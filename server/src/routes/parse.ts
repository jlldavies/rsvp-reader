import { Router } from 'express';
import type { Request, Response } from 'express';
import { upload } from '../middleware/upload.js';
import { parseUrl } from '../parsers/url-parser.js';
import { parsePdf } from '../parsers/pdf-parser.js';
import { parseDocx } from '../parsers/docx-parser.js';
import { parsePptx } from '../parsers/pptx-parser.js';
import { parseMarkdown, parseText } from '@rsvp-reader/core';

export const parseRouter = Router();

parseRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

parseRouter.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // File upload mode
    if (req.file) {
      const { originalname, buffer, mimetype } = req.file;
      const ext = originalname.split('.').pop()?.toLowerCase();

      let document;

      if (ext === 'pdf' || mimetype === 'application/pdf') {
        document = await parsePdf(buffer, originalname);
      } else if (ext === 'docx' || mimetype.includes('wordprocessingml')) {
        document = await parseDocx(buffer, originalname);
      } else if (ext === 'pptx' || mimetype.includes('presentationml')) {
        document = await parsePptx(buffer, originalname);
      } else if (ext === 'md' || ext === 'markdown' || mimetype === 'text/markdown') {
        document = await parseMarkdown(buffer.toString('utf-8'), originalname);
      } else if (ext === 'txt' || mimetype === 'text/plain') {
        document = await parseText(buffer.toString('utf-8'), originalname);
      } else {
        res.status(400).json({ error: `Unsupported file format: ${ext || mimetype}` });
        return;
      }

      res.json({ document });
      return;
    }

    // URL mode — fetch and parse a URL server-side
    const { url, html } = req.body as { url?: string; html?: string };

    if (url) {
      let pageHtml = html;
      if (!pageHtml) {
        const fetchRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSVPReader/1.0)' },
        });
        if (!fetchRes.ok) {
          res.status(400).json({ error: `Failed to fetch URL: HTTP ${fetchRes.status}` });
          return;
        }
        pageHtml = await fetchRes.text();
      }
      const document = await parseUrl(pageHtml, url);
      res.json({ document });
      return;
    }

    // Raw text mode
    const { text, format } = req.body as { text?: string; format?: string };
    if (text) {
      const document = format === 'markdown'
        ? await parseMarkdown(text, 'paste')
        : await parseText(text, 'paste');
      res.json({ document });
      return;
    }

    res.status(400).json({ error: 'Provide a file upload, { url, html }, or { text }' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    res.status(500).json({ error: message });
  }
});
