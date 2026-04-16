import { describe, it, expect } from 'vitest';
import { extractPageContent } from './extractor';

function makeDocument(html: string): Document {
  const doc = window.document.implementation.createHTMLDocument('Test');
  doc.documentElement.innerHTML = html;
  return doc;
}

const ARTICLE_HTML = `
  <html>
    <head><title>Speed Reading Tips</title></head>
    <body>
      <nav>Nav stuff that should be removed</nav>
      <article>
        <h1>Speed Reading Tips</h1>
        <p>Speed reading is a technique for increasing reading pace.</p>
        <p>Practice daily to improve comprehension and speed.</p>
      </article>
      <footer>Footer content</footer>
    </body>
  </html>
`;

describe('extractPageContent — successful extraction', () => {
  it('returns a result with title from the page', () => {
    const doc = makeDocument(ARTICLE_HTML);
    const result = extractPageContent(doc, 'https://example.com/article');

    expect(result.title).toBeTruthy();
  });

  it('returns a result with non-empty text content', () => {
    const doc = makeDocument(ARTICLE_HTML);
    const result = extractPageContent(doc, 'https://example.com/article');

    expect(result.text.length).toBeGreaterThan(10);
  });

  it('extracted text contains the article body content', () => {
    const doc = makeDocument(ARTICLE_HTML);
    const result = extractPageContent(doc, 'https://example.com/article');

    expect(result.text).toContain('Speed reading');
  });

  it('does not include nav element text in extracted content', () => {
    const doc = makeDocument(ARTICLE_HTML);
    const result = extractPageContent(doc, 'https://example.com/article');

    // Readability strips navigation
    expect(result.text).not.toContain('Nav stuff');
  });

  it('returns the url', () => {
    const doc = makeDocument(ARTICLE_HTML);
    const result = extractPageContent(doc, 'https://example.com/article');

    expect(result.url).toBe('https://example.com/article');
  });
});

describe('extractPageContent — fallback for non-article pages', () => {
  it('falls back to body text when Readability cannot parse', () => {
    const doc = makeDocument(`
      <html><body>
        <p>Just some text on a page without clear article structure.</p>
      </body></html>
    `);
    const result = extractPageContent(doc, 'https://example.com/random');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('uses document title as fallback title', () => {
    const doc = makeDocument(`
      <html><head><title>My Page</title></head>
      <body><p>Some content here.</p></body></html>
    `);
    const result = extractPageContent(doc, 'https://example.com/page');
    expect(result.title).toBeTruthy();
  });

  it('returns empty text for a page with no readable content', () => {
    const doc = makeDocument(`<html><body></body></html>`);
    const result = extractPageContent(doc, 'https://example.com/empty');
    expect(typeof result.text).toBe('string');
  });
});

describe('extractPageContent — multi-paragraph pages', () => {
  it('preserves paragraph structure in the text', () => {
    const doc = makeDocument(`
      <html><body>
        <article>
          <h1>Chapter One</h1>
          <p>First paragraph with content.</p>
          <p>Second paragraph with more content.</p>
          <h2>Chapter Two</h2>
          <p>Third paragraph under second heading.</p>
        </article>
      </body></html>
    `);
    const result = extractPageContent(doc, 'https://example.com/long');
    expect(result.text).toContain('First paragraph');
    expect(result.text).toContain('Second paragraph');
  });
});
