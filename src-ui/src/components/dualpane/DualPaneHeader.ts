export interface DualPaneHeaderOptions {
  title: string;
  badgeText?: string;
  showCloseBtn?: boolean;
  onTogglePreview: () => void;
  onOpen: () => void;
  onClose?: () => void;
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

  constructor(options: DualPaneHeaderOptions) {
    this.element = document.createElement("div");
    this.element.className = "dualpane-header";
    this.element.innerHTML = `
      <div class="dualpane-title-group">
        <span class="dualpane-title">${options.title}</span>
        ${options.badgeText ? `<span class="dualpane-badge">${options.badgeText}</span>` : ""}
      </div>
      <div class="dualpane-actions">
        <button class="dualpane-btn btn-preview" title="Toggle Preview (Ctrl+M)">Preview</button>
        <button class="dualpane-btn btn-open" title="Open Document...">📂</button>
        ${options.showCloseBtn ? `<button class="dualpane-btn btn-close" title="Exit Dual Pane">✕</button>` : ""}
      </div>
    `;

    this.titleEl = this.element.querySelector(".dualpane-title")!;
    this.previewBtn = this.element.querySelector(".btn-preview")!;
    this.openBtn = this.element.querySelector(".btn-open")!;
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
    this.previewBtn.textContent = active ? "Preview ✓" : "Preview";
  }

  private bindEvents(options: DualPaneHeaderOptions): void {
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
