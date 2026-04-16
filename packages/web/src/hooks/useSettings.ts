import { useState, useCallback } from 'react';
import type { ReaderSettings } from '@rsvp-reader/core';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

const STORAGE_KEY = 'rsvp-settings';

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: ReaderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

  const updateSetting = useCallback(<K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    persistSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
