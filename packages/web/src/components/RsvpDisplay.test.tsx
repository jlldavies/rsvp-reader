import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RsvpDisplay } from './RsvpDisplay';
import { useReaderStore } from '../stores/reader-store';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

// Clean up DOM then reset store before each test
beforeEach(() => {
  cleanup();
  useReaderStore.setState({
    document: null,
    currentToken: null,
    engineState: 'idle',
    progress: 0,
    settings: DEFAULT_SETTINGS,
    currentSectionHeading: null,
  });
});

const mockToken = (text: string, orpIndex: number) => ({
  index: 0,
  text,
  orpIndex,
  displayMs: 200,
  isParagraphEnd: false,
  isSectionEnd: false,
  hasPunctuation: false,
});

describe('RsvpDisplay — placeholder state', () => {
  it('shows placeholder when there is no token and state is idle', () => {
    render(<RsvpDisplay />);
    expect(screen.getByText(/paste text or import/i)).toBeInTheDocument();
  });

  it('shows placeholder when state is paused but no current token', () => {
    useReaderStore.setState({ engineState: 'paused' });
    render(<RsvpDisplay />);
    expect(screen.getByText(/paste text or import/i)).toBeInTheDocument();
  });
});

describe('RsvpDisplay — section-break overlay', () => {
  it('shows "Press Space to continue" in section-break state', () => {
    useReaderStore.setState({ engineState: 'section-break' });
    render(<RsvpDisplay />);
    expect(screen.getByText(/press space to continue/i)).toBeInTheDocument();
  });

  it('shows the current section heading when provided', () => {
    useReaderStore.setState({
      engineState: 'section-break',
      currentSectionHeading: 'Chapter Two',
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('Chapter Two')).toBeInTheDocument();
  });

  it('shows "Next Section" fallback when heading is null', () => {
    useReaderStore.setState({
      engineState: 'section-break',
      currentSectionHeading: null,
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('Next Section')).toBeInTheDocument();
  });

  it('does not show the word display in section-break state', () => {
    useReaderStore.setState({
      engineState: 'section-break',
      currentToken: mockToken('Hello', 1),
    });
    render(<RsvpDisplay />);
    expect(screen.queryByText('H')).not.toBeInTheDocument();
  });
});

describe('RsvpDisplay — word display', () => {
  it('renders the ORP letter', () => {
    // "Hello" with orpIndex=1 → prefix="H", orp="e", suffix="llo"
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('e')).toBeInTheDocument();
  });

  it('renders the prefix portion', () => {
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('renders the suffix portion', () => {
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('llo')).toBeInTheDocument();
  });

  it('renders single-letter word with empty prefix and suffix', () => {
    // "A" with orpIndex=0 → prefix="", orp="A", suffix=""
    useReaderStore.setState({
      currentToken: mockToken('A', 0),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies orpColor from settings to the ORP letter', () => {
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
      settings: { ...DEFAULT_SETTINGS, orpColor: '#ff0000' },
    });
    render(<RsvpDisplay />);
    const orpEl = screen.getByText('e');
    expect(orpEl).toHaveStyle({ color: '#ff0000' });
  });

  it('applies CSS var for prefix color', () => {
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    const prefixEl = screen.getByText('H');
    expect(prefixEl).toHaveStyle({ color: 'var(--color-word-prefix)' });
  });

  it('applies CSS var for suffix color', () => {
    useReaderStore.setState({
      currentToken: mockToken('Hello', 1),
      engineState: 'playing',
    });
    render(<RsvpDisplay />);
    const suffixEl = screen.getByText('llo');
    expect(suffixEl).toHaveStyle({ color: 'var(--color-word-suffix)' });
  });
});
