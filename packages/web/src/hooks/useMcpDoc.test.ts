import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMcpDoc } from './useMcpDoc';

beforeEach(() => {
  localStorage.clear();
  // Reset location search
  Object.defineProperty(window, 'location', {
    value: { search: '' },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockDoc = {
  id: 'doc-abc',
  title: 'Test Doc',
  source: { type: 'text', uri: 'mcp://text' },
  sections: [],
  totalWords: 50,
  createdAt: 1234567890,
};

describe('useMcpDoc — no doc param', () => {
  it('returns null document when no ?doc= param in URL', () => {
    window.location = { search: '' } as Location;
    const { result } = renderHook(() => useMcpDoc());
    expect(result.current.doc).toBeNull();
  });

  it('returns loading=false when no ?doc= param', () => {
    window.location = { search: '' } as Location;
    const { result } = renderHook(() => useMcpDoc());
    expect(result.current.loading).toBe(false);
  });
});

describe('useMcpDoc — with ?doc= param', () => {
  it('fetches document from /api/mcp-doc when ?doc= param present', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ doc: mockDoc, wpm: 300, chunkSize: 1 }),
    }));

    const { result } = renderHook(() => useMcpDoc());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.doc).toEqual(mockDoc);
  });

  it('includes the doc id in the fetch URL', async () => {
    window.location = { search: '?doc=doc-xyz' } as Location;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ doc: mockDoc, wpm: 300, chunkSize: 1 }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    renderHook(() => useMcpDoc());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toContain('doc-xyz');
  });

  it('returns wpm from the API response', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ doc: mockDoc, wpm: 600, chunkSize: 2 }),
    }));

    const { result } = renderHook(() => useMcpDoc());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.wpm).toBe(600);
  });

  it('returns chunkSize from the API response', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ doc: mockDoc, wpm: 300, chunkSize: 3 }),
    }));

    const { result } = renderHook(() => useMcpDoc());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chunkSize).toBe(3);
  });

  it('returns loading=true while fetch is in progress', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;
    let resolve: (v: unknown) => void;
    const pending = new Promise((r) => { resolve = r; });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));

    const { result } = renderHook(() => useMcpDoc());
    expect(result.current.loading).toBe(true);

    // Cleanup
    resolve!({ ok: true, json: async () => ({ doc: mockDoc, wpm: 300, chunkSize: 1 }) });
  });

  it('returns error message when fetch fails', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const { result } = renderHook(() => useMcpDoc());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('returns error when fetch throws (network error)', async () => {
    window.location = { search: '?doc=doc-abc' } as Location;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { result } = renderHook(() => useMcpDoc());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
