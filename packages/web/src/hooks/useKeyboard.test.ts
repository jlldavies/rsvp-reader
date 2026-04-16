import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboard } from './useKeyboard';
import { useReaderStore } from '../stores/reader-store';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

function makeActions() {
  return {
    toggle: vi.fn(),
    continueReading: vi.fn(),
    skipForward: vi.fn(),
    skipBackward: vi.fn(),
  };
}

function pressKey(code: string, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target });
  window.dispatchEvent(event);
}

beforeEach(() => {
  useReaderStore.setState({
    document: null,
    currentToken: null,
    engineState: 'idle',
    progress: 0,
    settings: DEFAULT_SETTINGS,
    currentSectionHeading: null,
  });
});

describe('useKeyboard — Space key', () => {
  it('calls toggle when Space pressed in idle state', () => {
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('Space');
    expect(actions.toggle).toHaveBeenCalledOnce();
  });

  it('calls toggle when Space pressed in playing state', () => {
    useReaderStore.setState({ engineState: 'playing' });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('Space');
    expect(actions.toggle).toHaveBeenCalledOnce();
  });

  it('calls toggle when Space pressed in paused state', () => {
    useReaderStore.setState({ engineState: 'paused' });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('Space');
    expect(actions.toggle).toHaveBeenCalledOnce();
  });

  it('calls continueReading (not toggle) when Space pressed in section-break state', () => {
    useReaderStore.setState({ engineState: 'section-break' });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('Space');
    expect(actions.continueReading).toHaveBeenCalledOnce();
    expect(actions.toggle).not.toHaveBeenCalled();
  });
});

describe('useKeyboard — Arrow keys', () => {
  it('calls skipForward on ArrowRight', () => {
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowRight');
    expect(actions.skipForward).toHaveBeenCalledOnce();
  });

  it('calls skipBackward on ArrowLeft', () => {
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowLeft');
    expect(actions.skipBackward).toHaveBeenCalledOnce();
  });

  it('increases WPM by 25 on ArrowUp', () => {
    useReaderStore.setState({ settings: { ...DEFAULT_SETTINGS, wpm: 300 } });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowUp');
    expect(useReaderStore.getState().settings.wpm).toBe(325);
  });

  it('decreases WPM by 25 on ArrowDown', () => {
    useReaderStore.setState({ settings: { ...DEFAULT_SETTINGS, wpm: 300 } });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowDown');
    expect(useReaderStore.getState().settings.wpm).toBe(275);
  });

  it('clamps WPM at 1500 maximum on ArrowUp', () => {
    useReaderStore.setState({ settings: { ...DEFAULT_SETTINGS, wpm: 1490 } });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowUp');
    expect(useReaderStore.getState().settings.wpm).toBe(1500);
  });

  it('clamps WPM at 50 minimum on ArrowDown', () => {
    useReaderStore.setState({ settings: { ...DEFAULT_SETTINGS, wpm: 60 } });
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));
    pressKey('ArrowDown');
    expect(useReaderStore.getState().settings.wpm).toBe(50);
  });
});

describe('useKeyboard — input field bypass', () => {
  it('does not call toggle when Space is pressed inside an input', () => {
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));

    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);
    document.body.removeChild(input);

    expect(actions.toggle).not.toHaveBeenCalled();
  });

  it('does not call skipForward when ArrowRight is pressed inside a textarea', () => {
    const actions = makeActions();
    renderHook(() => useKeyboard(actions));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const event = new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);
    document.body.removeChild(textarea);

    expect(actions.skipForward).not.toHaveBeenCalled();
  });
});

describe('useKeyboard — cleanup', () => {
  it('removes the event listener on unmount', () => {
    const actions = makeActions();
    const { unmount } = renderHook(() => useKeyboard(actions));
    unmount();
    pressKey('Space');
    expect(actions.toggle).not.toHaveBeenCalled();
  });
});
