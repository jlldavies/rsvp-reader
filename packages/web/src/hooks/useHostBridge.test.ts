import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { HOST_BRIDGE_PROTOCOL } from '@rsvp-reader/core';
import { createHostBridge, useHostBridge } from './useHostBridge';

function fakeTarget(): Window & { postMessage: ReturnType<typeof vi.fn> } {
  return { postMessage: vi.fn() } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };
}

function dispatchMessage(data: unknown, source: unknown, origin: string): void {
  const event = new MessageEvent('message', { data, origin });
  Object.defineProperty(event, 'source', { value: source, configurable: true });
  window.dispatchEvent(event);
}

describe('createHostBridge', () => {
  it('before origin is learned, send only posts rsvp:ready, to *', () => {
    const target = fakeTarget();
    const bridge = createHostBridge({ target, hosted: true });

    bridge.send({ type: 'rsvp:opened', docId: 'd1', title: 'T', totalWords: 10 });
    expect(target.postMessage).not.toHaveBeenCalled();

    bridge.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL });
    expect(target.postMessage).toHaveBeenCalledTimes(1);
    expect(target.postMessage).toHaveBeenCalledWith(
      { type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL },
      '*'
    );
  });

  it('learns hostOrigin from the first rsvp:init from target and posts to it thereafter', () => {
    const target = fakeTarget();
    const bridge = createHostBridge({ target, hosted: true });
    const received: unknown[] = [];
    bridge.onMessage((msg) => received.push(msg));

    expect(bridge.hostOrigin()).toBeNull();

    dispatchMessage(
      { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: null, position: null },
      target,
      'https://host.example'
    );

    expect(bridge.hostOrigin()).toBe('https://host.example');
    expect(received).toEqual([
      { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: null, position: null },
    ]);

    bridge.send({ type: 'rsvp:opened', docId: 'd1', title: 'T', totalWords: 10 });
    expect(target.postMessage).toHaveBeenCalledWith(
      { type: 'rsvp:opened', docId: 'd1', title: 'T', totalWords: 10 },
      'https://host.example'
    );

    // Further rsvp:ready sends also go to the learned origin, not '*'.
    bridge.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL });
    expect(target.postMessage).toHaveBeenLastCalledWith(
      { type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL },
      'https://host.example'
    );
  });

  it('ignores a message whose event.source is not target', () => {
    const target = fakeTarget();
    const otherSource = fakeTarget();
    const bridge = createHostBridge({ target, hosted: true });
    const handler = vi.fn();
    bridge.onMessage(handler);

    dispatchMessage(
      { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: null, position: null },
      otherSource,
      'https://host.example'
    );

    expect(handler).not.toHaveBeenCalled();
    expect(bridge.hostOrigin()).toBeNull();
  });

  it('ignores a message from a different origin once one has been learned', () => {
    const target = fakeTarget();
    const bridge = createHostBridge({ target, hosted: true });
    const handler = vi.fn();
    bridge.onMessage(handler);

    dispatchMessage(
      { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: null, position: null },
      target,
      'https://host.example'
    );
    handler.mockClear();

    dispatchMessage(
      { type: 'rsvp:settings', settings: { wpm: 400 } },
      target,
      'https://attacker.example'
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a message that fails isHostToReader', () => {
    const target = fakeTarget();
    const bridge = createHostBridge({ target, hosted: true });
    const handler = vi.fn();
    bridge.onMessage(handler);

    dispatchMessage({ type: 'rsvp:bogus' }, target, 'https://host.example');

    expect(handler).not.toHaveBeenCalled();
    expect(bridge.hostOrigin()).toBeNull();
  });

  it('when not hosted, send and onMessage are no-ops', () => {
    const target = fakeTarget();
    const bridge = createHostBridge({ target, hosted: false });
    const handler = vi.fn();
    const unsubscribe = bridge.onMessage(handler);

    bridge.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL });
    expect(target.postMessage).not.toHaveBeenCalled();

    dispatchMessage(
      { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: null, position: null },
      target,
      'https://host.example'
    );
    expect(handler).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('when target is null, send and onMessage are no-ops', () => {
    const bridge = createHostBridge({ target: null, hosted: true });
    expect(() => bridge.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL })).not.toThrow();
    const unsubscribe = bridge.onMessage(vi.fn());
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('useHostBridge', () => {
  const originalSearch = window.location.search;

  function setSearch(search: string): void {
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  }

  afterEach(() => {
    setSearch(originalSearch);
    // @ts-expect-error -- test cleanup of a jsdom-only property
    delete window.opener;
  });

  it('not hosted (no ?host=1): ready immediately, init null, send is a no-op', () => {
    setSearch('');
    const { result } = renderHook(() => useHostBridge());

    expect(result.current.hosted).toBe(false);
    expect(result.current.ready).toBe(true);
    expect(result.current.init).toBeNull();
    expect(() => result.current.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL })).not.toThrow();
  });

  it('hosted via opener but rsvp:init never arrives: ready becomes true after timeout, init stays null', async () => {
    vi.useFakeTimers();
    try {
      setSearch('?host=1');
      Object.defineProperty(window, 'opener', {
        value: { postMessage: vi.fn() },
        configurable: true,
      });

      const { result } = renderHook(() => useHostBridge());
      expect(result.current.hosted).toBe(true);
      expect(result.current.ready).toBe(false);

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.ready).toBe(true);
      expect(result.current.init).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hosted via opener: becomes ready on rsvp:init and stores it', async () => {
    setSearch('?host=1');
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });

    const { result } = renderHook(() => useHostBridge());
    expect(result.current.hosted).toBe(true);

    act(() => {
      const event = new MessageEvent('message', {
        data: { type: 'rsvp:init', protocol: HOST_BRIDGE_PROTOCOL, settings: { wpm: 500 }, position: 7 },
        origin: 'https://host.example',
      });
      Object.defineProperty(event, 'source', { value: opener, configurable: true });
      window.dispatchEvent(event);
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.init).toEqual({
      type: 'rsvp:init',
      protocol: HOST_BRIDGE_PROTOCOL,
      settings: { wpm: 500 },
      position: 7,
    });
  });
});
