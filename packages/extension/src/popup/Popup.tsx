import React, { useState, useEffect } from 'react';

export const Popup: React.FC = () => {
  const [wpm, setWpm] = useState(300);
  const [error, setError] = useState<string | null>(null);

  // Load saved WPM from chrome.storage.sync
  useEffect(() => {
    chrome.storage.sync.get(['wpm'], (result) => {
      if (result.wpm && typeof result.wpm === 'number') {
        setWpm(result.wpm);
      }
    });
  }, []);

  const handleWpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setWpm(value);
      chrome.storage.sync.set({ wpm: value }, () => {});
    }
  };

  const handleStartReading = () => {
    console.log('[RSVP] Start Reading clicked, wpm:', wpm);
    setError(null);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('[RSVP] tabs.query error:', chrome.runtime.lastError.message);
        setError('Could not access current tab.');
        return;
      }

      const tab = tabs[0];
      const tabId = tab?.id;
      console.log('[RSVP] Active tab:', { tabId, url: tab?.url, status: tab?.status });

      if (tabId == null) {
        console.error('[RSVP] No active tab found');
        setError('No active tab found.');
        return;
      }

      const sendMessage = (onFail: () => void) => {
        console.log('[RSVP] Sending speedRead message to tab', tabId);
        chrome.tabs.sendMessage(tabId, { action: 'speedRead', wpm }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[RSVP] sendMessage failed:', chrome.runtime.lastError.message);
            onFail();
          } else {
            console.log('[RSVP] Message delivered, response:', response);
          }
        });
      };

      sendMessage(() => {
        // Content script not present — inject the self-contained IIFE directly
        console.log('[RSVP] Injecting content script via executeScript...');
        chrome.scripting.executeScript(
          { target: { tabId }, files: ['content.js'] },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[RSVP] executeScript failed:', chrome.runtime.lastError.message);
              setError('Cannot inject script into this page. Try reloading the tab.');
              return;
            }
            console.log('[RSVP] Injected — retrying in 300ms');
            // Brief pause for the script to register its message listener
            setTimeout(() => sendMessage(() => {
              console.error('[RSVP] Still no response after injection');
              setError('Script injected but not responding — please reload the tab and try again.');
            }), 300);
          }
        );
      });
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>RSVP Speed Reader</h2>

      <div style={styles.row}>
        <label htmlFor="wpm-input" style={styles.label}>WPM</label>
        <input
          id="wpm-input"
          type="number"
          min={50}
          max={1500}
          step={25}
          value={wpm}
          onChange={handleWpmChange}
          style={styles.input}
        />
      </div>

      <button style={styles.button} onClick={handleStartReading}>
        Start Reading
      </button>

      {error === 'reload' && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>This tab needs a reload before the extension can run.</p>
          <button style={styles.reloadBtn} onClick={() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const tabId = tabs[0]?.id;
              if (tabId != null) chrome.tabs.reload(tabId);
            });
          }}>
            Reload Tab
          </button>
        </div>
      )}
      {error && error !== 'reload' && (
        <p style={styles.errorText}>{error}</p>
      )}

      <p style={styles.hint}>
        Opens in a new tab · Space play/pause · ↑↓ ±25 WPM · ←→ ±5 words · Del back sentence
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 240,
    padding: '16px 20px',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#111',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    width: 72,
    padding: '4px 8px',
    fontSize: 14,
    border: '1px solid #ccc',
    borderRadius: 4,
    textAlign: 'right',
  },
  button: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  hint: {
    margin: 0,
    fontSize: 11,
    color: '#888',
    lineHeight: 1.5,
    textAlign: 'center' as const,
  },
  errorBox: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: 6,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  errorText: {
    margin: 0,
    fontSize: 12,
    color: '#856404',
  },
  reloadBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    background: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    alignSelf: 'flex-start' as const,
  },
};
