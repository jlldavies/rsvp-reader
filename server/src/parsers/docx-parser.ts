import mammoth from 'mammoth';
import { parseMarkdown, generateDocumentId } from '@rsvp-reader/core';
import type { RsvpDocument } from '@rsvp-reader/core';

/**
 * Parse a DOCX buffer into an RsvpDocument.
 * Uses mammoth to convert to markdown-style text preserving headings,
 * then the markdown parser for section detection.
 */
export async function parseDocx(buffer: Buffer, uri: string): Promise<RsvpDocument> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (mammoth as any).convertToMarkdown({ buffer });

  if (!result.value?.trim()) {
    throw new Error(`No text content found in DOCX: ${uri}`);
  }

  // Use the markdown parser so headings become sections
  const doc = await parseMarkdown(result.value, uri);

  // Override source type to docx
  return {
    ...doc,
    id: generateDocumentId(uri + result.value.slice(0, 200)),
    source: { type: 'docx', uri },
    title: doc.title === 'Untitled Document'
      ? (uri.replace(/\.docx$/i, '').split('/').pop() || 'Word Document')
      : doc.title,
  };
}
