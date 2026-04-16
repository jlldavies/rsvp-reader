import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { DEFAULT_SETTINGS } from '@rsvp-reader/core';
import type { ReaderSettings } from '@rsvp-reader/core';

function makeProps(overrides: Partial<ReaderSettings> = {}) {
  const settings: ReaderSettings = { ...DEFAULT_SETTINGS, ...overrides };
  return {
    settings,
    onSettingChange: vi.fn() as <K extends keyof ReaderSettings>(k: K, v: ReaderSettings[K]) => void,
    onReset: vi.fn(),
  };
}

beforeEach(() => {
  cleanup();
});

describe('SettingsPanel — WPM control', () => {
  it('renders a WPM input showing current value', () => {
    render(<SettingsPanel {...makeProps({ wpm: 350 })} />);
    const input = screen.getByLabelText(/wpm/i) as HTMLInputElement;
    expect(input.value).toBe('350');
  });

  it('calls onSettingChange with new WPM when input changes', () => {
    const props = makeProps({ wpm: 300 });
    render(<SettingsPanel {...props} />);
    const input = screen.getByLabelText(/wpm/i);
    fireEvent.change(input, { target: { value: '500' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('wpm', 500);
  });
});

describe('SettingsPanel — chunk size', () => {
  it('renders chunk size buttons for 1, 2, 3', () => {
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('clicking chunk size 2 calls onSettingChange with chunkSize 2', () => {
    const props = makeProps({ chunkSize: 1 });
    render(<SettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(props.onSettingChange).toHaveBeenCalledWith('chunkSize', 2);
  });

  it('clicking chunk size 3 calls onSettingChange with chunkSize 3', () => {
    const props = makeProps({ chunkSize: 1 });
    render(<SettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(props.onSettingChange).toHaveBeenCalledWith('chunkSize', 3);
  });
});

describe('SettingsPanel — theme toggle', () => {
  it('renders a theme toggle', () => {
    render(<SettingsPanel {...makeProps({ theme: 'light' })} />);
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
  });

  it('calls onSettingChange with dark when toggled from light', () => {
    const props = makeProps({ theme: 'light' });
    render(<SettingsPanel {...props} />);
    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: 'dark' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('theme', 'dark');
  });

  it('calls onSettingChange with light when toggled from dark', () => {
    const props = makeProps({ theme: 'dark' });
    render(<SettingsPanel {...props} />);
    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: 'light' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('theme', 'light');
  });
});

describe('SettingsPanel — ORP color', () => {
  it('renders an ORP color input', () => {
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByLabelText(/highlight color/i)).toBeInTheDocument();
  });

  it('calls onSettingChange with new color when changed', () => {
    const props = makeProps({ orpColor: '#ff2c2c' });
    render(<SettingsPanel {...props} />);
    const colorInput = screen.getByLabelText(/highlight color/i);
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('orpColor', '#00ff00');
  });
});

describe('SettingsPanel — section pause mode', () => {
  it('renders a section pause mode select', () => {
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByLabelText(/section pause/i)).toBeInTheDocument();
  });

  it('calls onSettingChange with timed when selected', () => {
    const props = makeProps({ sectionPauseMode: 'manual' });
    render(<SettingsPanel {...props} />);
    fireEvent.change(screen.getByLabelText(/section pause/i), { target: { value: 'timed' } });
    expect(props.onSettingChange).toHaveBeenCalledWith('sectionPauseMode', 'timed');
  });
});

describe('SettingsPanel — reset button', () => {
  it('renders a reset button', () => {
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    const props = makeProps();
    render(<SettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.onReset).toHaveBeenCalledOnce();
  });
});
