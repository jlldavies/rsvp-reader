import type { ReaderSettings } from './settings.js';

/**
 * Host-bridge protocol — the postMessage contract between an embedded/popped-out
 * reader and the page that hosts it.
 *
 * The reader posts `ReaderToHost` messages to its host: `window.parent` when
 * embedded in an iframe, or `window.opener` when popped out into its own window.
 * The host answers with `HostToReader` messages, replying to the reader's
 * `rsvp:ready` with an `rsvp:init` that carries the settings and position to
 * resume from.
 *
 * `rsvp:ready` is the only message a reader may post to origin `'*'`: it carries
 * no document content or settings, only the protocol version, so there is
 * nothing in it for a same-origin restriction to protect. Every other message
 * — in either direction — must be posted to a known, verified origin.
 */
export const HOST_BRIDGE_PROTOCOL = 1;

export type ReaderToHost =
  | { type: 'rsvp:ready'; protocol: number }
  | { type: 'rsvp:opened'; docId: string; title: string; totalWords: number }
  | { type: 'rsvp:settings'; settings: ReaderSettings }
  | {
      type: 'rsvp:progress';
      docId: string;
      tokenIndex: number;
      totalWords: number;
      state: 'playing' | 'paused' | 'finished';
    }
  | { type: 'rsvp:finished'; docId: string; totalWords: number };

export type HostToReader =
  | { type: 'rsvp:init'; protocol: number; settings: Partial<ReaderSettings> | null; position: number | null }
  | { type: 'rsvp:settings'; settings: Partial<ReaderSettings> };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isProgressState(x: unknown): x is 'playing' | 'paused' | 'finished' {
  return x === 'playing' || x === 'paused' || x === 'finished';
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function isChunkSize(x: unknown): x is 1 | 2 | 3 {
  return x === 1 || x === 2 || x === 3;
}

function isPauseMode(x: unknown): x is 'timed' | 'manual' {
  return x === 'timed' || x === 'manual';
}

function isTheme(x: unknown): x is 'light' | 'dark' | 'system' {
  return x === 'light' || x === 'dark' || x === 'system';
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isBoolean(x: unknown): x is boolean {
  return typeof x === 'boolean';
}

// Per-field type validators for ReaderSettings. Keeping this keyed by every
// field of the interface means a new setting fails to compile here until it
// is given a validator — the guard cannot silently go stale.
const READER_SETTINGS_FIELD_VALIDATORS: {
  [K in keyof ReaderSettings]: (v: unknown) => boolean;
} = {
  wpm: isFiniteNumber,
  chunkSize: isChunkSize,
  orpColor: isString,
  prefixColor: isString,
  suffixColor: isString,
  backgroundColor: isString,
  sectionPauseMode: isPauseMode,
  paragraphPauseMode: isPauseMode,
  theme: isTheme,
  punctuationPauseMultiplier: isFiniteNumber,
  longWordPauseMultiplier: isFiniteNumber,
  font: isString,
  fontSize: isFiniteNumber,
  phantomWords: isBoolean,
  phantomColor: isString,
  focusBrackets: isBoolean,
  focusBracketColor: isString,
};

const READER_SETTINGS_KEYS = Object.keys(
  READER_SETTINGS_FIELD_VALIDATORS
) as (keyof ReaderSettings)[];

/**
 * Structurally validates a value as a `Partial<ReaderSettings>`: every key
 * present must be a known ReaderSettings field, and its value must match
 * that field's type (numeric fields require `Number.isFinite`, so `NaN`,
 * `Infinity` and non-numbers are all rejected). Arrays and non-objects are
 * rejected. Used for the host->reader direction, where settings are always
 * partial (patches) and cross a trust boundary this reader does not control.
 */
export function isPartialReaderSettings(x: unknown): x is Partial<ReaderSettings> {
  if (!isRecord(x)) return false;
  const validators = READER_SETTINGS_FIELD_VALIDATORS as Record<string, (v: unknown) => boolean>;
  for (const key of Object.keys(x)) {
    if (!Object.prototype.hasOwnProperty.call(validators, key)) return false;
    const validator = validators[key];
    if (typeof validator !== 'function') return false;
    if (!validator(x[key])) return false;
  }
  return true;
}

/**
 * Structurally validates a value as a complete `ReaderSettings`: same
 * per-field checks as `isPartialReaderSettings`, plus every one of the 17
 * fields must be present. Used for the reader->host `rsvp:settings`
 * variant, which is defined to carry the full settings object.
 */
export function isReaderSettings(x: unknown): x is ReaderSettings {
  if (!isPartialReaderSettings(x)) return false;
  const present = x as Record<string, unknown>;
  return READER_SETTINGS_KEYS.every((key) => Object.prototype.hasOwnProperty.call(present, key));
}

export function isReaderToHost(x: unknown): x is ReaderToHost {
  if (!isRecord(x) || typeof x.type !== 'string') return false;

  switch (x.type) {
    case 'rsvp:ready':
      return isFiniteNumber(x.protocol);
    case 'rsvp:opened':
      return (
        typeof x.docId === 'string' &&
        typeof x.title === 'string' &&
        isFiniteNumber(x.totalWords)
      );
    case 'rsvp:settings':
      return isReaderSettings(x.settings);
    case 'rsvp:progress':
      return (
        typeof x.docId === 'string' &&
        isFiniteNumber(x.tokenIndex) &&
        isFiniteNumber(x.totalWords) &&
        isProgressState(x.state)
      );
    case 'rsvp:finished':
      return typeof x.docId === 'string' && isFiniteNumber(x.totalWords);
    default:
      return false;
  }
}

export function isHostToReader(x: unknown): x is HostToReader {
  if (!isRecord(x) || typeof x.type !== 'string') return false;

  switch (x.type) {
    case 'rsvp:init':
      return (
        isFiniteNumber(x.protocol) &&
        (x.settings === null || isPartialReaderSettings(x.settings)) &&
        (x.position === null || isFiniteNumber(x.position))
      );
    case 'rsvp:settings':
      return isPartialReaderSettings(x.settings);
    default:
      return false;
  }
}
