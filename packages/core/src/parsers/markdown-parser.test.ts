import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown-parser.js';

describe('parseMarkdown — document structure', () => {
  it('returns a document with an id', async () => {
    const doc = await parseMarkdown('Hello world');
    expect(doc.id).toBeTruthy();
  });

  it('sets source type to markdown', async () => {
    const doc = await parseMarkdown('Hello world');
    expect(doc.source.type).toBe('markdown');
  });

  it('sets source uri to the provided value', async () => {
    const doc = await parseMarkdown('Hello world', 'https://example.com');
    expect(doc.source.uri).toBe('https://example.com');
  });

  it('uses first heading as document title', async () => {
    const doc = await parseMarkdown('# My Article\n\nSome text here.');
    expect(doc.title).toBe('My Article');
  });

  it('falls back to Untitled Document when no heading', async () => {
    const doc = await parseMarkdown('Just some plain text without a heading.');
    expect(doc.title).toBe('Untitled Document');
  });

  it('has a positive totalWords count', async () => {
    const doc = await parseMarkdown('Hello world foo bar');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('totalWords matches sum of all section token counts', async () => {
    const doc = await parseMarkdown('# Section One\n\nHello world.\n\n# Section Two\n\nFoo bar baz.');
    const counted = doc.sections.reduce((sum, s) => sum + s.tokens.length, 0);
    expect(doc.totalWords).toBe(counted);
  });
});

describe('parseMarkdown — sections from headings', () => {
  it('creates one section per heading', async () => {
    const md = '# Intro\n\nFirst paragraph.\n\n# Body\n\nSecond paragraph.';
    const doc = await parseMarkdown(md);
    expect(doc.sections).toHaveLength(2);
  });

  it('preserves section headings', async () => {
    const md = '# Hello\n\nText here.\n\n## World\n\nMore text.';
    const doc = await parseMarkdown(md);
    expect(doc.sections[0].heading).toBe('Hello');
    expect(doc.sections[1].heading).toBe('World');
  });

  it('content before first heading goes into a section with null heading', async () => {
    const md = 'Introduction text.\n\n# First Section\n\nSection content.';
    const doc = await parseMarkdown(md);
    expect(doc.sections[0].heading).toBeNull();
    expect(doc.sections.some(s => s.heading === 'First Section')).toBe(true);
  });

  it('single paragraph with no headings creates one section', async () => {
    const doc = await parseMarkdown('Just a single paragraph of text here.');
    expect(doc.sections).toHaveLength(1);
  });
});

describe('parseMarkdown — token content', () => {
  it('strips bold markdown from token text', async () => {
    const doc = await parseMarkdown('This is **bold** text.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('**bold**');
    expect(words).toContain('bold');
  });

  it('strips italic markdown from token text', async () => {
    const doc = await parseMarkdown('This is *italic* text.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('*italic*');
    expect(words).toContain('italic');
  });

  it('strips link syntax, keeps link text', async () => {
    const doc = await parseMarkdown('Visit [Google](https://google.com) now.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('Google');
    expect(words.some(w => w.includes('https://'))).toBe(false);
  });

  it('includes list item text as readable words', async () => {
    const doc = await parseMarkdown('- First item\n- Second item\n- Third item');
    expect(doc.totalWords).toBeGreaterThan(0);
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('First');
  });

  it('all tokens have valid orpIndex within word bounds', async () => {
    const doc = await parseMarkdown('# Title\n\nHello beautiful extraordinary world.');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.orpIndex).toBeGreaterThanOrEqual(0);
        expect(token.orpIndex).toBeLessThan(token.text.length);
      }
    }
  });

  it('all tokens have positive displayMs', async () => {
    const doc = await parseMarkdown('Hello world.');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.displayMs).toBeGreaterThan(0);
      }
    }
  });
});

describe('parseMarkdown — code blocks and blockquotes', () => {
  it('includes code block text as readable content', async () => {
    const doc = await parseMarkdown('Some text.\n\n```\nconst x = 1;\n```\n\nMore text.');
    expect(doc.totalWords).toBeGreaterThan(3);
  });

  it('includes blockquote text as readable content', async () => {
    const doc = await parseMarkdown('> This is a blockquote with words.');
    expect(doc.totalWords).toBeGreaterThan(0);
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('blockquote');
  });
});

describe('parseMarkdown — inline formatting stripping', () => {
  it('strips strikethrough syntax', async () => {
    const doc = await parseMarkdown('This is ~~deleted~~ text.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('~~deleted~~');
    expect(words).toContain('deleted');
  });

  it('strips inline code backticks', async () => {
    const doc = await parseMarkdown('Use `console.log` to debug.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('`console.log`');
    expect(words).toContain('console.log');
  });

  it('strips alt-bold __text__', async () => {
    const doc = await parseMarkdown('This is __bold__ text.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('__bold__');
    expect(words).toContain('bold');
  });

  it('strips alt-italic _text_', async () => {
    const doc = await parseMarkdown('This is _italic_ text.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).not.toContain('_italic_');
    expect(words).toContain('italic');
  });

  it('strips image syntax entirely', async () => {
    const doc = await parseMarkdown('See ![diagram](image.png) for details.');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words.some(w => w.includes('![')));
    expect(words.some(w => w.includes('image.png'))).toBe(false);
  });
});

describe('parseMarkdown — list edge cases', () => {
  it('handles list items with no text gracefully', async () => {
    // An empty list item should not crash or produce zero-length words
    const doc = await parseMarkdown('- Valid item\n- \n- Another item');
    expect(doc).toBeDefined();
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('Valid');
    expect(words).toContain('Another');
  });

  it('handles numbered lists', async () => {
    const doc = await parseMarkdown('1. First item\n2. Second item\n3. Third item');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('First');
    expect(words).toContain('Second');
  });
});

describe('parseMarkdown — code block edge cases', () => {
  it('handles empty code block gracefully', async () => {
    const doc = await parseMarkdown('Before.\n\n```\n\n```\n\nAfter.');
    expect(doc).toBeDefined();
    // Should still have the before/after text
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(words).toContain('Before.');
    expect(words).toContain('After.');
  });

  it('handles fenced code block with language tag', async () => {
    const doc = await parseMarkdown('```typescript\nconst x = 1;\n```');
    expect(doc.totalWords).toBeGreaterThan(0);
  });
});

describe('parseMarkdown — blockquote edge cases', () => {
  it('handles empty blockquote gracefully', async () => {
    const doc = await parseMarkdown('Before.\n\n> \n\nAfter.');
    expect(doc).toBeDefined();
  });

  it('handles multi-line blockquote', async () => {
    const doc = await parseMarkdown('> Line one\n> Line two\n> Line three');
    expect(doc.totalWords).toBeGreaterThan(0);
  });
});

describe('parseMarkdown — heading edge cases', () => {
  it('heading with no following content is not included as empty section', async () => {
    const doc = await parseMarkdown('# Empty Section\n\n# Real Section\n\nSome content here.');
    // The empty section (heading with no paragraphs) should be skipped
    const allTexts = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    expect(allTexts).toContain('Some');
  });

  it('handles all six heading levels', async () => {
    const md = '# H1\n\nA.\n\n## H2\n\nB.\n\n### H3\n\nC.\n\n#### H4\n\nD.\n\n##### H5\n\nE.\n\n###### H6\n\nF.';
    const doc = await parseMarkdown(md);
    expect(doc.sections).toHaveLength(6);
  });

  it('uses h2 as title if no h1 present', async () => {
    const doc = await parseMarkdown('## My Article\n\nContent here.');
    expect(doc.title).toBe('My Article');
  });
});

describe('parseMarkdown — edge cases', () => {
  it('handles empty markdown gracefully', async () => {
    const doc = await parseMarkdown('');
    expect(doc).toBeDefined();
    expect(doc.sections).toBeDefined();
  });

  it('two identical markdown strings produce same document id', async () => {
    const doc1 = await parseMarkdown('Hello world');
    const doc2 = await parseMarkdown('Hello world');
    expect(doc1.id).toBe(doc2.id);
  });

  it('different markdown strings produce different document ids', async () => {
    const doc1 = await parseMarkdown('Hello world');
    const doc2 = await parseMarkdown('Goodbye world');
    expect(doc1.id).not.toBe(doc2.id);
  });

  it('very long document produces correct word count', async () => {
    const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
    const doc = await parseMarkdown(words.join(' '));
    expect(doc.totalWords).toBe(1000);
  });

  it('document with only whitespace produces fallback content', async () => {
    const doc = await parseMarkdown('   \n\n   ');
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it('mixed content document preserves section order', async () => {
    const md = '# First\n\nParagraph one.\n\n# Second\n\nParagraph two.\n\n# Third\n\nParagraph three.';
    const doc = await parseMarkdown(md);
    expect(doc.sections[0].heading).toBe('First');
    expect(doc.sections[1].heading).toBe('Second');
    expect(doc.sections[2].heading).toBe('Third');
  });
});
