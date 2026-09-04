import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  parseSpeedReadInput,
  buildReaderUrl,
  validateWpm,
  validateChunkSize,
  parseToDocument,
  sourceRefFor,
} from './tools';
import { generateArtifact, type ArtifactSection } from './artifact-template';

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

describe('parseToDocument', () => {
  it('parses text input into an RsvpDocument', async () => {
    const doc = await parseToDocument({ type: 'text', content: 'Hello world. This is a test.' });
    expect(doc.totalWords).toBeGreaterThan(0);
    expect(doc.source.type).toBe('text');
  });

  describe('file input', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'rsvp-tools-test-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('parses a .txt file', async () => {
      const filePath = join(dir, 'sample.txt');
      writeFileSync(filePath, 'Plain text content for the reader to parse.');

      const doc = await parseToDocument({ type: 'file', content: filePath, format: 'txt' });

      expect(doc.totalWords).toBeGreaterThan(0);
      expect(doc.source.type).toBe('text');
    });

    it('parses a .md file', async () => {
      const filePath = join(dir, 'sample.md');
      writeFileSync(filePath, '# Heading\n\nSome **markdown** body text.');

      const doc = await parseToDocument({ type: 'file', content: filePath, format: 'md' });

      expect(doc.totalWords).toBeGreaterThan(0);
      expect(doc.source.type).toBe('markdown');
    });
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

  it('points to the IPv4 loopback (not "localhost", which is IPv6 ::1 on Windows)', () => {
    const url = buildReaderUrl(3000, 'doc-abc');
    expect(url).toContain('127.0.0.1');
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

// ─── Artifact parity with the web app ────────────────────────────────────────
// The artifact embeds a self-contained vanilla-JS rewrite of RsvpDisplay +
// RsvpEngine.buildTokenContext. These tests verify that the generated HTML
// includes the same features as the web app so behavior stays in sync.

function makeArtifact(): string {
  const sections: ArtifactSection[] = [
    {
      heading: null,
      tokens: [
        { text: 'one', orpIndex: 1, displayMs: 200, isParagraphEnd: false, isSectionEnd: false },
        { text: 'two', orpIndex: 1, displayMs: 200, isParagraphEnd: false, isSectionEnd: false },
        { text: 'three.', orpIndex: 1, displayMs: 200, isParagraphEnd: false, isSectionEnd: true },
      ],
    },
  ];
  return generateArtifact(sections, 'Test Doc', 300);
}

describe('generateArtifact — contains shared web defaults', () => {
  it('uses the same default phantom color as web', () => {
    expect(makeArtifact()).toContain('#bbbbbb');
  });

  it('uses the same default bracket color as web', () => {
    expect(makeArtifact()).toContain('#888888');
  });

  it('uses the same default ORP color as web', () => {
    expect(makeArtifact()).toContain('#ff2c2c');
  });

  it('uses the same default light background as web', () => {
    expect(makeArtifact()).toContain('#fafafa');
  });

  it('uses the same default font family as web', () => {
    expect(makeArtifact()).toContain('IBM Plex Mono');
  });

  it('embeds the document title', () => {
    expect(makeArtifact()).toContain('Test Doc');
  });

  it('embeds the initial WPM', () => {
    const html = generateArtifact([{ heading: null, tokens: [] }], 'x', 425);
    expect(html).toContain('425');
  });
});

describe('generateArtifact — feature parity with web RsvpDisplay', () => {
  it('renders focus brackets by default', () => {
    const html = makeArtifact();
    expect(html).toContain('SHOW_BRACKETS = true');
    expect(html).toContain("'<span class=\"bracket\">[</span>'");
    expect(html).toContain("'<span class=\"bracket\">]</span>'");
  });

  it('renders phantom (context) words by default', () => {
    expect(makeArtifact()).toContain('SHOW_PHANTOM = true');
  });

  it('uses non-breaking space at flex-cell boundaries', () => {
    const html = makeArtifact();
    // A &nbsp; span is used between phantom and current word
    expect(html).toContain('&nbsp;');
    expect(html).toContain("var sep = '<span>&nbsp;</span>'");
  });

  it('uses the center-anchored side-zone layout for multi-word', () => {
    const html = makeArtifact();
    expect(html).toContain('mw-side-left');
    expect(html).toContain('mw-side-right');
    expect(html).toContain('mw-center');
  });

  it('uses prefix:1 / orp:1ch / suffix:2 ratio for single-word', () => {
    const html = makeArtifact();
    expect(html).toContain('zone-left');
    expect(html).toContain('zone-orp');
    expect(html).toContain('zone-right');
    expect(html).toMatch(/\.zone-left\{[^}]*flex:1/);
    expect(html).toMatch(/\.zone-right\{[^}]*flex:2/);
  });

  it('uses overflow:hidden + flex-shrink:0 inner pattern for clipping', () => {
    const html = makeArtifact();
    expect(html).toMatch(/overflow:hidden/);
    expect(html).toContain('flex-shrink:0');
  });
});

describe('generateArtifact — phantom context matches engine', () => {
  it('gathers multiple before/after tokens with sentence bounds', () => {
    const html = makeArtifact();
    // Engine and artifact share this algorithm: multi-token gather, sentence-bounded
    expect(html).toContain('phantomContext');
    expect(html).toContain('MAX_LOOKAHEAD');
    expect(html).toContain('beforeParts.unshift');
    expect(html).toContain('afterParts.push');
    expect(html).toContain('isSentEnd');
  });

  it('respects the sentence boundary in both directions', () => {
    const html = makeArtifact();
    // Backward walk breaks on isSentEnd
    expect(html).toMatch(/for\s*\(var b=i-1;[^)]*\)\s*\{\s*var tb = tokens\[b\];\s*if\s*\(isSentEnd\(tb\)\)\s*break/);
    // Forward walk includes the sentence-ending token then breaks
    expect(html).toMatch(/afterParts\.push\(ta\.text\);\s*if\s*\(isSentEnd\(ta\)\)\s*break/);
  });
});

describe('sourceRefFor', () => {
  it('never puts the pasted body into the ref — a stable URI stands in for it', () => {
    expect(sourceRefFor({ type: 'text', content: 'the whole document body' })).toBe('mcp://text');
  });

  it('passes a URL or a file path through as the ref', () => {
    expect(sourceRefFor({ type: 'url', content: 'https://example.com/a' })).toBe('https://example.com/a');
    expect(sourceRefFor({ type: 'file', content: 'C:\docs\brief.md', format: 'md' })).toBe('C:\docs\brief.md');
  });
});
