/**
 * backStack.ts — LIFO overlay back-stack synchronized with window.history for Android WebView.
 * Coalesces same-tick close->open transitions via replaceState to prevent async history.back() races.
 */
interface BackLayer {
  id: string;
  onBack: () => void;
}

const layers: BackLayer[] = [];
let pendingPops = 0;
let ignorePopCount = 0;
let isHandlingPopState = false;
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    if (pendingPops > 0) {
      const pops = pendingPops;
      pendingPops = 0;
      ignorePopCount += pops;
      window.history.go(-pops);
    }
  });
}

export function pushBackLayer(id: string, onBack: () => void): void {
  const existingIdx = layers.findIndex((l) => l.id === id);
  if (existingIdx !== -1) {
    layers[existingIdx].onBack = onBack;
    return;
  }
  layers.push({ id, onBack });
  const curState = window.history.state || {};
  if (pendingPops > 0) {
    pendingPops--;
    window.history.replaceState({ ...curState, backLayer: id }, "");
  } else {
    window.history.pushState({ ...curState, backLayer: id }, "");
  }
}

export function removeBackLayer(id: string): void {
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].id === id) {
      layers.splice(i, 1);
      if (!isHandlingPopState) {
        pendingPops++;
        scheduleFlush();
      }
      return;
    }
  }
}

export function handleBackStackPopState(): boolean {
  if (ignorePopCount > 0) {
    ignorePopCount--;
    return true;
  }
  if (layers.length > 0) {
    const top = layers.pop()!;
    isHandlingPopState = true;
    try {
      top.onBack();
    } finally {
      isHandlingPopState = false;
    }
    return true;
  }
  return false;
}
