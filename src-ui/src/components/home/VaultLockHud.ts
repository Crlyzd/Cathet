/**
 * VaultLockHud.ts — Cyber Iris Shutter HUD for Private Notes
 * Renders a high-contrast 4-blade geometric iris aperture with 120fps rotation,
 * expanding central glowing core, and emerald unlock snap.
 * Target Line Count: <130 lines (Strict Anti-Monolith).
 */

export class VaultLockHud {
  private container: HTMLElement;
  private hudEl: HTMLElement;
  private cylinderEl: HTMLElement;
  private rotorEl: HTMLElement;
  private coreEl: SVGCircleElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const existing = this.container.querySelector(".vault-lock-hud");
    if (existing) existing.remove();

    this.hudEl = document.createElement("div");
    this.hudEl.className = "vault-lock-hud";
    this.hudEl.innerHTML = `
      <div class="vault-cylinder">
        <svg class="vault-safe-dial" width="58" height="58" viewBox="0 0 100 100" fill="none">
          <!-- Outer Housing Bezel Circle -->
          <circle class="vault-iris-housing" cx="50" cy="50" r="46" stroke-width="2.5" />

          <!-- Expanding Central Glowing Core -->
          <circle class="vault-iris-core" cx="50" cy="50" r="8" />
          <circle class="vault-iris-glint" cx="50" cy="50" r="3" fill="#ffffff" opacity="0.9" />

          <!-- ROTATING & DILATING 4-BLADE IRIS ASSEMBLY -->
          <g class="vault-safe-rotor">
            <path class="vault-iris-blade" d="M50,14 A36,36 0 0,1 86,50 L68,50 A18,18 0 0,0 50,32 Z" stroke-width="1.8" />
            <path class="vault-iris-blade" d="M86,50 A36,36 0 0,1 50,86 L50,68 A18,18 0 0,0 68,50 Z" stroke-width="1.8" />
            <path class="vault-iris-blade" d="M50,86 A36,36 0 0,1 14,50 L32,50 A18,18 0 0,0 50,68 Z" stroke-width="1.8" />
            <path class="vault-iris-blade" d="M14,50 A36,36 0 0,1 50,14 L50,32 A18,18 0 0,0 32,50 Z" stroke-width="1.8" />
          </g>
        </svg>
      </div>
    `;

    this.cylinderEl = this.hudEl.querySelector(".vault-cylinder")!;
    this.rotorEl = this.hudEl.querySelector(".vault-safe-rotor")!;
    this.coreEl = this.hudEl.querySelector(".vault-iris-core")!;
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
    const progress = clamped / 90;
    // 1.35x angular speed for responsive thumb drag feel (0° to 121.5°)
    this.rotorEl.style.transform = `rotate(${clamped * 1.35}deg)`;
    // Dynamic concentric core expansion from 8px to 16px radius
    this.coreEl.setAttribute("r", `${8 + progress * 8}`);
  }

  setUnlocked(unlocked: boolean): void {
    if (unlocked) {
      this.hudEl.classList.add("is-unlocked");
      this.rotorEl.style.transform = "rotate(121.5deg)";
      this.coreEl.setAttribute("r", "16");
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
      this.coreEl.setAttribute("r", "8");
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
      this.coreEl.setAttribute("r", "8");
      this.hudEl.classList.remove("is-engaged", "is-unlocked");
      onDone?.();
    }
  }

  destroy(): void {
    this.hudEl.remove();
  }
}
