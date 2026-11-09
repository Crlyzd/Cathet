/**
 * overscrollPullDown.ts — 2D "Pull Down & Turn Right" Vault Gesture Recognizer
 * Secret gesture for Private Notes on Android:
 * 1. Deep pull-down past silent dead-zone (>180px raw).
 * 2. Vault locks in at engagement zone (>340px raw).
 * 3. Horizontal thumb drag to the right rotates the key 90° with tactile haptics.
 * 4. Releasing touch when unlocked triggers biometric authentication.
 */

import { VaultLockHud } from "../components/home/VaultLockHud";
import { triggerHapticTick, triggerHapticUnlock, triggerHapticEngage } from "./hapticFeedback";

export interface OverscrollPullDownOptions {
  container: HTMLElement;
  scrollTarget?: () => HTMLElement | null;
  contentTarget?: () => HTMLElement | null;
  thresholdPx?: number;
  deadZonePx?: number;
  turnThresholdPx?: number;
  onTrigger: () => void;
}

type PullState = "IDLE" | "PULLING" | "ENGAGED" | "TURNING" | "UNLOCKED";

export class OverscrollPullDownDetector {
  private container: HTMLElement;
  private scrollTarget?: () => HTMLElement | null;
  private contentTarget?: () => HTMLElement | null;
  private thresholdPx: number;
  private deadZonePx: number;
  private turnThresholdPx: number;
  private onTrigger: () => void;

  private startY = 0;
  private turnStartX = 0;
  private state: PullState = "IDLE";
  private hud: VaultLockHud;

  private lastDetentStep = 0;
  private hasEngagedVibrated = false;

  private touchStartHandler!: (e: TouchEvent) => void;
  private touchMoveHandler!: (e: TouchEvent) => void;
  private touchEndHandler!: (e: TouchEvent) => void;

  constructor(options: OverscrollPullDownOptions) {
    this.container = options.container;
    this.scrollTarget = options.scrollTarget;
    this.contentTarget = options.contentTarget;
    this.thresholdPx = options.thresholdPx || 340;
    this.deadZonePx = options.deadZonePx || 180;
    this.turnThresholdPx = options.turnThresholdPx || 80;
    this.onTrigger = options.onTrigger;

    this.hud = new VaultLockHud(this.container);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const scrollEl = this.scrollTarget ? this.scrollTarget() : this.container;
      const scrollTop = scrollEl ? scrollEl.scrollTop : this.container.scrollTop;
      if (scrollTop <= 0) {
        this.startY = e.touches[0].clientY;
        this.state = "IDLE";
        this.lastDetentStep = 0;
        this.hasEngagedVibrated = false;
      }
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rawDeltaY = touch.clientY - this.startY;
      if (rawDeltaY <= 0 && this.state === "IDLE") return;

      // Elastic vertical displacement for note list content
      const dampedY = Math.min(220, Math.pow(Math.max(0, rawDeltaY), 0.82) * 1.8);
      const contentEl = this.contentTarget?.();
      if (contentEl) {
        contentEl.style.transform = `translateY(${dampedY * 0.6}px)`;
      }

      if (rawDeltaY <= this.deadZonePx) {
        // Silent dead-zone: zero hints or visibility
        this.hud.setDescent(0, -70);
        this.hud.setEngaged(false);
        this.state = "IDLE";
        return;
      }

      // Past dead-zone: progressive emergence
      const pullProgress = Math.min(1, (rawDeltaY - this.deadZonePx) / (this.thresholdPx - this.deadZonePx));
      const hudY = Math.min(68, (dampedY - 60));
      this.hud.setDescent(pullProgress, hudY);

      if (rawDeltaY >= this.thresholdPx) {
        if (this.state === "IDLE" || this.state === "PULLING") {
          this.state = "ENGAGED";
          this.turnStartX = touch.clientX;
          this.hud.setEngaged(true);
          if (!this.hasEngagedVibrated) {
            this.hasEngagedVibrated = true;
            triggerHapticEngage();
          }
        }

        // Horizontal turn tracking
        const deltaX = touch.clientX - this.turnStartX;
        if (deltaX > 0) {
          const turnProgress = Math.min(1, deltaX / this.turnThresholdPx);
          const degrees = turnProgress * 90;
          this.hud.setRotation(degrees);

          // Ratchet haptic clicks every 9° (matching dial graduation ticks)
          const currentDetent = Math.floor(degrees / 9);
          if (currentDetent !== this.lastDetentStep) {
            this.lastDetentStep = currentDetent;
            if (currentDetent > 0 && degrees < 90) {
              triggerHapticTick();
            }
          }

          if (turnProgress >= 1) {
            if (this.state !== "UNLOCKED") {
              this.state = "UNLOCKED";
              this.hud.setUnlocked(true);
              triggerHapticUnlock();
            }
          } else {
            if (this.state === "UNLOCKED") {
              this.hud.setUnlocked(false);
            }
            this.state = "TURNING";
          }
        } else {
          this.hud.setRotation(0);
          this.hud.setUnlocked(false);
          this.state = "ENGAGED";
          this.lastDetentStep = 0;
        }
      } else {
        this.state = "PULLING";
        this.hud.setEngaged(false);
        this.hud.setRotation(0);
        this.hasEngagedVibrated = false;
        this.lastDetentStep = 0;
      }
    };

    this.touchEndHandler = () => {
      const isReadyToUnlock = this.state === "UNLOCKED";
      this.state = "IDLE";
      this.animateReset(() => {
        if (isReadyToUnlock) {
          this.onTrigger();
        }
      });
    };

    this.container.addEventListener("touchstart", this.touchStartHandler, { passive: true });
    this.container.addEventListener("touchmove", this.touchMoveHandler, { passive: true });
    this.container.addEventListener("touchend", this.touchEndHandler, { passive: true });
    this.container.addEventListener("touchcancel", this.touchEndHandler, { passive: true });
  }

  private animateReset(onDone?: () => void): void {
    const contentEl = this.contentTarget?.();
    const transition = "transform 0.28s cubic-bezier(0.2, 0, 0, 1)";
    if (contentEl) {
      contentEl.style.transition = transition;
      contentEl.style.transform = "translateY(0)";
    }
    this.hud.reset(true, () => {
      if (contentEl) {
        contentEl.style.transition = "";
        contentEl.style.transform = "";
      }
      onDone?.();
    });
  }

  destroy(): void {
    this.container.removeEventListener("touchstart", this.touchStartHandler);
    this.container.removeEventListener("touchmove", this.touchMoveHandler);
    this.container.removeEventListener("touchend", this.touchEndHandler);
    this.container.removeEventListener("touchcancel", this.touchEndHandler);
    this.hud.destroy();
  }
}
