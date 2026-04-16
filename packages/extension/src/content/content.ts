import { parseText } from '@rsvp-reader/core';
import { extractPageContent } from './extractor';

interface SpeedReadMessage {
  action: 'speedRead';
  wpm?: number;
}

// Guard against duplicate injection (executeScript may be called multiple times)
if (!(window as any).__rsvpContentLoaded) {
  (window as any).__rsvpContentLoaded = true;

  console.log('[RSVP] Content script loaded on', window.location.href);

  chrome.runtime.onMessage.addListener((message: SpeedReadMessage, _sender, sendResponse) => {
    console.log('[RSVP] Message received:', message);

    if (message.action !== 'speedRead') return;

    console.log('[RSVP] Extracting page content...');
    const extracted = extractPageContent(document, window.location.href);
    console.log('[RSVP] Extracted:', { title: extracted.title, textLength: extracted.text.length });

    if (!extracted.text.trim()) {
      console.error('[RSVP] No readable content found on this page.');
      sendResponse({ error: 'No readable content found.' });
      return true;
    }

    const wpm = message.wpm ?? 300;

    console.log('[RSVP] Parsing text...');
    parseText(extracted.text, extracted.url, extracted.title)
      .then((doc) => {
        console.log('[RSVP] Parsed doc:', { title: doc.title, totalWords: doc.totalWords });
        // Send the full doc to background — it decides whether to open via server or extension page
        chrome.runtime.sendMessage({ action: 'openReader', doc, wpm });
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error('[RSVP] parseText failed:', err);
        sendResponse({ error: String(err) });
      });

    return true;
  });
}
