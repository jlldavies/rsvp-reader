import { useEffect } from 'react';
import { useReaderStore } from '../stores/reader-store';

interface KeyboardActions {
  toggle: () => void;
  continueReading: () => void;
  skipForward: () => void;
  skipBackward: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const { engineState, updateSettings, settings } = useReaderStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture keys when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (engineState === 'section-break') {
            actions.continueReading();
          } else {
            actions.toggle();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.skipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.skipBackward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSettings({ wpm: Math.min(1500, settings.wpm + 25) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateSettings({ wpm: Math.max(50, settings.wpm - 25) });
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, engineState, settings.wpm, updateSettings]);
}
