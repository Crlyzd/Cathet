/**
 * Automatically detects overflowing text within containers and applies
 * horizontal marquee scrolling so incomplete text is never hidden.
 */
export function initAutoScroll(
  root: HTMLElement,
  selector = ".setting-subtext"
): () => void {
  const elements = root.querySelectorAll<HTMLElement>(selector);

  const measureAndApply = () => {
    elements.forEach((el) => {
      const content = el.querySelector<HTMLElement>(".subtext-content") || el;
      el.classList.remove("is-overflowing");
      content.style.removeProperty("--scroll-dist");
      content.style.removeProperty("--scroll-dur");

      const overflow = content.scrollWidth - el.clientWidth;
      if (overflow > 3) {
        el.classList.add("is-overflowing");
        const dist = -(overflow + 8);
        const dur = Math.max(5, (overflow / 16) + 3);
        content.style.setProperty("--scroll-dist", `${dist}px`);
        content.style.setProperty("--scroll-dur", `${dur.toFixed(1)}s`);
      }
    });
  };

  measureAndApply();
  const rafId = requestAnimationFrame(measureAndApply);

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => measureAndApply());
    elements.forEach((el) => ro?.observe(el));
  }

  return () => {
    cancelAnimationFrame(rafId);
    ro?.disconnect();
  };
}

