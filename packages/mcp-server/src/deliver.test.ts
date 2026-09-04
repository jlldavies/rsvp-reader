import { describe, it, expect, vi } from 'vitest';
import { deliverDocument, type DeliverPayload } from './deliver';

function makePayload(): DeliverPayload {
  return {
    doc: { id: 'doc-1', title: 'Test Doc' },
    wpm: 300,
    chunkSize: 1,
    source: { kind: 'mcp', ref: 'mcp://text' },
  };
}

function mockFetchOk(body: unknown = { id: 'srv-1', title: 'Test Doc', position: 2 }) {
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('deliverDocument — request shape', () => {
  it('sends a POST with JSON content-type and the serialized payload', async () => {
    const payload = makePayload();
    let capturedInit: RequestInit | undefined;
    let capturedUrl: string | undefined;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify({ id: 'srv-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    await deliverDocument('http://localhost:3030/api/deliver', payload, undefined, fetchImpl);

    expect(capturedUrl).toBe('http://localhost:3030/api/deliver');
    expect(capturedInit?.method).toBe('POST');
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.parse(capturedInit?.body as string)).toEqual(payload);
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('adds an Authorization: Bearer header when a token is given', async () => {
    const payload = makePayload();
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: 'srv-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    await deliverDocument('http://localhost:3030/api/deliver', payload, 'secret-token', fetchImpl);

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token');
  });

  it('omits the Authorization header when no token is given', async () => {
    const payload = makePayload();
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: 'srv-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    await deliverDocument('http://localhost:3030/api/deliver', payload, undefined, fetchImpl);

    const headers = capturedInit?.headers as Record<string, string>;
    expect('Authorization' in headers).toBe(false);
  });
});

describe('deliverDocument — success', () => {
  it('resolves with id/title/position parsed from the JSON response', async () => {
    const payload = makePayload();
    const fetchImpl = mockFetchOk({ id: 'srv-1', title: 'Server Title', position: 4 });

    const result = await deliverDocument('http://localhost:3030/api/deliver', payload, undefined, fetchImpl);

    expect(result.id).toBe('srv-1');
    expect(result.title).toBe('Server Title');
    expect(result.position).toBe(4);
    expect(result.raw).toEqual({ id: 'srv-1', title: 'Server Title', position: 4 });
  });
});

describe('deliverDocument — failure', () => {
  it('throws an Error naming the URL and HTTP status on a non-2xx response', async () => {
    const payload = makePayload();
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;

    await expect(
      deliverDocument('http://localhost:3030/api/deliver', payload, undefined, fetchImpl)
    ).rejects.toThrow(/http:\/\/localhost:3030\/api\/deliver.*500/i);
  });

  it('throws an Error naming the URL when the network request fails', async () => {
    const payload = makePayload();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed: ECONNREFUSED');
    }) as unknown as typeof fetch;

    await expect(
      deliverDocument('http://localhost:3030/api/deliver', payload, undefined, fetchImpl)
    ).rejects.toThrow(/http:\/\/localhost:3030\/api\/deliver/);
  });
});
