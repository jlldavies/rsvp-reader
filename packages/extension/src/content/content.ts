import React from 'react';
import { createRoot } from 'react-dom/client';
import { parseText } from '@rsvp-reader/core';
import { extractPageContent } from './extractor';
import { createOverlay, destroyOverlay } from './overlay';
import { ReaderApp } from '../reader/ReaderApp';

interface SpeedReadMessage {
  action: 'speedRead';
  wpm?: number;
}

chrome.runtime.onMessage.addListener((message: SpeedReadMessage) => {
  if (message.action !== 'speedRead') return;

  // If overlay is already open, close it
  const existingHost = document.getElementById('rsvp-overlay-host');
  if (existingHost) {
    destroyOverlay();
    return;
  }

  const wpm = message.wpm ?? 300;

  // Extract readable content from the current page
  const extracted = extractPageContent(document, window.location.href);

  if (!extracted.text.trim()) {
    console.warn('[RSVP] No readable content found on this page.');
    return;
  }

  // Parse into an RsvpDocument
  const doc = parseText(extracted.text, extracted.url, extracted.title);

  // Create overlay and mount React app into shadow DOM
  createOverlay(document);
  const host = document.getElementById('rsvp-overlay-host')!;
  const shadow = host.shadowRoot!;
  const mountPoint = shadow.getElementById('rsvp-reader-root')!;

  // Inject minimal reset styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    #rsvp-reader-root {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      height: 100vh;
    }
  `;
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
