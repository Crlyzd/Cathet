/**
 * DualPaneSplitter — Draggable frosted glass divider with sync scroll toggle button.
 */
export class DualPaneSplitter {
  private element: HTMLElement;
  private syncBtn: HTMLElement;
  private onResize: (leftPercent: number) => void;
  private onToggleSync: () => boolean;
  private isDragging: boolean = false;
  private container: HTMLElement;

  constructor(
    container: HTMLElement,
    onResize: (leftPercent: number) => void,
    onToggleSync: () => boolean,
    initialSyncLocked: boolean = true
  ) {
    this.container = container;
    this.onResize = onResize;
    this.onToggleSync = onToggleSync;

    this.element = document.createElement("div");
    this.element.className = "dualpane-splitter";
    this.element.innerHTML = `
      <div class="dualpane-splitter-line"></div>
      <button class="dualpane-sync-badge${initialSyncLocked ? " active" : ""}" title="Toggle Synchronized Scrolling">
        <span class="sync-icon">${initialSyncLocked ? "🔗" : "🔓"}</span>
      </button>
      <div class="dualpane-splitter-line"></div>
    `;

    this.syncBtn = this.element.querySelector(".dualpane-sync-badge")!;
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  setSyncLocked(locked: boolean): void {
    this.syncBtn.classList.toggle("active", locked);
    this.syncBtn.innerHTML = `<span class="sync-icon">${locked ? "🔗" : "🔓"}</span>`;
    this.syncBtn.title = locked ? "Sync Scroll: Locked (Click to unlock)" : "Sync Scroll: Paused (Click to lock)";
  }

  private bindEvents(): void {
    this.syncBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newState = this.onToggleSync();
      this.setSyncLocked(newState);
    });

    this.element.addEventListener("dblclick", (e) => {
      if ((e.target as HTMLElement).closest(".dualpane-sync-badge")) return;
      e.preventDefault();
      this.onResize(50);
    });

    this.element.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest(".dualpane-sync-badge")) return;
      e.preventDefault();
      this.startDragging();
    });

    this.element.addEventListener("touchstart", (e) => {
      if ((e.target as HTMLElement).closest(".dualpane-sync-badge")) return;
      this.startDragging();
    }, { passive: true });
  }

  private startDragging(): void {
    this.isDragging = true;
    this.element.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const rect = this.container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const percentage = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));
      this.onResize(clamped);
    };

    const onEnd = () => {
      this.isDragging = false;
      this.element.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }

  destroy(): void {
    this.element.remove();
  }
}
