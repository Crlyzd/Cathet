/**
 * DropOverlayComponent — Sleek Frosted Glass Drag & Drop Overlay Indicator.
 * Supports simultaneous dual-zone drop targets in Dual Pane mode with live hover highlights.
 */
export class DropOverlayComponent {
  private overlayEl: HTMLElement;
  private singleEl: HTMLElement;
  private dualEl: HTMLElement;
  private zoneLeftEl: HTMLElement;
  private zoneRightEl: HTMLElement;

  constructor(containerId: string = "app") {
    const parent = document.getElementById(containerId) || document.body;
    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "cathet-drop-overlay";

    const makeCardHtml = (title: string, subtitle: string) => `
      <div class="drop-overlay-content">
        <svg class="drop-overlay-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <polyline points="9 15 12 12 15 15"></polyline>
        </svg>
        <span class="drop-overlay-title">${title}</span>
        <span class="drop-overlay-subtitle">${subtitle}</span>
      </div>
    `;

    this.overlayEl.innerHTML = `
      <div class="drop-overlay-single">
        ${makeCardHtml("Drop file to open", "Text & Markdown")}
      </div>
      <div class="drop-overlay-dual">
        <div class="drop-zone drop-zone-left active-target">
          ${makeCardHtml("Drop in Left Pane", "Primary Document")}
        </div>
        <div class="drop-zone drop-zone-right idle-target">
          ${makeCardHtml("Drop in Right Pane", "Secondary Document")}
        </div>
      </div>
    `;

    this.singleEl = this.overlayEl.querySelector(".drop-overlay-single")!;
    this.dualEl = this.overlayEl.querySelector(".drop-overlay-dual")!;
    this.zoneLeftEl = this.overlayEl.querySelector(".drop-zone-left")!;
    this.zoneRightEl = this.overlayEl.querySelector(".drop-zone-right")!;

    parent.appendChild(this.overlayEl);
  }

  updateSpatialTarget(isDualPane: boolean, splitterX?: number, cursorX?: number, windowWidth?: number): void {
    if (!isDualPane || splitterX === undefined || cursorX === undefined) {
      this.singleEl.style.display = "flex";
      this.dualEl.style.display = "none";
      return;
    }

    this.singleEl.style.display = "none";
    this.dualEl.style.display = "block";

    const totalWidth = windowWidth || window.innerWidth;
    const rightWidth = Math.max(0, totalWidth - splitterX);

    this.zoneLeftEl.style.width = `${splitterX}px`;
    this.zoneRightEl.style.left = `${splitterX}px`;
    this.zoneRightEl.style.width = `${rightWidth}px`;

    const isLeft = cursorX < splitterX;
    this.zoneLeftEl.classList.toggle("active-target", isLeft);
    this.zoneLeftEl.classList.toggle("idle-target", !isLeft);
    this.zoneRightEl.classList.toggle("active-target", !isLeft);
    this.zoneRightEl.classList.toggle("idle-target", isLeft);
  }

  show(): void {
    document.body.classList.add("is-dragging");
    this.overlayEl.classList.add("active");
  }

  hide(): void {
    document.body.classList.remove("is-dragging");
    this.overlayEl.classList.remove("active");
  }

  destroy(): void {
    this.overlayEl.remove();
  }
}
