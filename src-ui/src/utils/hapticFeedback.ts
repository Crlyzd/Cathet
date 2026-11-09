/**
 * hapticFeedback.ts — High-Performance Mobile Haptic Feedback Controller
 * Bridges Android native View.performHapticFeedback (CLOCK_TICK / CONFIRM)
 * with navigator.vibrate fallback for 120fps mechanical rotary dial ratchets.
 * Target Line Count: <60 lines (Strict Anti-Monolith).
 */

interface NativeHapticBridge {
  performHaptic(type: string): void;
}

declare global {
  interface Window {
    CathetNativeHaptic?: NativeHapticBridge;
  }
}

/**
 * Fires a micro-tick haptic (CLOCK_TICK) matching physical safe tumbler clicks.
 */
export function triggerHapticTick(): void {
  try {
    if (window.CathetNativeHaptic?.performHaptic) {
      window.CathetNativeHaptic.performHaptic("tick");
    } else if ("vibrate" in navigator) {
      navigator.vibrate(6);
    }
  } catch (_) {}
}

/**
 * Fires a heavy confirmation latch haptic (CONFIRM) when reaching the unlock threshold.
 */
export function triggerHapticUnlock(): void {
  try {
    if (window.CathetNativeHaptic?.performHaptic) {
      window.CathetNativeHaptic.performHaptic("unlock");
    } else if ("vibrate" in navigator) {
      navigator.vibrate([15, 30, 20]);
    }
  } catch (_) {}
}

/**
 * Fires a subtle engagement haptic when the vault descends into view.
 */
export function triggerHapticEngage(): void {
  try {
    if (window.CathetNativeHaptic?.performHaptic) {
      window.CathetNativeHaptic.performHaptic("tick");
    } else if ("vibrate" in navigator) {
      navigator.vibrate(12);
    }
  } catch (_) {}
}
