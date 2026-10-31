/**
 * themeTransition.ts — Expanding circular ripple theme transition
 */

export async function executeCircularThemeTransition(
  origin: { x: number; y: number },
  toggleFn: () => void
): Promise<void> {
  const doc = document as any;
  const { x, y } = origin;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

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
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    } catch {
      // Ignore if cancelled
    }
    return;
  }

  // Fallback: Expanding circular ripple overlay
  const ripple = document.createElement("div");
  ripple.className = "theme-ripple-overlay";
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);

  toggleFn();

  requestAnimationFrame(() => {
    ripple.style.transform = `scale(${(endRadius * 2) / 10})`;
    ripple.style.opacity = "0";
  });

  setTimeout(() => ripple.remove(), 450);
}

