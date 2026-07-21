# RSVP Speed Reader

Last reviewed: 2026-07-21

RSVP (Rapid Serial Visual Presentation) speed reader. Flashes text one word at a
time with the Optimal Recognition Point letter highlighted, so the eye stays
fixed while words stream past. Ships as a web app, a Chrome extension, and a
Claude MCP server. This is James's personal project (`github.com/jlldavies/rsvp-reader`).

## Commands

npm-workspaces monorepo; run these from the repo root unless noted.

- `npm install` - install all workspaces (a `postinstall` runs `scripts/dropbox-ignore.mjs`).
- `npm start` - run the web app and the parse/summarise server together (via `concurrently`).
- `npm run dev` - web app only (Vite dev server, `packages/web`).
- `npm run dev:server` - parse/summarise server only (`server/`, port 3847).
- `npm run dev:mcp` - build-watch and run the MCP server (`packages/mcp-server`).
- `npm run build` - build every workspace in order (core, server, web, extension, mcp).
- `npm run build:core` / `build:server` / `build:web` / `build:extension` / `build:mcp` - build one workspace.
- `npm run typecheck` - build core, then `tsc --noEmit` for web and mcp-server.
- `npm test` - run the unit test suites across all workspaces (Vitest).
- `npx playwright test` - end-to-end tests in `e2e/` (expects the app already running on `localhost:3000`).

## Architecture

Five workspaces (four under `packages/`, plus a root `server/`), all TypeScript, all `type: module`:

- `packages/core` (`@rsvp-reader/core`) - framework-agnostic engine and parsers. Owns
  tokenization, chunking, ORP calculation, per-word timing, the `RsvpEngine` state
  machine, document/bookmark/settings models, and Markdown/plain-text parsers. Every
  other workspace depends on it via the `*` workspace protocol.
- `packages/web` (`@rsvp-reader/web`) - React 19 + Vite + Zustand SPA reader UI. Dev
  server on port 3000.
- `packages/extension` (`@rsvp-reader/extension`) - Chrome extension (popup + reader
  page) built with Vite; uses `@mozilla/readability` to extract article text from the
  active tab. When the local server is running it opens the shared reader on port 3847
  so history is shared with the web app; otherwise it falls back to its bundled reader.
- `server/` (`@rsvp-reader/server`) - Express parse/summarise service on port 3847.
  Parses PDF/DOCX/PPTX/URL uploads and offers optional AI summarisation via the
  Anthropic SDK. Hardened with helmet, cors, and express-rate-limit.
- `packages/mcp-server` (`@rsvp-reader/mcp-server`) - Model Context Protocol server
  (stdio transport) exposing speed reading to Claude. Tools: `speed_read`,
  `speed_read_settings`, `speed_read_clipboard`, `speed_read_artifact`. It spins up its
  own local Express web server (on an OS-assigned port) and opens a browser to the
  reader, and can emit a self-contained HTML artifact.

## Key Files

- `package.json` - root workspace list and the orchestration scripts.
- `tsconfig.base.json` - shared compiler options (ES2022, ESNext modules, strict) extended by each workspace.
- `packages/core/src/index.ts` - the core public API surface (what other packages import).
- `packages/core/src/engine/rsvp-engine.ts` - the reader state machine.
- `packages/core/src/engine/orp.ts` - Optimal Recognition Point calculation.
- `packages/mcp-server/src/index.ts` - MCP server bootstrap and tool registration.
- `packages/mcp-server/src/tools.ts` - input parsing and validation shared by the tools.
- `packages/mcp-server/src/parsers/` - PDF, DOCX, PPTX, and URL parsers for the MCP path.
- `server/src/app.ts` / `server/src/index.ts` - Express app factory and listener.
- `packages/web/vite.config.ts` - web dev server config (port 3000).
- `playwright.config.ts` - e2e config (base URL `localhost:3000`, single worker, servers not auto-started).
- `.mcp.json.example` - template for registering the MCP server with an absolute `packages/mcp-server/dist/index.js` path.
- `scripts/dropbox-ignore.mjs` - postinstall helper that marks `node_modules` so Dropbox does not sync it.

## Conventions

- ES modules everywhere. Internal imports use explicit `.js` extensions on relative
  paths (e.g. `tools.js`) because the compiled output is what runs.
- Cross-package dependencies use the workspace `*` protocol; `@rsvp-reader/core` is the
  single source of truth for engine logic. Do not duplicate tokenizing or timing logic
  into web/extension/server.
- Strict TypeScript across all workspaces (`strict: true` in the base config).
- Tests live next to source as `*.test.ts` (Vitest); e2e specs live in `e2e/` (Playwright).
- Node 18+ (`.nvmrc` pins 18); the root `engines` field requires `>=18`.

## Environment

- The parse/summarise server reads env from `server/.env` (gitignored). Copy
  `server/.env.example` to create it.
- `ANTHROPIC_API_KEY` - optional, only needed for AI summarisation of long documents.
- `PORT` - parse/summarise server port, default 3847.
- The MCP server loads env before anything reads `process.env`, trying in order:
  `RSVP_ENV_FILE` (explicit override), the repo's `server/.env`, then a `.env` in the
  current working directory. This lets one `server/.env` serve both processes.
- Register the MCP server by copying `.mcp.json.example` to `.mcp.json` (gitignored,
  contains a machine-specific absolute path) and pointing it at
  `packages/mcp-server/dist/index.js`. Build the mcp-server first so `dist/` exists.

## Testing

- Unit/integration: Vitest, one config per workspace (`vitest.config.ts`). `npm test`
  fans out across all workspaces; a single workspace runs with, e.g.,
  `npm test --workspace=packages/core`.
- The server workspace uses `supertest` for HTTP-level route tests.
- End-to-end: Playwright specs in `e2e/` drive Chromium against a running app. The
  config deliberately does not start servers, so bring up `npm start` first, then run
  `npx playwright test`.
- `npm run typecheck` is a fast structural check that does not execute tests.

## MCP servers

This repo PROVIDES an MCP server: `packages/mcp-server` (`@rsvp-reader/mcp-server`),
a stdio-transport Model Context Protocol server that exposes speed reading to Claude.
It registers four tools:

- `speed_read` - speed-read a URL, file path (PDF/DOCX/PPTX/Markdown/text), or raw text; opens a browser window with the reader.
- `speed_read_settings` - configure default WPM and chunk size.
- `speed_read_clipboard` - speed-read supplied text (clipboard alias of `speed_read`).
- `speed_read_artifact` - generate a self-contained HTML RSVP reader as an inline artifact.

Build it first (`npm run build:mcp`) so `packages/mcp-server/dist/index.js` exists, then
consumers register it with `claude mcp add` pointing at that absolute path, for example:
`claude mcp add --scope user rsvp-reader -- node <repo>/packages/mcp-server/dist/index.js`.
The repo also ships `.mcp.json.example` as a template; a real `.mcp.json` (project scope)
contains a machine-specific absolute path and is gitignored - do not commit it.

## Gotchas

- This repo lives inside a Dropbox-synced tree. `node_modules` must not sync (native
  binaries are per-OS); the `postinstall`/`dropbox-ignore` script marks it. If installs
  behave oddly on a fresh machine, rerun `npm install` and let the script re-mark it.
- The MCP server registration path is absolute and machine-specific, so `.mcp.json` is
  gitignored. Use `.mcp.json.example` as the template; never commit a real `.mcp.json`.
- The MCP web server listens on an OS-assigned port (`listen(0, ...)`), not a fixed one.
  The fixed port 3847 belongs to the standalone `server/` process; the extension only
  gets shared history when that standalone server is running.
- Relative imports need the `.js` suffix even though the source files are `.ts`. Omitting
  it builds but fails at runtime under ESM.
- Build order matters: `core` must be built before the workspaces that consume its types.
  `npm run build` already sequences this; ad-hoc builds should build core first.
- Do not commit secrets. `server/.env`, `.env*`, and `.mcp.json` are gitignored on purpose.
