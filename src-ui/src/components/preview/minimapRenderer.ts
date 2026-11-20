/**
 * minimapRenderer.ts — Clean abstract block extraction & optical zoom-lens 2D Canvas renderer
 * with chromatic aberration on paragraph/heading/media bars away from the focal center.
 */
import type { PreviewBookmark } from "../../services/bookmarkService";

export interface CachedBlock {
  kind: "heading" | "paragraph" | "media";
  top: number;
  height: number;
}

export interface ProjectedPoint {
  y: number;
  lens: number;
  focus: number;
  widthScale: number;
  fade: number;
}

export type ProjectFn = (linearDy: number, halfH: number) => ProjectedPoint | null;

const MINI_SCALE = 0.22;

export function captureMinimapBlocks(editorEl: HTMLElement): CachedBlock[] {
  const nodes = editorEl.querySelectorAll<HTMLElement>(
    "h1,h2,h3,h4,h5,h6,p,pre,blockquote,ul,ol,table,img,hr"
  );
  return Array.from(nodes).map((el) => {
    const tag = el.tagName;
    const kind: CachedBlock["kind"] = /^H[1-6]$/.test(tag)
      ? "heading"
      : tag === "P" || tag === "UL" || tag === "OL"
        ? "paragraph"
        : "media";
    return { kind, top: el.offsetTop, height: el.offsetHeight };
  });
}

function drawChromaticRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  alpha: number, focus: number, normY: number
): void {
  const fringe = Math.max(0, 1 - focus);
  if (fringe < 0.10) return;
  const sx = fringe * 1.9;
  const sy = normY * fringe * 2.1;
  ctx.globalAlpha = alpha * fringe * 0.55;
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(x - sx, y - sy, w, h);
  ctx.fillStyle = "#f43f5e";
  ctx.fillRect(x + sx, y + sy, w, h);
}

export function renderMinimapFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  blocks: CachedBlock[],
  bookmarks: PreviewBookmark[],
  wrapperEl: HTMLElement,
  projectY: ProjectFn
): void {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const fg = isLight ? "#111827" : "#f1f5f9";
  const muted = isLight ? "#64748b" : "#94a3b8";
  const accent = isLight ? "#4f46e5" : "#818cf8";
  const halfH = h / 2;
  const activeCenterY = wrapperEl.scrollTop + wrapperEl.clientHeight / 2;
  const maxScroll = Math.max(1, wrapperEl.scrollHeight - wrapperEl.clientHeight);

  for (const b of blocks) {
    if (b.kind === "paragraph") {
      const lineCount = Math.max(1, Math.round(b.height / 14));
      const step = b.height / lineCount;
      for (let i = 0; i < lineCount; i++) {
        const p = projectY((b.top + i * step + step * 0.4 - activeCenterY) * MINI_SCALE, halfH);
        if (!p || p.fade < 0.03) continue;
        const innerW = Math.max(8, w * p.widthScale - 14);
        const drawW = (i === lineCount - 1 ? 0.62 : 1) * innerW;
        const x = (w - innerW) / 2;
        const lh = 0.85 + 0.60 * p.lens + 1.25 * p.focus;
        const alpha = (0.36 + 0.54 * p.focus) * p.fade;
        const normY = (p.y - halfH) / halfH;
        drawChromaticRect(ctx, x, p.y - lh / 2, drawW, lh, alpha, p.focus, normY);
        ctx.fillStyle = muted;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, p.y - lh / 2, drawW, lh);
      }
    } else {
      const p = projectY((b.top + b.height / 2 - activeCenterY) * MINI_SCALE, halfH);
      if (!p || p.fade < 0.03) continue;
      const bw = Math.max(8, w * p.widthScale - 14);
      const x = (w - bw) / 2;
      const bh = b.kind === "heading"
        ? 1.5 + 1.4 * p.lens + 2.4 * p.focus
        : Math.max(4, Math.min(34, b.height * MINI_SCALE * (0.48 + 0.36 * p.lens + 0.42 * p.focus)));
      const alpha = (b.kind === "heading" ? 0.72 + 0.28 * p.focus : 0.38 + 0.24 * p.focus) * p.fade;
      const normY = (p.y - halfH) / halfH;
      drawChromaticRect(ctx, x, p.y - bh / 2, bw, bh, alpha, p.focus, normY);
      ctx.fillStyle = b.kind === "heading" ? fg : muted;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, p.y - bh / 2, bw, bh);
    }
  }

  for (const bm of bookmarks) {
    const p = projectY((bm.scrollRatio * maxScroll + wrapperEl.clientHeight / 2 - activeCenterY) * MINI_SCALE, halfH);
    if (!p || p.fade < 0.05) continue;
    const bw = Math.max(8, w * p.widthScale - 8);
    const x = (w - bw) / 2;
    const bmH = 1.8 + 1.0 * p.focus;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.92 * p.fade;
    ctx.fillRect(x, p.y - bmH / 2, bw, bmH);
    ctx.fillRect(x + bw - 6, p.y - (bmH + 3) / 2, 6, bmH + 3);
  }
  ctx.globalAlpha = 1;
}
