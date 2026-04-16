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

  setDocument: (doc: RsvpDocument | null) => void;
  setCurrentToken: (token: RsvpToken | null) => void;
  setEngineState: (state: EngineState) => void;
  setProgress: (progress: number) => void;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
  setCurrentSectionHeading: (heading: string | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  document: null,
  currentToken: null,
  engineState: 'idle',
  progress: 0,
  settings: DEFAULT_SETTINGS,
  currentSectionHeading: null,

  setDocument: (document) => set({ document }),
  setCurrentToken: (currentToken) => set({ currentToken }),
  setEngineState: (engineState) => set({ engineState }),
  setProgress: (progress) => set({ progress }),
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
  setCurrentSectionHeading: (currentSectionHeading) => set({ currentSectionHeading }),
}));
