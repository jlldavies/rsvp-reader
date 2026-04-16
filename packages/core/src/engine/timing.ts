/**
 * Calculate display duration for a word based on WPM and word characteristics.
 */
export function calculateDisplayMs(word: string, wpm: number): number {
  const baseMs = 60000 / wpm;
  let multiplier = 1.0;

  // Punctuation pauses
  const lastChar = word[word.length - 1];
  if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
    multiplier *= 1.5;
  } else if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
    multiplier *= 2.0;
  }

  // Long word pauses
  if (word.length > 12) {
    multiplier *= 1.4;
  } else if (word.length > 8) {
    multiplier *= 1.2;
  }

  return Math.round(baseMs * multiplier);
}

/**
 * Calculate pause duration at paragraph boundaries.
 */
export function paragraphPauseMs(wpm: number): number {
  return Math.round((60000 / wpm) * 2.5);
}

/**
 * Calculate pause duration at section boundaries (timed mode).
 */
export function sectionPauseMs(wpm: number): number {
  return Math.round((60000 / wpm) * 3.0);
}

/**
 * Check if a word ends with sentence-ending punctuation.
 */
export function hasPunctuation(word: string): boolean {
  const last = word[word.length - 1];
  return ['.', ',', ';', ':', '!', '?', '"', "'", ')', ']'].includes(last);
}
