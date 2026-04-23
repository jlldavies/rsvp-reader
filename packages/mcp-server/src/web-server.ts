import express from 'express';
import multer from 'multer';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getDocument } from './doc-store.js';
import { parsePdf } from './parsers/pdf-parser.js';
import { parseDocx } from './parsers/docx-parser.js';
import { parsePptx } from './parsers/pptx-parser.js';
import { parseUrl as parseHtml } from './parsers/url-parser.js';
import { parseMarkdown, parseText } from '@rsvp-reader/core';

// In-memory upload — no temp files on disk, platform-independent.
// 50 MB matches the limit in server/src/middleware/upload.ts.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

let serverInstance: ReturnType<typeof createServer> | null = null;
let currentPort = 0;

/**
 * Ping the server to confirm it's accepting connections.
 * Returns true if healthy, false otherwise.
 */
async function isServerHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wait up to maxMs for the server to become healthy, polling every intervalMs.
 */
async function waitForServer(port: number, maxMs = 5000, intervalMs = 200): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isServerHealthy(port)) return;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Web server on port ${port} did not become healthy within ${maxMs}ms`);
}

/**
 * Start the embedded Express server if not already running (or if it has died).
 * Returns the port it's listening on, guaranteed to be healthy before returning.
 */
export async function ensureServerRunning(): Promise<number> {
  // If we have an instance, verify it's still alive
  if (serverInstance && currentPort) {
    if (await isServerHealthy(currentPort)) return currentPort;
    // Server died — tear down and restart
    serverInstance.close();
    serverInstance = null;
    currentPort = 0;
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Serve built web assets from packages/web/dist
  const webDistPath = resolve(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));

  // API: return document data for the reader to load
  app.get('/api/mcp-doc', (req, res) => {
    const id = req.query.doc as string;
    if (!id) {
      res.status(400).json({ error: 'missing doc param' });
      return;
    }
    const entry = getDocument(id);
    if (!entry) {
      res.status(404).json({ error: 'document not found' });
      return;
    }
    res.json(entry);
  });

  // POST /api/parse — matches the contract in server/src/routes/parse.ts so
  // the web UI's drag-and-drop / URL / paste flows work when the user lands
  // on the embedded reader's main page (not just via the speed_read tool).
  // Cast multer middleware: @types/multer pulls in @types/express@4 which
  // conflicts with this package's @types/express@5. Runtime behaviour is fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.post('/api/parse', upload.single('file') as any, async (req, res) => {
    try {
      if (req.file) {
        const { originalname, buffer, mimetype } = req.file;
        const ext = originalname.split('.').pop()?.toLowerCase();
        let document;
        if (ext === 'pdf' || mimetype === 'application/pdf') {
          document = await parsePdf(buffer, originalname);
        } else if (ext === 'docx' || mimetype.includes('wordprocessingml')) {
          document = await parseDocx(buffer, originalname);
        } else if (ext === 'pptx' || mimetype.includes('presentationml')) {
          document = await parsePptx(buffer, originalname);
        } else if (ext === 'md' || ext === 'markdown' || mimetype === 'text/markdown') {
          document = await parseMarkdown(buffer.toString('utf-8'), originalname);
        } else if (ext === 'txt' || mimetype === 'text/plain' || mimetype === 'application/octet-stream') {
          document = await parseText(buffer.toString('utf-8'), originalname);
        } else {
          res.status(400).json({ error: `Unsupported file format: ${ext || mimetype}` });
          return;
        }
        res.json({ document });
        return;
      }

      const { url, html, text, format } = req.body as {
        url?: string; html?: string; text?: string; format?: string;
      };

      if (url) {
        let pageHtml = html;
        if (!pageHtml) {
          const fetchRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSVPReader/1.0)' },
          });
          if (!fetchRes.ok) {
            res.status(400).json({ error: `Failed to fetch URL: HTTP ${fetchRes.status}` });
            return;
          }
          pageHtml = await fetchRes.text();
        }
        const document = await parseHtml(pageHtml, url);
        res.json({ document });
        return;
      }

      if (text) {
        const document = format === 'markdown'
          ? await parseMarkdown(text, 'paste')
          : await parseText(text, 'paste');
        res.json({ document });
        return;
      }

      res.status(400).json({ error: 'Provide a file upload, { url, html }, or { text }' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse failed';
      res.status(500).json({ error: message });
    }
  });

  // POST /api/summarize — AI summarisation via Anthropic API. Matches the
  // contract in server/src/routes/summarize.ts. Requires ANTHROPIC_API_KEY in
  // the environment (loaded from server/.env by the MCP bootstrap).
  app.post('/api/summarize', async (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: 'No text provided' });
      return;
    }
    if (text.length > 200_000) {
      res.status(413).json({ error: 'Document too large to summarise (max 200,000 characters).' });
      return;
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to server/.env or your shell environment.' });
      return;
    }
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Please create a concise but comprehensive summary of the following document. Preserve the main ideas, key points, and structure. Keep headings where appropriate. The summary should be roughly 20-30% of the original length, optimized for speed reading.\n\nDocument:\n${text}`,
        }],
      });
      const summary = (message.content[0] as { type: string; text: string }).text;
      res.json({ summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Summarization failed';
      res.status(500).json({ error: msg });
    }
  });

  // Fallback: serve index.html for SPA routing
  app.get('*', (_req, res) => {
    res.sendFile(resolve(webDistPath, 'index.html'));
  });

  await new Promise<void>((resolve_) => {
    serverInstance = createServer(app);
    serverInstance.listen(0, '127.0.0.1', () => {
      const addr = serverInstance!.address();
      currentPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve_();
    });
  });

  // Wait until the server is actually accepting connections
  await waitForServer(currentPort);

  return currentPort;
}

export function stopServer(): void {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    currentPort = 0;
  }
}
