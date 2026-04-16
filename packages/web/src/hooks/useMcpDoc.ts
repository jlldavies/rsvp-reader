import { useState, useEffect } from 'react';
import type { RsvpDocument } from '@rsvp-reader/core';

interface McpDocResult {
  doc: RsvpDocument | null;
  wpm: number;
  chunkSize: 1 | 2 | 3;
  loading: boolean;
  error: string | null;
}

/**
 * If the page URL contains a ?doc= parameter, fetch the document from the
 * MCP server's /api/mcp-doc endpoint and return it for auto-loading.
 */
export function useMcpDoc(): McpDocResult {
  const [doc, setDoc] = useState<RsvpDocument | null>(null);
  const [wpm, setWpm] = useState(300);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('doc');
    if (!docId) return;

    setLoading(true);
    fetch(`/api/mcp-doc?doc=${encodeURIComponent(docId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { doc: RsvpDocument; wpm: number; chunkSize: 1 | 2 | 3 }) => {
        setDoc(data.doc);
        setWpm(data.wpm);
        setChunkSize(data.chunkSize);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { doc, wpm, chunkSize, loading, error };
}
