import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';
import type { ReaderSettings } from '@rsvp-reader/core';

beforeEach(() => {
  localStorage.clear();
});

describe('useSettings — defaults', () => {
  it('returns DEFAULT_SETTINGS when nothing is saved', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('default WPM is 300', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.wpm).toBe(300);
  });

  it('default chunkSize is 1', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.chunkSize).toBe(1);
  });

  it('default theme is system', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe('system');
  });

  it('default sectionPauseMode is manual', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.sectionPauseMode).toBe('manual');
  });
});

describe('useSettings — updating', () => {
  it('updates a single setting', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 500);
    });
    expect(result.current.settings.wpm).toBe(500);
  });

  it('updating one setting leaves others unchanged', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 400);
    });
    expect(result.current.settings.chunkSize).toBe(DEFAULT_SETTINGS.chunkSize);
    expect(result.current.settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('can update orpColor', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('orpColor', '#0000ff');
    });
    expect(result.current.settings.orpColor).toBe('#0000ff');
  });

  it('can update theme to dark', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('theme', 'dark');
    });
    expect(result.current.settings.theme).toBe('dark');
  });

  it('can update chunkSize to 3', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('chunkSize', 3);
    });
    expect(result.current.settings.chunkSize).toBe(3);
  });
});

describe('useSettings — persistence', () => {
  it('settings survive unmount and remount', () => {
    const { result, unmount } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 750);
    });
    unmount();

    const { result: result2 } = renderHook(() => useSettings());
    expect(result2.current.settings.wpm).toBe(750);
  });

  it('multiple settings survive remount', () => {
    const { result, unmount } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 600);
      result.current.updateSetting('theme', 'dark');
      result.current.updateSetting('chunkSize', 2);
    });
    unmount();

    const { result: result2 } = renderHook(() => useSettings());
    expect(result2.current.settings.wpm).toBe(600);
    expect(result2.current.settings.theme).toBe('dark');
    expect(result2.current.settings.chunkSize).toBe(2);
  });

  it('persisted settings are merged with defaults (new keys get defaults)', () => {
    // Simulate old data missing a key by writing partial settings directly
    localStorage.setItem('rsvp-settings', JSON.stringify({ wpm: 400 }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.wpm).toBe(400);
    expect(result.current.settings.chunkSize).toBe(DEFAULT_SETTINGS.chunkSize);
    expect(result.current.settings.orpColor).toBe(DEFAULT_SETTINGS.orpColor);
  });

  it('handles corrupt localStorage gracefully (falls back to defaults)', () => {
    localStorage.setItem('rsvp-settings', 'not-valid-json{{{');
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('useSettings — persist callback', () => {
  it('calls persist with the merged settings on update', () => {
    const persist = vi.fn();
    const { result } = renderHook(() => useSettings(persist));
    act(() => {
      result.current.updateSetting('wpm', 450);
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, wpm: 450 });
  });

  it('calls persist with DEFAULT_SETTINGS on resetSettings', () => {
    const persist = vi.fn();
    const { result } = renderHook(() => useSettings(persist));
    act(() => {
      result.current.updateSetting('wpm', 450);
    });
    persist.mockClear();
    act(() => {
      result.current.resetSettings();
    });
    expect(persist).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it('still writes to localStorage when a persist callback is given', () => {
    const persist = vi.fn();
    const { result, unmount } = renderHook(() => useSettings(persist));
    act(() => {
      result.current.updateSetting('wpm', 620);
    });
    unmount();

    const { result: result2 } = renderHook(() => useSettings());
    expect(result2.current.settings.wpm).toBe(620);
  });

  it('works with no persist callback (existing callers keep working)', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 700);
    });
    expect(result.current.settings.wpm).toBe(700);
  });
});

describe('useSettings — initial (from host init)', () => {
  it('merges initial over DEFAULT_SETTINGS when nothing is in localStorage', () => {
    const { result } = renderHook(() => useSettings(undefined, { wpm: 550, theme: 'dark' }));
    expect(result.current.settings.wpm).toBe(550);
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.chunkSize).toBe(DEFAULT_SETTINGS.chunkSize);
  });

  it('merges initial over persisted localStorage settings (initial wins)', () => {
    localStorage.setItem('rsvp-settings', JSON.stringify({ wpm: 400, chunkSize: 2 }));
    const { result } = renderHook(() => useSettings(undefined, { wpm: 550 }));
    expect(result.current.settings.wpm).toBe(550);
    expect(result.current.settings.chunkSize).toBe(2);
  });

  it('null initial behaves like no initial at all', () => {
    const { result } = renderHook(() => useSettings(undefined, null));
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('applies initial when it transitions from null to a value on a later render (async host init)', () => {
    const { result, rerender } = renderHook(
      ({ init }: { init: Partial<ReaderSettings> | null }) => useSettings(undefined, init),
      { initialProps: { init: null } }
    );
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);

    rerender({ init: { wpm: 550 } });

    expect(result.current.settings.wpm).toBe(550);
    expect(result.current.settings.chunkSize).toBe(DEFAULT_SETTINGS.chunkSize);
  });

  it('a later change to initial does not clobber a setting the user already edited (read-once guard)', () => {
    const { result, rerender } = renderHook(
      ({ init }: { init: Partial<ReaderSettings> | null }) => useSettings(undefined, init),
      { initialProps: { init: null } }
    );

    rerender({ init: { wpm: 550 } });
    expect(result.current.settings.wpm).toBe(550);

    act(() => {
      result.current.updateSetting('wpm', 720);
    });
    expect(result.current.settings.wpm).toBe(720);

    rerender({ init: { wpm: 900 } });

    expect(result.current.settings.wpm).toBe(720);
  });
});

describe('useSettings — resetSettings', () => {
  it('resets all settings back to defaults', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 999);
      result.current.updateSetting('theme', 'dark');
    });
    act(() => {
      result.current.resetSettings();
    });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('after reset, remount still shows defaults', () => {
    const { result, unmount } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSetting('wpm', 999);
    });
    act(() => {
      result.current.resetSettings();
    });
    unmount();

    const { result: result2 } = renderHook(() => useSettings());
    expect(result2.current.settings.wpm).toBe(DEFAULT_SETTINGS.wpm);
  });
});
