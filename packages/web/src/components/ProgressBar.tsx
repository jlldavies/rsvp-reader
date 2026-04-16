import React from 'react';
import { useReaderStore } from '../stores/reader-store';

interface ProgressBarProps {
  onSeek?: (fraction: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ onSeek }) => {
  const { progress, document, settings } = useReaderStore();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(fraction);
  };

  const pct = Math.round(progress * 100);

  let timeLabel = '';
  if (document && settings.wpm > 0 && progress < 1) {
    const remainingWords = document.totalWords * (1 - progress);
    const remainingSecs = Math.ceil((remainingWords / settings.wpm) * 60);
    timeLabel = formatTime(remainingSecs);
  }

  return (
    <div style={styles.wrapper}>
      <div
        data-testid="progress-track"
        style={{ ...styles.track, cursor: onSeek ? 'pointer' : 'default' }}
        onClick={handleClick}
      >
        <div
          data-testid="progress-fill"
          style={{
            ...styles.fill,
            width: `${pct}%`,
          }}
        />
      </div>
      <div style={styles.labels}>
        <span style={styles.pctLabel}>{pct}%</span>
        {timeLabel && <span style={styles.timeLabel}>{timeLabel} left</span>}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    padding: '6px 16px 2px',
  },
  track: {
    width: '100%',
    height: 4,
    background: 'var(--color-border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    background: 'var(--color-accent)',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pctLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
  timeLabel: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
  },
};
