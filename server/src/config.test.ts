import { describe, it, expect } from 'vitest';
import { readServerConfig } from './config.js';

describe('readServerConfig', () => {
  it('defaults to standalone mode with a 5 minute, read-once doc store, no PORT/frame-ancestors', () => {
    const cfg = readServerConfig({});
    expect(cfg.port).toBe(3847);
    expect(cfg.mode).toBe('standalone');
    expect(cfg.docReadOnce).toBe(true);
    expect(cfg.docTtlMs).toBe(5 * 60 * 1000);
    expect(cfg.frameAncestors).toEqual([]);
  });

  it('switches to managed mode on RSVP_MODE=managed with different defaults', () => {
    const cfg = readServerConfig({ RSVP_MODE: 'managed' });
    expect(cfg.mode).toBe('managed');
    expect(cfg.docReadOnce).toBe(false);
    expect(cfg.docTtlMs).toBe(60 * 60 * 1000);
  });

  it('treats any RSVP_MODE value other than "managed" as standalone', () => {
    const cfg = readServerConfig({ RSVP_MODE: 'bogus' });
    expect(cfg.mode).toBe('standalone');
  });

  it('reads PORT from env', () => {
    const cfg = readServerConfig({ PORT: '4000' });
    expect(cfg.port).toBe(4000);
  });

  it('RSVP_DOC_TTL_MS overrides the TTL default in standalone mode', () => {
    const cfg = readServerConfig({ RSVP_DOC_TTL_MS: '1234' });
    expect(cfg.docTtlMs).toBe(1234);
  });

  it('RSVP_DOC_TTL_MS overrides the TTL default in managed mode', () => {
    const cfg = readServerConfig({ RSVP_MODE: 'managed', RSVP_DOC_TTL_MS: '9999' });
    expect(cfg.docTtlMs).toBe(9999);
  });

  it.each([
    ['1', true],
    ['true', true],
    ['0', false],
    ['false', false],
  ])('RSVP_DOC_READ_ONCE=%s overrides to %s in standalone mode', (raw, expected) => {
    const cfg = readServerConfig({ RSVP_DOC_READ_ONCE: raw });
    expect(cfg.docReadOnce).toBe(expected);
  });

  it.each([
    ['1', true],
    ['true', true],
    ['0', false],
    ['false', false],
  ])('RSVP_DOC_READ_ONCE=%s overrides to %s in managed mode', (raw, expected) => {
    const cfg = readServerConfig({ RSVP_MODE: 'managed', RSVP_DOC_READ_ONCE: raw });
    expect(cfg.docReadOnce).toBe(expected);
  });

  it('parses RSVP_FRAME_ANCESTORS as a trimmed, comma-separated list, dropping empties', () => {
    const cfg = readServerConfig({
      RSVP_FRAME_ANCESTORS: ' http://localhost:5173 ,https://dashboard.example.com,,',
    });
    expect(cfg.frameAncestors).toEqual(['http://localhost:5173', 'https://dashboard.example.com']);
  });

  it('leaves frameAncestors empty when RSVP_FRAME_ANCESTORS is unset or blank', () => {
    expect(readServerConfig({}).frameAncestors).toEqual([]);
    expect(readServerConfig({ RSVP_FRAME_ANCESTORS: '' }).frameAncestors).toEqual([]);
  });
});
