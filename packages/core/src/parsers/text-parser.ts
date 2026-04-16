import type { RsvpDocument } from '../models/document.js';
import { tokenizePlainText } from '../engine/tokenizer.js';
import { generateDocumentId } from './parser.js';

/**
 * Parse plain text into an RsvpDocument.
 */
export async function parseText(
  text: string,
  uri = 'paste'
): Promise<RsvpDocument> {
  const sections = tokenizePlainText(text);
  const totalWords = sections.reduce((sum, s) => sum + s.tokens.length, 0);

  return {
    id: generateDocumentId(text),
    title: 'Pasted Text',
    source: { type: 'text', uri },
    sections,
    totalWords,
    createdAt: Date.now(),
  };
}
