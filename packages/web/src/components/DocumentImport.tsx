import React, { useState, useCallback, useRef } from 'react';
import type { RsvpDocument } from '@rsvp-reader/core';
import { parseMarkdown, parseText } from '@rsvp-reader/core';
import { parseFile, parseUrl } from '../api/client';

interface DocumentImportProps {
  onDocumentLoaded: (doc: RsvpDocument) => void;
}

type InputMode = 'paste' | 'url' | 'file';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.pptx,.md,.markdown,.txt';
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/markdown',
  'text/plain',
].join(',');

export const DocumentImport: React.FC<DocumentImportProps> = ({ onDocumentLoaded }) => {
  const [mode, setInputMode] = useState<InputMode>('paste');
  const [text, setText] = useState('');
  const [markdownMode, setMarkdownMode] = useState(false);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoad = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let doc: RsvpDocument;
      if (mode === 'paste') {
        doc = markdownMode
          ? await parseMarkdown(text)
          : await parseText(text);
      } else if (mode === 'url') {
        doc = await parseUrl(url.trim());
      } else {
        return; // file mode handled by file picker
      }
      onDocumentLoaded(doc);
      setText('');
      setUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [mode, text, markdownMode, url, onDocumentLoaded]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const doc = await parseFile(file);
      onDocumentLoaded(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [onDocumentLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleLoad();
  }, [handleLoad]);

  const canSubmit = mode === 'paste' ? text.trim().length > 0
    : mode === 'url' ? url.trim().length > 0
    : false;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>RSVP Speed Reader</h1>
        <p style={styles.subtitle}>Read faster. One word at a time.</p>

        {/* Mode tabs */}
        <div style={styles.tabs}>
          {(['paste', 'url', 'file'] as InputMode[]).map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
              onClick={() => setInputMode(m)}
            >
              {m === 'paste' ? 'Paste Text' : m === 'url' ? 'URL' : 'Upload File'}
            </button>
          ))}
        </div>

        {/* Paste mode */}
        {mode === 'paste' && (
          <>
            <div style={styles.formatRow}>
              <button
                style={{ ...styles.fmtBtn, ...(markdownMode ? {} : styles.fmtBtnActive) }}
                onClick={() => setMarkdownMode(false)}
              >Plain Text</button>
              <button
                style={{ ...styles.fmtBtn, ...(markdownMode ? styles.fmtBtnActive : {}) }}
                onClick={() => setMarkdownMode(true)}
              >Markdown</button>
            </div>
            <textarea
              style={styles.textarea}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={markdownMode ? '# Heading\n\nPaste your Markdown here...' : 'Paste your text here...'}
              rows={8}
            />
          </>
        )}

        {/* URL mode */}
        {mode === 'url' && (
          <input
            style={styles.urlInput}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLoad(); }}
            placeholder="https://example.com/article"
          />
        )}

        {/* File drop zone */}
        {mode === 'file' && (
          <div
            style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={styles.dropIcon}>📄</div>
            <div style={styles.dropText}>
              Drop a file here, or click to browse
            </div>
            <div style={styles.dropFormats}>
              PDF, Word (.docx), PowerPoint (.pptx), Markdown (.md), Text (.txt)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              data-testid="file-input"
              accept={`${ACCEPTED_EXTENSIONS},${ACCEPTED_MIME}`}
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Submit button (not shown for file mode) */}
        {mode !== 'file' && (
          <button
            style={{ ...styles.loadBtn, ...(!canSubmit || loading ? styles.loadBtnDisabled : {}) }}
            onClick={handleLoad}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Loading...' : mode === 'url' ? 'Fetch & Read' : 'Start Reading'}
          </button>
        )}

        <div style={styles.hint}>
          Keyboard shortcuts: <kbd>Space</kbd> play/pause · <kbd>↑↓</kbd> WPM · <kbd>←→</kbd> skip
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f4f6f9',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 680,
    background: '#fff',
    borderRadius: 16,
    padding: 36,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: 0,
  },
  tab: {
    fontSize: 14,
    fontWeight: 500,
    padding: '8px 18px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#888',
    borderRadius: '6px 6px 0 0',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
  },
  tabActive: {
    color: '#2563eb',
    borderBottom: '2px solid #2563eb',
    background: '#f0f4ff',
  },
  formatRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
  },
  fmtBtn: {
    fontSize: 13,
    padding: '5px 14px',
    border: '1px solid #ddd',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
    color: '#666',
  },
  fmtBtnActive: {
    background: '#2563eb',
    color: '#fff',
    borderColor: '#2563eb',
  },
  textarea: {
    width: '100%',
    padding: 14,
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    border: '2px solid #e8e8e8',
    borderRadius: 10,
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  urlInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: '2px solid #e8e8e8',
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropZone: {
    border: '2px dashed #d0d5dd',
    borderRadius: 12,
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    background: '#fafbfc',
  },
  dropZoneActive: {
    borderColor: '#2563eb',
    background: '#f0f4ff',
  },
  dropIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  dropText: {
    fontSize: 16,
    fontWeight: 500,
    color: '#444',
    marginBottom: 6,
  },
  dropFormats: {
    fontSize: 12,
    color: '#999',
  },
  error: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fff0f0',
    border: '1px solid #fcc',
    borderRadius: 8,
    color: '#c00',
    fontSize: 14,
  },
  loadBtn: {
    marginTop: 14,
    width: '100%',
    padding: '13px 0',
    fontSize: 16,
    fontWeight: 700,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
  loadBtnDisabled: {
    background: '#c8d5f0',
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
};
