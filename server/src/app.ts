import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { parseRouter } from './routes/parse.js';
import { summarizeRouter } from './routes/summarize.js';
import { storeDoc, getDoc } from './doc-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const summarizeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many summarise requests. Please wait a few minutes.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const apiLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── API routes ────────────────────────────────────────────────────
  app.use('/api', apiLimit, parseRouter);
  app.use('/api/summarize', summarizeLimit);
  app.use('/api', summarizeRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Temporary document store — used by the Chrome extension to pass parsed
  // documents to the web app so they share the same localStorage / history.
  app.post('/api/docs', (req, res) => {
    const { doc, wpm, chunkSize } = req.body;
    if (!doc?.id) {
      res.status(400).json({ error: 'missing doc with id' });
      return;
    }
    storeDoc(doc.id, doc, wpm, chunkSize);
    res.json({ id: doc.id });
  });

  // Same response shape as the MCP server's /api/mcp-doc endpoint so the
  // web app's useMcpDoc hook works unchanged.
  app.get('/api/mcp-doc', (req, res) => {
    const id = req.query.doc as string;
    if (!id) {
      res.status(400).json({ error: 'missing doc param' });
      return;
    }
    const entry = getDoc(id);
    if (!entry) {
      res.status(404).json({ error: 'document not found' });
      return;
    }
    res.json({ doc: entry.doc, wpm: entry.wpm, chunkSize: entry.chunkSize });
  });

  // ─── Serve web app ────────────────────────────────────────────────
  const webDistPath = resolve(__dirname, '../../packages/web/dist');
  if (existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(resolve(webDistPath, 'index.html'));
    });
  }

  return app;
}
