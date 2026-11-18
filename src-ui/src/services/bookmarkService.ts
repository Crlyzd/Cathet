/**
 * bookmarkService.ts — Persistent per-document reading bookmarks for Markdown Preview mode.
 */

export interface PreviewBookmark {
  id: string;
  scrollRatio: number;
  label: string;
  snippet: string;
  createdAt: number;
}

const STORAGE_KEY = "cathet_preview_bookmarks_v1";
const MAX_BOOKMARKS_PER_DOC = 12;

export class BookmarkService {
  private memoryStore = new Map<string, PreviewBookmark[]>();

  private readAll(): Record<string, PreviewBookmark[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, PreviewBookmark[]>) : {};
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, PreviewBookmark[]>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  }

  private normalizeKey(docKey: string | null): string {
    return docKey?.trim() || "__untitled__";
  }

  getBookmarks(docKey: string | null): PreviewBookmark[] {
    if (!docKey) return [...(this.memoryStore.get("__untitled__") || [])];
    const all = this.readAll();
    return [...(all[this.normalizeKey(docKey)] || [])];
  }

  getLatestBookmark(docKey: string | null): PreviewBookmark | null {
    const list = this.getBookmarks(docKey);
    return list.length > 0 ? list[0] : null;
  }

  addBookmark(
    docKey: string | null,
    scrollRatio: number,
    label: string,
    snippet: string
  ): PreviewBookmark {
    const entry: PreviewBookmark = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scrollRatio: Math.max(0, Math.min(1, scrollRatio)),
      label: label.trim() || `${Math.round(scrollRatio * 100)}%`,
      snippet: snippet.trim().slice(0, 80),
      createdAt: Date.now(),
    };

    const existing = this.getBookmarks(docKey);
    const next = [entry, ...existing].slice(0, MAX_BOOKMARKS_PER_DOC);
    if (!docKey) {
      this.memoryStore.set("__untitled__", next);
    } else {
      const all = this.readAll();
      all[this.normalizeKey(docKey)] = next;
      this.writeAll(all);
    }
    return entry;
  }

  removeBookmark(docKey: string | null, id: string): PreviewBookmark[] {
    const next = this.getBookmarks(docKey).filter((b) => b.id !== id);
    if (!docKey) {
      this.memoryStore.set("__untitled__", next);
    } else {
      const all = this.readAll();
      const key = this.normalizeKey(docKey);
      if (next.length === 0) delete all[key];
      else all[key] = next;
      this.writeAll(all);
    }
    return next;
  }

  migrateDocKey(oldKey: string | null, newKey: string | null): void {
    if (!newKey || oldKey === newKey) return;
    const oldList = this.getBookmarks(oldKey);
    if (oldList.length === 0) return;
    const all = this.readAll();
    const targetKey = this.normalizeKey(newKey);
    const merged = [...oldList, ...(all[targetKey] || [])].slice(0, MAX_BOOKMARKS_PER_DOC);
    all[targetKey] = merged;
    if (oldKey) delete all[this.normalizeKey(oldKey)];
    else this.memoryStore.delete("__untitled__");
    this.writeAll(all);
  }
}

export const bookmarkService = new BookmarkService();
