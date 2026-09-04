import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storeDoc, getDoc, configureDocStore } from './doc-store.js';

describe('doc-store', () => {
  afterEach(() => {
    // Restore the module's built-in defaults (5 min TTL, read-once) so tests
    // don't leak configuration into each other.
    configureDocStore({ docTtlMs: 5 * 60 * 1000, docReadOnce: true });
    vi.useRealTimers();
  });

  it('deletes the entry on read when docReadOnce is true (today\'s default)', () => {
    configureDocStore({ docTtlMs: 5 * 60 * 1000, docReadOnce: true });
    storeDoc('a', { id: 'a' }, 300, 1);

    expect(getDoc('a')).toBeDefined();
    expect(getDoc('a')).toBeUndefined();
  });

  it('keeps the entry available across repeated reads when docReadOnce is false', () => {
    configureDocStore({ docTtlMs: 5 * 60 * 1000, docReadOnce: false });
    storeDoc('b', { id: 'b' }, 300, 1);

    expect(getDoc('b')).toBeDefined();
    expect(getDoc('b')).toBeDefined();
    expect(getDoc('b')?.doc).toEqual({ id: 'b' });
  });

  it('expires an entry once its configured TTL has elapsed', () => {
    vi.useFakeTimers();
    configureDocStore({ docTtlMs: 1000, docReadOnce: false });
    storeDoc('c', { id: 'c' }, 300, 1);

    vi.advanceTimersByTime(999);
    expect(getDoc('c')).toBeDefined();

    vi.advanceTimersByTime(2);
    expect(getDoc('c')).toBeUndefined();
  });

  it('honours a longer configured TTL (e.g. managed mode default of 1 hour)', () => {
    vi.useFakeTimers();
    configureDocStore({ docTtlMs: 60 * 60 * 1000, docReadOnce: false });
    storeDoc('d', { id: 'd' }, 300, 1);

    vi.advanceTimersByTime(59 * 60 * 1000);
    expect(getDoc('d')).toBeDefined();

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(getDoc('d')).toBeUndefined();
  });
});
