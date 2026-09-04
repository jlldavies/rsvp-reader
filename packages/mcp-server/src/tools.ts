import { extname } from 'path';
import { readFile } from 'fs/promises';
import type { RsvpDocument } from '@rsvp-reader/core';
import { parseText, parseMarkdown } from '@rsvp-reader/core';
import { parsePdf } from './parsers/pdf-parser.js';
import { parseDocx } from './parsers/docx-parser.js';
import { parsePptx } from './parsers/pptx-parser.js';
import { parseUrl } from './parsers/url-parser.js';

export type InputType = 'text' | 'url' | 'file';
export type FileFormat = 'pdf' | 'docx' | 'pptx' | 'md' | 'txt';

export interface ParsedInput {
  type: InputType;
  content: string;
  format?: FileFormat;
}

const FORMAT_MAP: Record<string, FileFormat> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.md': 'md',
  '.markdown': 'md',
  '.txt': 'txt',
};

/**
 * Validate and parse the raw input object from an MCP tool call.
 */
export function parseSpeedReadInput(input: Record<string, unknown>): ParsedInput {
  if (typeof input.text === 'string') {
    const trimmed = input.text.trim();
    if (!trimmed) throw new Error('text input cannot be empty');
    return { type: 'text', content: trimmed };
  }

  if (typeof input.url === 'string') {
    // Validate URL
    try {
      const parsed = new URL(input.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL must use http or https');
      }
    } catch {
      throw new Error(`Invalid URL: ${input.url}`);
    }
    return { type: 'url', content: input.url };
  }

  if (typeof input.file === 'string') {
    const ext = extname(input.file).toLowerCase();
    const format = FORMAT_MAP[ext] ?? 'txt';
    return { type: 'file', content: input.file, format };
  }

  throw new Error('Must provide text, url, or file');
}

/**
 * Parse a ParsedInput (text | url | file) into an RsvpDocument.
 *
 * Moved out of index.ts's speed_read handler so it can be shared by any tool
 * that needs to produce a document (e.g. the deliver-to path).
 */
export async function parseToDocument(input: ParsedInput): Promise<RsvpDocument> {
  let doc: RsvpDocument | undefined;

  if (input.type === 'text') {
    doc = await parseText(input.content, 'mcp://text');
  } else if (input.type === 'url') {
    const res = await fetch(input.content, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSVP-Reader/1.0)' },
    });
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status} ${input.content}`);
    const html = await res.text();
    doc = await parseUrl(html, input.content);
  } else {
    // File: read and parse based on format
    const buffer = await readFile(input.content);
    const fmt = input.format;
    if (fmt === 'md') {
      doc = await parseMarkdown(buffer.toString('utf-8'), input.content);
    } else if (fmt === 'txt') {
      doc = await parseText(buffer.toString('utf-8'), input.content);
    } else if (fmt === 'pdf') {
      doc = await parsePdf(buffer, input.content);
    } else if (fmt === 'docx') {
      doc = await parseDocx(buffer, input.content);
    } else if (fmt === 'pptx') {
      doc = await parsePptx(buffer, input.content);
    } else {
      throw new Error(`Unsupported file format: ${fmt}`);
    }
  }

  if (!doc) throw new Error('Failed to parse document');
  return doc;
}

/**
 * Build the local reader URL for a given document id.
 *
 * Use 127.0.0.1 (not "localhost") so it matches the IPv4 address the web server
 * binds to. On Windows, "localhost" resolves to IPv6 ::1 first, which the server
 * isn't listening on, so the opened browser tab would get connection-refused.
 */
/**
 * The `source.ref` a delivered document carries: a stable URI for pasted text
 * (never the text itself — the body already travels in `doc`), the URL or the
 * absolute file path otherwise.
 */
export function sourceRefFor(input: ParsedInput): string {
  return input.type === 'text' ? 'mcp://text' : input.content;
}

export function buildReaderUrl(port: number, docId: string): string {
  return `http://127.0.0.1:${port}/?doc=${encodeURIComponent(docId)}`;
}

/**
 * Clamp and validate WPM, returning the default if undefined.
 */
export function validateWpm(wpm: number | undefined): number {
  if (wpm === undefined) return 300;
  return Math.min(1500, Math.max(50, wpm));
}

/**
 * Validate chunk size (1 | 2 | 3), returning the default if undefined.
 */
export function validateChunkSize(chunkSize: number | undefined): 1 | 2 | 3 {
  if (chunkSize === undefined) return 1;
  if (chunkSize !== 1 && chunkSize !== 2 && chunkSize !== 3) {
    throw new Error(`chunkSize must be 1, 2, or 3 (got ${chunkSize})`);
  }
  return chunkSize;
}
