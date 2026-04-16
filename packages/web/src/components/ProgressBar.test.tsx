import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';
import { useReaderStore } from '../stores/reader-store';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

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

describe('ProgressBar — display', () => {
  it('renders a progress track element', () => {
    render(<ProgressBar />);
    // The track is the outer container — query by role or test-id
    // We check the fill width reflects 0% when progress=0
    const fill = document.querySelector('[data-testid="progress-fill"]');
    expect(fill).toBeInTheDocument();
  });

  it('fill width reflects 0% when progress is 0', () => {
    useReaderStore.setState({ progress: 0 });
    render(<ProgressBar />);
    const fill = document.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('fill width reflects 50% when progress is 0.5', () => {
    useReaderStore.setState({ progress: 0.5 });
    render(<ProgressBar />);
    const fill = document.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('fill width reflects 100% when progress is 1', () => {
    useReaderStore.setState({ progress: 1 });
    render(<ProgressBar />);
    const fill = document.querySelector('[data-testid="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});

describe('ProgressBar — seek on click', () => {
  it('calls onSeek with the click fraction when clicked', () => {
    const onSeek = vi.fn();
    render(<ProgressBar onSeek={onSeek} />);

    const track = document.querySelector('[data-testid="progress-track"]') as HTMLElement;
    // Mock bounding rect: 0–400px wide
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 400, width: 400, top: 0, bottom: 4, height: 4, x: 0, y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientX: 200 });
    expect(onSeek).toHaveBeenCalledOnce();
    expect(onSeek).toHaveBeenCalledWith(0.5);
  });

  it('calls onSeek with 0 when clicking at far left', () => {
    const onSeek = vi.fn();
    render(<ProgressBar onSeek={onSeek} />);

    const track = document.querySelector('[data-testid="progress-track"]') as HTMLElement;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 100, right: 500, width: 400, top: 0, bottom: 4, height: 4, x: 100, y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientX: 100 }); // exactly at left edge
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('calls onSeek with 1 when clicking at far right', () => {
    const onSeek = vi.fn();
    render(<ProgressBar onSeek={onSeek} />);

    const track = document.querySelector('[data-testid="progress-track"]') as HTMLElement;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 400, width: 400, top: 0, bottom: 4, height: 4, x: 0, y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientX: 400 });
    expect(onSeek).toHaveBeenCalledWith(1);
  });

  it('clamps seek fraction to [0, 1] for out-of-bounds clicks', () => {
    const onSeek = vi.fn();
    render(<ProgressBar onSeek={onSeek} />);

    const track = document.querySelector('[data-testid="progress-track"]') as HTMLElement;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 400, width: 400, top: 0, bottom: 4, height: 4, x: 0, y: 0,
      toJSON: () => {},
    });

    fireEvent.click(track, { clientX: -50 });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it('does not call onSeek when no onSeek prop provided', () => {
    // Should not throw
    render(<ProgressBar />);
    const track = document.querySelector('[data-testid="progress-track"]') as HTMLElement;
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0, right: 400, width: 400, top: 0, bottom: 4, height: 4, x: 0, y: 0,
      toJSON: () => {},
    });
    expect(() => fireEvent.click(track, { clientX: 200 })).not.toThrow();
  });
});
