import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RsvpDocument } from '@rsvp-reader/core';
import { present, defaultStandaloneMessage, clipboardStandaloneMessage, type PresentDeps } from './present';

function makeDoc(overrides: Partial<RsvpDocument> = {}): RsvpDocument {
  return {
    id: 'doc-1',
    title: 'Test Doc',
    totalWords: 42,
    sections: [],
    source: 'mcp://text',
    ...overrides,
  } as unknown as RsvpDocument;
}

function makeDeps(overrides: Partial<PresentDeps> = {}): PresentDeps {
  return {
    deliver: vi.fn(),
    ensureServerRunning: vi.fn(async () => 4123),
    storeDocument: vi.fn(),
    open: vi.fn(async () => undefined),
    ...overrides,
  } as PresentDeps;
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.RSVP_DELIVER_URL;
  delete process.env.RSVP_DELIVER_TOKEN;
  delete process.env.RSVP_OPEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('present — standalone mode (no RSVP_DELIVER_URL)', () => {
  it('uses the default title-based message when no standaloneMessage is given', async () => {
    const doc = makeDoc({ title: 'My Title', totalWords: 10 });
    const deps = makeDeps();

    const result = await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(result.content[0].text).toBe(
      'Opening RSVP reader for "My Title" (10 words) at 300 WPM.\n\nURL: http://127.0.0.1:4123/?doc=doc-1'
    );
  });

  it('uses a caller-supplied standaloneMessage verbatim (speed_read_clipboard wording)', async () => {
    const doc = makeDoc({ totalWords: 7 });
    const deps = makeDeps();

    const result = await present(doc, 250, 1, 'mcp://clipboard', clipboardStandaloneMessage, deps);

    expect(result.content[0].text).toBe(
      'Opening RSVP reader for clipboard text (7 words) at 250 WPM.\n\nURL: http://127.0.0.1:4123/?doc=doc-1'
    );
  });

  it('calls ensureServerRunning, storeDocument, and open', async () => {
    const doc = makeDoc();
    const deps = makeDeps();

    await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(deps.ensureServerRunning).toHaveBeenCalledTimes(1);
    expect(deps.storeDocument).toHaveBeenCalledWith(doc, 300, 1);
    expect(deps.open).toHaveBeenCalledWith('http://127.0.0.1:4123/?doc=doc-1');
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it('skips open() when RSVP_OPEN=0, but still returns the URL', async () => {
    process.env.RSVP_OPEN = '0';
    const doc = makeDoc();
    const deps = makeDeps();

    const result = await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(deps.open).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain('http://127.0.0.1:4123/?doc=doc-1');
  });
});

describe('present — deliver mode (RSVP_DELIVER_URL set)', () => {
  it('delivers instead of opening a browser, and calls neither ensureServerRunning nor open', async () => {
    process.env.RSVP_DELIVER_URL = 'http://localhost:3030/api/deliver';
    const doc = makeDoc({ title: 'Doc Title', totalWords: 5 });
    const deps = makeDeps({
      deliver: vi.fn(async () => ({ id: 'srv-1', title: 'Doc Title', raw: {} })),
    });

    const result = await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(deps.ensureServerRunning).not.toHaveBeenCalled();
    expect(deps.open).not.toHaveBeenCalled();
    expect(deps.storeDocument).not.toHaveBeenCalled();
    expect(result.content[0].text).toBe('Queued for James in the dashboard reader: "Doc Title" (5 words)');
  });

  it('passes doc, wpm, chunkSize, and the given sourceRef to deliver', async () => {
    process.env.RSVP_DELIVER_URL = 'http://localhost:3030/api/deliver';
    process.env.RSVP_DELIVER_TOKEN = 'tok-123';
    const doc = makeDoc();
    const deliverMock = vi.fn(async () => ({ raw: {} }));
    const deps = makeDeps({ deliver: deliverMock });

    await present(doc, 275, 2, 'mcp://clipboard', defaultStandaloneMessage, deps);

    expect(deliverMock).toHaveBeenCalledWith(
      'http://localhost:3030/api/deliver',
      { doc, wpm: 275, chunkSize: 2, source: { kind: 'mcp', ref: 'mcp://clipboard' } },
      'tok-123'
    );
  });

  it('appends ", position <k>" when the delivery result carries a position', async () => {
    process.env.RSVP_DELIVER_URL = 'http://localhost:3030/api/deliver';
    const doc = makeDoc({ title: 'Doc Title', totalWords: 5 });
    const deps = makeDeps({
      deliver: vi.fn(async () => ({ id: 'srv-1', title: 'Doc Title', position: 3, raw: {} })),
    });

    const result = await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(result.content[0].text).toBe(
      'Queued for James in the dashboard reader: "Doc Title" (5 words), position 3'
    );
  });

  it('replies with a clean one-line error and opens nothing when delivery fails', async () => {
    process.env.RSVP_DELIVER_URL = 'http://localhost:3030/api/deliver';
    const doc = makeDoc();
    const deps = makeDeps({
      deliver: vi.fn(async () => {
        throw new Error('Failed to deliver document to http://localhost:3030/api/deliver: HTTP 500');
      }),
    });

    const result = await present(doc, 300, 1, 'mcp://text', defaultStandaloneMessage, deps);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe(
      'Could not deliver to the dashboard reader: Failed to deliver document to http://localhost:3030/api/deliver: HTTP 500'
    );
    expect(result.content[0].text).not.toContain('\n');
    expect(deps.open).not.toHaveBeenCalled();
    expect(deps.ensureServerRunning).not.toHaveBeenCalled();
  });
});
