/**
 * keyboardTracker.ts — Real-time Android Soft Keyboard (IME) Elevation Tracker
 * Combines native Android WindowInsetsCompat.Type.ime() with WebView VisualViewport
 * so the mobile dock rises smoothly above Gboard across all viewport modes.
 */

export type KeyboardStateCallback = (isOpen: boolean, insetPx: number) => void;

export class KeyboardTracker {
  private callbacks: Set<KeyboardStateCallback> = new Set();
  private maxInnerHeight: number = typeof window !== "undefined" ? window.innerHeight : 0;
  private lastInnerWidth: number = typeof window !== "undefined" ? window.innerWidth : 0;
  private nativeImeDp: number = 0;
  private isKeyboardOpen: boolean = false;
  private isLandscape: boolean = false;
  private currentInsetPx: number = 0;
  private boundUpdate: () => void;

  constructor() {
    this.boundUpdate = () => this.recalculate();
    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") return;

    (window as any).__cathet_on_ime_inset = (imeDp: number) => {
      this.nativeImeDp = Math.max(0, Number(imeDp) || 0);
      this.recalculate();
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.boundUpdate);
      window.visualViewport.addEventListener("scroll", this.boundUpdate);
    }
    window.addEventListener("resize", this.boundUpdate);
    this.recalculate();
  }

  private recalculate(): void {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Reset baseline height when device orientation changes
    if (Math.abs(winW - this.lastInnerWidth) > 40) {
      this.lastInnerWidth = winW;
      this.maxInnerHeight = winH;
    } else if (winH > this.maxInnerHeight) {
      this.maxInnerHeight = winH;
    }

    const vv = window.visualViewport;
    const layoutShrink = Math.max(0, this.maxInnerHeight - winH);
    const vvShrink = vv ? Math.max(0, Math.round(winH - (vv.height + vv.offsetTop))) : 0;

    // Avoid double-offsetting if layout viewport (innerHeight) already shrank for IME
    const insetPx = Math.max(vvShrink, Math.max(0, this.nativeImeDp - layoutShrink));
    const isOpen = this.nativeImeDp > 80 || layoutShrink + vvShrink > 100;
    const nextLandscape = winW > this.maxInnerHeight && winW >= 480;

    if (nextLandscape !== this.isLandscape) {
      this.isLandscape = nextLandscape;
      document.body.classList.toggle("is-landscape", nextLandscape);
      window.dispatchEvent(new CustomEvent("cathet:orientation-change", { detail: { isLandscape: nextLandscape } }));
    }

    if (insetPx !== this.currentInsetPx || isOpen !== this.isKeyboardOpen) {
      this.currentInsetPx = insetPx;
      this.isKeyboardOpen = isOpen;
      document.documentElement.style.setProperty("--keyboard-inset", `${insetPx}px`);
      document.body.classList.toggle("is-keyboard-open", isOpen);
      this.callbacks.forEach((cb) => cb(isOpen, insetPx));
    }
  }

  onChange(cb: KeyboardStateCallback): () => void {
    this.callbacks.add(cb);
    cb(this.isKeyboardOpen, this.currentInsetPx);
    return () => this.callbacks.delete(cb);
  }

  getIsOpen(): boolean {
    return this.isKeyboardOpen;
  }

  destroy(): void {
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.boundUpdate);
      window.visualViewport.removeEventListener("scroll", this.boundUpdate);
    }
    window.removeEventListener("resize", this.boundUpdate);
    this.callbacks.clear();
  }
}

