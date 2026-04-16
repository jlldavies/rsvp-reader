import React, { useCallback, useState, useEffect } from 'react';
import type { RsvpDocument } from '@rsvp-reader/core';
import { parseMarkdown } from '@rsvp-reader/core';
import { useReaderStore } from './stores/reader-store';
import { useRsvpPlayer } from './hooks/useRsvpPlayer';
import { useKeyboard } from './hooks/useKeyboard';
import { useBookmarks } from './hooks/useBookmarks';
import { useSettings } from './hooks/useSettings';
import { useTheme } from './hooks/useTheme';
import { useMcpDoc } from './hooks/useMcpDoc';
import { RsvpDisplay } from './components/RsvpDisplay';
import { ControlBar } from './components/ControlBar';
import { ProgressBar } from './components/ProgressBar';
import { DocumentImport } from './components/DocumentImport';
import { SettingsPanel } from './components/SettingsPanel';
import { BookmarkList } from './components/BookmarkList';
import { TextPreview } from './components/TextPreview';
import { HistoryPanel } from './components/HistoryPanel';
import { summarizeDocument } from './api/client';

type Panel = 'none' | 'settings' | 'bookmarks' | 'history';

export const App: React.FC = () => {
  const { document, engineState, progress } = useReaderStore();
  const player = useRsvpPlayer();
  const { settings, updateSetting, resetSettings } = useSettings();
  useTheme();
  const bookmarks = useBookmarks();
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const cycleTheme = useCallback(() => {
    const order = ['system', 'light', 'dark'] as const;
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    updateSetting('theme', next);
  }, [settings.theme, updateSetting]);

  const themeIcon = settings.theme === 'dark' ? '🌙' : settings.theme === 'light' ? '☀️' : '💻';
  const themeLabel = `Theme: ${settings.theme} (click to cycle)`;
  const mcpDoc = useMcpDoc();

  // Keep store settings in sync with persisted settings
  useEffect(() => {
    useReaderStore.getState().updateSettings(settings);
  }, [settings]);

  // Auto-load document when opened via MCP
  useEffect(() => {
    if (mcpDoc.doc && !document) {
      if (mcpDoc.wpm !== settings.wpm) updateSetting('wpm', mcpDoc.wpm);
      if (mcpDoc.chunkSize !== settings.chunkSize) updateSetting('chunkSize', mcpDoc.chunkSize);
      player.loadDocument(mcpDoc.doc);
      player.play();
    }
  // Only run once when mcpDoc resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcpDoc.doc]);

  useKeyboard({
    toggle: player.toggle,
    continueReading: player.continueReading,
    skipForward: player.skipForward,
    skipBackward: player.skipBackward,
  });

  const handleDocumentLoaded = useCallback(
    (doc: RsvpDocument) => {
      bookmarks.saveToHistory(doc);
      const lastPos = bookmarks.getLastPosition(doc.id);
      player.loadDocument(doc, lastPos ?? undefined);
    },
    [player, bookmarks]
  );

  const handleBack = useCallback(() => {
    useReaderStore.getState().setDocument(null);
    useReaderStore.getState().setEngineState('idle');
    useReaderStore.getState().setCurrentToken(null);
    useReaderStore.getState().setProgress(0);
  }, []);

  // Auto-save progress when paused
  React.useEffect(() => {
    if (document && engineState === 'paused') {
      const tokenIndex = Math.round(progress * document.totalWords);
      bookmarks.saveProgress(document, tokenIndex);
    }
  }, [engineState, document, progress, bookmarks]);

  const handleSeek = useCallback(
    (tokenIndex: number) => {
      player.seekTo(tokenIndex);
    },
    [player]
  );

  const handleProgressSeek = useCallback(
    (fraction: number) => {
      if (!document) return;
      const tokenIndex = Math.round(fraction * document.totalWords);
      player.seekTo(tokenIndex);
    },
    [document, player]
  );

  const handleSaveBookmark = useCallback(
    (label: string) => {
      if (!document) return;
      const tokenIndex = Math.round(progress * document.totalWords);
      bookmarks.saveBookmark(document, tokenIndex, 0, label || 'Bookmark');
    },
    [document, progress, bookmarks]
  );

  const handleJumpToBookmark = useCallback(
    (bm: { tokenIndex: number }) => {
      player.seekTo(bm.tokenIndex);
      setActivePanel('none');
    },
    [player]
  );

  const handleSummarize = useCallback(async () => {
    if (!document) return;
    setSummarizing(true);
    try {
      // Extract full text from document tokens
      const text = document.sections
        .flatMap(s => s.tokens.map(t => t.text))
        .join(' ');
      const summary = await summarizeDocument(text);
      const summaryDoc = await parseMarkdown(summary, document.source.uri);
      const resumedDoc = {
        ...summaryDoc,
        title: `[Summary] ${document.title}`,
        source: document.source,
      };
      player.loadDocument(resumedDoc);
      player.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Summarisation failed';
      setSummarizeError(
        msg.includes('not configured')
          ? 'AI summarisation requires an ANTHROPIC_API_KEY on the server. See README for setup.'
          : msg
      );
    } finally {
      setSummarizing(false);
    }
  }, [document, player]);

  if (mcpDoc.loading) {
    return <div style={styles.loading}>Loading document…</div>;
  }

  if (mcpDoc.error) {
    return <div style={styles.loading}>Error: {mcpDoc.error}</div>;
  }

  if (!document) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Theme + history controls floating top-right */}
        <div style={styles.importControls}>
          <button style={styles.importIconBtn} onClick={cycleTheme} title={themeLabel}>
            {themeIcon}
          </button>
          <button
            style={{ ...styles.importIconBtn, ...(showImportHistory ? styles.importIconBtnActive : {}) }}
            onClick={() => setShowImportHistory(v => !v)}
            title="Recent documents"
          >
            📚
          </button>
        </div>

        {/* History dropdown */}
        {showImportHistory && (
          <div style={styles.importHistoryDropdown}>
            <HistoryPanel
              history={bookmarks.getAllHistory()}
              onOpen={(doc) => { handleDocumentLoaded(doc); setShowImportHistory(false); }}
              onJumpToBookmark={(doc, bm) => {
                handleDocumentLoaded(doc);
                setTimeout(() => player.seekTo(bm.tokenIndex), 200);
                setShowImportHistory(false);
              }}
              onRemove={bookmarks.removeFromHistory}
              onClearAll={bookmarks.clearHistory}
            />
          </div>
        )}

        <DocumentImport onDocumentLoaded={handleDocumentLoaded} />
      </div>
    );
  }

  const currentTokenIndex = Math.round(progress * document.totalWords);

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.iconBtn} onClick={handleBack} title="Back">
          &#x2190; Back
        </button>
        <span style={styles.docTitle}>{document.title}</span>
        <span style={styles.wordCount}>{document.totalWords} words</span>
        {document.totalWords > 3000 && (
          <button
            style={{ ...styles.iconBtn, ...(summarizing ? styles.iconBtnDisabled : {}) }}
            onClick={handleSummarize}
            disabled={summarizing}
            title="Summarize with AI"
          >
            {summarizing ? '⏳' : '✨'}
          </button>
        )}
        <button
          style={{
            ...styles.iconBtn,
            ...(activePanel === 'history' ? styles.iconBtnActive : {}),
          }}
          onClick={() => setActivePanel(activePanel === 'history' ? 'none' : 'history')}
          title="History"
        >
          📚
        </button>
        <button
          style={{
            ...styles.iconBtn,
            ...(activePanel === 'bookmarks' ? styles.iconBtnActive : {}),
          }}
          onClick={() => setActivePanel(activePanel === 'bookmarks' ? 'none' : 'bookmarks')}
          title="Bookmarks"
        >
          &#x1F516;
        </button>
        <button
          style={{
            ...styles.iconBtn,
            ...(activePanel === 'settings' ? styles.iconBtnActive : {}),
          }}
          onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')}
          title="Settings"
        >
          &#x2699;&#xFE0F;
        </button>
      </div>

      {/* Inline error banner */}
      {summarizeError && (
        <div style={styles.errorBanner}>
          <span>{summarizeError}</span>
          <button style={styles.errorDismiss} onClick={() => setSummarizeError(null)}>✕</button>
        </div>
      )}

      {/* Side panels */}
      {activePanel === 'settings' && (
        <div style={styles.panel}>
          <SettingsPanel
            settings={settings}
            onSettingChange={updateSetting}
            onReset={resetSettings}
          />
        </div>
      )}
      {activePanel === 'bookmarks' && document && (
        <div style={styles.panel}>
          <BookmarkList
            bookmarks={bookmarks.getBookmarks(document.id)}
            onSave={handleSaveBookmark}
            onJump={handleJumpToBookmark}
            onDelete={(id) => bookmarks.deleteBookmark(document.id, id)}
          />
        </div>
      )}
      {activePanel === 'history' && (
        <div style={styles.panel}>
          <HistoryPanel
            history={bookmarks.getAllHistory()}
            onOpen={(doc) => { handleDocumentLoaded(doc); setActivePanel('none'); }}
            onJumpToBookmark={(doc, bm) => {
              if (doc.id !== document?.id) { handleDocumentLoaded(doc); }
              setTimeout(() => player.seekTo(bm.tokenIndex), 100);
              setActivePanel('none');
            }}
            onRemove={bookmarks.removeFromHistory}
            onClearAll={bookmarks.clearHistory}
          />
        </div>
      )}

      <ProgressBar onSeek={handleProgressSeek} />
      <RsvpDisplay />
      <ControlBar
        onToggle={player.toggle}
        onSkipForward={player.skipForward}
        onSkipBackward={player.skipBackward}
      />

      {engineState === 'finished' && (
        <div style={styles.finished}>Done! Press Space to restart.</div>
      )}

      {document && (
        <TextPreview
          document={document}
          currentTokenIndex={currentTokenIndex}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  importControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    gap: 8,
    zIndex: 10,
  },
  importIconBtn: {
    fontSize: 18,
    background: 'var(--color-bg)',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  importIconBtnActive: {
    background: 'var(--color-accent-bg)',
    borderColor: 'var(--color-accent)',
  },
  importHistoryDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 420,
    maxWidth: 'calc(100vw - 32px)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    zIndex: 20,
    overflow: 'hidden',
  },
  container: {
    maxWidth: 800,
    margin: '0 auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--color-bg)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
  },
  docTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  wordCount: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  iconBtn: {
    fontSize: 14,
    background: 'none',
    border: '1px solid var(--color-btn-border)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    flexShrink: 0,
    color: 'var(--color-text)',
  },
  iconBtnActive: {
    background: 'var(--color-accent-bg)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-accent-text)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 16px',
    background: 'var(--color-warn-bg)',
    borderBottom: '1px solid var(--color-warn-border)',
    color: 'var(--color-warn-text)',
    fontSize: 13,
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-warn-text)',
    fontSize: 14,
    padding: '0 4px',
    flexShrink: 0,
  },
  iconBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  panel: {
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-secondary)',
  },
  finished: {
    textAlign: 'center',
    padding: 20,
    fontSize: 18,
    color: 'var(--color-accent-text)',
    fontWeight: 600,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: 18,
    color: 'var(--color-text-muted)',
  },
};
