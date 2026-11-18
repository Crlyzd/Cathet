/**
 * PreviewOverlayController.ts — Coordinates PreviewMinimap, PreviewBookmarkBar, scroll/resize observers, and setting gates.
 */
import { PreviewMinimap } from "./PreviewMinimap";
import { PreviewBookmarkBar } from "./PreviewBookmarkBar";
import { bookmarkService } from "../../services/bookmarkService";

export class PreviewOverlayController {
  private wrapperEl: HTMLElement;
  private editorEl: HTMLElement;
  private minimap: PreviewMinimap;
  private bookmarkBar: PreviewBookmarkBar;
  private resizeObserver: ResizeObserver;
  private isPreview = false;
  private docKey: string | null = null;
  private minimapEnabled: boolean;
  private bookmarksEnabled: boolean;

  private onScroll = (): void => {
    this.minimap.onScroll(this.wrapperEl);
  };

  private onMinimapSetting = (e: Event): void => {
    const enabled = (e as CustomEvent<boolean>).detail;
    this.minimapEnabled = Boolean(enabled);
    this.minimap.setEnabled(this.minimapEnabled, this.wrapperEl, this.editorEl);
  };

  private onBookmarksSetting = (e: Event): void => {
    const enabled = (e as CustomEvent<boolean>).detail;
    this.bookmarksEnabled = Boolean(enabled);
    this.bookmarkBar.setState(this.isPreview, this.docKey, this.bookmarksEnabled);
  };

  constructor(container: HTMLElement, wrapperEl: HTMLElement, editorEl: HTMLElement) {
    this.wrapperEl = wrapperEl;
    this.editorEl = editorEl;
    this.minimapEnabled = localStorage.getItem("cathet_preview_minimap") !== "false";
    this.bookmarksEnabled = localStorage.getItem("cathet_preview_bookmarks") !== "false";

    this.minimap = new PreviewMinimap(container);
    this.minimap.setEnabled(this.minimapEnabled, wrapperEl, editorEl);

    this.bookmarkBar = new PreviewBookmarkBar(container, wrapperEl, editorEl, (bookmarks) => {
      this.minimap.setBookmarks(bookmarks, this.wrapperEl);
    });

    this.wrapperEl.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("cathet:preview-minimap-change", this.onMinimapSetting);
    window.addEventListener("cathet:preview-bookmarks-change", this.onBookmarksSetting);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isPreview) return;
      this.minimap.updateVisibility(this.wrapperEl, this.editorEl);
      this.bookmarkBar.updateVisibility();
    });
    this.resizeObserver.observe(this.wrapperEl);
    this.resizeObserver.observe(this.editorEl);
  }

  attachToHost(host: HTMLElement): void {
    host.appendChild(this.minimap.getElement());
    host.appendChild(this.bookmarkBar.getElement());
  }

  syncState(isPreview: boolean, docKey: string | null): void {
    this.isPreview = isPreview;
    this.docKey = docKey;
    this.bookmarkBar.setState(isPreview, docKey, this.bookmarksEnabled);
    this.minimap.setBookmarks(bookmarkService.getBookmarks(docKey), this.wrapperEl);
    this.minimap.setPreviewState(isPreview, this.wrapperEl, this.editorEl);
  }

  destroy(): void {
    this.wrapperEl.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("cathet:preview-minimap-change", this.onMinimapSetting);
    window.removeEventListener("cathet:preview-bookmarks-change", this.onBookmarksSetting);
    this.resizeObserver.disconnect();
    this.minimap.destroy();
    this.bookmarkBar.destroy();
  }
}
