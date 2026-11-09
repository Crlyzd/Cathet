import { PlatformService } from "../../services/platformService";
import { icons } from "../../utils/monochromeIcons";
import { bindLongPress } from "../../utils/touchGesture";

/**
 * DualPaneSplitter — Draggable frosted glass divider with sync scroll toggle button.
 */
export class DualPaneSplitter {
  private element: HTMLElement;
  private syncBtn: HTMLElement;
  private onResize: (leftPercent: number) => void;
  private onToggleSync: () => boolean;
  private onToggleSnap?: (enabled: boolean) => void;
  private isDragging: boolean = false;
  private container: HTMLElement;
  private isLocked: boolean;
  private snapScroll: boolean = false;
  private longPressCleanup: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    onResize: (leftPercent: number) => void,
    onToggleSync: () => boolean,
    initialSyncLocked: boolean = true,
    onToggleSnap?: (enabled: boolean) => void
  ) {
    this.container = container;
    this.onResize = onResize;
    this.onToggleSync = onToggleSync;
    this.onToggleSnap = onToggleSnap;
    this.isLocked = initialSyncLocked;

    this.element = document.createElement("div");
    this.element.className = "dualpane-splitter";
    this.element.innerHTML = `
      <div class="dualpane-splitter-line"></div>
      <button class="dualpane-sync-badge${initialSyncLocked ? " active" : ""}" title="Toggle Synchronized Scrolling">
        <span class="sync-icon">${initialSyncLocked ? icons.link : icons.unlink}</span>
      </button>
      <div class="dualpane-splitter-line"></div>
    `;

    this.syncBtn = this.element.querySelector(".dualpane-sync-badge")!;
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private updateVisualState(): void {
    this.syncBtn.classList.toggle("active", this.isLocked);
    this.syncBtn.classList.toggle("blue-galaxy", this.isLocked && this.snapScroll);
    this.syncBtn.innerHTML = `<span class="sync-icon">${this.isLocked ? icons.link : icons.unlink}</span>`;
    this.syncBtn.title = this.isLocked ? "Sync Scroll: Locked (Click to pause sync)" : "Sync Scroll: Paused (Click to lock sync)";
  }

  setSyncLocked(locked: boolean): void {
    this.isLocked = locked;
    this.updateVisualState();
  }

  setSnapScroll(enabled: boolean): void {
    this.snapScroll = enabled;
    this.updateVisualState();
  }

  private toggleSnapMode(): void {
    const nextSnap = !this.snapScroll;
    this.snapScroll = nextSnap;
    if (nextSnap && !this.isLocked) {
      this.isLocked = true;
    }
    this.updateVisualState();
    try { if ("vibrate" in navigator) navigator.vibrate(30); } catch (_) {}
    this.onToggleSnap?.(this.snapScroll);
  }

  private bindEvents(): void {
    this.longPressCleanup = bindLongPress(this.syncBtn, {
      thresholdMs: 400,
      onClick: (e) => {
        e.stopPropagation();
        if (this.snapScroll) {
          this.snapScroll = false;
          this.onToggleSnap?.(false);
          this.setSyncLocked(false);
          return;
        }
        const newState = this.onToggleSync();
        this.setSyncLocked(newState);
      },
      onLongPress: (e) => {
        e.stopPropagation();
        this.toggleSnapMode();
      },
    });

    this.syncBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSnapMode();
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
    const isVertical = PlatformService.getInstance().isMobile() && window.getComputedStyle(this.container).flexDirection === "column";
    document.body.style.cursor = isVertical ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const rect = this.container.getBoundingClientRect();
      let percentage = 50;

      if (isVertical) {
        if (rect.height <= 0) return;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        percentage = ((clientY - rect.top) / rect.height) * 100;
      } else {
        if (rect.width <= 0) return;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        percentage = ((clientX - rect.left) / rect.width) * 100;
      }

      const clamped = Math.max(15, Math.min(85, percentage));
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
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  }

  destroy(): void {
    if (this.longPressCleanup) {
      this.longPressCleanup();
      this.longPressCleanup = null;
    }
    this.element.remove();
  }
}
