#!/usr/bin/env node
// Flag generated directories (node_modules, dist, coverage, test-results) with
// the Dropbox "ignore" attribute so Dropbox stops syncing them. Runs as the
// root package's postinstall — safe to run anywhere: if the repo isn't in a
// Dropbox folder, this script no-ops.
//
// Platform support:
//   Windows (NTFS)  -> alternate data stream `com.dropbox.ignored`
//   macOS           -> xattr `com.dropbox.ignored`
//   Linux (ext4+xattr) -> user.com.dropbox.ignored
// The ignore flag is per-device: re-running after `npm install` is required
// because a fresh node_modules/dist won't inherit the flag.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Heuristic: only do work if the repo path contains a "Dropbox" ancestor.
// Saves noise on CI / non-Dropbox contributor clones.
function inDropboxTree(p) {
  return p.split(sep).some(seg => /^Dropbox/i.test(seg));
}

if (!inDropboxTree(repoRoot)) {
  // Silent no-op — this machine isn't using Dropbox for this repo.
  process.exit(0);
}

// Relative paths from repo root — keeps script portable across workspaces.
const TARGETS = [
  'node_modules',
  'packages/core/node_modules',
  'packages/core/dist',
  'packages/core/coverage',
  'packages/extension/node_modules',
  'packages/extension/dist',
  'packages/mcp-server/node_modules',
  'packages/mcp-server/dist',
  'packages/web/node_modules',
  'packages/web/dist',
  'server/node_modules',
  'server/dist',
  'test-results',
  'playwright-report',
];

function markIgnored(absPath) {
  const os = platform();
  try {
    if (os === 'win32') {
      // PowerShell: write an alternate data stream. Works on NTFS.
      execFileSync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Set-Content -Path '${absPath}' -Stream com.dropbox.ignored -Value 1 -ErrorAction Stop`,
      ], { stdio: 'pipe' });
    } else if (os === 'darwin') {
      execFileSync('xattr', ['-w', 'com.dropbox.ignored', '1', absPath], { stdio: 'pipe' });
    } else {
      // Linux — best effort; requires user_xattr on the mount.
      execFileSync('setfattr', ['-n', 'user.com.dropbox.ignored', '-v', '1', absPath], { stdio: 'pipe' });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, err: err instanceof Error ? err.message : String(err) };
  }
}

let marked = 0;
let missing = 0;
let failed = 0;
for (const rel of TARGETS) {
  const abs = resolve(repoRoot, rel);
  if (!existsSync(abs)) { missing++; continue; }
  const { ok } = markIgnored(abs);
  if (ok) marked++; else failed++;
}

// Only log on non-trivial activity, so npm install output stays clean.
if (marked > 0 || failed > 0) {
  console.log(`[dropbox-ignore] marked ${marked}, missing ${missing}, failed ${failed}`);
}
