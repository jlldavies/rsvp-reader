import { marked } from 'marked';
import type { RsvpDocument } from '../models/document.js';
import type { RawSection } from '../engine/tokenizer.js';
import { tokenizeSections } from '../engine/tokenizer.js';
import { generateDocumentId } from './parser.js';

/**
 * Parse a Markdown document into an RsvpDocument.
 * Headings become section breaks.
 */
export async function parseMarkdown(
  markdown: string,
  uri = 'paste'
): Promise<RsvpDocument> {
  const tokens = marked.lexer(markdown);
  const rawSections: RawSection[] = [];
  let currentSection: RawSection = { heading: null, paragraphs: [] };

  for (const token of tokens) {
    if (token.type === 'heading') {
      // Start a new section if the current one has content
      if (currentSection.paragraphs.length > 0) {
        rawSections.push(currentSection);
      }
      currentSection = { heading: token.text, paragraphs: [] };
    } else if (token.type === 'paragraph' || token.type === 'text') {
      // Strip inline markdown formatting
      const text = stripInlineMarkdown(token.raw || token.text || '');
      if (text.trim()) {
        currentSection.paragraphs.push(text.trim());
      }
    } else if (token.type === 'list') {
      // Flatten list items into paragraph text
      const list = token as { items?: Array<{ text?: string }> };
      const items = list.items || [];
      for (const item of items) {
        const text = stripInlineMarkdown(item.text || '');
        if (text.trim()) {
          currentSection.paragraphs.push(text.trim());
        }
      }
    } else if (token.type === 'code') {
      // Include code blocks as text
      const codeToken = token as { text?: string };
      if (codeToken.text?.trim()) {
        currentSection.paragraphs.push(codeToken.text.trim());
      }
    } else if (token.type === 'blockquote') {
      const bq = token as { text?: string };
      const text = stripInlineMarkdown(bq.text || '');
      if (text.trim()) {
        currentSection.paragraphs.push(text.trim());
      }
    }
  }

  // Push the last section
  if (currentSection.paragraphs.length > 0) {
    rawSections.push(currentSection);
  }

  // If no content was found, create a minimal document
  if (rawSections.length === 0) {
    rawSections.push({ heading: null, paragraphs: ['(empty document)'] });
  }

  const sections = tokenizeSections(rawSections);
  const totalWords = sections.reduce((sum, s) => sum + s.tokens.length, 0);

  // Try to extract title from first heading
  const title =
    rawSections.find((s) => s.heading)?.heading || 'Untitled Document';

  return {
    id: generateDocumentId(markdown),
    title,
    source: { type: 'markdown', uri },
    sections,
    totalWords,
    createdAt: Date.now(),
  };
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/__(.+?)__/g, '$1')        // bold alt
    .replace(/_(.+?)_/g, '$1')          // italic alt
    .replace(/~~(.+?)~~/g, '$1')        // strikethrough
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .trim();
}
