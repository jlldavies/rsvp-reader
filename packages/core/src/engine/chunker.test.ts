import { describe, it, expect } from 'vitest';
import { chunkTokens } from './chunker.js';
import { tokenizeSections } from './tokenizer.js';

function makeSection(paragraphs: string[]) {
  return tokenizeSections([{ heading: null, paragraphs }]);
}

describe('chunkTokens with chunkSize=1', () => {
  it('returns sections unchanged', () => {
    const sections = makeSection(['hello world foo']);
    const result = chunkTokens(sections, 1);
    expect(result).toBe(sections); // same reference
  });
});

describe('chunkTokens with chunkSize=2', () => {
  it('combines pairs of words into single tokens', () => {
    const sections = makeSection(['one two three four']);
    const result = chunkTokens(sections, 2);
    expect(result[0].tokens).toHaveLength(2);
    expect(result[0].tokens[0].text).toBe('one two');
    expect(result[0].tokens[1].text).toBe('three four');
  });

  it('handles odd number of words — last chunk has one word', () => {
    const sections = makeSection(['one two three']);
    const result = chunkTokens(sections, 2);
    expect(result[0].tokens).toHaveLength(2);
    expect(result[0].tokens[0].text).toBe('one two');
    expect(result[0].tokens[1].text).toBe('three');
  });

  it('does not combine words across paragraph boundaries', () => {
    const sections = makeSection(['hello world', 'foo bar']);
    const result = chunkTokens(sections, 2);
    const texts = result[0].tokens.map((t) => t.text);
    // "world" ends a paragraph — must not be paired with "foo"
    expect(texts).not.toContain('world foo');
    expect(texts).toContain('hello world');
    expect(texts).toContain('foo bar');
  });

  it('chunk displayMs is sum of constituent word durations', () => {
    const sections = makeSection(['hello world']);
    const originalTokens = sections[0].tokens;
    const expectedMs = originalTokens[0].displayMs + originalTokens[1].displayMs;
    const result = chunkTokens(sections, 2);
    expect(result[0].tokens[0].displayMs).toBe(expectedMs);
  });

  it('last chunk inherits isSectionEnd from last word', () => {
    const sections = makeSection(['one two']);
    const result = chunkTokens(sections, 2);
    expect(result[0].tokens[result[0].tokens.length - 1].isSectionEnd).toBe(true);
  });

  it('last chunk inherits isParagraphEnd from last word', () => {
    const sections = makeSection(['one two three', 'four five']);
    const result = chunkTokens(sections, 2);
    // "one two" is not a paragraph end; "three" is (odd word out)
    expect(result[0].tokens[0].isParagraphEnd).toBe(false);
    expect(result[0].tokens[1].isParagraphEnd).toBe(true);
  });
});

describe('chunkTokens with chunkSize=3', () => {
  it('combines triples of words', () => {
    const sections = makeSection(['one two three four five six']);
    const result = chunkTokens(sections, 3);
    expect(result[0].tokens).toHaveLength(2);
    expect(result[0].tokens[0].text).toBe('one two three');
    expect(result[0].tokens[1].text).toBe('four five six');
  });

  it('handles remainder words', () => {
    const sections = makeSection(['one two three four']);
    const result = chunkTokens(sections, 3);
    expect(result[0].tokens).toHaveLength(2);
    expect(result[0].tokens[0].text).toBe('one two three');
    expect(result[0].tokens[1].text).toBe('four');
  });

  it('does not combine words across section boundaries', () => {
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['one two'] },
      { heading: null, paragraphs: ['three four'] },
    ]);
    const result = chunkTokens(sections, 3);
    // Each section chunked independently — no cross-section chunks
    const allTexts = result.flatMap((s) => s.tokens.map((t) => t.text));
    expect(allTexts).not.toContain('two three');
  });
});
