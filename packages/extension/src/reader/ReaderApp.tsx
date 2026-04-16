import React, { useEffect, useRef } from 'react';
import { RsvpEngine } from '@rsvp-reader/core';
import type { RsvpDocument, RsvpToken, EngineState } from '@rsvp-reader/core';

interface ReaderAppProps {
  document: RsvpDocument;
  wpm: number;
  onClose: () => void;
}

export const ReaderApp: React.FC<ReaderAppProps> = ({ document: doc, wpm, onClose }) => {
  const engineRef = useRef<RsvpEngine | null>(null);
  const [token, setToken] = React.useState<RsvpToken | null>(null);
  const [state, setState] = React.useState<EngineState>('idle');
  const [progress, setProgress] = React.useState(0);
  const [sectionHeading, setSectionHeading] = React.useState<string | null>(null);

  useEffect(() => {
    const engine = new RsvpEngine();
    engineRef.current = engine;

    engine.setWpm(wpm);
    engine.onToken((t, p) => {
      setToken(t);
      setProgress(p);
    });
    engine.onStateChange((s, section) => {
      setState(s);
      if (section?.heading) setSectionHeading(section.heading);
    });

    engine.loadDocument(doc);
    engine.play();

    return () => engine.destroy();
  }, [doc, wpm]);

  const handleToggle = () => engineRef.current?.toggle();
  const handleContinue = () => engineRef.current?.continue();

  // Keyboard: Space=toggle/continue, Escape=close (handled by overlay)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (state === 'section-break') handleContinue();
        else handleToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state]);

  const orpIndex = token?.orpIndex ?? 0;
  const text = token?.text ?? '';
  const prefix = text.slice(0, orpIndex);
  const orp = text[orpIndex] ?? '';
  const suffix = text.slice(orpIndex + 1);

  return (
    <div style={styles.container}>
      <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)">✕</button>

      {state === 'section-break' ? (
        <div style={styles.sectionBreak}>
          <div style={styles.sectionHeading}>{sectionHeading || 'Next Section'}</div>
          <div style={styles.hint}>Press Space to continue</div>
        </div>
      ) : state === 'finished' ? (
        <div style={styles.sectionBreak}>
          <div style={styles.sectionHeading}>Done!</div>
        </div>
      ) : (
        <div style={styles.wordContainer}>
          <span style={styles.prefix}>{prefix}</span>
          <span style={styles.orp}>{orp}</span>
          <span style={styles.suffix}>{suffix}</span>
        </div>
      )}

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${Math.round(progress * 100)}%` }} />
      </div>

      <div style={styles.controls}>
        <button style={styles.controlBtn} onClick={handleToggle}>
          {state === 'playing' ? '⏸' : '▶'}
        </button>
        <span style={styles.wpmLabel}>{wpm} WPM</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    background: '#1a1a2e',
    borderRadius: 16,
    padding: '40px 48px',
    width: 640,
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    color: '#eee',
    fontFamily: "'Courier New', Courier, monospace",
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
  },
  wordContainer: {
    display: 'flex',
    alignItems: 'baseline',
    fontSize: 52,
    fontWeight: 500,
    whiteSpace: 'pre',
    minHeight: 70,
  },
  prefix: {
    textAlign: 'right',
    minWidth: 210,
    display: 'inline-block',
    color: '#ccc',
  },
  orp: {
    color: '#ff4444',
    fontWeight: 700,
    minWidth: '0.6em',
    textAlign: 'center',
    display: 'inline-block',
  },
  suffix: {
    textAlign: 'left',
    minWidth: 210,
    display: 'inline-block',
    color: '#ccc',
  },
  sectionBreak: {
    textAlign: 'center',
    minHeight: 70,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 26,
    fontWeight: 600,
    color: '#eee',
  },
  hint: {
    fontSize: 14,
    color: '#888',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    background: '#333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    background: '#2563eb',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  controlBtn: {
    fontSize: 24,
    background: 'none',
    border: '1px solid #444',
    color: '#eee',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  wpmLabel: {
    fontSize: 14,
    color: '#888',
  },
};
