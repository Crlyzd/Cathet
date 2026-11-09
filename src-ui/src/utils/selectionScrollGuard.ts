import { PlatformService } from "../services/platformService";

/**
 * selectionScrollGuard.ts — Universal Selection Freeze & Dead-Edge Stabilization
 * Freezes the active editor wrapper (Single Pane or Dual Pane) during touch selection,
 * rendering all edges completely dead to prevent accidental flicks/autoscrolls to top/bottom.
 * Windows and Linux desktop mouse selection remains 100% standard and unaffected.
 */
export class SelectionScrollGuard {
  private static instance: SelectionScrollGuard | null = null;

  public static getInstance(): SelectionScrollGuard {
    if (!SelectionScrollGuard.instance) {
      SelectionScrollGuard.instance = new SelectionScrollGuard();
    }
    return SelectionScrollGuard.instance;
  }

  private isSelecting = false;
  private isTouchDown = false;
  private isAdjustingSelection = false;
  private touchY: number | null = null;
  private touchX: number | null = null;
  private frozenScrollTop = new WeakMap<HTMLElement, number>();
  private frozenWrappers = new Set<HTMLElement>();
  private boundWrappers = new WeakSet<HTMLElement>();

  private isDesktopMouse(e: Event): boolean {
    if ("pointerType" in e && (e as PointerEvent).pointerType === "mouse") {
      return !PlatformService.getInstance().isMobile();
    }
    return false;
  }

  private onPointerDown = (e: PointerEvent | TouchEvent) => {
    if (this.isDesktopMouse(e)) return;
    this.isTouchDown = true;
    const pt = "touches" in e && e.touches.length > 0 ? e.touches[0] : (e as PointerEvent);
    this.touchX = pt.clientX;
    this.touchY = pt.clientY;
    this.checkSelectionActive();
    if (this.isSelecting) {
      const w = this.resolveActiveWrapper();
      if (w) this.freeze(w);
    }
  };

  private onPointerMove = (e: PointerEvent | TouchEvent) => {
    if (this.isDesktopMouse(e)) return;
    const pt = "touches" in e && e.touches.length > 0 ? e.touches[0] : (e as PointerEvent);
    this.touchX = pt.clientX;
    this.touchY = pt.clientY;
    if (this.isSelecting && this.isTouchDown) {
      const w = this.resolveActiveWrapper();
      if (w) {
        this.freeze(w);
        const rect = w.getBoundingClientRect();
        const margin = this.getEdgeMargin(w);
        if (this.touchY <= rect.top + margin || this.touchY >= rect.bottom - margin) {
          this.clampSelectionToVisibleEdge(w, rect, margin);
        }
      }
    }
  };

  private onPointerUp = () => {
    this.isTouchDown = false;
    this.touchY = null;
    this.touchX = null;
    this.unfreezeAll();
    setTimeout(() => {
      this.checkSelectionActive();
      if (!this.isSelecting || !this.isTouchDown) {
        this.unfreezeAll();
      }
    }, 60);
  };

  private onSelectionChange = () => {
    if (this.isAdjustingSelection) return;
    this.checkSelectionActive();
    if (this.isSelecting && this.isTouchDown) {
      const w = this.resolveActiveWrapper();
      if (w) {
        this.freeze(w);
        if (this.touchY !== null) {
          const rect = w.getBoundingClientRect();
          const margin = this.getEdgeMargin(w);
          if (this.touchY <= rect.top + margin || this.touchY >= rect.bottom - margin) {
            this.clampSelectionToVisibleEdge(w, rect, margin);
          }
        }
      }
    } else if (!this.isTouchDown) {
      this.unfreezeAll();
    }
  };

  constructor() {
    this.bindEvents();
  }

  private freeze(wrapper: HTMLElement): void {
    if (this.frozenWrappers.has(wrapper)) return;
    this.ensureScrollBound(wrapper);
    const currentScroll = wrapper.scrollTop;
    this.frozenScrollTop.set(wrapper, currentScroll);
    this.frozenWrappers.add(wrapper);
    wrapper.classList.add("selection-frozen");
    wrapper.scrollTop = currentScroll;
  }

  private unfreezeAll(): void {
    for (const w of this.frozenWrappers) {
      w.classList.remove("selection-frozen");
    }
    this.frozenWrappers.clear();
  }

  private ensureScrollBound(wrapper: HTMLElement): void {
    if (this.boundWrappers.has(wrapper)) return;
    this.boundWrappers.add(wrapper);
    wrapper.addEventListener("scroll", (e) => {
      if (this.frozenWrappers.has(wrapper)) {
        const target = this.frozenScrollTop.get(wrapper);
        if (target !== undefined && wrapper.scrollTop !== target) {
          wrapper.scrollTop = target;
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    }, { passive: false });
  }

  private bindEvents(): void {
    window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerup", this.onPointerUp, { passive: true });
    window.addEventListener("pointercancel", this.onPointerUp, { passive: true });
    window.addEventListener("touchstart", this.onPointerDown, { passive: true });
    window.addEventListener("touchmove", this.onPointerMove, { passive: true });
    window.addEventListener("touchend", this.onPointerUp, { passive: true });
    window.addEventListener("touchcancel", this.onPointerUp, { passive: true });
    document.addEventListener("selectionchange", this.onSelectionChange);
  }

  private checkSelectionActive(): void {
    const sel = window.getSelection();
    this.isSelecting = !!(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
  }

  private resolveActiveWrapper(): HTMLElement | null {
    const sel = window.getSelection();
    const anchor = sel?.anchorNode;
    if (anchor) {
      const el = anchor instanceof Element ? anchor : anchor.parentElement;
      const found = el?.closest(".editor-wrapper") as HTMLElement | null;
      if (found) return found;
    }
    return document.querySelector(".active-pane .editor-wrapper")
      || document.querySelector("#editor-container .editor-wrapper")
      || document.querySelector(".editor-wrapper");
  }

  private getEdgeMargin(wrapper: HTMLElement): number {
    const editorEl = wrapper.querySelector(".editor-content") as HTMLElement;
    if (!editorEl) return 36;
    const style = window.getComputedStyle(editorEl);
    const lh = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.6);
    return Math.max(36, Math.round(lh * 1.6));
  }

  private getCaretAt(x: number, y: number): { node: Node; offset: number } | null {
    const doc = document as any;
    if (typeof doc.caretRangeFromPoint === "function") {
      const range = doc.caretRangeFromPoint(x, y);
      if (range && range.startContainer) return { node: range.startContainer, offset: range.startOffset };
    }
    if (typeof doc.caretPositionFromPoint === "function") {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos && pos.offsetNode) return { node: pos.offsetNode, offset: pos.offset };
    }
    return null;
  }

  private clampSelectionToVisibleEdge(wrapper: HTMLElement, rect: DOMRect, margin: number): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode || this.touchY === null) return;
    const isTop = this.touchY <= rect.top + margin;
    const clampedY = isTop ? rect.top + Math.round(margin * 0.7) : rect.bottom - Math.round(margin * 0.7);
    const clampedX = Math.max(rect.left + 16, Math.min(rect.right - 16, this.touchX ?? (rect.left + 30)));
    const caret = this.getCaretAt(clampedX, clampedY);
    if (!caret || !wrapper.contains(caret.node)) return;

    if (isTop && wrapper.scrollTop > 20) {
      const contentEl = wrapper.querySelector(".editor-content");
      const isRootZero = sel.focusOffset === 0 && (sel.focusNode === contentEl || !wrapper.contains(sel.focusNode));
      if (isRootZero || sel.focusNode !== caret.node) {
        this.isAdjustingSelection = true;
        try { sel.setBaseAndExtent(sel.anchorNode, sel.anchorOffset, caret.node, caret.offset); } catch (_) {}
        this.isAdjustingSelection = false;
      }
    }
  }

  isSelectionActive(): boolean { return this.isSelecting; }
}
