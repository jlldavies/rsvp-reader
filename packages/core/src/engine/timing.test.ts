import { describe, it, expect } from 'vitest';
import { calculateDisplayMs, paragraphPauseMs, sectionPauseMs, hasPunctuation } from './timing.js';

describe('calculateDisplayMs', () => {
  it('returns base interval for a plain word at 300 WPM', () => {
    // 60000 / 300 = 200ms base
    expect(calculateDisplayMs('hello', 300)).toBe(200);
  });

  it('scales correctly at 600 WPM', () => {
    // 60000 / 600 = 100ms base
    expect(calculateDisplayMs('hello', 600)).toBe(100);
  });

  it('applies 1.5x multiplier for words ending with comma', () => {
    expect(calculateDisplayMs('hello,', 300)).toBe(Math.round(200 * 1.5));
  });

  it('applies 1.5x multiplier for words ending with semicolon', () => {
    expect(calculateDisplayMs('wait;', 300)).toBe(Math.round(200 * 1.5));
  });

  it('applies 1.5x multiplier for words ending with colon', () => {
    expect(calculateDisplayMs('note:', 300)).toBe(Math.round(200 * 1.5));
  });

  it('applies 2x multiplier for words ending with period', () => {
    expect(calculateDisplayMs('end.', 300)).toBe(Math.round(200 * 2.0));
  });

  it('applies 2x multiplier for words ending with exclamation', () => {
    expect(calculateDisplayMs('stop!', 300)).toBe(Math.round(200 * 2.0));
  });

  it('applies 2x multiplier for words ending with question mark', () => {
    expect(calculateDisplayMs('really?', 300)).toBe(Math.round(200 * 2.0));
  });

  it('applies 1.2x multiplier for 9-letter words', () => {
    // "beautiful" is 9 letters — triggers >8 rule
    expect(calculateDisplayMs('beautiful', 300)).toBe(Math.round(200 * 1.2));
  });

  it('applies 1.4x multiplier for 13-letter words', () => {
    // "extraordinary" is 13 letters — triggers >12 rule
    expect(calculateDisplayMs('extraordinary', 300)).toBe(Math.round(200 * 1.4));
  });

  it('combines long word and punctuation multipliers', () => {
    // 13-letter word ending in period: 1.4 * 2.0
    expect(calculateDisplayMs('extraordinary.', 300)).toBe(Math.round(200 * 1.4 * 2.0));
  });

  it('never returns zero', () => {
    expect(calculateDisplayMs('a', 1000)).toBeGreaterThan(0);
  });
});

describe('paragraphPauseMs', () => {
  it('is 2.5x the base interval at 300 WPM', () => {
    expect(paragraphPauseMs(300)).toBe(Math.round(200 * 2.5));
  });

  it('is longer than a plain word at the same WPM', () => {
    expect(paragraphPauseMs(300)).toBeGreaterThan(calculateDisplayMs('word', 300));
  });
});

describe('sectionPauseMs', () => {
  it('is 3x the base interval at 300 WPM', () => {
    expect(sectionPauseMs(300)).toBe(Math.round(200 * 3.0));
  });

  it('is longer than paragraph pause at the same WPM', () => {
    expect(sectionPauseMs(300)).toBeGreaterThan(paragraphPauseMs(300));
  });
});

describe('hasPunctuation', () => {
  it('returns true for words ending with period', () => {
    expect(hasPunctuation('end.')).toBe(true);
  });

  it('returns true for words ending with comma', () => {
    expect(hasPunctuation('word,')).toBe(true);
  });

  it('returns true for words ending with closing paren', () => {
    expect(hasPunctuation('text)')).toBe(true);
  });

  it('returns false for plain words', () => {
    expect(hasPunctuation('hello')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasPunctuation('')).toBe(false);
  });
});
