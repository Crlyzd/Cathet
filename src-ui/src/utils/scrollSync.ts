/**
 * scrollSync.ts — Bidirectional Scroll Preservation Utility
 * Captures and restores normalized scroll progress across Editor and Markdown Preview mode toggles (Ctrl+M).
 */

export function captureScrollRatio(container: HTMLElement | null): number {
  if (!container) return 0;
  const maxScroll = container.scrollHeight - container.clientHeight;
  return maxScroll > 0 ? container.scrollTop / maxScroll : 0;
}

export function restoreScrollRatio(container: HTMLElement | null, ratio: number): void {
  if (!container || ratio <= 0) return;

  const apply = () => {
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0) {
      container.scrollTop = Math.round(ratio * maxScroll);
    }
  };

  // Immediate synchronous restoration
  apply();

  // Secondary pass in requestAnimationFrame to accommodate post-render font and image reflows
  requestAnimationFrame(apply);
}
