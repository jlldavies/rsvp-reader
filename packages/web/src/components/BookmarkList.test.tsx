import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BookmarkList } from './BookmarkList';
import type { SavedPosition } from '@rsvp-reader/core';

function makeBookmark(overrides: Partial<SavedPosition> = {}): SavedPosition {
  return {
    id: 'bm-1',
    tokenIndex: 42,
    sectionIndex: 1,
    label: 'My Bookmark',
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
});

describe('BookmarkList — empty state', () => {
  it('shows a "no bookmarks" message when list is empty', () => {
    render(<BookmarkList bookmarks={[]} onJump={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText(/no bookmarks/i)).toBeInTheDocument();
  });
});

describe('BookmarkList — rendering bookmarks', () => {
  it('renders each bookmark label', () => {
    const bookmarks = [
      makeBookmark({ id: 'a', label: 'Chapter One' }),
      makeBookmark({ id: 'b', label: 'Chapter Two' }),
    ];
    render(<BookmarkList bookmarks={bookmarks} onJump={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText('Chapter One')).toBeInTheDocument();
    expect(screen.getByText('Chapter Two')).toBeInTheDocument();
  });

  it('renders a jump button for each bookmark', () => {
    const bookmarks = [makeBookmark({ id: 'a', label: 'Mark A' })];
    render(<BookmarkList bookmarks={bookmarks} onJump={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /jump/i })).toBeInTheDocument();
  });

  it('renders a delete button for each bookmark', () => {
    const bookmarks = [makeBookmark({ id: 'a', label: 'Mark A' })];
    render(<BookmarkList bookmarks={bookmarks} onJump={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});

describe('BookmarkList — interactions', () => {
  it('calls onJump with the bookmark when jump is clicked', () => {
    const onJump = vi.fn();
    const bm = makeBookmark({ id: 'a', tokenIndex: 77 });
    render(<BookmarkList bookmarks={[bm]} onJump={onJump} onDelete={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /jump/i }));
    expect(onJump).toHaveBeenCalledWith(bm);
  });

  it('calls onDelete with the bookmark id when delete is clicked', () => {
    const onDelete = vi.fn();
    const bm = makeBookmark({ id: 'bm-99' });
    render(<BookmarkList bookmarks={[bm]} onJump={vi.fn()} onDelete={onDelete} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('bm-99');
  });
});

describe('BookmarkList — save new bookmark', () => {
  it('renders a "Save bookmark" button', () => {
    render(<BookmarkList bookmarks={[]} onJump={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save bookmark/i })).toBeInTheDocument();
  });

  it('calls onSave with the entered label when Save is clicked', () => {
    const onSave = vi.fn();
    render(<BookmarkList bookmarks={[]} onJump={vi.fn()} onDelete={vi.fn()} onSave={onSave} />);
    const input = screen.getByPlaceholderText(/bookmark name/i);
    fireEvent.change(input, { target: { value: 'My spot' } });
    fireEvent.click(screen.getByRole('button', { name: /save bookmark/i }));
    expect(onSave).toHaveBeenCalledWith('My spot');
  });

  it('clears the input after saving', () => {
    const onSave = vi.fn();
    render(<BookmarkList bookmarks={[]} onJump={vi.fn()} onDelete={vi.fn()} onSave={onSave} />);
    const input = screen.getByPlaceholderText(/bookmark name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My spot' } });
    fireEvent.click(screen.getByRole('button', { name: /save bookmark/i }));
    expect(input.value).toBe('');
  });

  it('calls onSave with empty string when no label entered', () => {
    const onSave = vi.fn();
    render(<BookmarkList bookmarks={[]} onJump={vi.fn()} onDelete={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /save bookmark/i }));
    expect(onSave).toHaveBeenCalledWith('');
  });
});
