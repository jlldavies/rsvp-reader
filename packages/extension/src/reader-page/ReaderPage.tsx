import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RsvpEngine } from '@rsvp-reader/core';
import type { RsvpDocument, RsvpToken, EngineState } from '@rsvp-reader/core';

interface ReaderPageProps {
  doc: RsvpDocument;
  initialWpm: number;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ doc, initialWpm }) => {
  const engineRef = useRef<RsvpEngine | null>(null);
  const [token, setToken] = useState<RsvpToken | null>(null);
  const [state, setState] = useState<EngineState>('idle');
  const [progress, setProgress] = useState(0);
  const [sectionHeading, setSectionHeading] = useState<string | null>(null);
  const [wpm, setWpm] = useState(initialWpm);
  const wpmRef = useRef(initialWpm);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    const engine = new RsvpEngine();
    engineRef.current = engine;

    engine.setWpm(wpmRef.current);
    engine.onToken((t, p) => {
      setToken(t);
      setProgress(p);
      currentIndexRef.current = Math.round(p * doc.totalWords);
    });
    engine.onStateChange((s, section) => {
      setState(s);
      if (section?.heading) setSectionHeading(section.heading);
    });

    engine.loadDocument(doc);
    engine.play();

    return () => engine.destroy();
  }, [doc]);

  const changeWpm = useCallback((delta: number) => {
    setWpm(prev => {
      const next = Math.max(50, Math.min(1500, prev + delta));
      wpmRef.current = next;
      engineRef.current?.setWpm(next);
      // Persist to storage
      chrome.storage.sync.set({ wpm: next });
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state === 'section-break') engine.continue();
          else engine.toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          engine.seekTo(Math.max(0, currentIndexRef.current - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          engine.seekTo(Math.min(doc.totalWords - 1, currentIndexRef.current + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeWpm(25);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeWpm(-25);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          engine.seekSentenceBack();
          break;
        case 'Enter':
          e.preventDefault();
          engine.seekForwardSmart();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, changeWpm]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const tokenIndex = Math.round(fraction * doc.totalWords);
    engineRef.current?.seekTo(tokenIndex);
  };

  const orpIndex = token?.orpIndex ?? 0;
  const text = token?.text ?? '';
  const prefix = text.slice(0, orpIndex);
  const orp = text[orpIndex] ?? '';
  const suffix = text.slice(orpIndex + 1);
  const currentWord = Math.round(progress * doc.totalWords);
  const minutesLeft = Math.ceil((doc.totalWords - currentWord) / wpm);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title} title={doc.title}>{doc.title}</span>
        <span style={styles.meta}>{doc.totalWords.toLocaleString()} words · ~{minutesLeft} min left</span>
      </div>

      {/* Progress bar */}
      <div style={styles.progressTrack} onClick={handleProgressClick} title="Click to seek">
        <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
      </div>

      {/* Main display */}
      <div style={styles.main}>
        {state === 'section-break' ? (
          <div style={styles.breakBox}>
            <div style={styles.breakHeading}>{sectionHeading || 'Next Section'}</div>
            <div style={styles.breakHint}>Press Space to continue</div>
          </div>
        ) : state === 'finished' ? (
          <div style={styles.breakBox}>
            <div style={styles.breakHeading}>Finished!</div>
            <div style={styles.breakHint}>Press Space to restart</div>
          </div>
        ) : (
          <div style={styles.wordRow}>
            <span style={styles.prefix}>{prefix}</span>
            <span style={styles.orpLetter}>{orp}</span>
            <span style={styles.suffix}>{suffix}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button style={styles.wpmBtn} onClick={() => changeWpm(-25)} title="Slower (↓)">−</button>
        <span style={styles.wpmDisplay}>{wpm} WPM</span>
        <button style={styles.wpmBtn} onClick={() => changeWpm(25)} title="Faster (↑)">+</button>

        <button
          style={styles.playBtn}
          onClick={() => {
            if (state === 'section-break') engineRef.current?.continue();
            else engineRef.current?.toggle();
          }}
        >
          {state === 'playing' ? '⏸' : '▶'}
        </button>

        <button style={styles.seekBtn} onClick={() => engineRef.current?.seekTo(Math.max(0, currentIndexRef.current - 5))} title="Back 5 words (←)">⏮</button>
        <button style={styles.seekBtn} onClick={() => engineRef.current?.seekTo(Math.min(doc.totalWords - 1, currentIndexRef.current + 5))} title="Forward 5 words (→)">⏭</button>
      </div>

      {/* Keyboard hint */}
      <div style={styles.hint}>
        Space play/pause · ←→ ±5 words · ↑↓ ±25 WPM · Del back sentence · Enter skip sentence
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f0f1a',
    color: '#e8e8f0',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Courier New', Courier, monospace",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid #2a2a3e',
    gap: 16,
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: '#c0c0d8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    fontFamily: 'system-ui, sans-serif',
  },
  meta: {
    fontSize: 13,
    color: '#666',
    flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
  },
  progressTrack: {
    height: 4,
    background: '#2a2a3e',
    cursor: 'pointer',
    flexShrink: 0,
  },
  progressFill: {
    height: '100%',
    background: '#2563eb',
    transition: 'width 0.1s linear',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  wordRow: {
    display: 'flex',
    alignItems: 'baseline',
    fontSize: 'clamp(36px, 6vw, 72px)',
    fontWeight: 500,
    whiteSpace: 'pre',
    lineHeight: 1.2,
  },
  prefix: {
    color: '#b0b0c8',
    textAlign: 'right',
    minWidth: '6ch',
    display: 'inline-block',
  },
  orpLetter: {
    color: '#ff5555',
    fontWeight: 700,
    minWidth: '1ch',
    textAlign: 'center',
    display: 'inline-block',
  },
  suffix: {
    color: '#b0b0c8',
    textAlign: 'left',
    minWidth: '6ch',
    display: 'inline-block',
  },
  breakBox: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  breakHeading: {
    fontSize: 'clamp(24px, 4vw, 40px)',
    fontWeight: 600,
    color: '#e8e8f0',
  },
  breakHint: {
    fontSize: 16,
    color: '#666',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid #2a2a3e',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  wpmBtn: {
    fontSize: 20,
    background: 'none',
    border: '1px solid #3a3a5e',
    color: '#aaa',
    borderRadius: 6,
    padding: '4px 14px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  wpmDisplay: {
    fontSize: 18,
    color: '#e8e8f0',
    minWidth: 90,
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  playBtn: {
    fontSize: 26,
    background: '#2563eb',
    border: 'none',
    color: '#fff',
    borderRadius: 50,
    width: 52,
    height: 52,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  seekBtn: {
    fontSize: 20,
    background: 'none',
    border: '1px solid #3a3a5e',
    color: '#aaa',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#444',
    padding: '8px 24px 16px',
    flexShrink: 0,
    fontFamily: 'system-ui, sans-serif',
  },
};
