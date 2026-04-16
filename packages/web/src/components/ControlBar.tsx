import React from 'react';
import { useReaderStore } from '../stores/reader-store';

interface ControlBarProps {
  onToggle: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onToggle,
  onSkipForward,
  onSkipBackward,
}) => {
  const { engineState, settings, updateSettings } = useReaderStore();

  const isPlaying = engineState === 'playing';

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <button style={styles.btn} onClick={onSkipBackward} title="Skip back (Left arrow)" aria-label="Rewind">
          &#x23EA;
        </button>
        <button style={styles.playBtn} onClick={onToggle} title="Play/Pause (Space)" aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '\u23F8' : '\u25B6'}
        </button>
        <button style={styles.btn} onClick={onSkipForward} title="Skip forward (Right arrow)" aria-label="Skip forward">
          &#x23E9;
        </button>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>
          WPM: {settings.wpm}
          <input
            type="range"
            min={50}
            max={1000}
            step={25}
            value={settings.wpm}
            onChange={(e) => updateSettings({ wpm: Number(e.target.value) })}
            style={styles.slider}
          />
        </label>
      </div>

    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
    background: '#fafafa',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    fontSize: 20,
    background: 'none',
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  playBtn: {
    fontSize: 24,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 24px',
    cursor: 'pointer',
  },
  label: {
    fontSize: 14,
    color: '#555',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    width: 160,
    cursor: 'pointer',
  },
};
