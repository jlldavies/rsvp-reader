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

  // Shared row layout: prefix [flex:1 right-aligned] | ORP [fixed 1ch] | suffix [flex:1 left-aligned]
  // This guarantees ORP is always at the horizontal midpoint regardless of word length.
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    maxWidth: 720,
    alignItems: 'baseline',
    fontFamily: settings.font,
    fontSize: settings.fontSize,
    fontWeight: 400,
    lineHeight: 1.2,
  };

  return (
    <div style={styles.container}>
      {/* Guide arrow — mirrors the word row layout so it stays above the ORP */}
      <div style={{ ...rowStyle, fontSize: 12, lineHeight: 1 }}>
        <div style={{ flex: 1 }} />
        <div style={styles.guideMark}>&#x25BC;</div>
        <div style={{ flex: 1 }} />
      </div>

      <div style={rowStyle}>
        <span style={{ ...styles.prefix, color: settings.prefixColor }}>
          {prefix}
        </span>
        <span style={{ ...styles.orp, color: settings.orpColor }}>
          {orp}
        </span>
        <span style={{ ...styles.suffix, color: settings.suffixColor }}>
          {suffix}
        </span>
      </div>

      {/* Guide arrow below */}
      <div style={{ ...rowStyle, fontSize: 12, lineHeight: 1 }}>
        <div style={{ flex: 1 }} />
        <div style={styles.guideMark}>&#x25B2;</div>
        <div style={{ flex: 1 }} />
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
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  orp: {
    flexShrink: 0,
    width: '1ch',
    textAlign: 'center',
  },
  suffix: {
    flex: 1,
    textAlign: 'left',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  guideMark: {
    width: '1ch',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
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
