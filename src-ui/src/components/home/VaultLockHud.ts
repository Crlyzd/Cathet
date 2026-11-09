/**
 * VaultLockHud.ts — Mechanical Frosted Glass Vault & Key Cylinder HUD
 * Renders an interactive 2D vault lock dial with rotating key tumbler for Private Notes.
 * Target Line Count: <150 lines (Strict Anti-Monolith).
 */

export class VaultLockHud {
  private container: HTMLElement;
  private hudEl: HTMLElement;
  private cylinderEl: HTMLElement;
  private rotorEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const existing = this.container.querySelector(".vault-lock-hud");
    if (existing) existing.remove();

    this.hudEl = document.createElement("div");
    this.hudEl.className = "vault-lock-hud";
    this.hudEl.innerHTML = `
      <div class="vault-cylinder">
        <svg class="vault-dial-ring" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 4" opacity="0.4" />
          <circle cx="24" cy="24" r="17" stroke="currentColor" stroke-width="1.2" opacity="0.25" />
          <line x1="24" y1="3" x2="24" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="45" y1="24" x2="41" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="24" y1="45" x2="24" y2="41" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="3" y1="24" x2="7" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="vault-key-rotor">
          <svg class="vault-key-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="7.5" cy="15.5" r="4.5"></circle>
            <path d="m21 2-9.6 9.6"></path>
            <path d="m15.5 7.5 3 3"></path>
            <path d="m18.5 4.5 2 2"></path>
          </svg>
        </div>
      </div>
    `;

    this.cylinderEl = this.hudEl.querySelector(".vault-cylinder")!;
    this.rotorEl = this.hudEl.querySelector(".vault-key-rotor")!;
    this.container.prepend(this.hudEl);
  }

  setDescent(progress: number, translateY: number): void {
    this.hudEl.style.visibility = progress > 0 ? "visible" : "hidden";
    this.hudEl.style.opacity = `${progress}`;
    this.hudEl.style.transform = `translateY(${translateY}px)`;
  }

  setEngaged(engaged: boolean): void {
    if (engaged) {
      this.hudEl.classList.add("is-engaged");
    } else {
      this.hudEl.classList.remove("is-engaged");
    }
  }

  setRotation(degrees: number): void {
    const clamped = Math.max(0, Math.min(90, degrees));
    this.rotorEl.style.transform = `rotate(${clamped}deg)`;
  }

  setUnlocked(unlocked: boolean): void {
    if (unlocked) {
      this.hudEl.classList.add("is-unlocked");
      this.rotorEl.style.transform = "rotate(90deg)";
    } else {
      this.hudEl.classList.remove("is-unlocked");
    }
  }

  reset(animated = true, onDone?: () => void): void {
    if (animated) {
      const transition = "transform 0.28s cubic-bezier(0.2, 0, 0, 1), opacity 0.22s ease";
      this.hudEl.style.transition = transition;
      this.rotorEl.style.transition = "transform 0.25s cubic-bezier(0.2, 0, 0, 1)";
      this.hudEl.style.transform = "translateY(-70px)";
      this.hudEl.style.opacity = "0";
      this.rotorEl.style.transform = "rotate(0deg)";
      this.hudEl.classList.remove("is-engaged", "is-unlocked");

      setTimeout(() => {
        this.hudEl.style.transition = "";
        this.rotorEl.style.transition = "";
        this.hudEl.style.visibility = "hidden";
        onDone?.();
      }, 290);
    } else {
      this.hudEl.style.transform = "translateY(-70px)";
      this.hudEl.style.opacity = "0";
      this.hudEl.style.visibility = "hidden";
      this.rotorEl.style.transform = "rotate(0deg)";
      this.hudEl.classList.remove("is-engaged", "is-unlocked");
      onDone?.();
    }
  }

  destroy(): void {
    this.hudEl.remove();
  }
}

