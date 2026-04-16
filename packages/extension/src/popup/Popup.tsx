import React, { useState, useEffect } from 'react';

export const Popup: React.FC = () => {
  const [wpm, setWpm] = useState(300);

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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId != null) {
        chrome.tabs.sendMessage(tabId, { action: 'speedRead', wpm });
      }
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
};
