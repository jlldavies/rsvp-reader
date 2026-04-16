import type { RsvpDocument } from '@rsvp-reader/core';

const API_BASE = '/api';
const SERVER_DOWN = 'The parse server is not running.\nStart it with: npm run dev:server';

/** Wraps fetch and converts proxy/network errors into a readable message. */
async function apiFetch(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(SERVER_DOWN);
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(SERVER_DOWN);
  }
  return res;
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return (data as { error?: string } | null)?.error || fallback;
}

export async function parseFile(file: File): Promise<RsvpDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch(`${API_BASE}/parse`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to parse file'));
  return ((await res.json()) as { document: RsvpDocument }).document;
}

export async function parseUrl(url: string): Promise<RsvpDocument> {
  const res = await apiFetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch URL'));
  return ((await res.json()) as { document: RsvpDocument }).document;
}

export async function parseText(text: string, format: 'text' | 'markdown' = 'text'): Promise<RsvpDocument> {
  const res = await apiFetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, format }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to parse text'));
  return ((await res.json()) as { document: RsvpDocument }).document;
}

export async function summarizeDocument(text: string): Promise<string> {
  const res = await apiFetch(`${API_BASE}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Summarisation failed'));
  return ((await res.json()) as { summary: string }).summary;
}
