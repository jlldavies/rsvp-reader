import { describe, it, expect } from 'vitest';
import { isReaderToHost, isHostToReader } from './host-bridge.js';
import type { ReaderSettings } from './settings.js';

const FULL_SETTINGS: ReaderSettings = {
  wpm: 300,
  chunkSize: 1,
  orpColor: '#ff2c2c',
  prefixColor: '#333333',
  suffixColor: '#333333',
  backgroundColor: '#fafafa',
  sectionPauseMode: 'manual',
  paragraphPauseMode: 'timed',
  theme: 'system',
  punctuationPauseMultiplier: 1.5,
  longWordPauseMultiplier: 1.2,
  font: "'IBM Plex Mono', 'Roboto Mono', Courier, monospace",
  fontSize: 56,
  phantomWords: true,
  phantomColor: '#bbbbbb',
  focusBrackets: true,
  focusBracketColor: '#888888',
};

describe('isReaderToHost', () => {
  it('accepts rsvp:ready', () => {
    expect(isReaderToHost({ type: 'rsvp:ready', protocol: 1 })).toBe(true);
  });

  it('rejects rsvp:ready with a non-number protocol', () => {
    expect(isReaderToHost({ type: 'rsvp:ready', protocol: '1' })).toBe(false);
  });

  it('accepts rsvp:opened', () => {
    expect(
      isReaderToHost({ type: 'rsvp:opened', docId: 'd1', title: 'Doc', totalWords: 100 })
    ).toBe(true);
  });

  it('rejects rsvp:opened with wrong field types', () => {
    expect(
      isReaderToHost({ type: 'rsvp:opened', docId: 'd1', title: 'Doc', totalWords: '100' })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:opened', docId: 1, title: 'Doc', totalWords: 100 })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:opened', docId: 'd1', title: 5, totalWords: 100 })
    ).toBe(false);
  });

  it('accepts rsvp:settings with a complete, well-typed ReaderSettings', () => {
    expect(isReaderToHost({ type: 'rsvp:settings', settings: FULL_SETTINGS })).toBe(true);
  });

  it('rejects rsvp:settings with a non-object settings field', () => {
    expect(isReaderToHost({ type: 'rsvp:settings', settings: 'nope' })).toBe(false);
    expect(isReaderToHost({ type: 'rsvp:settings' })).toBe(false);
  });

  it('rejects rsvp:settings that is missing required fields (the reader->host variant carries a full ReaderSettings)', () => {
    expect(isReaderToHost({ type: 'rsvp:settings', settings: {} })).toBe(false);
    expect(isReaderToHost({ type: 'rsvp:settings', settings: { wpm: 300 } })).toBe(false);
  });

  it('rejects rsvp:settings with a wrongly-typed field', () => {
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, wpm: 'fast' } })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, wpm: NaN } })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, chunkSize: 4 } })
    ).toBe(false);
  });

  it('accepts rsvp:progress for each valid state', () => {
    for (const state of ['playing', 'paused', 'finished'] as const) {
      expect(
        isReaderToHost({
          type: 'rsvp:progress',
          docId: 'd1',
          tokenIndex: 5,
          totalWords: 100,
          state,
        })
      ).toBe(true);
    }
  });

  it('rejects rsvp:progress with wrong field types or an invalid state', () => {
    expect(
      isReaderToHost({
        type: 'rsvp:progress',
        docId: 'd1',
        tokenIndex: '5',
        totalWords: 100,
        state: 'playing',
      })
    ).toBe(false);
    expect(
      isReaderToHost({
        type: 'rsvp:progress',
        docId: 'd1',
        tokenIndex: 5,
        totalWords: 100,
        state: 'stopped',
      })
    ).toBe(false);
  });

  it('accepts rsvp:finished', () => {
    expect(isReaderToHost({ type: 'rsvp:finished', docId: 'd1', totalWords: 100 })).toBe(true);
  });

  it('rejects rsvp:finished with wrong field types', () => {
    expect(isReaderToHost({ type: 'rsvp:finished', docId: 'd1', totalWords: '100' })).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(isReaderToHost({ type: 'rsvp:bogus', protocol: 1 })).toBe(false);
  });

  it('rejects a message missing a type field', () => {
    expect(isReaderToHost({ protocol: 1 })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isReaderToHost(null)).toBe(false);
    expect(isReaderToHost(undefined)).toBe(false);
    expect(isReaderToHost('rsvp:ready')).toBe(false);
    expect(isReaderToHost(42)).toBe(false);
    expect(isReaderToHost([])).toBe(false);
  });

  it('rejects settings keys that collide with Object.prototype members, without throwing', () => {
    expect(() =>
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, constructor: 1 } })
    ).not.toThrow();
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, constructor: 1 } })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, toString: 1 } })
    ).toBe(false);
    expect(
      isReaderToHost({ type: 'rsvp:settings', settings: { ...FULL_SETTINGS, valueOf: 1 } })
    ).toBe(false);
    expect(
      isReaderToHost({
        type: 'rsvp:settings',
        settings: { ...FULL_SETTINGS, hasOwnProperty: 0 },
      })
    ).toBe(false);
    expect(
      isReaderToHost({
        type: 'rsvp:settings',
        settings: { ...FULL_SETTINGS, propertyIsEnumerable: 1 },
      })
    ).toBe(false);
    expect(
      isReaderToHost({
        type: 'rsvp:settings',
        settings: { ...FULL_SETTINGS, __defineGetter__: 1 },
      })
    ).toBe(false);
  });

  it('rejects an own __proto__ data property from JSON.parse without throwing', () => {
    const settings = JSON.parse('{"__proto__":{}}');
    expect(() => isReaderToHost({ type: 'rsvp:settings', settings })).not.toThrow();
    expect(isReaderToHost({ type: 'rsvp:settings', settings })).toBe(false);
  });

  it('rejects a settings object whose own keys are all inherited (empty own-property set)', () => {
    const inherited = Object.create(FULL_SETTINGS);
    expect(isReaderToHost({ type: 'rsvp:settings', settings: inherited })).toBe(false);
  });
});

describe('isHostToReader', () => {
  it('accepts rsvp:init with settings and position', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: { wpm: 400 }, position: 10 })
    ).toBe(true);
  });

  it('accepts rsvp:init with null settings and null position', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: null, position: null })
    ).toBe(true);
  });

  it('rejects rsvp:init with wrong field types', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: '1', settings: null, position: null })
    ).toBe(false);
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: 'nope', position: null })
    ).toBe(false);
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: null, position: 'nope' })
    ).toBe(false);
  });

  it('rejects rsvp:init whose settings has a wrongly-typed field', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: { wpm: 'fast' }, position: null })
    ).toBe(false);
  });

  it('rejects rsvp:init with a NaN position', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: null, position: NaN })
    ).toBe(false);
  });

  it('rejects rsvp:init with an unknown settings key', () => {
    expect(
      isHostToReader({ type: 'rsvp:init', protocol: 1, settings: { bogus: 1 }, position: null })
    ).toBe(false);
  });

  it('accepts rsvp:settings', () => {
    expect(isHostToReader({ type: 'rsvp:settings', settings: { wpm: 300 } })).toBe(true);
  });

  it('rejects rsvp:settings with a non-object settings field', () => {
    expect(isHostToReader({ type: 'rsvp:settings', settings: 3 })).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(isHostToReader({ type: 'rsvp:bogus' })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isHostToReader(null)).toBe(false);
    expect(isHostToReader(undefined)).toBe(false);
    expect(isHostToReader('rsvp:init')).toBe(false);
    expect(isHostToReader(7)).toBe(false);
    expect(isHostToReader([])).toBe(false);
  });

  it('rejects settings keys that collide with Object.prototype members, without throwing', () => {
    expect(() =>
      isHostToReader({ type: 'rsvp:settings', settings: { constructor: 1 } })
    ).not.toThrow();
    expect(isHostToReader({ type: 'rsvp:settings', settings: { constructor: 1 } })).toBe(false);
    expect(isHostToReader({ type: 'rsvp:settings', settings: { toString: 1 } })).toBe(false);
    expect(isHostToReader({ type: 'rsvp:settings', settings: { valueOf: 1 } })).toBe(false);
    expect(isHostToReader({ type: 'rsvp:settings', settings: { hasOwnProperty: 0 } })).toBe(false);
    expect(
      isHostToReader({ type: 'rsvp:settings', settings: { propertyIsEnumerable: 1 } })
    ).toBe(false);
    expect(isHostToReader({ type: 'rsvp:settings', settings: { __defineGetter__: 1 } })).toBe(
      false
    );
  });

  it('rejects an own __proto__ data property from JSON.parse without throwing', () => {
    const settings = JSON.parse('{"__proto__":{}}');
    expect(() => isHostToReader({ type: 'rsvp:settings', settings })).not.toThrow();
    expect(isHostToReader({ type: 'rsvp:settings', settings })).toBe(false);
  });
});
