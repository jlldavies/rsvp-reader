import React from 'react';
import { useReaderStore } from '../stores/reader-store';

interface ProgressBarProps {
  onSeek?: (fraction: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ onSeek }) => {
  const { progress } = useReaderStore();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(fraction);
  };

  return (
    <div
      data-testid="progress-track"
      style={{ ...styles.track, cursor: onSeek ? 'pointer' : 'default' }}
      onClick={handleClick}
    >
      <div
        data-testid="progress-fill"
        style={{
          ...styles.fill,
          width: `${Math.round(progress * 100)}%`,
        }}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  track: {
    width: '100%',
    height: 4,
    background: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    background: '#2563eb',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
};
