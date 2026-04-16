import { useEffect, useRef } from 'react';
import { useReaderStore } from '../stores/reader-store';

interface KeyboardActions {
  toggle: () => void;
  continueReading: () => void;
  seekSentenceBack: () => void;
  seekForwardSmart: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const { engineState, updateSettings, settings } = useReaderStore();

  // Track last Delete/Backspace press time for rapid multi-sentence rewind
  const lastDeleteRef = useRef<number>(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture keys when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
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

        // Delete / Backspace — step back one sentence per press.
        // Rapid presses (within 500 ms) keep rewinding sentence by sentence.
        case 'Backspace':
        case 'Delete': {
          e.preventDefault();
          const now = Date.now();
          lastDeleteRef.current = now;
          actions.seekSentenceBack();
          break;
        }

        // Enter — smart skip forward: next sentence, or past a table/data block.
        case 'Enter':
          e.preventDefault();
          actions.seekForwardSmart();
          break;

        // Fine WPM control — ±5 per press
        case 'ArrowRight':
          e.preventDefault();
          updateSettings({ wpm: Math.min(1500, settings.wpm + 5) });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          updateSettings({ wpm: Math.max(50, settings.wpm - 5) });
          break;

        // Coarse WPM control — ±25 for quick jumps
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
