import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  text: string;
  url: string;
}

/**
 * Extract readable text from a document using Readability.
 * Falls back to body.innerText if Readability cannot parse the page.
 */
export function extractPageContent(doc: Document, url: string): ExtractedContent {
  // Clone the document so Readability doesn't mutate the live DOM
  const clone = doc.cloneNode(true) as Document;

  try {
    const reader = new Readability(clone);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 50) {
      return {
        title: article.title || doc.title || url,
        text: article.textContent.trim(),
        url,
      };
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: strip all tags and return plain text
  const bodyText = doc.body?.innerText ?? doc.body?.textContent ?? '';
  return {
    title: doc.title || url,
    text: bodyText.trim(),
    url,
  };
}
