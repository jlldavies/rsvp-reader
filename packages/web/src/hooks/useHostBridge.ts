import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ReaderToHost, HostToReader } from '@rsvp-reader/core';
import { HOST_BRIDGE_PROTOCOL, isHostToReader } from '@rsvp-reader/core';

const READY_TIMEOUT_MS = 2000;

export interface HostBridge {
  send(msg: ReaderToHost): void;
  onMessage(handler: (msg: HostToReader) => void): () => void;
  hostOrigin(): string | null;
}

/**
 * Wraps postMessage plumbing to a single host window (an iframe's
 * `window.parent`, or a popped-out window's `window.opener`).
 *
 * The host's origin is unknown until the host's first `rsvp:init` message
 * arrives from `target`. Until then, `send` will only post `rsvp:ready`
 * (the one message defined to carry nothing origin-sensitive) and only to
 * `'*'`; every other outgoing message is dropped. Once the origin is
 * learned from a verified `rsvp:init`, every subsequent send — including
 * further `rsvp:ready`s — goes to exactly that origin.
 *
 * `onMessage` only delivers events whose `source` is `target` and (once an
 * origin has been learned) whose `origin` matches it, and whose data passes
 * `isHostToReader`.
 */
export function createHostBridge(opts: { target: Window | null; hosted: boolean }): HostBridge {
  const { target, hosted } = opts;
  let learnedOrigin: string | null = null;

  function send(msg: ReaderToHost): void {
    if (!hosted || !target) return;
    if (learnedOrigin === null) {
      if (msg.type !== 'rsvp:ready') return;
      target.postMessage(msg, '*');
      return;
    }
    target.postMessage(msg, learnedOrigin);
  }

  function onMessage(handler: (msg: HostToReader) => void): () => void {
    if (!hosted || !target) return () => {};

    const listener = (event: MessageEvent) => {
      if (event.source !== target) return;
      if (learnedOrigin !== null && event.origin !== learnedOrigin) return;
      if (!isHostToReader(event.data)) return;

      if (event.data.type === 'rsvp:init' && learnedOrigin === null) {
        learnedOrigin = event.origin;
      }

      handler(event.data);
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }

  function hostOrigin(): string | null {
    return learnedOrigin;
  }

  return { send, onMessage, hostOrigin };
}

export interface UseHostBridgeResult {
  hosted: boolean;
  ready: boolean;
  init: Extract<HostToReader, { type: 'rsvp:init' }> | null;
  send: (m: ReaderToHost) => void;
}

function detectHosted(): boolean {
  const flagged = new URLSearchParams(window.location.search).get('host') === '1';
  if (!flagged) return false;
  return window.parent !== window || !!window.opener;
}

function detectTarget(): Window | null {
  if (window.parent !== window) return window.parent;
  if (window.opener) return window.opener;
  return null;
}

export function useHostBridge(): UseHostBridgeResult {
  const hostedRef = useRef(detectHosted());
  const hosted = hostedRef.current;
  const targetRef = useRef<Window | null>(hosted ? detectTarget() : null);

  const bridgeRef = useRef<HostBridge | null>(null);
  if (!bridgeRef.current) {
    bridgeRef.current = createHostBridge({ target: targetRef.current, hosted });
  }
  const bridge = bridgeRef.current;

  const [ready, setReady] = useState(!hosted);
  const [init, setInit] = useState<Extract<HostToReader, { type: 'rsvp:init' }> | null>(null);

  useEffect(() => {
    if (!hosted) return;

    const unsubscribe = bridge.onMessage((msg) => {
      if (msg.type === 'rsvp:init') {
        setInit(msg);
        setReady(true);
      }
    });

    bridge.send({ type: 'rsvp:ready', protocol: HOST_BRIDGE_PROTOCOL });

    const timer = window.setTimeout(() => {
      setReady((current) => {
        if (!current) {
          // eslint-disable-next-line no-console
          console.warn('[rsvp-reader] host bridge: no rsvp:init received within timeout; falling back to localStorage');
        }
        return true;
      });
    }, READY_TIMEOUT_MS);

    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    (m: ReaderToHost) => {
      bridge.send(m);
    },
    [bridge]
  );

  // Stable identity: only changes when hosted/ready/init/send actually change,
  // so consumers that put `bridge` in a dependency array don't re-run their
  // effects on every unrelated re-render (App.tsx does this for its
  // rsvp:progress / rsvp:finished / pagehide effects).
  return useMemo(
    () => ({ hosted, ready, init, send }),
    [hosted, ready, init, send]
  );
}
