import React from 'react';
import { useReaderStore } from '../stores/reader-store';

export const RsvpDisplay: React.FC = () => {
  const { currentToken, settings, engineState, currentSectionHeading } =
    useReaderStore();

  if (engineState === 'section-break') {
    return (
      <div style={styles.container}>
        <div style={styles.sectionBreak}>
          <div style={styles.sectionHeading}>
            {currentSectionHeading || 'Next Section'}
          </div>
          <div style={styles.sectionHint}>Press Space to continue</div>
        </div>
      </div>
    );
  }

  if (!currentToken) {
    return (
      <div style={styles.container}>
        <div style={styles.placeholder}>
          Paste text or import a document to begin
        </div>
      </div>
    );
  }

  const { text, orpIndex } = currentToken;
  const prefix = text.slice(0, orpIndex);
  const orp = text[orpIndex] || '';
  const suffix = text.slice(orpIndex + 1);

  const wordContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    fontFamily: settings.font,
    fontSize: settings.fontSize,
    fontWeight: 400,
    lineHeight: 1.2,
    whiteSpace: 'pre',
  };

  const orpStyle: React.CSSProperties = {
    display: 'inline-block',
    minWidth: '0.6em',
    textAlign: 'center',
    color: settings.orpColor,
  };

  return (
    <div style={styles.container}>
      <div style={styles.guides}>
        <div style={styles.guideMark}>&#x25BC;</div>
      </div>
      <div style={wordContainerStyle}>
        <span style={{ ...styles.prefix, color: settings.prefixColor }}>
          {prefix}
        </span>
        <span style={orpStyle}>
          {orp}
        </span>
        <span style={{ ...styles.suffix, color: settings.suffixColor }}>
          {suffix}
        </span>
      </div>
      <div style={styles.guides}>
        <div style={styles.guideMark}>&#x25B2;</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px 20px',
    userSelect: 'none',
    background: 'var(--color-bg)',
  },
  prefix: {
    textAlign: 'right',
    minWidth: 180,
    display: 'inline-block',
  },
  suffix: {
    textAlign: 'left',
    minWidth: 180,
    display: 'inline-block',
  },
  guides: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  guideMark: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginLeft: 180, // aligns with ORP position
  },
  placeholder: {
    fontSize: 18,
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  sectionBreak: {
    textAlign: 'center',
    padding: 40,
  },
  sectionHeading: {
    fontSize: 28,
    fontWeight: 600,
    marginBottom: 16,
    color: 'var(--color-text)',
  },
  sectionHint: {
    fontSize: 16,
    color: 'var(--color-text-muted)',
  },
};
