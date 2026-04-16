interface StoredDoc {
  doc: any;
  wpm: number;
  chunkSize: number;
  expires: number;
}

const store = new Map<string, StoredDoc>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

function purgeExpired() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expires < now) store.delete(id);
  }
}

export function storeDoc(id: string, doc: any, wpm = 300, chunkSize = 1): void {
  purgeExpired();
  store.set(id, { doc, wpm, chunkSize, expires: Date.now() + TTL_MS });
}

export function getDoc(id: string): StoredDoc | undefined {
  purgeExpired();
  const entry = store.get(id);
  if (entry) store.delete(id);
  return entry;
}
