import { tokenizePlainText, generateDocumentId } from '@rsvp-reader/core';
import type { RsvpDocument } from '@rsvp-reader/core';

/**
 * Parse a PDF buffer into an RsvpDocument using pdfjs-dist.
 */
export async function parsePdf(buffer: Buffer, uri: string): Promise<RsvpDocument> {
  // Dynamic import to avoid ESM/CJS issues with pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item) => item.str || '')
      .join(' ')
      .trim();
    if (pageText) textParts.push(pageText);
  }

  const text = textParts.join('\n\n');

  if (!text.trim()) {
    throw new Error(`No text content found in PDF: ${uri}`);
  }

  const sections = tokenizePlainText(text);
  const totalWords = sections.reduce((sum, s) => sum + s.tokens.length, 0);
  const title = uri.replace(/\.pdf$/i, '').split('/').pop() || 'PDF Document';

  return {
    id: generateDocumentId(uri + text.slice(0, 200)),
    title,
    source: { type: 'pdf', uri },
    sections,
    totalWords,
    createdAt: Date.now(),
  };
}
