/**
 * PreviewMinimap.ts — Display-only frosted-glass fisheye page scroller for Markdown Preview.
 * Renders a 1/4-height curved cylindrical projection of the document that fades out when idle.
 */
import { PreviewBookmark } from "../../services/bookmarkService";

interface CachedBlock {
  kind: "heading" | "paragraph" | "media";
  top: number;
  height: number;
}

const MINI_SCALE = 0.24;
const IDLE_HIDE_MS = 1800;

export class PreviewMinimap {
  private rootEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private blocks: CachedBlock[] = [];
  private bookmarks: PreviewBookmark[] = [];
  private enabled = true;
  private isPreview = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId = 0;

  constructor(host: HTMLElement) {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "preview-minimap";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "preview-minimap-canvas";
    this.rootEl.appendChild(this.canvas);
    host.appendChild(this.rootEl);
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
    if (isPreview) this.captureBlocks(editorEl);
    this.updateVisibility(wrapperEl, editorEl);
  }

  setBookmarks(bookmarks: PreviewBookmark[], wrapperEl: HTMLElement): void {
    this.bookmarks = bookmarks;
    if (this.isVisible(wrapperEl)) this.scheduleDraw(wrapperEl);
  }

  captureBlocks(editorEl: HTMLElement): void {
    if (!this.isPreview) return;
    const nodes = editorEl.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,pre,blockquote,ul,ol,table,img,hr");
    this.blocks = Array.from(nodes).map((el) => {
      const tag = el.tagName;
      const kind: CachedBlock["kind"] = /^H[1-6]$/.test(tag)
        ? "heading"
        : tag === "P" || tag === "UL" || tag === "OL"
          ? "paragraph"
          : "media";
      return { kind, top: el.offsetTop, height: el.offsetHeight };
    });
  }

  onScroll(wrapperEl: HTMLElement): void {
    if (!this.isVisible(wrapperEl)) return;
    this.rootEl.classList.add("is-visible");
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.rootEl.classList.remove("is-visible");
    }, IDLE_HIDE_MS);
    this.scheduleDraw(wrapperEl);
  }

  updateVisibility(wrapperEl: HTMLElement, editorEl: HTMLElement): void {
    const show = this.isVisible(wrapperEl);
    this.rootEl.style.display = show ? "block" : "none";
    if (!show) {
      this.rootEl.classList.remove("is-visible");
      if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
      return;
    }
    this.captureBlocks(editorEl);
    this.scheduleDraw(wrapperEl);
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

  private projectY(linearDy: number, halfH: number): { y: number; lens: number; widthScale: number; fade: number } | null {
    const norm = linearDy / (halfH * 1.15);
    if (Math.abs(norm) >= 1.25) return null;
    const clamped = Math.max(-1, Math.min(1, norm));
    const y = halfH + Math.sin(clamped * Math.PI * 0.46) * halfH * 1.02;
    const lens = Math.cos(clamped * Math.PI * 0.46);
    return { y, lens, widthScale: 0.72 + 0.28 * lens, fade: Math.pow(Math.max(0, lens), 1.85) };
  }

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

    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const fg = isLight ? "#111827" : "#f1f5f9";
    const muted = isLight ? "#64748b" : "#94a3b8";
    const accent = isLight ? "#4f46e5" : "#818cf8";
    const halfH = h / 2;
    const activeDocCenterY = wrapperEl.scrollTop + wrapperEl.clientHeight / 2;
    const maxScroll = Math.max(1, wrapperEl.scrollHeight - wrapperEl.clientHeight);

    for (const b of this.blocks) {
      if (b.kind === "paragraph") {
        const lineCount = Math.max(1, Math.round(b.height / 14));
        const step = b.height / lineCount;
        for (let i = 0; i < lineCount; i++) {
          const docY = b.top + i * step + step * 0.4;
          const p = this.projectY((docY - activeDocCenterY) * MINI_SCALE, halfH);
          if (!p || p.fade < 0.03) continue;
          const baseW = (i === lineCount - 1 ? 0.54 : 0.82) * (w - 10);
          const x = (w - (w - 10) * p.widthScale) / 2;
          ctx.fillStyle = muted;
          ctx.globalAlpha = 0.68 * p.fade;
          ctx.fillRect(x, p.y, baseW * p.widthScale, 1.4 * (0.75 + 0.25 * p.lens));
        }
      } else {
        const docY = b.top + b.height / 2;
        const p = this.projectY((docY - activeDocCenterY) * MINI_SCALE, halfH);
        if (!p || p.fade < 0.03) continue;
        const bw = (w - 10) * p.widthScale;
        const x = (w - bw) / 2;
        const bh = b.kind === "heading"
          ? 3.2 * (0.7 + 0.3 * p.lens)
          : Math.max(4, Math.min(28, b.height * MINI_SCALE * (0.65 + 0.35 * p.lens)));
        ctx.fillStyle = b.kind === "heading" ? fg : muted;
        ctx.globalAlpha = (b.kind === "heading" ? 0.95 : 0.45) * p.fade;
        ctx.fillRect(x, p.y - bh / 2, bw, bh);
      }
    }

    for (const bm of this.bookmarks) {
      const bmDocY = bm.scrollRatio * maxScroll + wrapperEl.clientHeight / 2;
      const p = this.projectY((bmDocY - activeDocCenterY) * MINI_SCALE, halfH);
      if (!p || p.fade < 0.05) continue;
      const bw = (w - 4) * p.widthScale;
      const x = (w - bw) / 2;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.92 * p.fade;
      ctx.fillRect(x, p.y - 1, bw, 2);
      ctx.fillRect(x + bw - 6, p.y - 2.5, 6, 5);
    }
    ctx.globalAlpha = 1;
  }

  destroy(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rootEl.remove();
  }
}
