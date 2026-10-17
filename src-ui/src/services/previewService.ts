export class PreviewService {
  private readonly STORAGE_KEY = "cathet_always_preview";
  private alwaysPreview: boolean;

  constructor() {
    this.alwaysPreview = localStorage.getItem(this.STORAGE_KEY) === "true";
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

  /**
   * Determines if an opened file should start in Preview mode.
   * Blank Untitled windows (filePath === null) always start in Edit mode.
   */
  shouldOpenInPreview(filePath: string | null): boolean {
    if (!filePath) return false;
    return this.alwaysPreview;
  }
}
