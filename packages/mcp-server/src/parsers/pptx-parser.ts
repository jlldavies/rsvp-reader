import JSZip from 'jszip';
import { tokenizeSections, generateDocumentId } from '@rsvp-reader/core';
import type { RsvpDocument, Section } from '@rsvp-reader/core';
import type { RawSection } from '@rsvp-reader/core';

/**
 * Parse a PPTX buffer into an RsvpDocument.
 * Each slide becomes a section. Text is extracted from <a:t> elements in slide XML.
 */
export async function parsePptx(buffer: Buffer, uri: string): Promise<RsvpDocument> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error(`Failed to parse PPTX: ${uri}`);
  }

  // Find all slide files, sorted numerically
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error(`No slides found in PPTX: ${uri}`);
  }

  const rawSections: RawSection[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.files[slideFiles[i]].async('string');
    const text = extractTextFromSlideXml(slideXml);
    const paragraphs = text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length > 0) {
      rawSections.push({
        heading: `Slide ${i + 1}`,
        paragraphs,
      });
    }
  }

  if (rawSections.length === 0) {
    throw new Error(`No readable content found in PPTX: ${uri}`);
  }

  const sections: Section[] = tokenizeSections(rawSections);
  const totalWords = sections.reduce((sum, s) => sum + s.tokens.length, 0);
  const title = uri.replace(/\.pptx$/i, '').split('/').pop() || 'Presentation';

  const allText = rawSections.flatMap(s => s.paragraphs).join(' ');

  return {
    id: generateDocumentId(uri + allText.slice(0, 200)),
    title,
    source: { type: 'pptx', uri },
    sections,
    totalWords,
    createdAt: Date.now(),
  };
}

/**
 * Extract all text from a slide's XML by finding <a:t> elements.
 * Groups runs by paragraph (<a:p>) with newlines between paragraphs.
 */
function extractTextFromSlideXml(xml: string): string {
  const paragraphMatches = xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g);
  const paragraphs: string[] = [];

  for (const match of paragraphMatches) {
    const paragraphXml = match[1];
    const runs = [...paragraphXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map(m => m[1]);
    const text = runs.join('').trim();
    if (text) paragraphs.push(text);
  }

  return paragraphs.join('\n');
}
