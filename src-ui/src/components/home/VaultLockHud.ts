/**
 * VaultLockHud.ts — Mechanical Safe Tumbler HUD for Private Notes
 * Renders an authentic rotary combination safe dial with 120fps rotation,
 * top red index marker, and graduation ring (0–90).
 * Target Line Count: <140 lines (Strict Anti-Monolith).
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
        <svg class="vault-safe-dial" width="58" height="58" viewBox="0 0 120 120" fill="none">
          <defs>
            <radialGradient id="v-dial-face" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#1e2433" />
              <stop offset="70%" stop-color="#11141c" />
              <stop offset="100%" stop-color="#0a0c12" />
            </radialGradient>
            <radialGradient id="v-knob-grad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stop-color="#384252" />
              <stop offset="60%" stop-color="#1e2430" />
              <stop offset="100%" stop-color="#0d1117" />
            </radialGradient>
          </defs>

          <!-- Outer Housing Shadow & Bezel -->
          <circle cx="60" cy="60" r="57" fill="#0c0e14" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
          <circle cx="60" cy="60" r="52" fill="url(#v-dial-face)" />

          <!-- ROTATING TUMBLER ASSEMBLY -->
          <g class="vault-safe-rotor">
            <!-- Dial Number Ring Background -->
            <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.05)" stroke-width="1" />

            <!-- Precision Graduation Marks -->
            <circle cx="60" cy="60" r="47" stroke="#94a3b8" stroke-width="1.8" pathLength="360" stroke-dasharray="2 7" opacity="0.45" />
            <circle cx="60" cy="60" r="44" stroke="#94a3b8" stroke-width="1.2" pathLength="360" stroke-dasharray="4 32" opacity="0.75" />

            <!-- Numbers (0, 10, 20, 30 ... 90) around perimeter -->
            <g font-family="monospace" font-size="5" font-weight="700" fill="#94a3b8" text-anchor="middle" dominant-baseline="central" opacity="0.85">
              <text transform="translate(60, 20) rotate(0, 0, 0)">0</text>
              <text transform="translate(83.5, 27.6) rotate(36, 0, 0)">10</text>
              <text transform="translate(98, 47.6) rotate(72, 0, 0)">20</text>
              <text transform="translate(98, 72.4) rotate(108, 0, 0)">30</text>
              <text transform="translate(83.5, 92.4) rotate(144, 0, 0)">40</text>
              <text transform="translate(60, 100) rotate(180, 0, 0)">50</text>
              <text transform="translate(36.5, 92.4) rotate(216, 0, 0)">60</text>
              <text transform="translate(22, 72.4) rotate(252, 0, 0)">70</text>
              <text transform="translate(22, 47.6) rotate(288, 0, 0)">80</text>
              <text transform="translate(36.5, 27.6) rotate(324, 0, 0)">90</text>
            </g>

            <!-- Knurled Rotary Knob -->
            <circle cx="60" cy="60" r="28" fill="#1e2430" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
            <circle cx="60" cy="60" r="28" stroke="#334155" stroke-width="2.5" pathLength="120" stroke-dasharray="1 1" />
            <circle cx="60" cy="60" r="24" fill="url(#v-knob-grad)" stroke="rgba(255,255,255,0.12)" stroke-width="1.2" />
            <circle cx="60" cy="60" r="18" fill="#141822" stroke="rgba(0,0,0,0.5)" stroke-width="1" />

            <!-- Center mechanical hub & indicator -->
            <circle class="vault-safe-hub" cx="60" cy="60" r="11" fill="#0d1017" stroke="rgba(56,189,248,0.3)" stroke-width="1.2" />
            <line class="vault-safe-hub-notch" x1="60" y1="49" x2="60" y2="53" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
            <circle class="vault-safe-hub-dot" cx="60" cy="60" r="3" fill="#38bdf8" opacity="0.85" />
          </g>

          <!-- FIXED RED INDEX MARKER (Top 12 o'clock) -->
          <polygon points="60,11 57.5,5 62.5,5" fill="#ef4444" />
          <line x1="60" y1="5" x2="60" y2="13" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </div>
    `;

    this.cylinderEl = this.hudEl.querySelector(".vault-cylinder")!;
    this.rotorEl = this.hudEl.querySelector(".vault-safe-rotor")!;
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
