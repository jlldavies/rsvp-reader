import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { tokenizePlainText } from '@rsvp-reader/core';
import { generateDocumentId } from '@rsvp-reader/core';
import type { RsvpDocument } from '@rsvp-reader/core';

/**
 * Parse an HTML string into an RsvpDocument using Mozilla Readability.
 * Strips navigation, ads, and boilerplate — extracts the article text.
 */
export async function parseUrl(html: string, uri: string): Promise<RsvpDocument> {
  const dom = new JSDOM(html, { url: uri });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const rawText = article?.textContent?.trim() || extractFallbackText(dom);
  const title = article?.title || dom.window.document.title || 'Untitled Page';

  const sections = tokenizePlainText(rawText);
  const totalWords = sections.reduce((sum, s) => sum + s.tokens.length, 0);

  return {
    id: generateDocumentId(uri + rawText.slice(0, 200)),
    title,
    source: { type: 'url', uri },
    sections,
    totalWords,
    createdAt: Date.now(),
  };
}

function extractFallbackText(dom: JSDOM): string {
  // Remove script/style elements
  const doc = dom.window.document;
  doc.querySelectorAll('script, style, nav, footer').forEach(el => el.remove());
  return doc.body?.textContent?.trim() || '(no readable content)';
}
