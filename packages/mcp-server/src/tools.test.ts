import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseSpeedReadInput,
  buildReaderUrl,
  validateWpm,
  validateChunkSize,
} from './tools';

describe('parseSpeedReadInput — text input', () => {
  it('accepts plain text via text field', () => {
    const result = parseSpeedReadInput({ text: 'Hello world. This is a test.' });
    expect(result.type).toBe('text');
    expect(result.content).toBe('Hello world. This is a test.');
  });

  it('trims whitespace from text input', () => {
    const result = parseSpeedReadInput({ text: '  Hello world.  ' });
    expect(result.content).toBe('Hello world.');
  });
});

describe('parseSpeedReadInput — URL input', () => {
  it('accepts a URL via url field', () => {
    const result = parseSpeedReadInput({ url: 'https://example.com/article' });
    expect(result.type).toBe('url');
    expect(result.content).toBe('https://example.com/article');
  });

  it('rejects invalid URLs', () => {
    expect(() => parseSpeedReadInput({ url: 'not-a-url' })).toThrow();
  });

  it('accepts http:// URLs', () => {
    const result = parseSpeedReadInput({ url: 'http://example.com' });
    expect(result.type).toBe('url');
  });
});

describe('parseSpeedReadInput — file input', () => {
  it('accepts a file path via file field', () => {
    const result = parseSpeedReadInput({ file: '/tmp/document.pdf' });
    expect(result.type).toBe('file');
    expect(result.content).toBe('/tmp/document.pdf');
  });

  it('determines format from file extension', () => {
    expect(parseSpeedReadInput({ file: '/tmp/doc.pdf' }).format).toBe('pdf');
    expect(parseSpeedReadInput({ file: '/tmp/doc.docx' }).format).toBe('docx');
    expect(parseSpeedReadInput({ file: '/tmp/doc.pptx' }).format).toBe('pptx');
    expect(parseSpeedReadInput({ file: '/tmp/doc.md' }).format).toBe('md');
    expect(parseSpeedReadInput({ file: '/tmp/doc.txt' }).format).toBe('txt');
  });
});

describe('parseSpeedReadInput — validation', () => {
  it('throws when neither text, url, nor file is provided', () => {
    expect(() => parseSpeedReadInput({})).toThrow(/text, url, or file/i);
  });

  it('throws when text is empty string', () => {
    expect(() => parseSpeedReadInput({ text: '' })).toThrow();
  });

  it('throws when text is only whitespace', () => {
    expect(() => parseSpeedReadInput({ text: '   ' })).toThrow();
  });
});

describe('buildReaderUrl', () => {
  it('includes the document id as a query parameter', () => {
    const url = buildReaderUrl(3000, 'doc-abc-123');
    expect(url).toContain('doc-abc-123');
  });

  it('uses the given port', () => {
    const url = buildReaderUrl(4567, 'doc-xyz');
    expect(url).toContain('4567');
  });

  it('points to localhost', () => {
    const url = buildReaderUrl(3000, 'doc-abc');
    expect(url).toContain('localhost');
  });
});

describe('validateWpm', () => {
  it('accepts valid WPM values (50–1500)', () => {
    expect(validateWpm(300)).toBe(300);
    expect(validateWpm(50)).toBe(50);
    expect(validateWpm(1500)).toBe(1500);
  });

  it('clamps WPM below 50 to 50', () => {
    expect(validateWpm(10)).toBe(50);
  });

  it('clamps WPM above 1500 to 1500', () => {
    expect(validateWpm(9999)).toBe(1500);
  });

  it('uses 300 as default when undefined', () => {
    expect(validateWpm(undefined)).toBe(300);
  });
});

describe('validateChunkSize', () => {
  it('accepts valid chunk sizes 1, 2, 3', () => {
    expect(validateChunkSize(1)).toBe(1);
    expect(validateChunkSize(2)).toBe(2);
    expect(validateChunkSize(3)).toBe(3);
  });

  it('uses 1 as default when undefined', () => {
    expect(validateChunkSize(undefined)).toBe(1);
  });

  it('throws for invalid chunk size', () => {
    expect(() => validateChunkSize(5)).toThrow();
  });
});
