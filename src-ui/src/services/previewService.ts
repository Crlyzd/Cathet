export class PreviewService {
  private readonly STORAGE_KEY = "cathet_always_preview";
  private readonly MINIMAP_KEY = "cathet_preview_minimap";
  private readonly BOOKMARKS_KEY = "cathet_preview_bookmarks";
  private alwaysPreview: boolean;
  private previewMinimap: boolean;
  private previewBookmarks: boolean;

  constructor() {
    this.alwaysPreview = localStorage.getItem(this.STORAGE_KEY) === "true";
    this.previewMinimap = localStorage.getItem(this.MINIMAP_KEY) !== "false";
    this.previewBookmarks = localStorage.getItem(this.BOOKMARKS_KEY) !== "false";
  }

  /**
   * Returns whether documents should default to Markdown Preview mode.
   */
  getAlwaysPreview(): boolean {
    return this.alwaysPreview;
  }

  /**
   * Updates preview mode preference and persists to localStorage.
   */
  setAlwaysPreview(enabled: boolean): void {
    this.alwaysPreview = enabled;
    localStorage.setItem(this.STORAGE_KEY, String(enabled));
  }

  /** Returns whether the preview fisheye page scroller is enabled. */
  getPreviewMinimap(): boolean {
    return this.previewMinimap;
  }

  /** Updates preview fisheye page scroller preference and persists to localStorage. */
  setPreviewMinimap(enabled: boolean): void {
    this.previewMinimap = enabled;
    localStorage.setItem(this.MINIMAP_KEY, String(enabled));
  }

  /** Returns whether preview reading bookmarks are enabled. */
  getPreviewBookmarks(): boolean {
    return this.previewBookmarks;
  }

  /** Updates preview reading bookmarks preference and persists to localStorage. */
  setPreviewBookmarks(enabled: boolean): void {
    this.previewBookmarks = enabled;
    localStorage.setItem(this.BOOKMARKS_KEY, String(enabled));
  }

  /**
   * Determines if an opened file should start in Preview mode.
   * Blank Untitled windows (filePath === null) always start in Edit mode.
   */
  shouldOpenInPreview(filePath: string | null): boolean {
    if (!filePath) return false;
    return this.alwaysPreview;
  }
}
