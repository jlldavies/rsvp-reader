import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReaderSettings } from '@rsvp-reader/core';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

const STORAGE_KEY = 'rsvp-settings';

function loadSettings(initial?: Partial<ReaderSettings> | null): ReaderSettings {
  let base: ReaderSettings = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      base = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    base = DEFAULT_SETTINGS;
  }
  return initial ? { ...base, ...initial } : base;
}

function persistSettings(settings: ReaderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings(
  persist?: (s: ReaderSettings) => void,
  initial?: Partial<ReaderSettings> | null
) {
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings(initial));
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // `initial` (e.g. from an async rsvp:init host message) is very often
  // still null/undefined on first render, so the lazy useState initializer
  // above misses it. Apply it here, exactly once, the first time it
  // transitions to a real value — guarded so a later host push (or a
  // changed `initial` reference) never clobbers settings the user has
  // already edited in this session.
  const appliedInitialRef = useRef(false);
  useEffect(() => {
    if (appliedInitialRef.current) return;
    if (initial == null) return;
    appliedInitialRef.current = true;
    setSettings((prev) => {
      const next = { ...prev, ...initial };
      persistSettings(next);
      return next;
    });
  }, [initial]);

  const updateSetting = useCallback(<K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      persistRef.current?.(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    persistSettings(DEFAULT_SETTINGS);
    persistRef.current?.(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
