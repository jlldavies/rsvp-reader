import type { RsvpDocument } from '../models/document.js';

export interface Parser {
  parse(input: string | ArrayBuffer): Promise<RsvpDocument>;
}

export function generateDocumentId(source: string): string {
  // Simple hash for document deduplication
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
