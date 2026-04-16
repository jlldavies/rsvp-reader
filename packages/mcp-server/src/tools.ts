import { extname } from 'path';

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
 * Build the local reader URL for a given document id.
 */
export function buildReaderUrl(port: number, docId: string): string {
  return `http://localhost:${port}/?doc=${encodeURIComponent(docId)}`;
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
