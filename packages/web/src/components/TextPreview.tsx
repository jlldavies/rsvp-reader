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
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to keep current token in view
  useEffect(() => {
    if (highlightRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = highlightRef.current;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      // Keep highlighted word in the middle third of the visible area
      if (elTop < scrollTop + containerHeight * 0.2 || elBottom > scrollTop + containerHeight * 0.8) {
        container.scrollTop = elTop - containerHeight * 0.4;
      }
    }
  }, [currentTokenIndex]);

  const sections = document.sections;

  return (
    <div
      ref={containerRef}
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
    borderTop: '1px solid #e0e0e0',
    padding: '12px 20px',
    background: '#fafafa',
    fontSize: 13,
    lineHeight: 1.7,
    color: '#444',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  section: {
    marginBottom: 16,
  },
  heading: {
    fontWeight: 700,
    fontSize: 14,
    color: '#222',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #e8e8e8',
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
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 600,
    outline: '1px solid #f59e0b',
    borderRadius: 3,
  },
  tokenPast: {
    color: '#9ca3af',
  },
  paraBreak: {
    display: 'block',
    marginBottom: 8,
  },
};
