import React, { useState } from 'react';
import type { DocumentProgress, RsvpDocument, SavedPosition } from '@rsvp-reader/core';

interface HistoryEntry extends DocumentProgress {
  doc: RsvpDocument | null;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onOpen: (doc: RsvpDocument) => void;
  onJumpToBookmark: (doc: RsvpDocument, bookmark: SavedPosition) => void;
  onRemove: (docId: string) => void;
  onClearAll: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onOpen,
  onJumpToBookmark,
  onRemove,
  onClearAll,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>No history yet.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <span style={styles.heading}>History</span>
        <button style={styles.clearBtn} onClick={onClearAll}>Clear all</button>
      </div>
      {history.map(entry => (
        <div key={entry.documentId} style={styles.entry}>
          <div style={styles.entryHeader}>
            <div style={styles.entryInfo}>
              <span style={styles.entryTitle}>{entry.title}</span>
              <span style={styles.entryMeta}>
                {entry.totalWords} words · {new Date(entry.lastRead ?? 0).toLocaleDateString()}
              </span>
            </div>
            <div style={styles.entryActions}>
              {entry.doc && (
                <button style={styles.openBtn} onClick={() => onOpen(entry.doc!)}>
                  Open
                </button>
              )}
              <button
                style={styles.expandBtn}
                onClick={() => setExpanded(expanded === entry.documentId ? null : entry.documentId)}
              >
                {(entry.positions?.length ?? 0) > 0
                  ? `${entry.positions.length} bookmark${entry.positions.length !== 1 ? 's' : ''}`
                  : 'No bookmarks'
                } {expanded === entry.documentId ? '▲' : '▼'}
              </button>
              <button style={styles.removeBtn} onClick={() => onRemove(entry.documentId)}>✕</button>
            </div>
          </div>
          {expanded === entry.documentId && (
            <div style={styles.bookmarkList}>
              {(entry.positions?.length ?? 0) === 0 ? (
                <div style={styles.noBookmarks}>No bookmarks for this document</div>
              ) : (
                entry.positions.map(pos => (
                  <div key={pos.id} style={styles.bookmark}>
                    <span style={styles.bookmarkLabel}>{pos.label}</span>
                    <span style={styles.bookmarkMeta}>Word {pos.tokenIndex + 1}</span>
                    {entry.doc && (
                      <button
                        style={styles.jumpBtn}
                        onClick={() => onJumpToBookmark(entry.doc!, pos)}
                      >
                        Jump
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 16px',
    maxHeight: 400,
    overflowY: 'auto',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heading: {
    fontWeight: 600,
    fontSize: 15,
    color: 'var(--color-text)',
  },
  empty: {
    color: 'var(--color-text-muted)',
    fontSize: 14,
    padding: '8px 0',
  },
  clearBtn: {
    fontSize: 12,
    padding: '3px 10px',
    border: '1px solid var(--color-error-border)',
    borderRadius: 4,
    background: 'var(--color-btn-bg)',
    color: 'var(--color-error-text)',
    cursor: 'pointer',
  },
  entry: {
    borderBottom: '1px solid var(--color-border-light)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  entryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  entryTitle: {
    fontWeight: 600,
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text)',
  },
  entryMeta: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
  entryActions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
    alignItems: 'center',
  },
  openBtn: {
    fontSize: 12,
    padding: '3px 10px',
    border: '1px solid #2563eb',
    borderRadius: 4,
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
  expandBtn: {
    fontSize: 11,
    padding: '3px 8px',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-btn-bg)',
    cursor: 'pointer',
    color: 'var(--color-text-subtle)',
  },
  removeBtn: {
    fontSize: 12,
    padding: '3px 7px',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-btn-bg)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  },
  bookmarkList: {
    marginTop: 6,
    paddingLeft: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  noBookmarks: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  bookmark: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
  },
  bookmarkLabel: {
    flex: 1,
    color: 'var(--color-text)',
  },
  bookmarkMeta: {
    color: 'var(--color-text-muted)',
    fontSize: 11,
  },
  jumpBtn: {
    fontSize: 11,
    padding: '2px 8px',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-btn-bg)',
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
};
