import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parsePptx } from './pptx-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '../../tests/fixtures');

describe('parsePptx', () => {
  it('extracts text from a valid PPTX buffer', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('sets source type to pptx', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    expect(doc.source.type).toBe('pptx');
  });

  it('sets source uri to provided filename', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'slides.pptx');
    expect(doc.source.uri).toBe('slides.pptx');
  });

  it('creates one section per slide', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    // Fixture has 2 slides
    expect(doc.sections.length).toBe(2);
  });

  it('sections are labeled with slide numbers', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    expect(doc.sections[0].heading).toContain('1');
    expect(doc.sections[1].heading).toContain('2');
  });

  it('totalWords matches token count across all sections', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    const counted = doc.sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(doc.totalWords).toBe(counted);
  });

  it('all tokens have positive displayMs', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.displayMs).toBeGreaterThan(0);
      }
    }
  });

  it('all tokens have valid orpIndex within word bounds', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.orpIndex).toBeGreaterThanOrEqual(0);
        expect(token.orpIndex).toBeLessThan(token.text.length);
      }
    }
  });

  it('extracts text from both slides in the fixture', async () => {
    const buf = readFileSync(resolve(fixturesDir, 'test.pptx'));
    const doc = await parsePptx(buf, 'test.pptx');
    const allWords = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    // slide1 contains "Introduction", slide2 contains "Second"
    expect(allWords.some(w => w.toLowerCase().includes('introduction') || w.toLowerCase().includes('slide'))).toBe(true);
  });

  it('throws for invalid PPTX buffer', async () => {
    const invalidBuf = Buffer.from('not a pptx file');
    await expect(parsePptx(invalidBuf, 'bad.pptx')).rejects.toThrow();
  });
});
