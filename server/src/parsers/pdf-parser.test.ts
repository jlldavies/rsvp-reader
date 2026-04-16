import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parsePdf } from './pdf-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../../tests/fixtures');

describe('parsePdf', () => {
  it('extracts text from a valid PDF buffer', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('sets source type to pdf', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    expect(doc.source.type).toBe('pdf');
  });

  it('sets source uri to provided filename', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'my-document.pdf');
    expect(doc.source.uri).toBe('my-document.pdf');
  });

  it('returns a document with sections', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it('totalWords matches token count across all sections', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    const counted = doc.sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(doc.totalWords).toBe(counted);
  });

  it('all tokens have positive displayMs', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.displayMs).toBeGreaterThan(0);
      }
    }
  });

  it('all tokens have valid orpIndex within word bounds', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pdf'));
    const doc = await parsePdf(buf, 'test.pdf');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.orpIndex).toBeGreaterThanOrEqual(0);
        expect(token.orpIndex).toBeLessThan(token.text.length);
      }
    }
  });

  it('throws or returns empty document for invalid PDF buffer', async () => {
    const invalidBuf = Buffer.from('not a pdf file at all');
    await expect(parsePdf(invalidBuf, 'bad.pdf')).rejects.toThrow();
  });
});
