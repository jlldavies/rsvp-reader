import { create } from 'zustand';
import type { RsvpDocument, RsvpToken, EngineState, ReaderSettings } from '@rsvp-reader/core';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';

interface ReaderState {
  document: RsvpDocument | null;
  currentToken: RsvpToken | null;
  engineState: EngineState;
  progress: number;
  settings: ReaderSettings;
  currentSectionHeading: string | null;
  beforeText: string;
  afterText: string;

  setDocument: (doc: RsvpDocument | null) => void;
  setCurrentToken: (token: RsvpToken | null) => void;
  setEngineState: (state: EngineState) => void;
  setProgress: (progress: number) => void;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
  setCurrentSectionHeading: (heading: string | null) => void;
  setPhantomContext: (before: string, after: string) => void;
}

const SETTINGS_KEY = 'rsvp-settings';

function loadPersistedSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const useReaderStore = create<ReaderState>((set) => ({
  document: null,
  currentToken: null,
  engineState: 'idle',
  progress: 0,
  settings: loadPersistedSettings(),
  currentSectionHeading: null,
  beforeText: '',
  afterText: '',

  setDocument: (document) => set({ document }),
  setCurrentToken: (currentToken) => set({ currentToken }),
  setEngineState: (engineState) => set({ engineState }),
  setProgress: (progress) => set({ progress }),
  updateSettings: (partial) =>
    set((state) => {
      const next = { ...state.settings, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return { settings: next };
    }),
  setCurrentSectionHeading: (currentSectionHeading) => set({ currentSectionHeading }),
  setPhantomContext: (beforeText, afterText) => set({ beforeText, afterText }),
}));
