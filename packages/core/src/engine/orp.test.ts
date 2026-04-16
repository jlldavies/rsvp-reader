import { describe, it, expect } from 'vitest';
import { calculateOrp, calculateChunkOrp } from './orp.js';

describe('calculateOrp', () => {
  it('returns 0 for a single character word', () => {
    expect(calculateOrp('a')).toBe(0);
  });

  it('returns 1 for a 2-letter word', () => {
    expect(calculateOrp('go')).toBe(1);
  });

  it('returns 1 for a 5-letter word', () => {
    expect(calculateOrp('hello')).toBe(1);
  });

  it('returns 2 for a 6-letter word', () => {
    expect(calculateOrp('planet')).toBe(2);
  });

  it('returns 2 for a 9-letter word', () => {
    expect(calculateOrp('beautiful')).toBe(2);
  });

  it('returns 3 for a 10-letter word', () => {
    expect(calculateOrp('strawberry')).toBe(3);
  });

  it('returns 3 for a 13-letter word', () => {
    expect(calculateOrp('extraordinary')).toBe(3);
  });

  it('returns 4 for a 14-letter word', () => {
    expect(calculateOrp('extraordinarily')).toBe(4);
  });

  it('returns 4 for very long words', () => {
    expect(calculateOrp('incomprehensible')).toBe(4);
  });

  it('ORP index is always within bounds of word length', () => {
    const words = ['a', 'be', 'cat', 'word', 'hello', 'planet', 'beautiful', 'strawberry'];
    for (const word of words) {
      const orp = calculateOrp(word);
      expect(orp).toBeGreaterThanOrEqual(0);
      expect(orp).toBeLessThan(word.length);
    }
  });
});

describe('calculateChunkOrp', () => {
  it('returns single word ORP for one-word array', () => {
    expect(calculateChunkOrp(['hello'])).toBe(1);
  });

  it('returns ORP on middle word for two-word chunk', () => {
    // "the planet" — middle word is "planet" (index 1), offset by "the " (4 chars)
    // calculateOrp("planet") = 2, offset = 4
    expect(calculateChunkOrp(['the', 'planet'])).toBe(4 + 2);
  });

  it('returns ORP on middle word for three-word chunk', () => {
    // "the big cat" — middle is "big" (index 1), offset by "the " (4 chars)
    // calculateOrp("big") = 1, offset = 4
    expect(calculateChunkOrp(['the', 'big', 'cat'])).toBe(4 + 1);
  });

  it('ORP index is always within bounds of joined string', () => {
    const chunks = [
      ['hello', 'world'],
      ['the', 'quick', 'fox'],
      ['a', 'b', 'c'],
    ];
    for (const words of chunks) {
      const joined = words.join(' ');
      const orp = calculateChunkOrp(words);
      expect(orp).toBeGreaterThanOrEqual(0);
      expect(orp).toBeLessThan(joined.length);
    }
  });
});
