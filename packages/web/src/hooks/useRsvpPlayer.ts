import { useRef, useEffect, useCallback } from 'react';
import { RsvpEngine } from '@rsvp-reader/core';
import type { RsvpDocument } from '@rsvp-reader/core';
import { useReaderStore } from '../stores/reader-store';

export function useRsvpPlayer() {
  const engineRef = useRef<RsvpEngine | null>(null);

  const {
    settings,
    setCurrentToken,
    setEngineState,
    setProgress,
    setDocument,
    setCurrentSectionHeading,
  } = useReaderStore();

  // Lazy init engine
  if (!engineRef.current) {
    engineRef.current = new RsvpEngine();
  }

  const engine = engineRef.current;

  // Sync settings to engine
  useEffect(() => {
    engine.setWpm(settings.wpm);
    engine.setChunkSize(settings.chunkSize);
    engine.setSectionPauseMode(settings.sectionPauseMode);
    engine.setParagraphPauseMode(settings.paragraphPauseMode);
  }, [engine, settings.wpm, settings.chunkSize, settings.sectionPauseMode, settings.paragraphPauseMode]);

  // Wire up callbacks
  useEffect(() => {
    const unsubToken = engine.onToken((token, progress) => {
      setCurrentToken(token);
      setProgress(progress);
    });

    const unsubState = engine.onStateChange((state, section) => {
      setEngineState(state);
      if (section?.heading) {
        setCurrentSectionHeading(section.heading);
      }
    });

    return () => {
      unsubToken();
      unsubState();
    };
  }, [engine, setCurrentToken, setEngineState, setProgress, setCurrentSectionHeading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => engine.destroy();
  }, [engine]);

  const loadDocument = useCallback(
    (doc: RsvpDocument, startPosition?: number) => {
      engine.loadDocument(doc);
      if (startPosition != null && startPosition > 0) {
        engine.seekTo(startPosition);
      }
      setDocument(doc);
      setCurrentToken(null);
      setProgress(startPosition != null ? startPosition / Math.max(1, doc.totalWords) : 0);
    },
    [engine, setDocument, setCurrentToken, setProgress]
  );

  const play = useCallback(() => engine.play(), [engine]);
  const pause = useCallback(() => engine.pause(), [engine]);
  const toggle = useCallback(() => engine.toggle(), [engine]);
  const continueReading = useCallback(() => engine.continue(), [engine]);
  const skipForward = useCallback(() => engine.skipForward(10), [engine]);
  const skipBackward = useCallback(() => engine.skipBackward(10), [engine]);
  const seekTo = useCallback((idx: number) => engine.seekTo(idx), [engine]);
  const seekSentenceBack = useCallback(() => engine.seekSentenceBack(), [engine]);
  const seekForwardSmart = useCallback(() => engine.seekForwardSmart(), [engine]);

  return {
    loadDocument,
    play,
    pause,
    toggle,
    continueReading,
    skipForward,
    skipBackward,
    seekTo,
    seekSentenceBack,
    seekForwardSmart,
  };
}
