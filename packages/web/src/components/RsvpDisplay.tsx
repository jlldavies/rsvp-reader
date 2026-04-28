import React from 'react';
import { calculateOrp } from '@rsvp-reader/core';
import { useReaderStore } from '../stores/reader-store';

export const RsvpDisplay: React.FC = () => {
  const { currentToken, settings, engineState, currentSectionHeading, beforeText, afterText } =
    useReaderStore();
  const showPhantom = settings.phantomWords;

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
  const words = text.split(' ');
  const isMultiWord = words.length > 1;

  const fontStyle: React.CSSProperties = {
    fontFamily: settings.font,
    fontSize: settings.fontSize,
    fontWeight: 400,
    lineHeight: 1.2,
  };

  if (isMultiWord) {
    // Multi-word: each word gets its own ORP highlight, displayed as a centred row
    return (
      <div style={styles.container}>
        <div
          key={currentToken.index}
          className="rsvp-flash"
          style={{ ...styles.multiWordRow, ...fontStyle }}
        >
          {showPhantom && beforeText && (
            <><span style={styles.phantomInline}>{beforeText}</span><span>&nbsp;</span></>
          )}
          {words.map((word, i) => {
            const oi = calculateOrp(word);
            const wp = word.slice(0, oi);
            const wo = word[oi] ?? '';
            const ws = word.slice(oi + 1);
            return (
              <React.Fragment key={i}>
                {i > 0 && <span>&nbsp;</span>}
                <span style={styles.wordGroup}>
                  <span style={{ color: 'var(--color-word-prefix)' }}>{wp}</span>
                  <span style={{ color: settings.orpColor }}>{wo}</span>
                  <span style={{ color: 'var(--color-word-suffix)' }}>{ws}</span>
                </span>
              </React.Fragment>
            );
          })}
          {showPhantom && afterText && (
            <><span>&nbsp;</span><span style={styles.phantomInline}>{afterText}</span></>
          )}
        </div>
      </div>
    );
  }

  // Single word: ORP pinned at ~33% from left (flex 1:2 split).
  // Words typically have more text after the ORP than before, so the right
  // zone is given twice the space. This matches the research recommendation
  // of placing the ORP ~35% from the word's left edge.
  const prefix = text.slice(0, orpIndex);
  const orp = text[orpIndex] || '';
  const suffix = text.slice(orpIndex + 1);

  // Row layout: [prefix flex:1 right-aligned] [ORP 1ch] [suffix flex:2 left-aligned]
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'baseline',
    ...fontStyle,
  };

  // Reticle lines: thin horizontal guides on either side of the ORP column.
  // They use the same 1:ORP:2 column layout so they track the red letter exactly.
  const reticleRow = (
    <div style={{ ...rowStyle, alignItems: 'center' }}>
      <div style={{ flex: 1, ...styles.reticleLine }} />
      <div style={styles.reticleGap} />
      <div style={{ flex: 2, ...styles.reticleLine }} />
    </div>
  );

  return (
    <div style={styles.container}>
      {reticleRow}

      <div key={currentToken.index} className="rsvp-flash" style={rowStyle}>
        <span style={{ ...styles.prefix, color: 'var(--color-word-prefix)' }}>
          {showPhantom && beforeText && (
            <span style={styles.phantom}>{beforeText}{' '}</span>
          )}
          {prefix}
        </span>
        <span style={{ ...styles.orp, color: settings.orpColor }}>
          {orp}
        </span>
        <span style={{ ...styles.suffix, color: 'var(--color-word-suffix)' }}>
          {suffix}
          {showPhantom && afterText && (
            <span style={styles.phantom}>{' '}{afterText}</span>
          )}
        </span>
      </div>

      {reticleRow}
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
  // Single-word layout: prefix gets 1/3 of width, suffix 2/3
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
    flex: 2,
    textAlign: 'left',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  reticleLine: {
    height: 1,
    background: 'var(--color-text-muted)',
    opacity: 0.35,
  },
  reticleGap: {
    width: '1ch',
    flexShrink: 0,
  },
  // Multi-word layout: centred flex row
  multiWordRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    maxWidth: '90vw',
  },
  wordGroup: {
    whiteSpace: 'nowrap',
  },
  phantom: {
    color: 'var(--color-text-muted)',
    opacity: 0.25,
  },
  phantomInline: {
    color: 'var(--color-text-muted)',
    opacity: 0.25,
    whiteSpace: 'nowrap',
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
