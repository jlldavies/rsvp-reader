import React from 'react';
import { calculateOrp } from '@rsvp-reader/core';
import { useReaderStore } from '../stores/reader-store';

export const RsvpDisplay: React.FC = () => {
  const { currentToken, settings, engineState, currentSectionHeading, beforeText, afterText } =
    useReaderStore();
  const showPhantom = settings.phantomWords;
  const phantomColor = settings.phantomColor;
  const showBrackets = settings.focusBrackets;
  const bracketColor = settings.focusBracketColor;
  const phantomStyle: React.CSSProperties = { color: phantomColor };
  const phantomInlineStyle: React.CSSProperties = { color: phantomColor, whiteSpace: 'nowrap' };

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

  // Use full phantom text — CSS overflow:hidden on the prefix/suffix flex cells
  // clips from the correct side (left for before, right for after).
  const phantomBefore = beforeText;
  const phantomAfter = afterText;

  if (isMultiWord) {
    // Multi-word: words anchored at center, phantoms in side zones that clip on overflow.
    return (
      <div style={styles.container}>
        <div
          key={currentToken.index}
          className="rsvp-flash"
          style={{ ...styles.multiWordRow, ...fontStyle }}
        >
          <div style={styles.multiSideLeft}>
            <span style={styles.prefixInner}>
              {showPhantom && phantomBefore && (
                <>
                  <span style={phantomStyle}>{phantomBefore}</span>
                  <span>{' '}</span>
                </>
              )}
              {showBrackets && <span style={{ color: bracketColor }}>[</span>}
            </span>
          </div>
          <div style={styles.multiCenter}>
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
          </div>
          <div style={styles.multiSideRight}>
            <span style={styles.suffixInner}>
              {showBrackets && <span style={{ color: bracketColor }}>]</span>}
              {showPhantom && phantomAfter && (
                <>
                  <span>&nbsp;</span>
                  <span style={phantomStyle}>{phantomAfter}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Single word: ORP pinned at ~33% from left (flex 1:2 split).
  const prefix = text.slice(0, orpIndex);
  const orp = text[orpIndex] || '';
  const suffix = text.slice(orpIndex + 1);

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'baseline',
    ...fontStyle,
  };

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
        <div style={styles.prefix}>
          <span style={styles.prefixInner}>
            {showPhantom && phantomBefore && (
              <span style={phantomStyle}>{phantomBefore}{' '}</span>
            )}
            {showBrackets && <span style={{ color: bracketColor }}>[</span>}
            <span style={{ color: 'var(--color-word-prefix)' }}>{prefix}</span>
          </span>
        </div>
        <span style={{ ...styles.orp, color: settings.orpColor }}>
          {orp}
        </span>
        <div style={styles.suffix}>
          <span style={styles.suffixInner}>
            <span style={{ color: 'var(--color-word-suffix)' }}>{suffix}</span>
            {showBrackets && <span style={{ color: bracketColor }}>]</span>}
            {showPhantom && phantomAfter && (
              <span style={phantomStyle}>{' '}{phantomAfter}</span>
            )}
          </span>
        </div>
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
  // Single-word layout: prefix block gets 1/3 of width (right-aligned), suffix 2/3 (left-aligned)
  // The inner wrapper has flexShrink:0 so it keeps its full width; combined with
  // justifyContent on the outer flex container, overflow goes off the correct side
  // (left for prefix, right for suffix), where overflow:hidden clips it.
  prefix: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    minWidth: 0,
    overflow: 'hidden',
  },
  prefixInner: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  orp: {
    flexShrink: 0,
    width: '1ch',
    textAlign: 'center',
  },
  suffix: {
    flex: 2,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    minWidth: 0,
    overflow: 'hidden',
  },
  suffixInner: {
    flexShrink: 0,
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
  // Multi-word layout: words anchored at center, phantoms in clippable side zones.
  multiWordRow: {
    display: 'flex',
    flexWrap: 'nowrap',
    alignItems: 'baseline',
    width: '100%',
  },
  multiSideLeft: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    minWidth: 0,
    overflow: 'hidden',
  },
  multiCenter: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  multiSideRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    minWidth: 0,
    overflow: 'hidden',
  },
  wordGroup: {
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
