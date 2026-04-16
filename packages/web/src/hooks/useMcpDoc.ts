import { useState, useEffect } from 'react';
import type { RsvpDocument } from '@rsvp-reader/core';

interface McpDocResult {
  doc: RsvpDocument | null;
  wpm: number;
  chunkSize: 1 | 2 | 3;
  loading: boolean;
  error: string | null;
}

// Chrome extension API types — only present when running inside an extension page
declare const chrome: any;

function getChromeStorageLocal(): any | null {
  try {
    return typeof chrome !== 'undefined' && chrome.storage?.local ? chrome.storage.local : null;
  } catch {
    return null;
  }
}

/**
 * If the page URL contains a ?doc= parameter, load the document either:
 *  - From chrome.storage.local (when running as a Chrome extension page)
 *  - From the server's /api/mcp-doc endpoint (when running as a web app)
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

    const chromeStorage = getChromeStorageLocal();

    if (chromeStorage) {
      // Extension context: read from chrome.storage.local
      const storageKey = `rsvp_doc_${docId}`;

      chrome.storage.sync.get(['wpm'], (result: any) => {
        if (result.wpm && typeof result.wpm === 'number') {
          setWpm(result.wpm);
        }
      });

      chromeStorage.get([storageKey], (result: any) => {
        const entry = result[storageKey];
        if (!entry) {
          setError(`Document not found (id: ${docId}). Please try again.`);
          setLoading(false);
          return;
        }
        setDoc(entry as RsvpDocument);
        setLoading(false);
        chromeStorage.remove([storageKey]);
      });
    } else {
      // Web / MCP context: fetch from local server
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
    }
  }, []);

  return { doc, wpm, chunkSize, loading, error };
}
