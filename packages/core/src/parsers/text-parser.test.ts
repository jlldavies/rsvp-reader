import { describe, it, expect } from 'vitest';
import { parseText } from './text-parser.js';

describe('parseText', () => {
  it('returns a document with source type text', async () => {
    const doc = await parseText('Hello world');
    expect(doc.source.type).toBe('text');
  });

  it('sets title to Pasted Text', async () => {
    const doc = await parseText('Any content here');
    expect(doc.title).toBe('Pasted Text');
  });

  it('counts words correctly', async () => {
    const doc = await parseText('one two three four five');
    expect(doc.totalWords).toBe(5);
  });

  it('sets source uri to provided value', async () => {
    const doc = await parseText('text', 'my-file.txt');
    expect(doc.source.uri).toBe('my-file.txt');
  });

  it('produces tokens for all words', async () => {
    const doc = await parseText('hello world foo');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('hello');
    expect(words).toContain('world');
    expect(words).toContain('foo');
  });

  it('generates a stable id from text content', async () => {
    const doc1 = await parseText('same text');
    const doc2 = await parseText('same text');
    expect(doc1.id).toBe(doc2.id);
  });
});
