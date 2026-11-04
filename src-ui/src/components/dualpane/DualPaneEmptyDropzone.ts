import { PlatformService } from "../../services/platformService";
import { t } from "../../services/i18nService";

export interface DualPaneEmptyCallbacks {
  onOpen: () => void;
  onOpenFile?: () => void;
  onNew: () => void;
}

/**
 * DualPaneEmptyDropzone — Placeholder view when the secondary pane is empty.
 */
export class DualPaneEmptyDropzone {
  private element: HTMLElement;

  constructor(callbacks: DualPaneEmptyCallbacks) {
    const isMobile = PlatformService.getInstance().isAndroid();
    this.element = document.createElement("div");
    this.element.className = "dualpane-empty";
    this.element.innerHTML = `
      <div class="dualpane-empty-card">
        <svg class="dualpane-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <polyline points="9 15 12 12 15 15"></polyline>
        </svg>
        <span class="dualpane-empty-title">${t("menu.dualPane")}</span>
        <span class="dualpane-empty-desc">${t("dualpane.dropHint")}</span>
        <div class="dualpane-empty-actions${isMobile ? " is-mobile-actions" : ""}">
          <button class="dualpane-empty-btn dualpane-empty-btn-primary" id="dualpane-empty-browse-btn" title="${isMobile ? "Home" : t("menu.open")}">
            <span class="dualpane-empty-btn-full">${isMobile ? "Home" : t("menu.open")}</span>
            <span class="dualpane-empty-btn-compact">${isMobile ? "Home" : t("menu.open")}</span>
          </button>
          ${
            isMobile
              ? `<button class="dualpane-empty-btn dualpane-empty-btn-secondary" id="dualpane-empty-openfile-btn" title="${t("dualpane.openFile")}">
                  <span class="dualpane-empty-btn-full">${t("dualpane.openFile")}</span>
                  <span class="dualpane-empty-btn-compact">${t("dualpane.openFile")}</span>
                </button>`
              : ""
          }
          <button class="dualpane-empty-btn dualpane-empty-btn-secondary" id="dualpane-empty-new-btn" title="${t("dualpane.newDocument")}">
            <span class="dualpane-empty-btn-full">${t("dualpane.newDocument")}</span>
            <span class="dualpane-empty-btn-compact">${t("common.ok")}</span>
          </button>
        </div>
      </div>
    `;

    this.element.querySelector("#dualpane-empty-new-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onNew();
    });

    this.element.querySelector("#dualpane-empty-browse-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onOpen();
    });

    this.element.querySelector("#dualpane-empty-openfile-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      callbacks.onOpenFile?.();
    });

    if (!isMobile) {
      this.element.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".dualpane-empty-btn")) return;
        callbacks.onNew();
      });
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
