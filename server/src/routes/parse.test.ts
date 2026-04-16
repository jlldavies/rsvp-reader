import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../../tests/fixtures');
const app = createApp();

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/parse — URL mode', () => {
  it('parses a URL and returns an RsvpDocument', async () => {
    const html = `<html><head><title>Test Article</title></head><body>
      <article><p>This is article content with enough words to parse.</p></article>
    </body></html>`;

    const res = await request(app)
      .post('/api/parse')
      .send({ html, url: 'https://example.com/test' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.source.type).toBe('url');
    expect(res.body.document.totalWords).toBeGreaterThan(0);
  });

  it('returns 400 when neither file nor url/html provided', async () => {
    const res = await request(app)
      .post('/api/parse')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/parse — file upload mode', () => {
  it('parses a DOCX file upload', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const res = await request(app)
      .post('/api/parse')
      .attach('file', buf, { filename: 'test.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    expect(res.status).toBe(200);
    expect(res.body.document.source.type).toBe('docx');
    expect(res.body.document.totalWords).toBeGreaterThan(0);
  });

  it('parses a PPTX file upload', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const res = await request(app)
      .post('/api/parse')
      .attach('file', buf, { filename: 'test.pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

    expect(res.status).toBe(200);
    expect(res.body.document.source.type).toBe('pptx');
    expect(res.body.document.totalWords).toBeGreaterThan(0);
  });

  it('parses a PDF file upload', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const res = await request(app)
      .post('/api/parse')
      .attach('file', buf, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.document.source.type).toBe('pdf');
    expect(res.body.document.totalWords).toBeGreaterThan(0);
  });

  it('parses a Markdown file upload', async () => {
    const md = Buffer.from('# Test Doc\n\nHello world this is markdown content.');
    const res = await request(app)
      .post('/api/parse')
      .attach('file', md, { filename: 'test.md', contentType: 'text/markdown' });

    expect(res.status).toBe(200);
    expect(res.body.document.source.type).toBe('markdown');
    expect(res.body.document.totalWords).toBeGreaterThan(0);
  });

  it('returns 400 for unsupported file format', async () => {
    const buf = Buffer.from('some random content');
    const res = await request(app)
      .post('/api/parse')
      .attach('file', buf, { filename: 'test.xyz', contentType: 'application/octet-stream' });

    expect(res.status).toBe(400);
  });

  it('returned document has valid sections with tokens', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const res = await request(app)
      .post('/api/parse')
      .attach('file', buf, { filename: 'test.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const doc = res.body.document;
    expect(doc.sections).toBeDefined();
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.sections[0].tokens.length).toBeGreaterThan(0);
  });
});
