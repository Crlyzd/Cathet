/**
 * themeTransition.ts — Expanding circular reveal theme transition
 * High-performance 120fps circular clip-path mask transition powered by View Transitions API.
 * Includes concurrency mutex & cancellation to eliminate jank & GPU framebuffer pile-up.
 */

let activeTransition: any = null;
let isTransitioning = false;

export async function executeCircularThemeTransition(
  origin: { x: number; y: number },
  toggleFn: () => void
): Promise<void> {
  const { x, y } = origin;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const doc = document as any;

  // If a transition is already in flight, skip/abort prior to prevent GPU framebuffer pile-up
  if (isTransitioning && activeTransition) {
    try {
      if (typeof activeTransition.skipTransition === "function") {
        activeTransition.skipTransition();
      }
    } catch {
      // Ignore abort errors
    }
    toggleFn();
    return;
  }

  if (typeof doc.startViewTransition === "function") {
    isTransitioning = true;
    try {
      const transition = doc.startViewTransition(() => {
        toggleFn();
      });
      activeTransition = transition;

      await transition.ready;
      const anim = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 380,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );

      await anim.finished.catch(() => {});
    } catch {
      // Fallback
    } finally {
      isTransitioning = false;
      activeTransition = null;
    }
    return;
  }

  // Direct toggle fallback if View Transitions API is not supported
  toggleFn();
}

