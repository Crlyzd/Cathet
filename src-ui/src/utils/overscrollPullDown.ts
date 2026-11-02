/**
 * overscrollPullDown.ts — Secret pull-down gesture recognizer for Private Notes
 * Strictly active on Android when the note list is scrolled to the top.
 */

export interface OverscrollPullDownOptions {
  container: HTMLElement;
  thresholdPx?: number;
  onTrigger: () => void;
}

export class OverscrollPullDownDetector {
  private container: HTMLElement;
  private thresholdPx: number;
  private onTrigger: () => void;

  private startY = 0;
  private currentY = 0;
  private isTracking = false;
  private hasVibrated = false;

  private hudEl!: HTMLElement;
  private lockIconEl!: HTMLElement;
  private labelEl!: HTMLElement;

  private touchStartHandler!: (e: TouchEvent) => void;
  private touchMoveHandler!: (e: TouchEvent) => void;
  private touchEndHandler!: (e: TouchEvent) => void;

  constructor(options: OverscrollPullDownOptions) {
    this.container = options.container;
    this.thresholdPx = options.thresholdPx || 135;
    this.onTrigger = options.onTrigger;

    this.createHud();
    this.bindEvents();
  }

  private createHud(): void {
    const existing = this.container.querySelector(".home-pulldown-hud");
    if (existing) existing.remove();

    this.hudEl = document.createElement("div");
    this.hudEl.className = "home-pulldown-hud";
    this.hudEl.innerHTML = `
      <div class="home-pulldown-pill">
        <svg class="home-pulldown-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path class="home-lock-shackle" d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span class="home-pulldown-label">Pull down for private notes</span>
      </div>
    `;

    this.lockIconEl = this.hudEl.querySelector(".home-pulldown-icon")!;
    this.labelEl = this.hudEl.querySelector(".home-pulldown-label")!;
    this.container.prepend(this.hudEl);
  }

  private bindEvents(): void {
    this.touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (this.container.scrollTop <= 0) {
        this.startY = e.touches[0].clientY;
        this.isTracking = true;
        this.hasVibrated = false;
      }
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      if (!this.isTracking || e.touches.length !== 1) return;
      const rawDelta = e.touches[0].clientY - this.startY;
      if (rawDelta <= 0) {
        this.resetHud();
        return;
      }

      // Overscroll damping
      const damped = Math.min(180, Math.pow(rawDelta, 0.82) * 2);
      this.currentY = damped;

      if (damped > 25) {
        this.hudEl.style.transform = `translateY(${damped - 45}px)`;
        this.hudEl.style.opacity = `${Math.min(1, (damped - 25) / 50)}`;

        if (damped >= this.thresholdPx) {
          this.hudEl.classList.add("threshold-reached");
          this.labelEl.textContent = "Release to view private notes";
          if (!this.hasVibrated) {
            this.hasVibrated = true;
            try { navigator.vibrate?.(15); } catch (_) {}
          }
        } else {
          this.hudEl.classList.remove("threshold-reached");
          this.labelEl.textContent = "Pull down for private notes";
          this.hasVibrated = false;
        }
      }
    };

    this.touchEndHandler = () => {
      if (!this.isTracking) return;
      const wasReached = this.currentY >= this.thresholdPx;
      this.isTracking = false;
      this.animateReset(() => {
        if (wasReached) {
          this.onTrigger();
        }
      });
    };

    this.container.addEventListener("touchstart", this.touchStartHandler, { passive: true });
    this.container.addEventListener("touchmove", this.touchMoveHandler, { passive: true });
    this.container.addEventListener("touchend", this.touchEndHandler, { passive: true });
    this.container.addEventListener("touchcancel", this.touchEndHandler, { passive: true });
  }

  private resetHud(): void {
    this.hudEl.style.transform = "translateY(-60px)";
    this.hudEl.style.opacity = "0";
    this.hudEl.classList.remove("threshold-reached");
    this.currentY = 0;
  }

  private animateReset(onDone?: () => void): void {
    this.hudEl.style.transition = "transform 0.26s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease";
    this.resetHud();
    setTimeout(() => {
      this.hudEl.style.transition = "";
      onDone?.();
    }, 270);
  }

  destroy(): void {
    this.container.removeEventListener("touchstart", this.touchStartHandler);
    this.container.removeEventListener("touchmove", this.touchMoveHandler);
    this.container.removeEventListener("touchend", this.touchEndHandler);
    this.container.removeEventListener("touchcancel", this.touchEndHandler);
    this.hudEl.remove();
  }
}
