import { t } from "../../services/i18nService";

export interface HomeSelectionBarCallbacks {
  onRename: () => void;
  onHide: () => void;
  onPin: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export class HomeSelectionBarComponent {
  private element: HTMLElement;
  private callbacks: HomeSelectionBarCallbacks;

  constructor(container: HTMLElement, callbacks: HomeSelectionBarCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "home-selection-bar";
    this.element.style.display = "none";
    this.render();
    container.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="home-selection-pill disabled">
        <button class="home-sel-btn" id="home-sel-rename" title="${t("common.rename")}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span class="home-sel-label">${t("common.rename")}</span>
        </button>
        <button class="home-sel-btn" id="home-sel-pin" title="${t("common.pin")}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 17v5"></path>
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
          </svg>
          <span class="home-sel-label">${t("common.pin")}</span>
        </button>
        <button class="home-sel-btn" id="home-sel-move" title="${t("common.move")}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <polyline points="12 11 15 14 12 17"></polyline>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          <span class="home-sel-label">${t("common.move")}</span>
        </button>
        <button class="home-sel-btn" id="home-sel-hide" title="${t("common.hide")}">
          <svg class="home-sel-hide-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path class="home-sel-shackle" d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span class="home-sel-label home-sel-hide-label">${t("common.hide")}</span>
        </button>
        <button class="home-sel-btn" id="home-sel-delete" title="${t("common.delete")}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span class="home-sel-label">${t("common.delete")}</span>
        </button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.element.querySelector("#home-sel-rename")?.addEventListener("click", () => this.callbacks.onRename());
    this.element.querySelector("#home-sel-pin")?.addEventListener("click", () => this.callbacks.onPin());
    this.element.querySelector("#home-sel-move")?.addEventListener("click", () => this.callbacks.onMove());
    this.element.querySelector("#home-sel-hide")?.addEventListener("click", () => this.callbacks.onHide());
    this.element.querySelector("#home-sel-delete")?.addEventListener("click", () => this.callbacks.onDelete());
  }

  setEnabled(enabled: boolean): void {
    const pill = this.element.querySelector(".home-selection-pill");
    pill?.classList.toggle("disabled", !enabled);
  }

  setSingleSelected(single: boolean): void {
    const renameBtn = this.element.querySelector("#home-sel-rename");
    renameBtn?.classList.toggle("disabled", !single);
  }

  setRenameEnabled(enabled: boolean): void {
    const btn = this.element.querySelector<HTMLButtonElement>("#home-sel-rename");
    if (btn) btn.disabled = !enabled;
  }

  setHiddenMode(isPrivate: boolean): void {
    const btn = this.element.querySelector<HTMLElement>("#home-sel-hide");
    const shackle = this.element.querySelector<SVGPathElement>(".home-sel-shackle");
    const label = this.element.querySelector<HTMLElement>(".home-sel-hide-label");
    if (btn) btn.title = isPrivate ? t("common.unhide") : t("common.hide");
    if (label) label.textContent = isPrivate ? t("common.unhide") : t("common.hide");
    if (shackle) shackle.setAttribute("d", isPrivate ? "M7 11V7a5 5 0 0 1 10 0" : "M7 11V7a5 5 0 0 1 10 0v4");
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? "flex" : "none";
  }

  destroy(): void {
    this.element.remove();
  }
}
