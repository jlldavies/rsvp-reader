/**
 * Deliver-to: hands a parsed document off to a running dashboard reader instance
 * instead of opening a local browser window. Used when RSVP_DELIVER_URL is set.
 */

export interface DeliverPayload {
  doc: unknown;
  wpm: number;
  chunkSize: number;
  source: { kind: 'mcp'; ref: string };
}

export interface DeliverResult {
  id?: string;
  title?: string;
  position?: number;
  raw: unknown;
}

const DELIVER_TIMEOUT_MS = 10_000;

/**
 * POST a parsed document to a dashboard-managed reader endpoint.
 *
 * Throws an Error naming the URL and HTTP status on a non-2xx response, or the
 * underlying network/timeout error (wrapped, with the URL) on failure to connect.
 */
export async function deliverDocument(
  url: string,
  payload: DeliverPayload,
  token?: string,
  fetchImpl: typeof fetch = fetch
): Promise<DeliverResult> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DELIVER_TIMEOUT_MS),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to deliver document to ${url}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to deliver document to ${url}: HTTP ${response.status}`);
  }

  const raw = await response.json().catch(() => null);
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    title: typeof record.title === 'string' ? record.title : undefined,
    position: typeof record.position === 'number' ? record.position : undefined,
    raw,
  };
}
