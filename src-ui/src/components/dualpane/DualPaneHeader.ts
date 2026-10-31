import { icons } from "../../utils/monochromeIcons";

export interface DualPaneHeaderOptions {
  title: string;
  badgeText?: string;
  showCloseBtn?: boolean;
  onTogglePreview: () => void;
  onOpen: () => void;
  onClose?: () => void;
  onBack?: () => void;
}

/**
 * DualPaneHeader — Frosted glass header strip for each pane in Dual Pane mode.
 */
export class DualPaneHeader {
  private element: HTMLElement;
  private titleEl: HTMLElement;
  private previewBtn: HTMLElement;
  private openBtn: HTMLElement;
  private closeBtn?: HTMLElement;
  private backBtn: HTMLElement;

  constructor(options: DualPaneHeaderOptions) {
    this.element = document.createElement("div");
    this.element.className = "dualpane-header";
    this.element.innerHTML = `
      <div class="dualpane-title-group">
        <button class="dualpane-back-btn" style="display: none;" title="Back to Document">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="dualpane-title">${options.title}</span>
        ${options.badgeText ? `<span class="dualpane-badge">${options.badgeText}</span>` : ""}
      </div>
      <div class="dualpane-actions">
        <button class="dualpane-btn btn-preview" title="Toggle Preview (Ctrl+M)">Preview</button>
        <button class="dualpane-btn btn-open" title="Notes Dashboard">${icons.grid}</button>
        ${options.showCloseBtn ? `<button class="dualpane-btn btn-close" title="Exit Dual Pane">✕</button>` : ""}
      </div>
    `;

    this.titleEl = this.element.querySelector(".dualpane-title")!;
    this.previewBtn = this.element.querySelector(".btn-preview")!;
    this.openBtn = this.element.querySelector(".btn-open")!;
    this.backBtn = this.element.querySelector(".dualpane-back-btn")!;
    if (options.showCloseBtn) {
      this.closeBtn = this.element.querySelector(".btn-close")!;
    }

    this.bindEvents(options);
  }

  getElement(): HTMLElement {
    return this.element;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  setPreviewActive(active: boolean): void {
    this.previewBtn.classList.toggle("active", active);
  }

  setBackVisible(visible: boolean): void {
    this.backBtn.style.display = visible ? "inline-flex" : "none";
  }

  private bindEvents(options: DualPaneHeaderOptions): void {
    this.backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      options.onBack?.();
    });

    this.previewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      options.onTogglePreview();
    });

    this.openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      options.onOpen();
    });

    if (this.closeBtn && options.onClose) {
      this.closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        options.onClose?.();
      });
    }
  }

  destroy(): void {
    this.element.remove();
  }
}
