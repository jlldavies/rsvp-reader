import { useCallback } from 'react';
import type { SavedPosition, DocumentProgress, RsvpDocument } from '@rsvp-reader/core';

const STORAGE_KEY = 'rsvp-bookmarks';
const DOC_STORAGE_PREFIX = 'rsvp-doc-';

function loadStore(): Record<string, DocumentProgress> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, DocumentProgress>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function saveDocToStorage(doc: RsvpDocument): void {
  try {
    localStorage.setItem(DOC_STORAGE_PREFIX + doc.id, JSON.stringify(doc));
  } catch {
    // Storage quota exceeded - skip silently
  }
}

function getDocFromStorage(docId: string): RsvpDocument | null {
  try {
    const raw = localStorage.getItem(DOC_STORAGE_PREFIX + docId);
    return raw ? (JSON.parse(raw) as RsvpDocument) : null;
  } catch {
    return null;
  }
}

interface BookmarkDoc {
  id: string;
  title: string;
  source: { type: string; uri: string };
  totalWords: number;
}

export function useBookmarks() {
  const getBookmarks = useCallback((docId: string): SavedPosition[] => {
    return loadStore()[docId]?.positions ?? [];
  }, []);

  const saveToHistory = useCallback((doc: RsvpDocument) => {
    saveDocToStorage(doc);
    const store = loadStore();
    if (!store[doc.id]) {
      store[doc.id] = {
        documentId: doc.id,
        title: doc.title,
        source: doc.source,
        totalWords: doc.totalWords,
        positions: [],
        lastRead: Date.now(),
      };
      saveStore(store);
    }
  }, []);

  const saveBookmark = useCallback(
    (doc: BookmarkDoc, tokenIndex: number, sectionIndex: number, label: string) => {
      const store = loadStore();
      const existing = store[doc.id] ?? {
        documentId: doc.id,
        title: doc.title,
        source: doc.source,
        totalWords: doc.totalWords,
        positions: [],
        lastRead: Date.now(),
      };

      const position: SavedPosition = {
        id: `${doc.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        tokenIndex,
        sectionIndex,
        label,
        createdAt: Date.now(),
      };

      store[doc.id] = {
        ...existing,
        positions: [...existing.positions, position],
        lastRead: Date.now(),
      };
      saveStore(store);
    },
    []
  );

  const deleteBookmark = useCallback((docId: string, bookmarkId: string) => {
    const store = loadStore();
    if (!store[docId]) return;
    store[docId] = {
      ...store[docId],
      positions: store[docId].positions.filter(p => p.id !== bookmarkId),
    };
    saveStore(store);
  }, []);

  const saveProgress = useCallback((doc: BookmarkDoc, tokenIndex: number) => {
    const store = loadStore();
    const existing = store[doc.id] ?? {
      documentId: doc.id,
      title: doc.title,
      source: doc.source,
      totalWords: doc.totalWords,
      positions: [],
      lastRead: Date.now(),
    };
    store[doc.id] = { ...existing, lastRead: Date.now() };
    saveStore(store);
    localStorage.setItem(`rsvp-progress-${doc.id}`, String(tokenIndex));
  }, []);

  const getLastPosition = useCallback((docId: string): number | null => {
    const raw = localStorage.getItem(`rsvp-progress-${docId}`);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }, []);

  const getAllHistory = useCallback((): Array<DocumentProgress & { doc: RsvpDocument | null }> => {
    const store = loadStore();
    return Object.values(store)
      .sort((a, b) => (b.lastRead ?? 0) - (a.lastRead ?? 0))
      .map(entry => ({ ...entry, doc: getDocFromStorage(entry.documentId) }));
  }, []);

  const clearHistory = useCallback(() => {
    const store = loadStore();
    Object.keys(store).forEach(docId => {
      localStorage.removeItem(DOC_STORAGE_PREFIX + docId);
      localStorage.removeItem(`rsvp-progress-${docId}`);
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeFromHistory = useCallback((docId: string) => {
    const store = loadStore();
    delete store[docId];
    saveStore(store);
    localStorage.removeItem(DOC_STORAGE_PREFIX + docId);
    localStorage.removeItem(`rsvp-progress-${docId}`);
  }, []);

  return {
    getBookmarks,
    saveBookmark,
    deleteBookmark,
    saveProgress,
    getLastPosition,
    saveToHistory,
    getAllHistory,
    clearHistory,
    removeFromHistory,
  };
}
