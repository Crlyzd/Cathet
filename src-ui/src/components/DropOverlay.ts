/**
 * DropOverlayComponent — Sleek Frosted Glass Drag & Drop Overlay Indicator
 */
export class DropOverlayComponent {
  private overlayEl: HTMLElement;

  constructor(containerId: string = "app") {
    const parent = document.getElementById(containerId) || document.body;
    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "cathet-drop-overlay";
    this.overlayEl.innerHTML = `
      <div class="drop-overlay-content">
        <svg class="drop-overlay-icon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <polyline points="9 15 12 12 15 15"></polyline>
        </svg>
        <span class="drop-overlay-title">Drop file to open</span>
        <span class="drop-overlay-subtitle">Text & Markdown</span>
      </div>
    `;
    parent.appendChild(this.overlayEl);
  }

  show(): void {
    this.overlayEl.classList.add("active");
  }

  hide(): void {
    this.overlayEl.classList.remove("active");
  }

  destroy(): void {
    this.overlayEl.remove();
  }
}
