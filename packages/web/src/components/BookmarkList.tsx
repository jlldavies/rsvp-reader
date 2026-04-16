import React, { useState } from 'react';
import type { SavedPosition } from '@rsvp-reader/core';

interface BookmarkListProps {
  bookmarks: SavedPosition[];
  onJump: (bookmark: SavedPosition) => void;
  onDelete: (id: string) => void;
  onSave: (label: string) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onJump,
  onDelete,
  onSave,
}) => {
  const [label, setLabel] = useState('');

  const handleSave = () => {
    onSave(label);
    setLabel('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.saveRow}>
        <input
          style={styles.input}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Bookmark name"
        />
        <button style={styles.saveBtn} onClick={handleSave}>
          Save bookmark
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <p style={styles.empty}>No bookmarks saved yet.</p>
      ) : (
        <ul style={styles.list}>
          {bookmarks.map((bm) => (
            <li key={bm.id} style={styles.item}>
              <span style={styles.itemLabel}>{bm.label || '(unnamed)'}</span>
              <div style={styles.itemActions}>
                <button style={styles.jumpBtn} onClick={() => onJump(bm)}>
                  Jump
                </button>
                <button style={styles.deleteBtn} onClick={() => onDelete(bm.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
  },
  saveRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 14,
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-bg-input)',
    color: 'var(--color-text)',
  },
  saveBtn: {
    padding: '6px 12px',
    fontSize: 13,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  empty: {
    fontSize: 13,
    color: 'var(--color-text-muted)',
    margin: 0,
    fontStyle: 'italic',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    background: 'var(--color-bg-secondary)',
    borderRadius: 4,
    border: '1px solid var(--color-border-light)',
  },
  itemLabel: {
    fontSize: 13,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text)',
  },
  itemActions: {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  },
  jumpBtn: {
    padding: '3px 8px',
    fontSize: 12,
    background: 'var(--color-btn-bg)',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
  deleteBtn: {
    padding: '3px 8px',
    fontSize: 12,
    background: 'var(--color-btn-bg)',
    border: '1px solid var(--color-error-border)',
    color: 'var(--color-error-text)',
    borderRadius: 4,
    cursor: 'pointer',
  },
};
