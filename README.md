# RSVP Speed Reader

Speed-read anything — articles, PDFs, research papers, Word docs — at 2–3× your normal pace. Words flash one at a time with the key letter highlighted in red (the Optimal Recognition Point), trained to land your eye in the right place every time.

**This is a local tool. Clone it, run it, use it.**

## Quick start

```bash
git clone https://github.com/jlldavies/rsvp-reader.git
cd rsvp-reader
npm install
npm start
```

Open **http://localhost:3000**.

`npm start` runs both servers at once. Paste text and start reading immediately — no further setup needed.

## Requirements

- **Node.js 18+** — check with `node --version`  
  Install via [nvm](https://github.com/nvm-sh/nvm): `nvm use` (reads `.nvmrc` automatically)

## What you can read

| Source | How | Needs server? |
|---|---|---|
| Pasted text | Paste tab | No |
| Markdown (pasted) | Paste tab → Markdown | No |
| URL (web article) | URL tab | Yes |
| PDF | Upload File tab | Yes |
| Word (.docx) | Upload File tab | Yes |
| PowerPoint (.pptx) | Upload File tab | Yes |
| Markdown file | Upload File tab | Yes |

The web app alone (no server) works for pasted text. The server is only needed for file upload and URL fetch.

## Features

- **ORP highlighting** — key letter in red, aligned consistently across every word
- **Adjustable speed** — 50–1,500 WPM via slider or ↑↓ keys
- **Words per flash** — 1, 2, or 3 words at a time (in Settings)
- **Full-text preview** — scrollable panel below; current word highlighted; click any word to jump there
- **Section breaks** — headings in Markdown/Word create natural pause points (Space to continue)
- **Bookmarks** — save named positions; multiple bookmarks per document
- **History** — all previously read documents stored locally; reopens where you left off
- **Font choice** — IBM Plex Mono (default, research-backed for RSVP), Roboto Mono, Space Mono, Courier Prime, Courier New
- **Dark / Light / System theme**
- **Keyboard shortcuts** — `Space` play/pause · `↑↓` WPM · `←→` skip

## AI summarisation (optional)

For documents over 3,000 words, a ✨ button appears. It uses [Claude](https://www.anthropic.com/) to produce a ~25% summary then loads it into the reader.

**Setup:**
```bash
cp server/.env.example server/.env
# Add your key to server/.env:
# ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). If the key is absent the button shows a clear message and everything else keeps working.

## Chrome extension

Lets you speed-read any web page without leaving the browser.

```bash
npm run build:extension
```

Load `packages/extension/dist/` as an unpacked extension:  
Chrome → `chrome://extensions` → Developer mode → Load unpacked

## Claude Code / MCP integration

Use the `speed_read` tool directly from Claude Code.

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

Then in Claude Code:
```
speed_read https://example.com/article
speed_read /path/to/paper.pdf
```

## Individual commands

```bash
npm run dev          # web app only (port 3000)
npm run dev:server   # parse server only (port 3847)
npm test             # unit tests (all workspaces)
npx playwright test  # E2E tests (requires both servers running)
```

## Tech

React · TypeScript · Vite · Zustand · Express · pdfjs-dist · mammoth · @mozilla/readability · Playwright

## License

MIT
