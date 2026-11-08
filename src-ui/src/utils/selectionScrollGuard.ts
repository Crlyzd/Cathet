/**
 * selectionScrollGuard.ts — Dual Pane Selection Boundary & Autoscroll Stabilization
 * Prevents Chromium selection boundary snaps to scrollTop=0 and provides smooth,
 * font-aware 2-line continuous edge auto-panning across dual-pane containers.
 */

export class SelectionScrollGuard {
  private leftWrapper: HTMLElement | null = null;
  private rightWrapper: HTMLElement | null = null;
  private getActivePane: () => "left" | "right";
  private onPanProgress?: (source: "left" | "right") => void;

  private isSelecting = false;
  private touchY: number | null = null;
  private touchX: number | null = null;
  private rafId: number | null = null;
  private hapticFired = false;
  private lastKnownScrollTop = new WeakMap<HTMLElement, number>();

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchX = e.touches[0].clientX;
      this.touchY = e.touches[0].clientY;
      this.checkSelectionActive();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchX = e.touches[0].clientX;
      this.touchY = e.touches[0].clientY;
      if (this.isSelecting) {
        this.ensurePanning();
      }
    }
  };

  private onTouchEnd = () => {
    this.touchY = null;
    this.touchX = null;
    this.stopPanning();
    this.hapticFired = false;
    setTimeout(() => this.checkSelectionActive(), 100);
  };

  private onSelectionChange = () => {
    this.checkSelectionActive();
    if (this.isSelecting && this.touchY !== null) {
      this.ensurePanning();
    } else if (!this.isSelecting) {
      this.stopPanning();
    }
  };

  constructor(
    leftWrapper: HTMLElement,
    rightWrapper: HTMLElement,
    getActivePane: () => "left" | "right",
    onPanProgress?: (source: "left" | "right") => void
  ) {
    this.leftWrapper = leftWrapper;
    this.rightWrapper = rightWrapper;
    this.getActivePane = getActivePane;
    this.onPanProgress = onPanProgress;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: true });
    window.addEventListener("touchend", this.onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", this.onTouchEnd, { passive: true });
    document.addEventListener("selectionchange", this.onSelectionChange);

    const bindScroll = (wrapper: HTMLElement) => {
      this.lastKnownScrollTop.set(wrapper, wrapper.scrollTop);
      wrapper.addEventListener("scroll", () => {
        const prev = this.lastKnownScrollTop.get(wrapper) ?? wrapper.scrollTop;
        const cur = wrapper.scrollTop;
        if (this.isSelecting && this.touchY !== null && this.getActiveWrapper() === wrapper) {
          const rect = wrapper.getBoundingClientRect();
          const margin = this.getEdgeMargin(wrapper);
          // Detect uncommanded snap toward 0 when touch is near or above the top
          if (this.touchY <= rect.top + margin && prev - cur > 25) {
            wrapper.scrollTop = Math.max(0, prev - 11);
            this.lastKnownScrollTop.set(wrapper, wrapper.scrollTop);
            return;
          }
        }
        this.lastKnownScrollTop.set(wrapper, cur);
      }, { passive: false });
    };

    if (this.leftWrapper) bindScroll(this.leftWrapper);
    if (this.rightWrapper) bindScroll(this.rightWrapper);
  }

  private checkSelectionActive(): void {
    const sel = window.getSelection();
    this.isSelecting = !!(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
  }

  private getActiveWrapper(): HTMLElement | null {
    return this.getActivePane() === "left" ? this.leftWrapper : this.rightWrapper;
  }

  private getEdgeMargin(wrapper: HTMLElement): number {
    const editorEl = wrapper.querySelector(".editor-content") as HTMLElement;
    if (!editorEl) return 40;
    const style = window.getComputedStyle(editorEl);
    const lh = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.6);
    return Math.max(40, Math.round(lh * 2));
  }

  private ensurePanning(): void {
    if (this.rafId !== null) return;
    this.tickPanning();
  }

  private stopPanning(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tickPanning = (): void => {
    const wrapper = this.getActiveWrapper();
    if (!wrapper || !this.isSelecting || this.touchY === null) {
      this.stopPanning();
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const margin = this.getEdgeMargin(wrapper);
    let step = 0;

    if (this.touchY <= rect.top + margin) {
      // Top Edge Zone: slow pan upward (decrease scrollTop)
      const dist = rect.top + margin - this.touchY;
      const ratio = Math.min(1, Math.max(0, dist / margin));
      step = -(3 + Math.round(ratio * 8)); // 3px to 11px
    } else if (this.touchY >= rect.bottom - margin) {
      // Bottom Edge Zone: slow pan downward (increase scrollTop)
      const dist = this.touchY - (rect.bottom - margin);
      const ratio = Math.min(1, Math.max(0, dist / margin));
      step = 3 + Math.round(ratio * 8); // 3px to 11px
    }

    if (step !== 0) {
      if (!this.hapticFired) {
        this.hapticFired = true;
        try { if ("vibrate" in navigator) navigator.vibrate(10); } catch (_) {}
      }
      const prev = wrapper.scrollTop;
      wrapper.scrollTop = Math.max(0, Math.min(wrapper.scrollHeight - wrapper.clientHeight, prev + step));
      this.lastKnownScrollTop.set(wrapper, wrapper.scrollTop);
      this.onPanProgress?.(this.getActivePane());
    } else {
      this.hapticFired = false;
    }

    this.rafId = requestAnimationFrame(this.tickPanning);
  };

  isSelectionActive(): boolean {
    return this.isSelecting;
  }

  destroy(): void {
    this.stopPanning();
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchcancel", this.onTouchEnd);
    document.removeEventListener("selectionchange", this.onSelectionChange);
    this.leftWrapper = null;
    this.rightWrapper = null;
  }
}
