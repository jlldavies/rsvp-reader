# RSVP Speed Reader

Speed-read anything — articles, PDFs, research papers, Word docs, PowerPoints — at 2-3x your normal pace. Words flash one at a time with the key letter highlighted in red (the **Optimal Recognition Point**), trained to land your eye in the right place every time.

Works as a **web app**, **Chrome extension**, and **Claude AI tool** (MCP server).

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Web App](#web-app)
- [Chrome Extension](#chrome-extension)
- [Claude Code / MCP Integration](#claude-code--mcp-integration)
- [Features](#features)
- [AI Summarisation (Optional)](#ai-summarisation-optional)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

---

## Quick Start

```bash
git clone https://github.com/jlldavies/rsvp-reader.git
cd rsvp-reader
npm install
npm run build
npm start
```

Open **http://localhost:3847**. Paste text and start reading immediately.

---

## Prerequisites

- **Node.js 18+** — check with `node --version`
  - Install via [nvm](https://github.com/nvm-sh/nvm): `nvm install 18 && nvm use 18`
  - Or download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Google Chrome** (for the extension — optional)
- **Claude Code CLI** or **Claude Desktop** (for MCP integration — optional)

---

## Installation

### For AI Agents

If you are an AI agent (Claude Code, Copilot, Cursor, etc.) helping a user install this project, follow these exact steps:

```bash
# 1. Clone the repository
git clone https://github.com/jlldavies/rsvp-reader.git
cd rsvp-reader

# 2. Install all dependencies (npm workspaces handles cross-package linking)
npm install

# 3. Build all packages in the correct order
#    This builds: core -> server -> web -> extension -> mcp-server
npm run build

# 4. (Optional) Set up AI summarisation
cp server/.env.example server/.env
# Then edit server/.env and add: ANTHROPIC_API_KEY=sk-ant-...

# 5. Start the app
npm start
```

**Build order matters.** `npm run build` runs them sequentially: `core` first (shared library), then `server`, `web`, `extension`, and `mcp-server`. If you need to rebuild a single package, use `npm run build:core`, `npm run build:web`, etc. — but always rebuild `core` first if you changed it.

**`npm start`** runs the API server on port 3847. The server serves both the API endpoints and the web app. Open http://localhost:3847.

For development with hot-reload, run `npm run dev` (Vite dev server on port 3000, proxies API to port 3847) and `npm run dev:server` (API server with watch) in separate terminals — or just `npm start` which runs both concurrently.

---

## Web App

### Running

```bash
npm start
```

This starts the server on port 3847, serving both the API and the web app. Open http://localhost:3847.

For development with hot-reload:

```bash
npm start    # Runs both Vite dev server (port 3000) + API server (port 3847)
```

### What You Can Read

| Source | How | Needs Server? |
|---|---|---|
| Pasted text | Paste tab | No |
| Markdown (pasted) | Paste tab | No |
| URL (web article) | URL tab | Yes |
| PDF | Upload File tab | Yes |
| Word (.docx) | Upload File tab | Yes |
| PowerPoint (.pptx) | Upload File tab | Yes |
| Markdown file | Upload File tab | Yes |

The web app alone (no server) works for pasted text. The server is needed for file uploads, URL fetching, and AI summarisation.

---

## Chrome Extension

The extension lets you speed-read any web page directly from your browser. Click the extension icon on any page, press **Start Reading**, and it opens the full reader in a new tab.

### Building

```bash
npm run build:extension
```

This outputs a ready-to-load extension in `packages/extension/dist/`.

### Installing in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/` directory
5. The extension icon (lightning bolt) appears in your toolbar

### Using

1. Navigate to any web page (article, Wikipedia, blog post, etc.)
2. Click the RSVP Speed Reader icon in your Chrome toolbar
3. Adjust WPM if desired (default: 300)
4. Click **Start Reading**
5. A new tab opens with the full reader UI

### Shared History

If the local server is running (`npm start`), the extension opens the reader at `http://localhost:3847` so that reading history is shared between the extension and the web app. If the server is not running, the extension falls back to its own built-in reader page (history is local to the extension in that case).

### Permissions

The extension requests minimal permissions:

- **activeTab** — access to the current tab only when you click the extension icon (no background snooping)
- **storage** — save your WPM preference
- **scripting** — inject the content extraction script into the current page when you click Start Reading

The extension does **not** request access to all your sites. It only accesses a page when you explicitly click the icon.

### For AI Agents

```bash
# Build the extension
cd /path/to/rsvp-reader
npm run build:extension

# The built extension is at:
# /path/to/rsvp-reader/packages/extension/dist/
#
# Tell the user to:
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the packages/extension/dist/ directory
```

---

## Claude Code / MCP Integration

The MCP server exposes RSVP tools directly inside Claude Code. Say "speed read this URL" or "speed read this PDF" and Claude opens the reader in your browser.

### Build

```bash
# Build the MCP server (requires core and web to be built first)
npm run build:core
npm run build:web
npm run build:mcp
```

### Option 1: Claude Code CLI (Recommended)

The simplest way to register the MCP server is with the `claude` CLI:

```bash
# From the rsvp-reader repo root:
claude mcp add rsvp-reader node "$(pwd)/packages/mcp-server/dist/index.js"
```

This writes the config to `~/.claude/.mcp.json` automatically. Restart Claude Code for the tools to appear.

Alternatively, you can edit `~/.claude/.mcp.json` by hand — see `.mcp.json.example` in this repo for the format. Replace the path with the absolute path to your clone (`pwd` in the repo root to get it).

### Option 2: Claude Desktop (macOS / Windows app)

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the `rsvp-reader` entry to the `mcpServers` object (create the file if it doesn't exist):

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

Replace `/absolute/path/to/rsvp-reader` with the actual absolute path to your clone. Restart Claude Desktop after saving.

### For AI Agents

If you are an AI agent helping a user set up the MCP server:

```bash
# 1. Build (if not already built)
cd /path/to/rsvp-reader
npm run build:core && npm run build:web && npm run build:mcp

# 2. Get the absolute path to the MCP server entry point
RSVP_MCP_PATH="$(pwd)/packages/mcp-server/dist/index.js"

# 3. Verify the file exists
ls -la "$RSVP_MCP_PATH"

# 4a. For Claude Code CLI — register directly:
claude mcp add rsvp-reader node "$RSVP_MCP_PATH"

# 4b. For Claude Desktop — add to the config file:
#     macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
#     Windows: %APPDATA%/Claude/claude_desktop_config.json
#
#     Merge this into the mcpServers object (do NOT overwrite other entries):
#     {
#       "mcpServers": {
#         "rsvp-reader": {
#           "command": "node",
#           "args": ["<RSVP_MCP_PATH>"]
#         }
#       }
#     }
```

After configuring, restart Claude Code or Claude Desktop. The tools will be available immediately.

### Available MCP Tools

| Tool | Description |
|---|---|
| `speed_read` | Speed-read a URL, file path, or raw text. Opens the reader in your browser. |
| `speed_read_artifact` | Generate a self-contained HTML RSVP reader as an inline artifact (no server needed). |
| `speed_read_settings` | Configure default WPM and chunk size. |
| `speed_read_clipboard` | Speed-read text content directly. |

### Usage Examples

In Claude Code, just say:

```
speed_read https://en.wikipedia.org/wiki/Speed_reading
speed_read /path/to/paper.pdf
speed_read /path/to/slides.pptx
```

Or ask Claude to generate an inline reader:

```
Use speed_read_artifact with this text: [paste text]
```

The artifact version produces a self-contained HTML page that works without any server.

---

## Features

- **ORP highlighting** — key letter in red, aligned consistently across every word
- **Adjustable speed** — 50-1,500 WPM via slider or keyboard
- **Words per flash** — 1, 2, or 3 words at a time (in Settings)
- **Full-text preview** — scrollable panel below the reader; current word highlighted; click any word to jump there
- **Section breaks** — headings in Markdown/Word/PDF create natural pause points (Space to continue)
- **Bookmarks** — save named positions; multiple bookmarks per document
- **History** — all previously read documents stored locally; reopens where you left off
- **Font choice** — IBM Plex Mono (default), Roboto Mono, Space Mono, Courier Prime, Courier New
- **Dark / Light / System theme**
- **Keyboard shortcuts:**

| Key | Action |
|---|---|
| `Space` | Play / Pause (or continue past section break) |
| `↑` / `↓` | Increase / decrease WPM |
| `←` / `→` | Skip backward / forward |
| `Delete` / `Backspace` | Back one sentence |
| `Enter` | Skip to next sentence (or next section if paused at a break) |

---

## AI Summarisation (Optional)

For documents over 3,000 words, a sparkle button appears in the top bar. It uses Claude to produce a ~25% summary optimised for speed reading, then loads the summary into the reader.

### Setup

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). If the key is absent, the button shows a clear message and everything else works normally.

---

## Architecture

```
rsvp-reader/
├── packages/
│   ├── core/           # Shared RSVP engine, parsers, types (platform-agnostic)
│   ├── web/            # React web app (Vite + React 19 + Zustand)
│   ├── extension/      # Chrome extension (Manifest V3)
│   └── mcp-server/     # MCP server for Claude Code / Claude Desktop
├── server/             # Express API server (parsing, summarisation)
├── package.json        # npm workspaces root
└── .nvmrc              # Node.js version (18)
```

### Package Dependencies

```
@rsvp-reader/core          (no internal deps — leaf package)
  ├── @rsvp-reader/web     (imports core)
  ├── @rsvp-reader/server  (imports core)
  ├── @rsvp-reader/extension (imports core + web components)
  └── @rsvp-reader/mcp-server (imports core, serves web/dist)
```

### How Each Piece Works

- **Core** (`packages/core`): The RSVP engine — tokenises text, calculates ORP positions, manages word-by-word playback timing. Shared by all other packages.
- **Web** (`packages/web`): React SPA with the full reader UI — display, controls, settings, bookmarks, history. Built with Vite.
- **Server** (`server`): Express API server. Parses PDFs, DOCX, PPTX, and URLs into RSVP documents. Serves the web app's built files. Optional AI summarisation via Anthropic API.
- **Extension** (`packages/extension`): Chrome Manifest V3 extension. Extracts page text using Mozilla Readability, opens the reader in a new tab. Uses `activeTab` permission (no blanket site access).
- **MCP Server** (`packages/mcp-server`): Model Context Protocol server for Claude. Parses documents using built-in parsers, spins up an embedded web server, and opens the reader in your browser.

---

## Development

### Scripts

```bash
npm start              # Web app + API server (development, with hot-reload)
npm run build          # Build everything (core -> server -> web -> extension -> mcp)
npm test               # Run all unit tests
npm run typecheck      # TypeScript type checking

# Individual packages
npm run build:core     # Build core library
npm run build:server   # Build API server
npm run build:web      # Build web app
npm run build:extension # Build Chrome extension
npm run build:mcp      # Build MCP server

npm run dev            # Web app dev server only (port 3000)
npm run dev:server     # API server with watch (port 3847)
```

### Environment Variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `server/.env` | No | Enables AI summarisation. Get from [console.anthropic.com](https://console.anthropic.com/) |
| `PORT` | `server/.env` | No | API server port (default: 3847) |

### Running Tests

```bash
npm test                  # All unit tests
npm run test:watch        # Watch mode (per workspace)
npx playwright test       # E2E tests (requires both servers running)
```

---

## Troubleshooting

### `npm install` fails

- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then retry: `rm -rf node_modules package-lock.json && npm install`

### Web app shows blank page

- Make sure you ran `npm run build` before `npm start` (the server needs `packages/web/dist` to serve the app)
- Check that the API server is running: `curl http://localhost:3847/api/health`

### Chrome extension: "Cannot inject script into this page"

- Some pages block extensions (Chrome Web Store, `chrome://` pages, browser internal pages)
- Try on a regular webpage like Wikipedia

### Chrome extension: nothing happens when clicking Start Reading

- Open Chrome DevTools on the popup (right-click extension icon → Inspect popup) to see console errors
- Reload the extension at `chrome://extensions`

### MCP tools not appearing in Claude

- Verify the path in your MCP config points to the built file: `ls /path/to/packages/mcp-server/dist/index.js`
- Rebuild: `npm run build:core && npm run build:web && npm run build:mcp`
- Restart Claude Code (`claude` CLI) or Claude Desktop after changing config

### PDF/DOCX/PPTX parsing fails

- These formats require the API server to be running: `npm run dev:server`
- Check server logs for specific parse errors

---

## Security

This is a **local-first** tool. Every server it spawns — the full API server
(`npm start`, port 3847), the Vite dev server (`npm run dev`, port 3000),
and the embedded server that Claude launches when you use `speed_read` (a
random high port, loopback-bound) — listens on `127.0.0.1` only. They are
not reachable from the network or from another device on your Wi-Fi.

### Dependabot alerts

GitHub Dependabot may flag advisories against transitive dependencies of
the parser chain (`multer`, `@mozilla/readability`, `mammoth` →
`@xmldom/xmldom`, etc.). Nearly all of these are **denial-of-service** flaws
reachable only by feeding malformed input to the parser — which means:

- **External attackers cannot reach the servers** (loopback only).
- **The worst-case outcome is that the local Node process crashes**, which
  you can resolve by restarting the reader.
- There is no persisted data to corrupt: documents live in memory on the
  embedded server; history lives in your browser's localStorage.

This doesn't mean the alerts are worthless — a malicious page open in
another browser tab could POST to `127.0.0.1` and crash the parser. So
we still pin patched versions where they exist:

- `multer@^2.0.0` (2.x patches all seven DoS advisories against 1.x)
- `@mozilla/readability@^0.6.0` (patches the regex DoS in <0.6.0)
- `@xmldom/xmldom` resolves to `0.8.13+` via `mammoth@1.12.0`'s semver
  range

Run `npm audit` to see the current state on your machine. A clean install
of the current `main` branch should report **0 vulnerabilities**.

---

## Tech

React 19 · TypeScript · Vite · Zustand · Express · esbuild · pdfjs-dist · mammoth · jszip · @mozilla/readability · @modelcontextprotocol/sdk · @anthropic-ai/sdk

## License

MIT
