/**
 * themeTransition.ts — Expanding circular reveal theme transition
 * High-performance 120fps circular clip-path mask transition powered by View Transitions API.
 */

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
  if (typeof doc.startViewTransition === "function") {
    const transition = doc.startViewTransition(() => {
      toggleFn();
    });

    try {
      await transition.ready;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 420,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    } catch {
      // Ignore if cancelled
    }
    return;
  }

  // Direct toggle fallback if View Transitions API is not supported
  toggleFn();
}
