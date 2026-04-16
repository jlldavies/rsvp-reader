import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Popup } from './Popup';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  // Reset chrome storage mock to return empty
  (globalThis as unknown as { chrome: { storage: { sync: { get: (k: unknown, cb: (r: Record<string, unknown>) => void) => void; set: (i: unknown, cb?: () => void) => void } } } }).chrome.storage.sync.get = (_keys, cb) => cb({});
});

describe('Popup — rendering', () => {
  it('renders a "Start Reading" button', () => {
    render(<Popup />);
    expect(screen.getByRole('button', { name: /start reading/i })).toBeInTheDocument();
  });

  it('renders a WPM input', () => {
    render(<Popup />);
    expect(screen.getByLabelText(/wpm/i)).toBeInTheDocument();
  });

  it('shows default WPM of 300', () => {
    render(<Popup />);
    const input = screen.getByLabelText(/wpm/i) as HTMLInputElement;
    expect(input.value).toBe('300');
  });
});

describe('Popup — WPM setting', () => {
  it('updates displayed WPM when input changes', () => {
    render(<Popup />);
    const input = screen.getByLabelText(/wpm/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '500' } });
    expect(input.value).toBe('500');
  });

  it('saves WPM to chrome.storage.sync when changed', () => {
    const setSpy = vi.fn((_items: unknown, cb?: () => void) => cb?.());
    (globalThis as unknown as { chrome: { storage: { sync: { set: typeof setSpy } } } }).chrome.storage.sync.set = setSpy;

    render(<Popup />);
    fireEvent.change(screen.getByLabelText(/wpm/i), { target: { value: '450' } });
    expect(setSpy).toHaveBeenCalledWith({ wpm: 450 }, expect.any(Function));
  });

  it('loads saved WPM from chrome.storage.sync on mount', async () => {
    (globalThis as unknown as { chrome: { storage: { sync: { get: (k: unknown, cb: (r: Record<string, unknown>) => void) => void } } } }).chrome.storage.sync.get = (_keys, cb) => cb({ wpm: 750 });

    render(<Popup />);
    // Give useEffect time to run
    await Promise.resolve();
    const input = screen.getByLabelText(/wpm/i) as HTMLInputElement;
    expect(input.value).toBe('750');
  });
});

describe('Popup — start reading action', () => {
  it('sends speedRead message to active tab when Start Reading is clicked', () => {
    const sendMessageSpy = vi.fn();
    (globalThis as unknown as { chrome: { tabs: { sendMessage: typeof sendMessageSpy; query: (q: unknown, cb: (tabs: { id: number }[]) => void) => void } } }).chrome.tabs.sendMessage = sendMessageSpy;
    (globalThis as unknown as { chrome: { tabs: { query: (q: unknown, cb: (tabs: { id: number }[]) => void) => void } } }).chrome.tabs.query = (_q, cb) => cb([{ id: 42 }]);

    render(<Popup />);
    fireEvent.click(screen.getByRole('button', { name: /start reading/i }));

    expect(sendMessageSpy).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ action: 'speedRead' })
    );
  });

  it('includes the current WPM in the message', () => {
    const sendMessageSpy = vi.fn();
    (globalThis as unknown as { chrome: { tabs: { sendMessage: typeof sendMessageSpy; query: (q: unknown, cb: (tabs: { id: number }[]) => void) => void } } }).chrome.tabs.sendMessage = sendMessageSpy;
    (globalThis as unknown as { chrome: { tabs: { query: (q: unknown, cb: (tabs: { id: number }[]) => void) => void } } }).chrome.tabs.query = (_q, cb) => cb([{ id: 1 }]);

    render(<Popup />);
    fireEvent.change(screen.getByLabelText(/wpm/i), { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: /start reading/i }));

    expect(sendMessageSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ wpm: 600 })
    );
  });
});
