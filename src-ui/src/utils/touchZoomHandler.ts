import type { EditorComponent } from "../components/Editor";

export interface TouchZoomOptions {
  isSyncActive?: () => boolean;
  getSiblingEditor?: () => EditorComponent | null;
}

/**
 * Attaches a 2-finger pinch-to-zoom gesture listener to the given editor container.
 * Strictly designed for touch devices (Android WebView).
 */
export function attachTouchZoom(
  container: HTMLElement,
  editor: EditorComponent,
  getOptions?: () => TouchZoomOptions | undefined
): () => void {
  let pillEl: HTMLElement | null = container.querySelector(".touch-zoom-pill");
  if (!pillEl) {
    pillEl = document.createElement("div");
    pillEl.className = "touch-zoom-pill";
    container.appendChild(pillEl);
  }

  let d0 = 0;
  let startZoom = 100;
  let siblingStartZoom: number | null = null;
  let fadeTimer: number | null = null;

  const showPill = (percent: number) => {
    if (!pillEl) return;
    pillEl.textContent = `${percent}%`;
    pillEl.style.opacity = "1";
    if (fadeTimer) {
      window.clearTimeout(fadeTimer);
      fadeTimer = null;
    }
  };

  const schedulePillFade = () => {
    if (fadeTimer) window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      if (pillEl) {
        pillEl.style.opacity = "0";
      }
      fadeTimer = null;
    }, 1200);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      d0 = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      startZoom = editor.getZoomLevel();

      const opts = getOptions?.();
      if (opts?.isSyncActive?.()) {
        const sibling = opts.getSiblingEditor?.();
        siblingStartZoom = sibling ? sibling.getZoomLevel() : null;
      } else {
        siblingStartZoom = null;
      }
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = d / d0;
      const newZoom = Math.max(50, Math.min(300, Math.round(startZoom * scale)));

      editor.setZoomLevel(newZoom);
      showPill(newZoom);

      const opts = getOptions?.();
      if (opts?.isSyncActive?.() && siblingStartZoom !== null) {
        const sibling = opts.getSiblingEditor?.();
        if (sibling) {
          const delta = newZoom - startZoom;
          const siblingNewZoom = Math.max(50, Math.min(300, Math.round(siblingStartZoom + delta)));
          sibling.setZoomLevel(siblingNewZoom);
        }
      }
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2 && d0 > 0) {
      d0 = 0;
      siblingStartZoom = null;
      schedulePillFade();
    }
  };

  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd, { passive: true });
  container.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return () => {
    if (fadeTimer) window.clearTimeout(fadeTimer);
    container.removeEventListener("touchstart", onTouchStart);
    container.removeEventListener("touchmove", onTouchMove);
    container.removeEventListener("touchend", onTouchEnd);
    container.removeEventListener("touchcancel", onTouchEnd);
    pillEl?.remove();
  };
}

