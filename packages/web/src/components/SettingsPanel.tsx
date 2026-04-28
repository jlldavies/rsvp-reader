import React from 'react';
import type { ReaderSettings } from '@rsvp-reader/core';

interface SettingsPanelProps {
  settings: ReaderSettings;
  onSettingChange: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingChange,
  onReset,
}) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Settings</h3>

      {/* WPM */}
      <div style={styles.row}>
        <label htmlFor="wpm-input" style={styles.label}>WPM</label>
        <input
          id="wpm-input"
          type="number"
          min={50}
          max={1500}
          value={settings.wpm}
          onChange={(e) => onSettingChange('wpm', parseInt(e.target.value, 10))}
          style={styles.input}
        />
      </div>

      {/* Font family */}
      <div style={styles.row}>
        <label htmlFor="font-select" style={styles.label}>Font</label>
        <select
          id="font-select"
          value={settings.font}
          onChange={(e) => onSettingChange('font', e.target.value)}
          style={styles.select}
        >
          <option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
          <option value="'Roboto Mono', monospace">Roboto Mono</option>
          <option value="'Space Mono', monospace">Space Mono</option>
          <option value="'Courier Prime', monospace">Courier Prime</option>
          <option value="'Courier New', Courier, monospace">Courier New</option>
        </select>
      </div>

      {/* Font size */}
      <div style={styles.row}>
        <label htmlFor="font-size" style={styles.label}>Font size</label>
        <input
          id="font-size"
          type="number"
          min={24}
          max={120}
          value={settings.fontSize}
          onChange={(e) => onSettingChange('fontSize', parseInt(e.target.value, 10))}
          style={styles.input}
        />
      </div>

      {/* Chunk size */}
      <div style={styles.row}>
        <span style={styles.label}>Words per flash</span>
        <div style={styles.buttonGroup}>
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              onClick={() => onSettingChange('chunkSize', n)}
              style={{
                ...styles.chunkBtn,
                ...(settings.chunkSize === n ? styles.chunkBtnActive : {}),
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ORP highlight color */}
      <div style={styles.row}>
        <label htmlFor="orp-color" style={styles.label}>Highlight color</label>
        <input
          id="orp-color"
          type="color"
          value={settings.orpColor}
          onChange={(e) => onSettingChange('orpColor', e.target.value)}
          style={styles.colorInput}
        />
      </div>

      {/* Theme */}
      <div style={styles.row}>
        <label htmlFor="theme-select" style={styles.label}>Theme</label>
        <select
          id="theme-select"
          value={settings.theme}
          onChange={(e) => onSettingChange('theme', e.target.value as 'light' | 'dark' | 'system')}
          style={styles.select}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Context words (phantom) */}
      <div style={styles.row}>
        <label htmlFor="phantom-toggle" style={styles.label}>Context words</label>
        <input
          id="phantom-toggle"
          type="checkbox"
          checked={settings.phantomWords}
          onChange={(e) => onSettingChange('phantomWords', e.target.checked)}
        />
      </div>

      {/* Section pause mode */}
      <div style={styles.row}>
        <label htmlFor="section-pause" style={styles.label}>Section pause</label>
        <select
          id="section-pause"
          value={settings.sectionPauseMode}
          onChange={(e) =>
            onSettingChange('sectionPauseMode', e.target.value as 'timed' | 'manual')
          }
          style={styles.select}
        >
          <option value="manual">Manual (spacebar)</option>
          <option value="timed">Timed</option>
        </select>
      </div>

      {/* Reset */}
      <div style={styles.row}>
        <button onClick={onReset} style={styles.resetBtn}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 260,
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
  },
  heading: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 14,
    flex: 1,
    color: 'var(--color-text-subtle)',
  },
  input: {
    width: 80,
    padding: '4px 8px',
    fontSize: 14,
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-bg-input)',
    color: 'var(--color-text)',
  },
  colorInput: {
    width: 40,
    height: 32,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  select: {
    padding: '4px 8px',
    fontSize: 14,
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-bg-input)',
    color: 'var(--color-text)',
  },
  buttonGroup: {
    display: 'flex',
    gap: 4,
  },
  chunkBtn: {
    width: 36,
    height: 32,
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-btn-bg)',
    cursor: 'pointer',
    fontSize: 14,
    color: 'var(--color-text)',
  },
  chunkBtnActive: {
    background: '#2563eb',
    color: '#fff',
    borderColor: '#2563eb',
  },
  resetBtn: {
    padding: '6px 14px',
    fontSize: 13,
    border: '1px solid var(--color-btn-border)',
    borderRadius: 4,
    background: 'var(--color-bg-secondary)',
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
};
