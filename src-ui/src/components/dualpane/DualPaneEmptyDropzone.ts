export interface DualPaneEmptyCallbacks {
  onOpen: () => void;
  onNew: () => void;
}

/**
 * DualPaneEmptyDropzone — Placeholder view when the secondary pane is empty.
 */
export class DualPaneEmptyDropzone {
  private element: HTMLElement;

  constructor(callbacks: DualPaneEmptyCallbacks) {
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
        <span class="dualpane-empty-title">Secondary Document</span>
        <span class="dualpane-empty-desc">Drop a text or markdown file here, or choose an existing document.</span>
        <div class="dualpane-empty-actions">
          <button class="dualpane-empty-btn dualpane-empty-btn-primary" id="dualpane-empty-new-btn" title="New Document">
            <span class="dualpane-empty-btn-full">New Document</span>
            <span class="dualpane-empty-btn-compact">New</span>
          </button>
          <button class="dualpane-empty-btn dualpane-empty-btn-secondary" id="dualpane-empty-browse-btn" title="Open Document...">
            <span class="dualpane-empty-btn-full">Open Document...</span>
            <span class="dualpane-empty-btn-compact">Open</span>
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

    this.element.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".dualpane-empty-btn")) return;
      callbacks.onNew();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
