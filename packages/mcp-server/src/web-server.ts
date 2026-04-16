import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getDocument } from './doc-store.js';

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
