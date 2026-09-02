/**
 * GlassDialog.ts — Custom Frosted Glass Modal & Alert Dialog for Cathet
 * Replaces native OS alert() popups with native frosted glassmorphic UI.
 */

export interface GlassDialogOptions {
  title?: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  confirmText?: string;
}

const dialogIcons = {
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
};

export function showGlassDialog(options: GlassDialogOptions): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.getElementById("glass-dialog-overlay");
    if (existing) existing.remove();

    const type = options.type || "info";
    const title = options.title || "Cathet";
    const confirmText = options.confirmText || "OK";
    const iconSvg = dialogIcons[type];

    const overlay = document.createElement("div");
    overlay.className = "glass-dialog-overlay";
    overlay.id = "glass-dialog-overlay";

    overlay.innerHTML = `
      <div class="glass-dialog-card" role="dialog" aria-modal="true">
        <div class="glass-dialog-body">
          <div class="glass-dialog-icon-wrap glass-dialog-${type}">
            ${iconSvg}
          </div>
          <div class="glass-dialog-content">
            <span class="glass-dialog-title">${title}</span>
            <span class="glass-dialog-message">${options.message}</span>
          </div>
        </div>
        <div class="glass-dialog-actions">
          <button type="button" class="glass-dialog-btn" id="glass-dialog-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector("#glass-dialog-confirm-btn") as HTMLButtonElement | null;
    btn?.focus();

    const cleanup = () => {
      window.removeEventListener("keydown", handleKeyDown);
      overlay.classList.add("closing");
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 120);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        cleanup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    btn?.addEventListener("click", () => cleanup());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });
  });
}
