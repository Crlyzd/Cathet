/**
 * PreviewMinimap.ts — Interactive optical zoom-lens page scroller for Markdown Preview.
 * Renders a curved elliptical lens via minimapRenderer and supports cylinder-wheel drag scrubbing.
 */
import { PreviewBookmark } from "../../services/bookmarkService";
import {
  CachedBlock,
  ProjectedPoint,
  captureMinimapBlocks,
  renderMinimapFrame,
} from "./minimapRenderer";

const IDLE_HIDE_MS = 1800;
const SCRUB_MULTIPLIER = 3.5;

export class PreviewMinimap {
  private rootEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private blocks: CachedBlock[] = [];
  private bookmarks: PreviewBookmark[] = [];
  private activeWrapper: HTMLElement | null = null;
  private enabled = true;
  private isPreview = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId = 0;

  private scrubPointerId: number | null = null;
  private scrubStartY = 0;
  private scrubLastY = 0;
  private isScrubbing = false;

  constructor(host: HTMLElement) {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "preview-minimap";
    const lensEl = document.createElement("div");
    lensEl.className = "preview-minimap-lens";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "preview-minimap-canvas";
    lensEl.appendChild(this.canvas);
    this.rootEl.appendChild(lensEl);
    host.appendChild(this.rootEl);
    this.bindScrubEvents();
  }

  getElement(): HTMLElement {
    return this.rootEl;
  }

  setEnabled(enabled: boolean, wrapperEl: HTMLElement, editorEl: HTMLElement): void {
    this.enabled = enabled;
    this.updateVisibility(wrapperEl, editorEl);
  }

  setPreviewState(isPreview: boolean, wrapperEl: HTMLElement, editorEl: HTMLElement): void {
    this.isPreview = isPreview;
    this.activeWrapper = wrapperEl;
    if (isPreview) this.captureBlocks(editorEl);
    this.updateVisibility(wrapperEl, editorEl);
  }

  setBookmarks(bookmarks: PreviewBookmark[], wrapperEl: HTMLElement): void {
    this.bookmarks = bookmarks;
    this.activeWrapper = wrapperEl;
    if (this.isVisible(wrapperEl)) this.scheduleDraw(wrapperEl);
  }

  captureBlocks(editorEl: HTMLElement): void {
    if (!this.isPreview) return;
    this.blocks = captureMinimapBlocks(editorEl);
  }

  onScroll(wrapperEl: HTMLElement): void {
    this.activeWrapper = wrapperEl;
    if (!this.isVisible(wrapperEl)) return;
    this.rootEl.classList.add("is-visible");
    if (!this.isScrubbing) this.armIdleHide();
    this.scheduleDraw(wrapperEl);
  }

  updateVisibility(wrapperEl: HTMLElement, editorEl: HTMLElement): void {
    this.activeWrapper = wrapperEl;
    const show = this.isVisible(wrapperEl);
    this.rootEl.style.display = show ? "block" : "none";
    if (!show) {
      this.endScrub();
      this.rootEl.classList.remove("is-visible");
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
      return;
    }
    this.captureBlocks(editorEl);
    this.scheduleDraw(wrapperEl);
  }

  private armIdleHide(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.rootEl.classList.remove("is-visible");
    }, IDLE_HIDE_MS);
  }

  private bindScrubEvents(): void {
    this.rootEl.addEventListener("pointerdown", (e: PointerEvent) => {
      if (!this.activeWrapper || !this.rootEl.classList.contains("is-visible")) return;
      this.scrubPointerId = e.pointerId;
      this.scrubStartY = e.clientY;
      this.scrubLastY = e.clientY;
      this.isScrubbing = false;
      try { this.rootEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });

    this.rootEl.addEventListener("pointermove", (e: PointerEvent) => {
      if (this.scrubPointerId !== e.pointerId || !this.activeWrapper) return;
      if (!this.isScrubbing && Math.abs(e.clientY - this.scrubStartY) > 4) {
        this.isScrubbing = true;
        this.rootEl.classList.add("is-dragging");
        if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
      }
      if (!this.isScrubbing) return;
      const dy = e.clientY - this.scrubLastY;
      this.scrubLastY = e.clientY;
      const maxScroll = Math.max(0, this.activeWrapper.scrollHeight - this.activeWrapper.clientHeight);
      this.activeWrapper.scrollTop = Math.max(0, Math.min(maxScroll, this.activeWrapper.scrollTop + dy * SCRUB_MULTIPLIER));
    });

    const stop = (e: PointerEvent) => {
      if (this.scrubPointerId !== e.pointerId) return;
      this.endScrub();
    };
    this.rootEl.addEventListener("pointerup", stop);
    this.rootEl.addEventListener("pointercancel", stop);
  }

  private endScrub(): void {
    if (this.scrubPointerId !== null) {
      try { this.rootEl.releasePointerCapture(this.scrubPointerId); } catch { /* ignore */ }
    }
    this.scrubPointerId = null;
    this.isScrubbing = false;
    this.rootEl.classList.remove("is-dragging");
    if (this.rootEl.classList.contains("is-visible")) this.armIdleHide();
  }

  private isVisible(wrapperEl: HTMLElement): boolean {
    return this.enabled && this.isPreview && wrapperEl.scrollHeight > wrapperEl.clientHeight * 1.15;
  }

  private scheduleDraw(wrapperEl: HTMLElement): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.draw(wrapperEl);
    });
  }

  private projectY = (linearDy: number, halfH: number): ProjectedPoint | null => {
    const norm = linearDy / (halfH * 1.15);
    if (Math.abs(norm) >= 1.25) return null;
    const clamped = Math.max(-1, Math.min(1, norm));
    const lens = Math.cos(clamped * Math.PI * 0.48);
    const focus = Math.exp(-Math.pow(norm / 0.36, 2));
    const y = halfH + (Math.sin(clamped * Math.PI * 0.48) * 0.74 + Math.tanh(norm * 2.3) * 0.26) * halfH;
    const normY = (y - halfH) / halfH;
    const widthScale = Math.sqrt(Math.max(0.08, 1 - Math.pow(normY / 1.44, 2)));
    const fade = Math.pow(Math.max(0, lens), 1.55);
    return { y, lens, focus, widthScale, fade };
  };

  private draw(wrapperEl: HTMLElement): void {
    const w = this.rootEl.clientWidth;
    const h = this.rootEl.clientHeight;
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    renderMinimapFrame(ctx, w, h, this.blocks, this.bookmarks, wrapperEl, this.projectY);
  }

  destroy(): void {
    this.endScrub();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rootEl.remove();
  }
}
