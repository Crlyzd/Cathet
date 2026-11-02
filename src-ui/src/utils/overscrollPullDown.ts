/**
 * overscrollPullDown.ts — Secret pull-down gesture recognizer for Private Notes
 * Strictly active on Android when the note list is scrolled to the top.
 * Features a silent dead-zone, progressive shackle descent, and elastic spring-back.
 */

export interface OverscrollPullDownOptions {
  container: HTMLElement;
  scrollTarget?: () => HTMLElement | null;
  contentTarget?: () => HTMLElement | null;
  thresholdPx?: number;
  deadZonePx?: number;
  onTrigger: () => void;
}

export class OverscrollPullDownDetector {
  private container: HTMLElement;
  private scrollTarget?: () => HTMLElement | null;
  private contentTarget?: () => HTMLElement | null;
  private thresholdPx: number;
  private deadZonePx: number;
  private onTrigger: () => void;

  private startY = 0;
  private currentY = 0;
  private isTracking = false;
  private hasVibrated = false;

  private hudEl!: HTMLElement;
  private lockIconEl!: HTMLElement;
  private shackleEl!: HTMLElement;
  private labelEl!: HTMLElement;

  private touchStartHandler!: (e: TouchEvent) => void;
  private touchMoveHandler!: (e: TouchEvent) => void;
  private touchEndHandler!: (e: TouchEvent) => void;

  constructor(options: OverscrollPullDownOptions) {
    this.container = options.container;
    this.scrollTarget = options.scrollTarget;
    this.contentTarget = options.contentTarget;
    this.thresholdPx = options.thresholdPx || 135;
    this.deadZonePx = options.deadZonePx || 65;
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
    this.shackleEl = this.hudEl.querySelector(".home-lock-shackle")!;
    this.labelEl = this.hudEl.querySelector(".home-pulldown-label")!;
    this.container.prepend(this.hudEl);
  }

  private bindEvents(): void {
    this.touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const scrollEl = this.scrollTarget ? this.scrollTarget() : this.container;
      const scrollTop = scrollEl ? scrollEl.scrollTop : this.container.scrollTop;
      if (scrollTop <= 0) {
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

      // Displace content elastically
      const contentEl = this.contentTarget?.();
      if (contentEl) {
        contentEl.style.transform = `translateY(${damped * 0.65}px)`;
      }

      if (damped <= this.deadZonePx) {
        // Silent dead-zone: lock HUD is completely invisible
        this.hudEl.style.opacity = "0";
        this.hudEl.style.visibility = "hidden";
        this.hudEl.classList.remove("threshold-reached");
        this.shackleEl.style.transform = "translateY(-5px)";
        this.labelEl.style.opacity = "0";
        this.hasVibrated = false;
        return;
      }

      // Past dead-zone: progressive appearance
      this.hudEl.style.visibility = "visible";
      this.hudEl.style.transform = `translateY(${damped - 45}px)`;

      const progress = Math.min(1, (damped - this.deadZonePx) / (this.thresholdPx - this.deadZonePx));
      this.hudEl.style.opacity = `${progress}`;

      // Shackle moves from detached translateY(-5px) to closed translateY(0px)
      const shackleY = -5 * (1 - progress);
      this.shackleEl.style.transform = `translateY(${shackleY}px)`;
      this.labelEl.style.opacity = progress > 0.4 ? `${(progress - 0.4) / 0.6}` : "0";

      if (damped >= this.thresholdPx) {
        this.hudEl.classList.add("threshold-reached");
        this.labelEl.textContent = "Release to view private notes";
        this.shackleEl.style.transform = "translateY(0px)";
        if (!this.hasVibrated) {
          this.hasVibrated = true;
          try { navigator.vibrate?.(15); } catch (_) {}
        }
      } else {
        this.hudEl.classList.remove("threshold-reached");
        this.labelEl.textContent = "Pull down for private notes";
        this.hasVibrated = false;
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
    this.hudEl.style.visibility = "hidden";
    this.hudEl.classList.remove("threshold-reached");
    this.shackleEl.style.transform = "translateY(-5px)";
    this.labelEl.style.opacity = "0";
    this.currentY = 0;
  }

  private animateReset(onDone?: () => void): void {
    const contentEl = this.contentTarget?.();
    const transition = "transform 0.28s cubic-bezier(0.2, 0, 0, 1)";
    this.hudEl.style.transition = `${transition}, opacity 0.22s ease`;
    if (contentEl) {
      contentEl.style.transition = transition;
      contentEl.style.transform = "translateY(0)";
    }
    this.resetHud();
    setTimeout(() => {
      this.hudEl.style.transition = "";
      if (contentEl) {
        contentEl.style.transition = "";
        contentEl.style.transform = "";
      }
      onDone?.();
    }, 290);
  }

  destroy(): void {
    this.container.removeEventListener("touchstart", this.touchStartHandler);
    this.container.removeEventListener("touchmove", this.touchMoveHandler);
    this.container.removeEventListener("touchend", this.touchEndHandler);
    this.container.removeEventListener("touchcancel", this.touchEndHandler);
    this.hudEl.remove();
  }
}
