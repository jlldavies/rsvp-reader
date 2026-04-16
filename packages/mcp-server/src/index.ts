import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { parseText, parseMarkdown } from '@rsvp-reader/core';
import { parseSpeedReadInput, validateWpm, validateChunkSize } from './tools.js';
import { storeDocument } from './doc-store.js';
import { ensureServerRunning } from './web-server.js';
import { buildReaderUrl } from './tools.js';
import { generateArtifact } from './artifact-template.js';
import open from 'open';
import { parsePdf } from './parsers/pdf-parser.js';
import { parseDocx } from './parsers/docx-parser.js';
import { parsePptx } from './parsers/pptx-parser.js';
import { parseUrl } from './parsers/url-parser.js';

const server = new McpServer({
  name: 'rsvp-reader',
  version: '1.0.0',
});

// ─── speed_read tool ──────────────────────────────────────────────────────────
server.tool(
  'speed_read',
  'Speed-read a URL, file path, or raw text using RSVP (one word at a time). Opens a browser window with the reader.',
  {
    text: z.string().optional().describe('Raw text to speed-read'),
    url: z.string().optional().describe('URL of a webpage to fetch and speed-read'),
    file: z.string().optional().describe('Absolute path to a PDF, DOCX, PPTX, Markdown, or text file'),
    wpm: z.number().optional().describe('Words per minute (50–1500, default 300)'),
    chunk_size: z.number().optional().describe('Words per flash: 1, 2, or 3 (default 1)'),
  },
  async ({ text, url, file, wpm, chunk_size }) => {
    const input = parseSpeedReadInput({ text, url, file });
    const resolvedWpm = validateWpm(wpm);
    const resolvedChunkSize = validateChunkSize(chunk_size);

    // Start the web server in parallel with parsing so it's ready when we need it
    const serverPromise = ensureServerRunning();

    let doc;

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

    const port = await serverPromise;
    storeDocument(doc, resolvedWpm, resolvedChunkSize);
    const readerUrl = buildReaderUrl(port, doc.id);

    // Open browser
    await open(readerUrl);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Opening RSVP reader for "${doc.title}" (${doc.totalWords} words) at ${resolvedWpm} WPM.\n\nURL: ${readerUrl}`,
        },
      ],
    };
  }
);

// ─── speed_read_settings tool ─────────────────────────────────────────────────
server.tool(
  'speed_read_settings',
  'Configure default settings for the RSVP reader (WPM, chunk size).',
  {
    wpm: z.number().optional().describe('Default words per minute (50–1500)'),
    chunk_size: z.number().optional().describe('Default words per flash: 1, 2, or 3'),
  },
  async ({ wpm, chunk_size }) => {
    const resolvedWpm = validateWpm(wpm);
    const resolvedChunkSize = validateChunkSize(chunk_size);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Settings updated: ${resolvedWpm} WPM, ${resolvedChunkSize} word${resolvedChunkSize > 1 ? 's' : ''} per flash.`,
        },
      ],
    };
  }
);

// ─── speed_read_clipboard tool ────────────────────────────────────────────────
server.tool(
  'speed_read_clipboard',
  'Speed-read the text provided (e.g. from clipboard). Alias for speed_read with text input.',
  {
    text: z.string().describe('Text content to speed-read'),
    wpm: z.number().optional().describe('Words per minute (50–1500, default 300)'),
  },
  async ({ text, wpm }) => {
    const resolvedWpm = validateWpm(wpm);
    const serverPromise = ensureServerRunning();
    const doc = await parseText(text.trim(), 'mcp://clipboard');

    const port = await serverPromise;
    storeDocument(doc, resolvedWpm, 1);
    const readerUrl = buildReaderUrl(port, doc.id);

    await open(readerUrl);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Opening RSVP reader for clipboard text (${doc.totalWords} words) at ${resolvedWpm} WPM.\n\nURL: ${readerUrl}`,
        },
      ],
    };
  }
);

// ─── speed_read_artifact tool ─────────────────────────────────────────────────
server.tool(
  'speed_read_artifact',
  [
    'Generate a self-contained RSVP speed-reader as an inline HTML artifact.',
    'Works with raw text, Markdown files, or any text the user has in the conversation.',
    'Returns a complete single-file HTML page — no server or internet required.',
    'IMPORTANT: present the returned HTML directly as a rendered HTML artifact so the',
    'user can read it inline without leaving the chat.',
  ].join(' '),
  {
    text: z.string().optional().describe('Raw text or Markdown to speed-read'),
    file: z.string().optional().describe('Absolute path to a Markdown or text file'),
    wpm: z.number().optional().describe('Words per minute (50–1000, default 300)'),
  },
  async ({ text, file, wpm }) => {
    const resolvedWpm = Math.max(50, Math.min(1000, wpm ?? 300));

    let doc;
    if (file) {
      const raw = (await readFile(file)).toString('utf-8');
      const isMarkdown = /\.(md|markdown)$/i.test(file);
      doc = isMarkdown ? await parseMarkdown(raw, file) : await parseText(raw, file);
    } else if (text) {
      // Auto-detect markdown by checking for heading/bold/list syntax
      const looksLikeMarkdown = /^#{1,6} |^\*\*|^\- |\[.+\]\(/m.test(text);
      doc = looksLikeMarkdown
        ? await parseMarkdown(text, 'mcp://text')
        : await parseText(text, 'mcp://text');
    } else {
      throw new Error('Provide either text or a file path.');
    }

    // Convert to the minimal artifact section format
    const sections = doc.sections.map((s) => ({
      heading: s.heading,
      tokens: s.tokens.map((t) => ({
        text: t.text,
        orpIndex: t.orpIndex,
        displayMs: t.displayMs,
        isParagraphEnd: t.isParagraphEnd,
        isSectionEnd: t.isSectionEnd,
      })),
    }));

    const html = generateArtifact(sections, doc.title, resolvedWpm);

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `RSVP reader ready — "${doc.title}" (${doc.totalWords} words, ~${Math.ceil(doc.totalWords / resolvedWpm)} min at ${resolvedWpm} WPM).`,
            '',
            'Render the following as an HTML artifact:',
            '',
            html,
          ].join('\n'),
        },
      ],
    };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
