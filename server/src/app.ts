import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { parseRouter } from './routes/parse.js';
import { summarizeRouter } from './routes/summarize.js';
import { storeDoc, getDoc, configureDocStore } from './doc-store.js';
import type { ServerConfig } from './config.js';
import { HOST_BRIDGE_PROTOCOL } from '@rsvp-reader/core';

const __dirname = dirname(fileURLToPath(import.meta.url));

const serverVersion: string = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
).version;

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

export function createApp(cfg?: ServerConfig) {
  const app = express();

  if (cfg?.frameAncestors && cfg.frameAncestors.length > 0) {
    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          'frame-ancestors': cfg.frameAncestors,
        },
      },
      frameguard: false,
    }));
  } else {
    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
  }

  if (cfg) {
    configureDocStore({ docTtlMs: cfg.docTtlMs, docReadOnce: cfg.docReadOnce });
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── API routes ────────────────────────────────────────────────────
  // express v5's @types/express-serve-static-core disagrees with the
  // express-rate-limit and this workspace's duplicated @types/express
  // copies (root vs server node_modules) — the handlers are structurally
  // compatible at runtime, so cast rather than fork the typings.
  //
  // apiLimit is mounted at /api FIRST (matching pre-change behaviour, where
  // parseRouter's own GET /health served /api/health under this same
  // limiter) so /api/health also carries the rate-limit headers and
  // consumes the shared /api budget. The richer /api/health handler below
  // is then registered before parseRouter so it shadows parseRouter's
  // GET /health, per Express's route registration order.
  app.use('/api', apiLimit as unknown as RequestHandler);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: serverVersion,
      mode: cfg?.mode ?? 'standalone',
      protocol: HOST_BRIDGE_PROTOCOL,
    });
  });

  app.use('/api', parseRouter);
  app.use('/api/summarize', summarizeLimit as unknown as RequestHandler);
  app.use('/api', summarizeRouter);

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
