import type { RsvpDocument } from '@rsvp-reader/core';
import { deliverDocument } from './deliver.js';
import { storeDocument } from './doc-store.js';
import { ensureServerRunning } from './web-server.js';
import { buildReaderUrl } from './tools.js';
import open from 'open';

export type ToolReply = { content: { type: 'text'; text: string }[] };

/**
 * Injectable side-effect seams for present(), so it can be tested without
 * a real dashboard endpoint, a real embedded web server, or a real browser
 * launch. Every field defaults to the real implementation.
 */
export interface PresentDeps {
  deliver: typeof deliverDocument;
  ensureServerRunning: () => Promise<number>;
  storeDocument: typeof storeDocument;
  open: (url: string) => Promise<unknown>;
}

export const defaultPresentDeps: PresentDeps = {
  deliver: deliverDocument,
  ensureServerRunning,
  storeDocument,
  open,
};

/**
 * Builds the standalone-mode success message. Defaults to the speed_read
 * wording; callers with a different pre-existing standalone string (e.g.
 * speed_read_clipboard) pass their own builder so that wording is preserved
 * byte-for-byte.
 */
export type StandaloneMessage = (doc: RsvpDocument, wpm: number) => string;

export const defaultStandaloneMessage: StandaloneMessage = (doc, wpm) =>
  `Opening RSVP reader for "${doc.title}" (${doc.totalWords} words) at ${wpm} WPM.`;

/**
 * Preserves the exact pre-existing speed_read_clipboard standalone reply text
 * (distinct from the generic title-based wording speed_read uses above).
 * Shipped from here so present.test.ts exercises the same builder index.ts
 * actually passes to present(), rather than a locally re-declared look-alike.
 */
export const clipboardStandaloneMessage: StandaloneMessage = (doc, wpm) =>
  `Opening RSVP reader for clipboard text (${doc.totalWords} words) at ${wpm} WPM.`;

/**
 * Present a parsed document to the user: either deliver it to a running
 * dashboard reader instance (when RSVP_DELIVER_URL is set) or fall back to
 * the standalone behaviour — store locally, spin up the embedded web server,
 * and open a browser tab.
 *
 * `standaloneMessage` lets each caller preserve its own exact pre-existing
 * standalone-mode reply text; `deps` lets tests substitute every side effect
 * (network delivery, the embedded server, and the browser open call).
 */
export async function present(
  doc: RsvpDocument,
  wpm: number,
  chunkSize: 1 | 2 | 3,
  sourceRef: string,
  standaloneMessage: StandaloneMessage = defaultStandaloneMessage,
  deps: PresentDeps = defaultPresentDeps
): Promise<ToolReply> {
  const deliverUrl = process.env.RSVP_DELIVER_URL;

  if (deliverUrl) {
    try {
      const result = await deps.deliver(
        deliverUrl,
        { doc, wpm, chunkSize, source: { kind: 'mcp', ref: sourceRef } },
        process.env.RSVP_DELIVER_TOKEN
      );
      const title = result.title ?? doc.title;
      const positionSuffix =
        typeof result.position === 'number' ? `, position ${result.position}` : '';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Queued for James in the dashboard reader: "${title}" (${doc.totalWords} words)${positionSuffix}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Could not deliver to the dashboard reader: ${message}`,
          },
        ],
      };
    }
  }

  const port = await deps.ensureServerRunning();
  deps.storeDocument(doc, wpm, chunkSize);
  const readerUrl = buildReaderUrl(port, doc.id);

  if (process.env.RSVP_OPEN !== '0') {
    await deps.open(readerUrl);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `${standaloneMessage(doc, wpm)}\n\nURL: ${readerUrl}`,
      },
    ],
  };
}
