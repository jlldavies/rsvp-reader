import type { RsvpDocument } from '@rsvp-reader/core';

/**
 * In-memory store mapping document IDs to parsed RsvpDocuments.
 * Used to pass documents from the MCP tool handler to the embedded web server.
 */
const store = new Map<string, { doc: RsvpDocument; wpm: number; chunkSize: 1 | 2 | 3 }>();

export function storeDocument(
  doc: RsvpDocument,
  wpm: number,
  chunkSize: 1 | 2 | 3
): string {
  store.set(doc.id, { doc, wpm, chunkSize });
  return doc.id;
}

export function getDocument(id: string) {
  return store.get(id) ?? null;
}

export function clearDocument(id: string) {
  store.delete(id);
}
