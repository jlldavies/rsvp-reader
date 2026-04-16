import { describe, it, expect } from 'vitest';
import { parseUrl } from './url-parser.js';

describe('parseUrl', () => {
  it('extracts readable text from a simple HTML page', async () => {
    const html = `<html><head><title>Test Article</title></head><body>
      <article>
        <h1>My Test Article</h1>
        <p>This is the first paragraph with several words in it.</p>
        <p>This is the second paragraph with even more words here.</p>
      </article>
    </body></html>`;
    const doc = await parseUrl(html, 'https://example.com/article');
    expect(doc.totalWords).toBeGreaterThan(5);
    expect(doc.source.type).toBe('url');
    expect(doc.source.uri).toBe('https://example.com/article');
  });

  it('uses page title as document title when available', async () => {
    const html = `<html><head><title>My Page Title</title></head><body>
      <p>Some content here with enough words to be readable.</p>
    </body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    expect(doc.title).toBeTruthy();
    expect(doc.title.length).toBeGreaterThan(0);
  });

  it('strips HTML tags from extracted text', async () => {
    const html = `<html><body>
      <p>Hello <strong>world</strong> this <em>is</em> a test.</p>
    </body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    const words = doc.sections.flatMap(s => s.tokens.map(t => t.text));
    // No words should contain HTML tag characters
    expect(words.every(w => !w.includes('<') && !w.includes('>'))).toBe(true);
  });

  it('returns document with correct source type', async () => {
    const html = `<html><body><p>Content with enough words to parse.</p></body></html>`;
    const doc = await parseUrl(html, 'https://test.com');
    expect(doc.source.type).toBe('url');
  });

  it('handles minimal HTML with just a paragraph', async () => {
    const html = `<html><body><p>Just a simple paragraph with some words.</p></body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('all tokens have valid ORP index within bounds', async () => {
    const html = `<html><body>
      <article><p>The quick brown fox jumps over the lazy dog.</p></article>
    </body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    for (const section of doc.sections) {
      for (const token of section.tokens) {
        expect(token.orpIndex).toBeGreaterThanOrEqual(0);
        expect(token.orpIndex).toBeLessThan(token.text.length);
      }
    }
  });

  it('handles HTML with navigation/boilerplate (readability should strip it)', async () => {
    const html = `<html><body>
      <nav>Home About Contact</nav>
      <article>
        <h1>Real Content Title</h1>
        <p>This is the actual article content that should be preserved for reading.</p>
        <p>It has multiple paragraphs with meaningful words in each one.</p>
      </article>
      <footer>Copyright 2024</footer>
    </body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    expect(doc.totalWords).toBeGreaterThan(0);
  });

  it('creates stable id from same URL and content', async () => {
    const html = `<html><body><p>Same content every time.</p></body></html>`;
    const doc1 = await parseUrl(html, 'https://example.com');
    const doc2 = await parseUrl(html, 'https://example.com');
    expect(doc1.id).toBe(doc2.id);
  });

  it('produces different ids for different URLs', async () => {
    const html = `<html><body><p>Same content.</p></body></html>`;
    const doc1 = await parseUrl(html, 'https://site-a.com');
    const doc2 = await parseUrl(html, 'https://site-b.com');
    expect(doc1.id).not.toBe(doc2.id);
  });

  it('handles empty body gracefully', async () => {
    const html = `<html><body></body></html>`;
    const doc = await parseUrl(html, 'https://example.com');
    expect(doc).toBeDefined();
    expect(doc.sections).toBeDefined();
  });
});
