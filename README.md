# RSVP Speed Reader

A fast, full-featured speed-reading web app using Rapid Serial Visual Presentation (RSVP). Words flash one at a time with the Optimal Recognition Point (ORP) highlighted in red, letting you read 2–3× faster with practice.

![RSVP Speed Reader](https://img.shields.io/badge/TypeScript-5.x-blue) ![React](https://img.shields.io/badge/React-18-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multiple import formats** — paste text, fetch a URL, or upload PDF, Word (.docx), PowerPoint (.pptx), Markdown, or plain text
- **ORP highlighting** — the key recognition letter is highlighted in red, aligned consistently across all words
- **Adjustable speed** — 50–1,500 WPM with a live slider
- **Words per flash** — show 1, 2, or 3 words at once (configure in Settings)
- **Full-text preview** — scrollable panel shows all text; current word is highlighted in amber; click any word to jump there
- **Section breaks** — headings in Markdown/Word docs create natural pause points
- **Bookmarks** — save named positions in any document; multiple bookmarks per document
- **Reading history** — all previously read documents stored locally; resume from where you left off
- **Settings persistence** — WPM, font, font size, colours, and pause behaviour survive page reloads
- **Keyboard shortcuts** — `Space` play/pause · `↑↓` WPM · `←→` skip sentence
- **AI summarisation** *(optional)* — summarise long documents with Claude before reading, requires an Anthropic API key
- **Chrome extension** — speed-read any web page via a popup overlay *(see `packages/extension/`)*
- **MCP server** — use from Claude Code via `speed_read` tool *(see `packages/mcp-server/`)*

## Quick start

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone https://github.com/YOUR_USERNAME/rsvp-reader.git
cd rsvp-reader
npm install
```

### Run

You need two terminal windows:

**Terminal 1 — web app** (port 3000):
```bash
npm run dev
```

**Terminal 2 — parse server** (port 3847, required for PDF/URL/file imports):
```bash
npm run dev:server
```

Open [http://localhost:3000](http://localhost:3000).

> Paste text works without the server. The server is only needed for file upload, URL fetch, and AI summarisation.

## AI Summarisation (optional)

For documents over 3,000 words a ✨ button appears in the top bar. It calls [Claude](https://www.anthropic.com/) to produce a concise summary (~20–30% of the original length) which is then loaded into the reader.

### Setup

1. Copy the example env file:
   ```bash
   cp server/.env.example server/.env
   ```

2. Add your Anthropic API key to `server/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at [console.anthropic.com](https://console.anthropic.com/).

3. Restart the parse server (`npm run dev:server`).

The ✨ button will show a clear error message if the key is missing or invalid — it does not affect any other feature.

> `server/.env` is listed in `.gitignore` and will never be committed.

## Environment variables

| Variable | Where | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `server/.env` | *(none)* | Enables AI summarisation. Optional. |
| `PORT` | `server/.env` | `3847` | Parse/summarise server port. |

## Project structure

```
rsvp-reader/
├── packages/
│   ├── core/          # RSVP engine, parsers, types (shared)
│   ├── web/           # React web app (Vite)
│   ├── extension/     # Chrome extension (Manifest V3)
│   └── mcp-server/    # MCP server for Claude Code
├── server/            # Express backend (PDF/URL/DOCX parsing + summarisation)
├── e2e/               # Playwright end-to-end tests
└── README.md
```

## Running tests

Unit tests:
```bash
npm test
```

End-to-end tests (requires both servers running):
```bash
npx playwright test
```

## Chrome extension

```bash
npm run build:extension
```

Load `packages/extension/dist/` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## MCP server (Claude Code integration)

```bash
npm run build:mcp
```

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "rsvp-reader": {
      "command": "node",
      "args": ["/absolute/path/to/rsvp-reader/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Then from Claude Code: `speed_read https://example.com/article`

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Zustand |
| Backend | Express, Node.js, TypeScript |
| Parsers | pdfjs-dist, mammoth, jszip, @mozilla/readability |
| AI | Anthropic Claude (via @anthropic-ai/sdk) |
| Testing | Vitest, Playwright |
| Fonts | IBM Plex Mono (default), Roboto Mono, Space Mono, Courier Prime |

## Contributing

Pull requests welcome. Please run `npm test` and `npx playwright test` before submitting.

## License

MIT
