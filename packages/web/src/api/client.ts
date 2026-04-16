import type { RsvpDocument } from '@rsvp-reader/core';

const API_BASE = '/api';

export async function parseFile(file: File): Promise<RsvpDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Parse failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json() as { document: RsvpDocument };
  return data.document;
}

export async function parseUrl(url: string): Promise<RsvpDocument> {
  // Fetch the URL server-side via proxy
  const res = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Parse failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json() as { document: RsvpDocument };
  return data.document;
}

export async function parseText(text: string, format: 'text' | 'markdown' = 'text'): Promise<RsvpDocument> {
  const res = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, format }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Parse failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json() as { document: RsvpDocument };
  return data.document;
}

export async function summarizeDocument(text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Summarize failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json() as { summary: string };
  return data.summary;
}
