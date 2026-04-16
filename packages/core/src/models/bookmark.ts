export interface BookmarkStore {
  bookmarks: Record<string, DocumentProgress>;
}

export interface DocumentProgress {
  documentId: string;
  title: string;
  source: { type: string; uri: string };
  totalWords: number;
  positions: SavedPosition[];
  lastRead: number;
  settings?: {
    wpm?: number;
    chunkSize?: 1 | 2 | 3;
  };
}

export interface SavedPosition {
  id: string;
  tokenIndex: number;
  sectionIndex: number;
  label: string;
  createdAt: number;
}
