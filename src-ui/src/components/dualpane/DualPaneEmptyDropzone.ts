/**
 * DualPaneEmptyDropzone — Placeholder view when the secondary pane is empty.
 */
export class DualPaneEmptyDropzone {
  private element: HTMLElement;

  constructor(onOpen: () => void) {
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
        <button class="dualpane-empty-btn" id="dualpane-empty-browse-btn">Open Document...</button>
      </div>
    `;

    const browseBtn = this.element.querySelector("#dualpane-empty-browse-btn");
    browseBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      onOpen();
    });

    this.element.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("#dualpane-empty-browse-btn")) return;
      onOpen();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.element.remove();
  }
}
