import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getDocument } from './doc-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serverInstance: ReturnType<typeof createServer> | null = null;
let currentPort = 0;

/**
 * Start the embedded Express server if not already running.
 * Returns the port it's listening on.
 */
export async function ensureServerRunning(): Promise<number> {
  if (serverInstance) return currentPort;

  const app = express();

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

  // Fallback: serve index.html for SPA routing
  app.get('*', (_req, res) => {
    res.sendFile(resolve(webDistPath, 'index.html'));
  });

  return new Promise((resolve_) => {
    serverInstance = createServer(app);
    serverInstance.listen(0, '127.0.0.1', () => {
      const addr = serverInstance!.address();
      currentPort = typeof addr === 'object' && addr ? addr.port : 0;
      resolve_(currentPort);
    });
  });
}

export function stopServer(): void {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    currentPort = 0;
  }
}
