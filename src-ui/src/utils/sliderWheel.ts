/**
 * Attaches a mouse wheel listener to range slider inputs or their wrapper containers.
 * Allows adjusting the slider value on hover without scrolling ancestor containers,
 * with normalized threshold accumulation for both discrete mouse wheels and precision trackpads.
 */

export interface SliderWheelOptions {
  /** Base step per discrete wheel tick or threshold accumulation (default: derived from input or 2) */
  step?: number;
  /** Accelerated step when Shift key is held */
  shiftStep?: number;
  /** Fine-grained step when Alt or Ctrl key is held */
  fineStep?: number;
  /** Invert scroll direction if needed (default: false where wheel up = increment) */
  invert?: boolean;
}

export function attachSliderWheel(
  hoverTarget: HTMLElement,
  sliderInput?: HTMLInputElement | null,
  options: SliderWheelOptions = {}
): () => void {
  const input =
    sliderInput ||
    (hoverTarget instanceof HTMLInputElement
      ? hoverTarget
      : hoverTarget.querySelector<HTMLInputElement>('input[type="range"]'));

  if (!input) return () => {};

  let accumulatedDelta = 0;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  const DELTA_THRESHOLD = 60; // Pixels per discrete step tick

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rawDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? -e.deltaY : e.deltaX;
    if (rawDelta === 0) return;

    const normalizedDelta =
      e.deltaMode === 1 ? rawDelta * 20 : e.deltaMode === 2 ? rawDelta * 400 : rawDelta;

    const directedDelta = options.invert ? -normalizedDelta : normalizedDelta;
    accumulatedDelta += directedDelta;

    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      accumulatedDelta = 0;
    }, 200);

    if (Math.abs(accumulatedDelta) < DELTA_THRESHOLD) {
      return;
    }

    const direction = Math.sign(accumulatedDelta);
    const stepsCount = Math.trunc(Math.abs(accumulatedDelta) / DELTA_THRESHOLD);
    accumulatedDelta -= direction * stepsCount * DELTA_THRESHOLD;

    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const currentVal = parseFloat(input.value) || min;

    let step = options.step ?? (parseFloat(input.step) || 2);
    if (e.shiftKey) {
      step = options.shiftStep ?? (step * 2.5 || 5);
    } else if (e.altKey || e.ctrlKey) {
      step = options.fineStep ?? 1;
    }

    const deltaValue = direction * stepsCount * step;
    let nextVal = Math.max(min, Math.min(max, currentVal + deltaValue));

    if (Number.isInteger(min) && Number.isInteger(max) && Number.isInteger(step)) {
      nextVal = Math.round(nextVal);
    }

    if (nextVal !== currentVal) {
      input.value = String(nextVal);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  hoverTarget.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    hoverTarget.removeEventListener("wheel", onWheel);
    if (resetTimer) clearTimeout(resetTimer);
  };
}

