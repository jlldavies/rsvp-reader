import type { RsvpToken, Section } from '../models/document.js';
import { calculateChunkOrp } from './orp.js';

/**
 * Re-chunk a section's tokens into groups of 1, 2, or 3 words.
 * Chunks never span paragraph or section boundaries.
 */
export function chunkTokens(
  sections: Section[],
  chunkSize: 1 | 2 | 3
): Section[] {
  if (chunkSize === 1) return sections;

  return sections.map((section) => ({
    ...section,
    tokens: chunkSectionTokens(section.tokens, chunkSize),
  }));
}

function chunkSectionTokens(tokens: RsvpToken[], chunkSize: 2 | 3): RsvpToken[] {
  const chunked: RsvpToken[] = [];
  let i = 0;
  let globalIndex = 0;

  while (i < tokens.length) {
    const group: RsvpToken[] = [tokens[i]];
    let j = 1;

    // Collect up to chunkSize tokens, but stop at paragraph/section boundaries
    while (j < chunkSize && i + j < tokens.length) {
      if (tokens[i + j - 1].isParagraphEnd || tokens[i + j - 1].isSectionEnd) {
        break;
      }
      group.push(tokens[i + j]);
      j++;
    }

    const words = group.map((t) => t.text);
    const totalDisplayMs = group.reduce((sum, t) => sum + t.displayMs, 0);
    const lastToken = group[group.length - 1];

    chunked.push({
      index: globalIndex++,
      text: words.join(' '),
      orpIndex: calculateChunkOrp(words),
      displayMs: totalDisplayMs,
      isParagraphEnd: lastToken.isParagraphEnd,
      isSectionEnd: lastToken.isSectionEnd,
      hasPunctuation: lastToken.hasPunctuation,
    });

    i += j;
  }

  return chunked;
}
