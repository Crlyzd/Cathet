/**
 * TabDragReorder.ts — Pointer-based horizontal drag reordering for custom folder tabs in edit mode.
 * Threshold (>10px) aligns with bindLongPress moveTolerancePx so short taps still trigger Rename.
 */
export interface TabDragReorderOptions {
  isEnabled: () => boolean;
  onReorder: (order: string[]) => void;
}

export class TabDragReorder {
  private container: HTMLElement;
  private opts: TabDragReorderOptions;
  private pointerId: number | null = null;
  private draggedEl: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private anchorX = 0;
  private currentTx = 0;
  private hasMoved = false;
  private initialOrder: string[] = [];

  constructor(container: HTMLElement, opts: TabDragReorderOptions) {
    this.container = container;
    this.opts = opts;
    this.container.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
  }

  private getScrollEl(): HTMLElement | null {
    return this.container.querySelector(".home-tabs-scroll");
  }

  private getCustomChips(): HTMLElement[] {
    return Array.from(this.container.querySelectorAll<HTMLElement>('.home-tab-chip[data-custom="true"]'));
  }

  private getOrder(): string[] {
    return this.getCustomChips().map((c) => c.getAttribute("data-folder") || "").filter(Boolean);
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.opts.isEnabled() || (e.button !== 0 && e.pointerType === "mouse")) return;
    const target = e.target as HTMLElement | null;
    if (!target || target.closest(".home-tab-delete-badge")) return;
    const chip = target.closest<HTMLElement>('.home-tab-chip[data-custom="true"]');
    if (!chip) return;

    this.pointerId = e.pointerId;
    this.draggedEl = chip;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.anchorX = e.clientX;
    this.currentTx = 0;
    this.hasMoved = false;
    this.initialOrder = this.getOrder();
  };

  private onMove = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId || !this.draggedEl || !this.opts.isEnabled()) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    if (!this.hasMoved) {
      if (Math.abs(dy) > 14 && Math.abs(dx) <= 10) { this.reset(); return; }
      if (Math.abs(dx) <= 10) return;
      this.hasMoved = true;
      this.anchorX = e.clientX - dx;
      this.draggedEl.classList.add("is-dragging");
      try { this.getScrollEl()?.setPointerCapture(e.pointerId); } catch {}
    }

    this.applyTransform(e.clientX);
    if (this.swapWithNeighbor()) {
      this.applyTransform(e.clientX);
    }
  };

  private applyTransform(clientX: number): void {
    if (!this.draggedEl) return;
    let tx = clientX - this.anchorX;
    const allChip = this.container.querySelector<HTMLElement>('.home-tab-chip[data-folder="All"]');
    const addChip = this.container.querySelector<HTMLElement>(".home-tab-add");
    if (allChip && addChip) {
      const dragRect = this.draggedEl.getBoundingClientRect();
      const baseLeft = dragRect.left - this.currentTx;
      const baseRight = dragRect.right - this.currentTx;
      const minTx = (allChip.getBoundingClientRect().right + 8) - baseLeft;
      const maxTx = (addChip.getBoundingClientRect().left - 8) - baseRight;
      if (minTx <= maxTx) {
        tx = Math.max(minTx, Math.min(maxTx, tx));
      }
    }
    this.currentTx = tx;
    this.draggedEl.style.transform = `translate3d(${tx}px, 0, 0) scale(1.06)`;
  }

  private swapWithNeighbor(): boolean {
    const scrollEl = this.getScrollEl();
    if (!scrollEl || !this.draggedEl) return false;
    const chips = this.getCustomChips();
    const idx = chips.indexOf(this.draggedEl);
    if (idx === -1) return false;

    const dragRect = this.draggedEl.getBoundingClientRect();
    const dragCenter = dragRect.left + dragRect.width / 2;

    if (idx > 0) {
      const prev = chips[idx - 1];
      const prevRect = prev.getBoundingClientRect();
      if (dragCenter < prevRect.left + prevRect.width / 2) {
        const beforeLeft = this.draggedEl.getBoundingClientRect().left;
        scrollEl.insertBefore(this.draggedEl, prev);
        this.anchorX += this.draggedEl.getBoundingClientRect().left - beforeLeft;
        try { if ("vibrate" in navigator) navigator.vibrate(12); } catch {}
        return true;
      }
    }
    if (idx < chips.length - 1) {
      const next = chips[idx + 1];
      const nextRect = next.getBoundingClientRect();
      if (dragCenter > nextRect.left + nextRect.width / 2) {
        const beforeLeft = this.draggedEl.getBoundingClientRect().left;
        scrollEl.insertBefore(next, this.draggedEl);
        this.anchorX += this.draggedEl.getBoundingClientRect().left - beforeLeft;
        try { if ("vibrate" in navigator) navigator.vibrate(12); } catch {}
        return true;
      }
    }
    return false;
  }

  private onUp = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return;
    const moved = this.hasMoved;
    const before = this.initialOrder;
    try { this.getScrollEl()?.releasePointerCapture(e.pointerId); } catch {}
    this.reset();
    if (moved) {
      const after = this.getOrder();
      if (after.length === before.length && after.some((f, i) => f !== before[i])) {
        this.opts.onReorder(after);
      }
    }
  };

  private reset(): void {
    if (this.draggedEl) {
      this.draggedEl.classList.remove("is-dragging");
      this.draggedEl.style.transform = "";
    }
    this.pointerId = null;
    this.draggedEl = null;
    this.currentTx = 0;
    this.hasMoved = false;
  }

  destroy(): void {
    this.reset();
    this.container.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
  }
}
