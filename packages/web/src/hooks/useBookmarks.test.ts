import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarks } from './useBookmarks';

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
});

const mockDoc = {
  id: 'doc-abc',
  title: 'My Test Doc',
  source: { type: 'text' as const, uri: 'test' },
  totalWords: 100,
};

describe('useBookmarks — saving positions', () => {
  it('starts with no bookmarks for a document', () => {
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.getBookmarks('doc-abc')).toHaveLength(0);
  });

  it('saves a bookmark for a document', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 1, 'Halfway');
    });
    expect(result.current.getBookmarks('doc-abc')).toHaveLength(1);
  });

  it('saved bookmark has correct token index', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 1, 'Mark A');
    });
    expect(result.current.getBookmarks('doc-abc')[0].tokenIndex).toBe(42);
  });

  it('saved bookmark has correct section index', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 2, 'Mark B');
    });
    expect(result.current.getBookmarks('doc-abc')[0].sectionIndex).toBe(2);
  });

  it('saved bookmark has correct label', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 1, 'Chapter 3');
    });
    expect(result.current.getBookmarks('doc-abc')[0].label).toBe('Chapter 3');
  });

  it('can save multiple bookmarks for the same document', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 10, 0, 'Start');
      result.current.saveBookmark(mockDoc, 50, 1, 'Middle');
      result.current.saveBookmark(mockDoc, 90, 2, 'End');
    });
    expect(result.current.getBookmarks('doc-abc')).toHaveLength(3);
  });

  it('bookmarks are isolated per document', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 10, 0, 'Doc A mark');
      result.current.saveBookmark({ ...mockDoc, id: 'doc-xyz' }, 20, 0, 'Doc B mark');
    });
    expect(result.current.getBookmarks('doc-abc')).toHaveLength(1);
    expect(result.current.getBookmarks('doc-xyz')).toHaveLength(1);
  });
});

describe('useBookmarks — deleting positions', () => {
  it('deletes a bookmark by id', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 1, 'To delete');
    });
    const id = result.current.getBookmarks('doc-abc')[0].id;
    act(() => {
      result.current.deleteBookmark('doc-abc', id);
    });
    expect(result.current.getBookmarks('doc-abc')).toHaveLength(0);
  });

  it('deleting one bookmark leaves others intact', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 10, 0, 'Keep this');
      result.current.saveBookmark(mockDoc, 20, 0, 'Delete this');
    });
    const marks = result.current.getBookmarks('doc-abc');
    const toDelete = marks.find(m => m.label === 'Delete this')!.id;
    act(() => {
      result.current.deleteBookmark('doc-abc', toDelete);
    });
    const remaining = result.current.getBookmarks('doc-abc');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe('Keep this');
  });
});

describe('useBookmarks — last-read progress', () => {
  it('saves auto-progress (last read position)', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveProgress(mockDoc, 55);
    });
    expect(result.current.getLastPosition('doc-abc')).toBe(55);
  });

  it('returns null for document with no saved progress', () => {
    const { result } = renderHook(() => useBookmarks());
    expect(result.current.getLastPosition('unknown-doc')).toBeNull();
  });

  it('updating progress overwrites previous value', () => {
    const { result } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveProgress(mockDoc, 10);
      result.current.saveProgress(mockDoc, 75);
    });
    expect(result.current.getLastPosition('doc-abc')).toBe(75);
  });
});

describe('useBookmarks — persistence across hook instances', () => {
  it('bookmarks survive unmount and remount (localStorage)', () => {
    const { result, unmount } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveBookmark(mockDoc, 42, 1, 'Persistent');
    });
    unmount();

    const { result: result2 } = renderHook(() => useBookmarks());
    expect(result2.current.getBookmarks('doc-abc')).toHaveLength(1);
    expect(result2.current.getBookmarks('doc-abc')[0].label).toBe('Persistent');
  });

  it('last position survives unmount and remount', () => {
    const { result, unmount } = renderHook(() => useBookmarks());
    act(() => {
      result.current.saveProgress(mockDoc, 88);
    });
    unmount();

    const { result: result2 } = renderHook(() => useBookmarks());
    expect(result2.current.getLastPosition('doc-abc')).toBe(88);
  });
});
