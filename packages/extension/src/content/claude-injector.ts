import React from 'react';
import { createRoot } from 'react-dom/client';
import { parseText } from '@rsvp-reader/core';
import { createOverlay, destroyOverlay } from './overlay';
import { ReaderApp } from '../reader/ReaderApp';

const INJECTED_ATTR = 'data-rsvp-injected';

function getWpm(): Promise<number> {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['wpm'], (result) => {
        resolve(typeof result.wpm === 'number' ? result.wpm : 300);
      });
    } catch {
      resolve(300);
    }
  });
}

function findMessageContainer(actionBar: Element): Element | null {
  // Walk up the tree to find the nearest ancestor with substantial text
  // that is a sibling relationship to the action bar
  let el: Element | null = actionBar.parentElement;
  for (let i = 0; i < 10 && el; i++) {
    // Look for a previous sibling with substantial content
    const prev = el.previousElementSibling;
    if (prev && (prev.textContent?.trim().length ?? 0) > 100) {
      return prev;
    }
    // Or the parent itself if it has lots of text and isn't just wrapping the action bar
    if ((el.textContent?.trim().length ?? 0) > 200) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function injectButton(actionBar: Element, messageEl: Element): void {
  if (actionBar.hasAttribute(INJECTED_ATTR)) return;
  actionBar.setAttribute(INJECTED_ATTR, 'true');

  const btn = document.createElement('button');
  btn.title = 'Speed read this response';
  btn.textContent = '⚡';
  btn.setAttribute('aria-label', 'Speed read');
  btn.style.cssText = [
    'background:none',
    'border:none',
    'cursor:pointer',
    'font-size:14px',
    'padding:4px 6px',
    'border-radius:4px',
    'opacity:0.5',
    'transition:opacity 0.15s',
    'color:inherit',
    'line-height:1',
    'vertical-align:middle',
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.5'; });

  btn.addEventListener('click', async () => {
    // Toggle: close if already open
    if (document.getElementById('rsvp-overlay-host')) {
      destroyOverlay();
      return;
    }

    const text = (messageEl as HTMLElement).innerText ?? messageEl.textContent ?? '';
    if (!text.trim()) return;

    const wpm = await getWpm();
    const doc = await parseText(text.trim(), window.location.href);

    createOverlay(document);
    const host = document.getElementById('rsvp-overlay-host')!;
    const shadow = host.shadowRoot!;
    const mountPoint = shadow.getElementById('rsvp-reader-root')!;

    const style = document.createElement('style');
    style.textContent = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      '#rsvp-reader-root {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 100vw;',
      '  height: 100vh;',
      '}',
    ].join('\n');
    shadow.insertBefore(style, mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      React.createElement(ReaderApp, {
        document: doc,
        wpm,
        onClose: () => {
          root.unmount();
          destroyOverlay();
        },
      })
    );
  });

  actionBar.appendChild(btn);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scanForMessages(): void {
  // Use copy buttons as stable anchors — aria-labels are more stable than class names
  const copyBtns = document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label*="Copy"], button[data-testid*="copy"]'
  );

  for (const copyBtn of copyBtns) {
    // The action bar is the closest role="group" ancestor, or the direct parent
    const actionBar =
      (copyBtn.closest('[role="group"]') as Element | null) ??
      copyBtn.parentElement;

    if (!actionBar || actionBar.hasAttribute(INJECTED_ATTR)) continue;

    const messageEl = findMessageContainer(actionBar);
    if (!messageEl) continue;

    injectButton(actionBar, messageEl);
  }
}

function scheduleScan(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    scanForMessages();
  }, 400);
}

// Watch for new responses being added (including streaming completions)
const observer = new MutationObserver(scheduleScan);
observer.observe(document.body, { childList: true, subtree: true });

// Initial scan after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForMessages);
} else {
  scanForMessages();
}
