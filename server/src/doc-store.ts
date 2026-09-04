interface StoredDoc {
  doc: any;
  wpm: number;
  chunkSize: number;
  expires: number;
}

const store = new Map<string, StoredDoc>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_READ_ONCE = true;

let ttlMs = DEFAULT_TTL_MS;
let readOnce = DEFAULT_READ_ONCE;

export function configureDocStore(cfg: { docTtlMs: number; docReadOnce: boolean }): void {
  ttlMs = cfg.docTtlMs;
  readOnce = cfg.docReadOnce;
}

export function purgeExpired() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expires < now) store.delete(id);
  }
}

export function storeDoc(id: string, doc: any, wpm = 300, chunkSize = 1): void {
  purgeExpired();
  store.set(id, { doc, wpm, chunkSize, expires: Date.now() + ttlMs });
}

export function getDoc(id: string): StoredDoc | undefined {
  purgeExpired();
  const entry = store.get(id);
  if (entry && readOnce) store.delete(id);
  return entry;
}
