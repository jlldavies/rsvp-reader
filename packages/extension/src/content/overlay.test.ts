import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOverlay, destroyOverlay, isOverlayOpen } from './overlay';

beforeEach(() => {
  // Ensure clean DOM state
  destroyOverlay();
});

afterEach(() => {
  destroyOverlay();
});

describe('createOverlay', () => {
  it('inserts a shadow host element into the document body', () => {
    createOverlay(document);
    const host = document.getElementById('rsvp-overlay-host');
    expect(host).not.toBeNull();
  });

  it('isOverlayOpen returns true after createOverlay', () => {
    createOverlay(document);
    expect(isOverlayOpen()).toBe(true);
  });

  it('isOverlayOpen returns false before any overlay is created', () => {
    expect(isOverlayOpen()).toBe(false);
  });

  it('calling createOverlay twice does not duplicate the host', () => {
    createOverlay(document);
    createOverlay(document);
    const hosts = document.querySelectorAll('#rsvp-overlay-host');
    expect(hosts.length).toBe(1);
  });
});

describe('destroyOverlay', () => {
  it('removes the overlay host from the DOM', () => {
    createOverlay(document);
    destroyOverlay();
    expect(document.getElementById('rsvp-overlay-host')).toBeNull();
  });

  it('isOverlayOpen returns false after destroyOverlay', () => {
    createOverlay(document);
    destroyOverlay();
    expect(isOverlayOpen()).toBe(false);
  });

  it('destroyOverlay is safe to call when no overlay exists', () => {
    expect(() => destroyOverlay()).not.toThrow();
  });
});

describe('Escape key dismissal', () => {
  it('destroys the overlay when Escape is pressed', () => {
    createOverlay(document);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isOverlayOpen()).toBe(false);
  });

  it('does not throw when Escape is pressed with no overlay open', () => {
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }).not.toThrow();
  });

  it('non-Escape keys do not close the overlay', () => {
    createOverlay(document);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isOverlayOpen()).toBe(true);
  });

  it('removes the Escape listener after overlay is destroyed', () => {
    createOverlay(document);
    destroyOverlay();
    // No error expected; the listener should be removed
    expect(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }).not.toThrow();
  });
});

describe('message handler', () => {
  it('createOverlay returns a cleanup function', () => {
    const cleanup = createOverlay(document);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
