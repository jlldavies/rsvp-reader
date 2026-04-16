/**
 * Calculate the Optimal Recognition Point (ORP) for a word.
 * The ORP is the character the eye naturally fixates on.
 * Aligning the ORP at a fixed position eliminates saccadic eye movement.
 */
export function calculateOrp(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

/**
 * For multi-word chunks, calculate ORP on the full display string.
 * The ORP is placed on the middle word's natural ORP position,
 * offset by the preceding characters.
 */
export function calculateChunkOrp(words: string[]): number {
  if (words.length === 1) return calculateOrp(words[0]);

  const middleIdx = Math.floor(words.length / 2);
  let offset = 0;
  for (let i = 0; i < middleIdx; i++) {
    offset += words[i].length + 1; // +1 for space
  }
  return offset + calculateOrp(words[middleIdx]);
}
