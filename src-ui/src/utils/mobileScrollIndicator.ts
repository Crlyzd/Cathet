/**
 * mobileScrollIndicator.ts — Zero-reflow, 120fps GPU-composited overlay scrollbar for Android.
 * Mounts into the editor's non-scrolling host (#editor-container or .dualpane-editor-host)
 * so .editor-wrapper keeps zero layout scrollbar width (zero text reflow during open/close morphs).
 */
import type { EditorComponent } from "../components/Editor";

const MIN_THUMB_PX = 28;
const IDLE_HIDE_MS = 900;

const scrollHostRegistry = new WeakMap<EditorComponent, () => void>();

export function syncMobileScrollHost(editor: EditorComponent): void {
  scrollHostRegistry.get(editor)?.();
}

export function attachMobileScrollIndicator(
  wrapperEl: HTMLElement,
  editor: EditorComponent
): () => void {
  const trackEl = document.createElement("div");
  trackEl.className = "mobile-scroll-track";
  trackEl.setAttribute("aria-hidden", "true");

  const thumbEl = document.createElement("div");
  thumbEl.className = "mobile-scroll-thumb";
  trackEl.appendChild(thumbEl);

  let rafId = 0;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const ensureTrackHost = (): HTMLElement | null => {
    const host = wrapperEl.parentElement;
    if (!host) return null;
    if (!trackEl.isConnected || trackEl.parentElement !== host) {
      host.appendChild(trackEl);
    }
    return host;
  };

  const hideImmediate = (): void => {
    trackEl.classList.remove("is-visible");
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const update = (): void => {
    rafId = 0;
    if (document.body.classList.contains("is-animating-transform")) {
      hideImmediate();
      return;
    }
    const host = ensureTrackHost();
    if (!host) return;

    const scrollHeight = wrapperEl.scrollHeight;
    const clientHeight = wrapperEl.clientHeight;
    if (scrollHeight <= clientHeight + 2) {
      hideImmediate();
      return;
    }

    const trackHeight = trackEl.clientHeight;
    if (trackHeight <= 0) return;

    const maxScroll = scrollHeight - clientHeight;
    const ratio = Math.max(0, Math.min(1, wrapperEl.scrollTop / maxScroll));
    const thumbHeight = Math.max(
      MIN_THUMB_PX,
      Math.min(trackHeight * 0.85, (clientHeight / scrollHeight) * trackHeight)
    );
    const thumbTop = ratio * Math.max(0, trackHeight - thumbHeight);

    thumbEl.style.height = `${thumbHeight.toFixed(1)}px`;
    thumbEl.style.transform = `translate3d(0, ${thumbTop.toFixed(1)}px, 0)`;
    trackEl.classList.add("is-visible");

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      trackEl.classList.remove("is-visible");
      hideTimer = null;
    }, IDLE_HIDE_MS);
  };

  const onScroll = (): void => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  const syncHost = (): void => {
    hideImmediate();
    ensureTrackHost();
  };

  ensureTrackHost();
  scrollHostRegistry.set(editor, syncHost);
  wrapperEl.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    wrapperEl.removeEventListener("scroll", onScroll);
    if (rafId) cancelAnimationFrame(rafId);
    if (hideTimer) clearTimeout(hideTimer);
    scrollHostRegistry.delete(editor);
    trackEl.remove();
  };
}
