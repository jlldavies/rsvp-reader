import React, { useEffect, useRef } from 'react';
import type { RsvpDocument } from '@rsvp-reader/core';

interface TextPreviewProps {
  document: RsvpDocument;
  currentTokenIndex: number;
  onSeek: (tokenIndex: number) => void;
}

export const TextPreview: React.FC<TextPreviewProps> = ({
  document,
  currentTokenIndex,
  onSeek,
}) => {
  const highlightRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to keep current token in view
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentTokenIndex]);

  const sections = document.sections;

  return (
    <div
      style={styles.container}
      data-testid="text-preview"
    >
      {sections.map((section) => (
        <div key={section.index} style={styles.section}>
          {section.heading && (
            <div style={styles.heading}>{section.heading}</div>
          )}
          <div style={styles.paragraph}>
            {section.tokens.map((token) => {
              const isCurrent = token.index === currentTokenIndex;
              const isPast = token.index < currentTokenIndex;
              return (
                <React.Fragment key={token.index}>
                  <span
                    ref={isCurrent ? highlightRef : undefined}
                    onClick={() => onSeek(token.index)}
                    style={{
                      ...styles.token,
                      ...(isCurrent ? styles.tokenCurrent : {}),
                      ...(isPast ? styles.tokenPast : {}),
                      cursor: 'pointer',
                    }}
                    title={`Word ${token.index + 1}`}
                  >
                    {token.text}
                  </span>
                  {token.isParagraphEnd && !token.isSectionEnd && (
                    <span style={styles.paraBreak}>{'\n\n'}</span>
                  )}
                  {!token.isParagraphEnd && ' '}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: 220,
    overflowY: 'auto',
    borderTop: '1px solid var(--color-border)',
    padding: '12px 20px',
    background: 'var(--color-bg-secondary)',
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--color-text)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  section: {
    marginBottom: 16,
  },
  heading: {
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--color-text)',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid var(--color-border-light)',
  },
  paragraph: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  token: {
    display: 'inline',
    borderRadius: 2,
    padding: '0 1px',
    transition: 'background 0.1s',
  },
  tokenCurrent: {
    background: 'var(--color-preview-current-bg)',
    color: 'var(--color-preview-current-text)',
    fontWeight: 600,
    outline: '1px solid var(--color-preview-current-border)',
    borderRadius: 3,
  },
  tokenPast: {
    color: 'var(--color-preview-past)',
  },
  paraBreak: {
    display: 'block',
    marginBottom: 8,
  },
};
