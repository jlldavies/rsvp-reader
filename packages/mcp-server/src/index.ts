import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { parseText, parseMarkdown } from '@rsvp-reader/core';
import { parseSpeedReadInput, validateWpm, validateChunkSize } from './tools.js';
import { storeDocument } from './doc-store.js';
import { ensureServerRunning } from './web-server.js';
import { buildReaderUrl } from './tools.js';
import open from 'open';

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

    let doc;

    if (input.type === 'text') {
      doc = await parseText(input.content, 'mcp://text');
    } else if (input.type === 'url') {
      // Fetch URL via the backend server
      const serverPort = await ensureServerRunning();
      const fetchRes = await fetch(`http://localhost:${serverPort}/api/parse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: input.content }),
      });
      if (!fetchRes.ok) throw new Error(`Failed to fetch URL: ${fetchRes.status}`);
      const { document: parsed } = await fetchRes.json() as { document: typeof doc };
      doc = parsed;
    } else {
      // File: read and parse based on format
      const buffer = await readFile(input.content);
      if (input.format === 'md' || input.format === 'txt') {
        const text = buffer.toString('utf-8');
        doc = input.format === 'md'
          ? await parseMarkdown(text, input.content)
          : await parseText(text, input.content);
      } else {
        // PDF/DOCX/PPTX: use the backend server
        const serverPort = await ensureServerRunning();
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), input.content.split('/').pop());
        const fetchRes = await fetch(`http://localhost:${serverPort}/api/parse`, {
          method: 'POST',
          body: formData,
        });
        if (!fetchRes.ok) throw new Error(`Failed to parse file: ${fetchRes.status}`);
        const { document: parsed } = await fetchRes.json() as { document: typeof doc };
        doc = parsed;
      }
    }

    if (!doc) throw new Error('Failed to parse document');

    const port = await ensureServerRunning();
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
    const doc = await parseText(text.trim(), 'mcp://clipboard');

    const port = await ensureServerRunning();
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

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
