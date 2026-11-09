import { captureScrollRatio } from "./scrollSync";

/**
 * SyncScrollController — High-performance bidirectional scroll synchronization.
 * Prevents recursive event feedback loops and normalizes scroll progress across
 * documents with unequal content heights or mixed viewing modes.
 */
export class SyncScrollController {
  private leftEl: HTMLElement | null = null;
  private rightEl: HTMLElement | null = null;
  private locked: boolean = true;
  private snapScroll: boolean = false;
  private ratioOffset: number = 0;
  private isSyncing: boolean = false;
  private activeDriver: "left" | "right" | null = null;
  private driverTimer: number | null = null;

  private onLeftScroll = (): void => {
    this.handleScroll("left");
  };

  private onRightScroll = (): void => {
    this.handleScroll("right");
  };

  attach(leftEl: HTMLElement, rightEl: HTMLElement): void {
    this.detach();
    this.leftEl = leftEl;
    this.rightEl = rightEl;

    if (this.locked) {
      if (this.snapScroll) {
        this.ratioOffset = 0;
        this.resync("left");
      } else {
        const rLeft = captureScrollRatio(this.leftEl);
        const rRight = captureScrollRatio(this.rightEl);
        this.ratioOffset = rRight - rLeft;
      }
    }

    this.leftEl.addEventListener("scroll", this.onLeftScroll, { passive: true });
    this.rightEl.addEventListener("scroll", this.onRightScroll, { passive: true });
  }

  detach(): void {
    if (this.leftEl) {
      this.leftEl.removeEventListener("scroll", this.onLeftScroll);
      this.leftEl = null;
    }
    if (this.rightEl) {
      this.rightEl.removeEventListener("scroll", this.onRightScroll);
      this.rightEl = null;
    }
    if (this.driverTimer) {
      clearTimeout(this.driverTimer);
      this.driverTimer = null;
    }
    this.activeDriver = null;
    this.isSyncing = false;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (this.locked && this.leftEl && this.rightEl) {
      if (this.snapScroll) {
        this.ratioOffset = 0;
        this.resync("left");
      } else {
        const rLeft = captureScrollRatio(this.leftEl);
        const rRight = captureScrollRatio(this.rightEl);
        this.ratioOffset = rRight - rLeft;
      }
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  setSnapScroll(enabled: boolean): void {
    this.snapScroll = enabled;
    if (this.locked && this.leftEl && this.rightEl) {
      if (this.snapScroll) {
        this.ratioOffset = 0;
        this.resync("left");
      } else {
        const rLeft = captureScrollRatio(this.leftEl);
        const rRight = captureScrollRatio(this.rightEl);
        this.ratioOffset = rRight - rLeft;
      }
    }
  }

  getSnapScroll(): boolean {
    return this.snapScroll;
  }

  toggleLock(): boolean {
    this.setLocked(!this.locked);
    return this.locked;
  }

  resync(source: "left" | "right"): void {
    if (!this.leftEl || !this.rightEl) return;
    const sourceEl = source === "left" ? this.leftEl : this.rightEl;
    const targetEl = source === "left" ? this.rightEl : this.leftEl;

    const ratio = captureScrollRatio(sourceEl);
    const targetRatio = source === "left"
      ? Math.max(0, Math.min(1, ratio + this.ratioOffset))
      : Math.max(0, Math.min(1, ratio - this.ratioOffset));

    this.applyRatio(targetEl, targetRatio);
  }

  private handleScroll(source: "left" | "right"): void {
    if (!this.locked || this.isSyncing || !this.leftEl || !this.rightEl) return;
    if (this.activeDriver && this.activeDriver !== source) return;

    this.activeDriver = source;
    const sourceEl = source === "left" ? this.leftEl : this.rightEl;
    const targetEl = source === "left" ? this.rightEl : this.leftEl;

    const ratio = captureScrollRatio(sourceEl);
    this.isSyncing = true;

    const targetRatio = source === "left"
      ? Math.max(0, Math.min(1, ratio + this.ratioOffset))
      : Math.max(0, Math.min(1, ratio - this.ratioOffset));

    this.applyRatio(targetEl, targetRatio);

    requestAnimationFrame(() => {
      this.isSyncing = false;
    });

    if (this.driverTimer) clearTimeout(this.driverTimer);
    this.driverTimer = window.setTimeout(() => {
      this.activeDriver = null;
    }, 75);
  }

  private applyRatio(target: HTMLElement, ratio: number): void {
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll > 0) {
      target.scrollTop = Math.round(ratio * maxScroll);
    }
  }
}
