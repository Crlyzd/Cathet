/**
 * containerTransform.ts — 60fps Native FLIP Container Morph Animations
 * Material-style container expansion from tile/FAB rect to full-screen editor & collapse.
 */

export interface ExpandContainerOptions {
  originRect: DOMRect;
  theme?: "dark" | "light";
  borderRadius?: number;
  title?: string;
  content?: string;
  isNewNote?: boolean;
  onReady?: () => void;
  onComplete: () => void;
}

export interface CollapseContainerOptions {
  targetRect: DOMRect;
  theme?: "dark" | "light";
  targetBorderRadius?: number;
  cardEl?: HTMLElement | null;
  onReady?: () => void;
  onComplete: () => void;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export class ContainerTransform {
  static expand(options: ExpandContainerOptions): void {
    const { originRect, theme = "dark", borderRadius = 16, title = "", content = "", isNewNote = false, onReady, onComplete } = options;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onReady?.();
      onComplete();
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = `container-transform-overlay ${theme}`;
    const bg = theme === "light" ? "#ffffff" : "#1e2026";
    const border = theme === "light" ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.12)";
    const shadow = theme === "light" ? "0 8px 30px rgba(0, 0, 0, 0.12)" : "0 8px 30px rgba(0, 0, 0, 0.4)";

    Object.assign(overlay.style, {
      position: "fixed",
      top: `${originRect.top}px`,
      left: `${originRect.left}px`,
      width: `${originRect.width}px`,
      height: `${originRect.height}px`,
      borderRadius: `${borderRadius}px`,
      background: bg,
      border,
      boxShadow: shadow,
      zIndex: "9998",
      pointerEvents: "none",
      overflow: "hidden",
      boxSizing: "border-box",
      willChange: "top, left, width, height, border-radius",
    });

    const isLight = theme === "light";
    const textCol = isLight ? "#111827" : "#f3f4f6";
    const secCol = isLight ? "#6b7280" : "#9ca3af";
    const borderCol = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
    const headerTitle = title || (isNewNote ? "Untitled Note" : "Note");
    const docText = isNewNote ? "" : content;

    const windowEl = document.createElement("div");
    windowEl.className = "container-transform-window";
    Object.assign(windowEl.style, {
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      pointerEvents: "none",
      boxSizing: "border-box",
    });

    windowEl.innerHTML = `
      <div style="height: 48px; padding-top: max(24px, env(safe-area-inset-top, 0px)); padding-left: 14px; padding-right: 14px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid ${borderCol}; flex-shrink: 0;">
        <span style="display: flex; align-items: center; color: ${secCol};">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </span>
        <span style="font-size: 15px; font-weight: 600; color: ${textCol}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(headerTitle)}</span>
      </div>
      <div style="flex: 1; padding: 18px; overflow: hidden; font-family: inherit; font-size: 15px; line-height: 1.6; color: ${textCol}; white-space: pre-wrap; word-break: break-word;">${escapeHtml(docText)}${isNewNote ? '<span style="display: inline-block; width: 2px; height: 16px; background: var(--col-accent, #3b82f6); margin-left: 2px; vertical-align: middle;"></span>' : ""}</div>
    `;
    overlay.appendChild(windowEl);

    document.body.appendChild(overlay);
    onReady?.();

    const anim = overlay.animate(
      [
        {
          top: `${originRect.top}px`,
          left: `${originRect.left}px`,
          width: `${originRect.width}px`,
          height: `${originRect.height}px`,
          borderRadius: `${borderRadius}px`,
        },
        {
          top: "0px",
          left: "0px",
          width: "100vw",
          height: "100vh",
          borderRadius: "0px",
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );

    const finish = () => {
      overlay.remove();
      onComplete();
    };

    anim.onfinish = finish;
    anim.oncancel = finish;
  }

  static collapse(options: CollapseContainerOptions): void {
    const { targetRect, theme = "dark", targetBorderRadius = 16, cardEl, onReady, onComplete } = options;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onReady?.();
      onComplete();
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = `container-transform-overlay ${theme}`;
    const bg = theme === "light" ? "#ffffff" : "#1e2026";
    const border = theme === "light" ? "1px solid rgba(0, 0, 0, 0.08)" : "1px solid rgba(255, 255, 255, 0.12)";
    const shadow = theme === "light" ? "0 4px 20px rgba(0, 0, 0, 0.08)" : "0 4px 20px rgba(0, 0, 0, 0.3)";

    Object.assign(overlay.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "100vw",
      height: "100vh",
      borderRadius: "0px",
      background: bg,
      border,
      boxShadow: shadow,
      zIndex: "9998",
      pointerEvents: "none",
      overflow: "hidden",
      boxSizing: "border-box",
      willChange: "transform, top, left, width, height, border-radius, opacity",
    });

    if (cardEl) {
      const clone = document.createElement("div");
      clone.className = "container-transform-content";
      clone.innerHTML = cardEl.innerHTML;
      clone.querySelector(".home-card-checkbox")?.remove();
      clone.querySelector(".home-card-check")?.remove();
      Object.assign(clone.style, {
        padding: "14px",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 200ms ease-in",
        boxSizing: "border-box",
      });
      overlay.appendChild(clone);
      requestAnimationFrame(() => {
        clone.style.opacity = "1";
      });
    }

    document.body.appendChild(overlay);
    onReady?.();

    const anim = overlay.animate(
      [
        {
          top: "0px",
          left: "0px",
          width: "100vw",
          height: "100vh",
          borderRadius: "0px",
          opacity: 1,
        },
        {
          top: `${targetRect.top}px`,
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          borderRadius: `${targetBorderRadius}px`,
          opacity: 0.94,
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );

    const finish = () => {
      overlay.remove();
      onComplete();
    };

    anim.onfinish = finish;
    anim.oncancel = finish;
  }
}
