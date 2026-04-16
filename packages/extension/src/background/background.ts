const SERVER_URL = 'http://localhost:3847';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'openReader' && message.doc) {
    const { doc, wpm } = message;

    // Try posting to local server — enables shared history with web app
    fetch(`${SERVER_URL}/api/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, wpm }),
      signal: AbortSignal.timeout(2000),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        chrome.tabs.create({ url: `${SERVER_URL}/?doc=${encodeURIComponent(data.id)}` });
      })
      .catch(() => {
        // Server not running — use extension's built-in reader page
        const storageKey = `rsvp_doc_${doc.id}`;
        chrome.storage.local.set({ [storageKey]: doc }, () => {
          const url = chrome.runtime.getURL(`reader.html?doc=${encodeURIComponent(doc.id)}`);
          chrome.tabs.create({ url });
        });
      });

    sendResponse({ ok: true });
    return true;
  }
});
