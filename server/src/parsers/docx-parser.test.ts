import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseDocx } from './docx-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../../tests/fixtures');

describe('parseDocx', () => {
  it('extracts text from a valid DOCX buffer', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('sets source type to docx', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    expect(doc.source.type).toBe('docx');
  });

  it('sets source uri to provided filename', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'my-doc.docx');
    expect(doc.source.uri).toBe('my-doc.docx');
  });

  it('returns at least one section', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it('totalWords matches token count across all sections', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    const counted = doc.sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(doc.totalWords).toBe(counted);
  });

  it('all tokens have positive displayMs', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.displayMs).toBeGreaterThan(0);
      }
    }
  });

  it('all tokens have valid orpIndex within word bounds', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.orpIndex).toBeGreaterThanOrEqual(0);
        expect(token.orpIndex).toBeLessThan(token.text.length);
      }
    }
  });

  it('throws for invalid DOCX buffer', async () => {
    const invalidBuf = Buffer.from('not a docx file');
    await expect(parseDocx(invalidBuf, 'bad.docx')).rejects.toThrow();
  });

  it('extracts text content that includes words from the fixture', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.docx'));
    const doc = await parseDocx(buf, 'test.docx');
    const allWords = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    // The fixture contains "Hello from a test Word document."
    expect(allWords.some(w => w.toLowerCase().includes('hello') || w.toLowerCase().includes('word'))).toBe(true);
  });
});
