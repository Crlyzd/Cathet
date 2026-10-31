/**
 * touchGesture.ts — Modular touch gestures (Long-press detector)
 */

export interface LongPressOptions {
  thresholdMs?: number;
  moveTolerancePx?: number;
  onLongPress: (e: PointerEvent | TouchEvent) => void;
  onClick?: (e: MouseEvent | TouchEvent) => void;
}

export function bindLongPress(element: HTMLElement, options: LongPressOptions): () => void {
  const threshold = options.thresholdMs ?? 500;
  const tolerance = options.moveTolerancePx ?? 10;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let isLongPressTriggered = false;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isLongPressTriggered = false;
    startX = e.clientX;
    startY = e.clientY;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      isLongPressTriggered = true;
      try {
        if ("vibrate" in navigator) navigator.vibrate(40);
      } catch {}
      options.onLongPress(e);
    }, threshold);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!timer) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > tolerance || dy > tolerance) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!isLongPressTriggered && options.onClick) {
      options.onClick(e);
    }
  };

  const onPointerCancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    isLongPressTriggered = false;
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerCancel);

  return () => {
    if (timer) clearTimeout(timer);
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerCancel);
  };
}

