#!/usr/bin/env node
// Optional Dropbox sync helper — runs as postinstall, silent no-op for users
// who don't have Dropbox. For Dropbox users, flags node_modules/dist/coverage
// with com.dropbox.ignored so Dropbox stops syncing them.
//
// Detection: requires BOTH
//   (1) the repo path includes a "Dropbox" ancestor, AND
//   (2) the Dropbox app is installed on this machine
// Either check failing → silent exit 0, npm install continues normally.
//
// Platform support:
//   Windows (NTFS)  -> alternate data stream `com.dropbox.ignored`
//   macOS           -> xattr `com.dropbox.ignored`
//   Linux (ext4+xattr) -> user.com.dropbox.ignored
//
// The ignore flag is per-device and doesn't survive directory recreation, so
// postinstall re-applies it on every install. Can also be invoked manually
// via `npm run dropbox-ignore`.
//
// This script NEVER exits non-zero — failures are swallowed to avoid blocking
// npm install for users whose OS tooling doesn't support xattrs.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform, homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Heuristic #1: repo path contains a "Dropbox" ancestor.
function inDropboxTree(p) {
  return p.split(sep).some(seg => /^Dropbox/i.test(seg));
}

// Heuristic #2: Dropbox app is installed on this machine. Check the standard
// install/config locations per platform. Returning false triggers a silent
// no-op — the user simply doesn't have Dropbox, so there's nothing to do.
function dropboxInstalled() {
  const os = platform();
  const home = homedir();
  if (os === 'win32') {
    const appData = process.env.APPDATA;
    const localAppData = process.env.LOCALAPPDATA;
    return (
      (appData && existsSync(join(appData, 'Dropbox'))) ||
      (localAppData && existsSync(join(localAppData, 'Dropbox'))) ||
      existsSync(join(home, 'Dropbox')) ||
      existsSync('C:\\Program Files (x86)\\Dropbox') ||
      existsSync('C:\\Program Files\\Dropbox')
    );
  }
  if (os === 'darwin') {
    return (
      existsSync('/Applications/Dropbox.app') ||
      existsSync(join(home, 'Applications/Dropbox.app')) ||
      existsSync(join(home, '.dropbox')) ||
      existsSync(join(home, 'Library/Application Support/Dropbox'))
    );
  }
  // Linux
  return existsSync(join(home, '.dropbox')) || existsSync(join(home, '.dropbox-dist'));
}

// Wrap everything in a try/catch so npm install never fails on this script,
// regardless of the filesystem or tooling quirks on the user's machine.
try {
  if (!inDropboxTree(repoRoot) || !dropboxInstalled()) {
    // Silent no-op — this machine isn't using Dropbox for this repo.
    process.exit(0);
  }
} catch {
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

try {
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
} catch {
  // Never fail the install over Dropbox housekeeping.
}
