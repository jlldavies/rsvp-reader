import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import type { ServerConfig } from './config.js';
import { HOST_BRIDGE_PROTOCOL } from '@rsvp-reader/core';

const baseCfg: ServerConfig = {
  port: 3847,
  mode: 'standalone',
  docTtlMs: 5 * 60 * 1000,
  docReadOnce: true,
  frameAncestors: [],
};

describe('createApp() — no config (standalone, byte-for-byte today\'s behaviour)', () => {
  const app = createApp();

  it('sends X-Frame-Options: SAMEORIGIN', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sends a CSP containing frame-ancestors \'self\'', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'self'");
  });

  it('/api/health reports mode standalone with a version and protocol', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.mode).toBe('standalone');
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
    expect(res.body.protocol).toBe(HOST_BRIDGE_PROTOCOL);
  });

  it('/api/health carries the shared /api rate-limit headers (apiLimit is mounted before it)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['ratelimit-policy']).toBe('200;w=60');
  });
});

describe('createApp(cfg) — managed mode with frameAncestors', () => {
  const app = createApp({
    ...baseCfg,
    mode: 'managed',
    frameAncestors: ['http://localhost:5173'],
  });

  it('sends a CSP with frame-ancestors set to the configured origin', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain('frame-ancestors http://localhost:5173');
  });

  it('sends no X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeUndefined();
  });

  it('/api/health reports mode managed', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.mode).toBe('managed');
  });
});

describe('createApp(cfg) — standalone-equivalent config with no frameAncestors', () => {
  const app = createApp(baseCfg);

  it('still sends X-Frame-Options: SAMEORIGIN and frame-ancestors \'self\'', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'self'");
  });
});

describe('createApp(cfg) — wires cfg.docTtlMs/docReadOnce into the doc store', () => {
  it('docReadOnce:false keeps the doc available across repeated reads', async () => {
    const app = createApp({ ...baseCfg, mode: 'managed', docReadOnce: false });
    const doc = { id: 'app-test-doc-not-readonce' };

    const postRes = await request(app).post('/api/docs').send({ doc, wpm: 300, chunkSize: 1 });
    expect(postRes.status).toBe(200);

    const firstGet = await request(app).get(`/api/mcp-doc?doc=${doc.id}`);
    expect(firstGet.status).toBe(200);

    const secondGet = await request(app).get(`/api/mcp-doc?doc=${doc.id}`);
    expect(secondGet.status).toBe(200);
  });

  it('docReadOnce:true deletes the doc after the first read', async () => {
    const app = createApp({ ...baseCfg, mode: 'standalone', docReadOnce: true });
    const doc = { id: 'app-test-doc-readonce' };

    const postRes = await request(app).post('/api/docs').send({ doc, wpm: 300, chunkSize: 1 });
    expect(postRes.status).toBe(200);

    const firstGet = await request(app).get(`/api/mcp-doc?doc=${doc.id}`);
    expect(firstGet.status).toBe(200);

    const secondGet = await request(app).get(`/api/mcp-doc?doc=${doc.id}`);
    expect(secondGet.status).toBe(404);
  });
});
