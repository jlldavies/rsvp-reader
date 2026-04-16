const OVERLAY_ID = 'rsvp-overlay-host';

let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

export function isOverlayOpen(): boolean {
  return document.getElementById(OVERLAY_ID) !== null;
}

/**
 * Insert the overlay shadow host into the document body.
 * Returns a cleanup function.
 */
export function createOverlay(doc: Document): () => void {
  // Prevent duplicates
  if (doc.getElementById(OVERLAY_ID)) {
    return destroyOverlay;
  }

  const host = doc.createElement('div');
  host.id = OVERLAY_ID;
  host.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100vw',
    'height:100vh',
    'z-index:2147483647',
    'background:rgba(0,0,0,0.85)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  // Attach a shadow DOM so our styles don't conflict with the host page
  const shadow = host.attachShadow({ mode: 'open' });

  // Placeholder div for React mount point
  const mountPoint = doc.createElement('div');
  mountPoint.id = 'rsvp-reader-root';
  shadow.appendChild(mountPoint);

  doc.body.appendChild(host);

  // Register Escape to close
  escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      destroyOverlay();
    }
  };
  doc.addEventListener('keydown', escapeHandler);

  return destroyOverlay;
}

export function destroyOverlay(): void {
  const host = document.getElementById(OVERLAY_ID);
  if (host) {
    host.remove();
  }

  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
}
