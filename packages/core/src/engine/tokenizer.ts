import type { RsvpToken, Section } from '../models/document.js';
import { calculateOrp } from './orp.js';
import { calculateDisplayMs, hasPunctuation as checkPunctuation } from './timing.js';

const DEFAULT_WPM = 300;

export interface RawSection {
  heading: string | null;
  paragraphs: string[];
}

/**
 * Convert raw text sections into structured Sections with RsvpTokens.
 */
export function tokenizeSections(rawSections: RawSection[]): Section[] {
  let globalIndex = 0;

  return rawSections.map((raw, sectionIdx) => {
    const tokens: RsvpToken[] = [];

    raw.paragraphs.forEach((paragraph, paraIdx) => {
      const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
      const isLastParagraph = paraIdx === raw.paragraphs.length - 1;

      words.forEach((word, wordIdx) => {
        const isLastWord = wordIdx === words.length - 1;
        const isParagraphEnd = isLastWord;
        const isSectionEnd = isParagraphEnd && isLastParagraph;

        tokens.push({
          index: globalIndex++,
          text: word,
          orpIndex: calculateOrp(word),
          displayMs: calculateDisplayMs(word, DEFAULT_WPM),
          isParagraphEnd,
          isSectionEnd,
          hasPunctuation: checkPunctuation(word),
        });
      });
    });

    return {
      index: sectionIdx,
      heading: raw.heading,
      tokens,
    };
  });
}

/**
 * Convert plain text into sections. Splits on double newlines for paragraphs.
 */
export function tokenizePlainText(text: string): Section[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);

  return tokenizeSections([{ heading: null, paragraphs }]);
}
