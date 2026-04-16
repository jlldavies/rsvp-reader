import { describe, it, expect } from 'vitest';
import { tokenizePlainText, tokenizeSections } from './tokenizer.js';

describe('tokenizePlainText', () => {
  it('splits text into individual word tokens', () => {
    const sections = tokenizePlainText('hello world');
    expect(sections).toHaveLength(1);
    expect(sections[0].tokens).toHaveLength(2);
    expect(sections[0].tokens[0].text).toBe('hello');
    expect(sections[0].tokens[1].text).toBe('world');
  });

  it('assigns sequential global indices', () => {
    const sections = tokenizePlainText('one two three');
    const tokens = sections[0].tokens;
    expect(tokens[0].index).toBe(0);
    expect(tokens[1].index).toBe(1);
    expect(tokens[2].index).toBe(2);
  });

  it('marks the last word of a paragraph as isParagraphEnd', () => {
    const sections = tokenizePlainText('hello world');
    const tokens = sections[0].tokens;
    expect(tokens[0].isParagraphEnd).toBe(false);
    expect(tokens[1].isParagraphEnd).toBe(true);
  });

  it('marks the last word of the last paragraph as isSectionEnd', () => {
    const sections = tokenizePlainText('hello world');
    const last = sections[0].tokens[sections[0].tokens.length - 1];
    expect(last.isSectionEnd).toBe(true);
  });

  it('splits on double newlines into separate paragraphs within one section', () => {
    const sections = tokenizePlainText('hello world\n\nfoo bar');
    // Plain text makes one section with both paragraphs
    expect(sections).toHaveLength(1);
    // Last word of first paragraph is paragraph end, not section end
    const firstParaLastToken = sections[0].tokens.find((t) => t.text === 'world');
    expect(firstParaLastToken?.isParagraphEnd).toBe(true);
    expect(firstParaLastToken?.isSectionEnd).toBe(false);
  });

  it('produces correct total word count', () => {
    const sections = tokenizePlainText('one two\n\nthree four five');
    const total = sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(total).toBe(5);
  });

  it('ignores extra whitespace between words', () => {
    const sections = tokenizePlainText('hello   world');
    expect(sections[0].tokens).toHaveLength(2);
  });

  it('each token has a valid orpIndex within its word', () => {
    const sections = tokenizePlainText('hello beautiful extraordinary');
    for (const token of sections[0].tokens) {
      expect(token.orpIndex).toBeGreaterThanOrEqual(0);
      expect(token.orpIndex).toBeLessThan(token.text.length);
    }
  });

  it('each token has a positive displayMs', () => {
    const sections = tokenizePlainText('hello world');
    for (const token of sections[0].tokens) {
      expect(token.displayMs).toBeGreaterThan(0);
    }
  });

  it('returns empty array for blank input', () => {
    const sections = tokenizePlainText('   ');
    const total = sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(total).toBe(0);
  });
});

describe('tokenizeSections', () => {
  it('creates one Section per RawSection', () => {
    const sections = tokenizeSections([
      { heading: 'Intro', paragraphs: ['Hello world'] },
      { heading: 'Body', paragraphs: ['More text here'] },
    ]);
    expect(sections).toHaveLength(2);
  });

  it('preserves section heading', () => {
    const sections = tokenizeSections([{ heading: 'My Heading', paragraphs: ['text'] }]);
    expect(sections[0].heading).toBe('My Heading');
  });

  it('null heading is preserved', () => {
    const sections = tokenizeSections([{ heading: null, paragraphs: ['text'] }]);
    expect(sections[0].heading).toBeNull();
  });

  it('global token indices are continuous across sections', () => {
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['one two'] },
      { heading: null, paragraphs: ['three four'] },
    ]);
    const allTokens = sections.flatMap((s) => s.tokens);
    allTokens.forEach((t, i) => expect(t.index).toBe(i));
  });

  it('last token of each section is marked isSectionEnd', () => {
    const sections = tokenizeSections([
      { heading: null, paragraphs: ['hello world'] },
      { heading: null, paragraphs: ['foo bar'] },
    ]);
    const lastOfFirst = sections[0].tokens[sections[0].tokens.length - 1];
    const lastOfSecond = sections[1].tokens[sections[1].tokens.length - 1];
    expect(lastOfFirst.isSectionEnd).toBe(true);
    expect(lastOfSecond.isSectionEnd).toBe(true);
  });
});
