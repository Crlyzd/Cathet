import { invoke } from "@tauri-apps/api/core";
import { icons } from "./monochromeIcons";

/**
 * heartSprout.ts — Spammable Sprouting Heart Particle Controller
 * Spawns dynamic clusters of 1 to 3 multi-colored floating heart particles per click.
 * Features arc-based trajectory dispersion, FIFO active particle ceiling, and idle memory compaction.
 */
const HEART_PALETTE = [
  "#ef4444", // Crimson Red
  "#f43f5e", // Rose
  "#ec4899", // Hot Pink
  "#d946ef", // Fuchsia
  "#a855f7", // Purple
  "#8b5cf6", // Violet
  "#38bdf8", // Sky Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#fbbf24", // Golden Yellow
];

const MAX_ACTIVE_PARTICLES = 24;
const activeParticles: HTMLElement[] = [];
let cachedHeartTemplate: HTMLElement | null = null;
let idleTrimTimer: number | null = null;

function getHeartTemplate(): HTMLElement {
  if (!cachedHeartTemplate) {
    cachedHeartTemplate = document.createElement("span");
    cachedHeartTemplate.className = "sprouting-heart-particle";
    cachedHeartTemplate.innerHTML = icons.heart;
  }
  return cachedHeartTemplate;
}

function scheduleIdleTrim(): void {
  if (idleTrimTimer !== null) {
    window.clearTimeout(idleTrimTimer);
  }
  idleTrimTimer = window.setTimeout(() => {
    if (activeParticles.length === 0) {
      invoke("trim_memory").catch(() => {});
    }
    idleTrimTimer = null;
  }, 1500);
}

function spawnSingleHeart(
  containerEl: HTMLElement,
  originX: number,
  originY: number,
  index: number,
  total: number
): void {
  // Enforce FIFO ceiling: retire oldest particle if spamming exceeds cap
  if (activeParticles.length >= MAX_ACTIVE_PARTICLES) {
    const oldest = activeParticles.shift();
    if (oldest && oldest.parentElement) {
      oldest.remove();
    }
  }

  const particle = getHeartTemplate().cloneNode(true) as HTMLElement;

  // Arc-based trajectory dispersion so multi-particle bursts fan out gracefully
  let driftX: number;
  if (total === 1) {
    driftX = (Math.random() - 0.5) * 170; // -85px to +85px
  } else if (total === 2) {
    driftX = index === 0 ? -15 - Math.random() * 70 : 15 + Math.random() * 70;
  } else {
    // 3 particles: left arc, center fountain, right arc
    if (index === 0) driftX = -25 - Math.random() * 60;
    else if (index === 1) driftX = (Math.random() - 0.5) * 35;
    else driftX = 25 + Math.random() * 60;
  }

  // Upward elevation (-55px to -95px)
  const driftY = -55 - Math.random() * 40;
  // Rotation (-45deg to +45deg)
  const driftRot = (Math.random() - 0.5) * 90;
  // Scale (0.7 to 1.3)
  const scale = 0.7 + Math.random() * 0.6;
  // Unique random color
  const color = HEART_PALETTE[Math.floor(Math.random() * HEART_PALETTE.length)];

  particle.style.left = `${originX}px`;
  particle.style.top = `${originY}px`;
  particle.style.color = color;
  particle.style.setProperty("--sprout-drift-x", `${driftX}px`);
  particle.style.setProperty("--sprout-drift-y", `${driftY}px`);
  particle.style.setProperty("--sprout-drift-rot", `${driftRot}deg`);
  particle.style.setProperty("--sprout-scale", `${scale}`);
  particle.style.setProperty("--sprout-glow-col", color);

  containerEl.appendChild(particle);
  activeParticles.push(particle);

  const cleanup = () => {
    particle.removeEventListener("animationend", cleanup);
    const idx = activeParticles.indexOf(particle);
    if (idx !== -1) {
      activeParticles.splice(idx, 1);
    }
    if (particle.parentElement) {
      particle.remove();
    }
    scheduleIdleTrim();
  };

  particle.addEventListener("animationend", cleanup);
  setTimeout(cleanup, 1200);
}

export function attachHeartSprout(
  triggerEl: HTMLElement,
  containerEl: HTMLElement
): () => void {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();

    // 1. Tactile bounce on trigger icon
    triggerEl.classList.remove("heart-pop");
    void triggerEl.offsetWidth; // Force reflow
    triggerEl.classList.add("heart-pop");

    // 2. Compute trigger position relative to container
    const triggerRect = triggerEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const originX = triggerRect.left - containerRect.left + triggerRect.width / 2;
    const originY = triggerRect.top - containerRect.top;

    // 3. Random burst count between 1, 2, and 3
    const count = Math.floor(Math.random() * 3) + 1;

    // 4. Spawn particles with organic micro-staggering
    for (let i = 0; i < count; i++) {
      if (i === 0) {
        spawnSingleHeart(containerEl, originX, originY, i, count);
      } else {
        setTimeout(() => {
          spawnSingleHeart(containerEl, originX, originY, i, count);
        }, i * 40);
      }
    }
  };

  triggerEl.addEventListener("click", handleClick);

  return () => {
    triggerEl.removeEventListener("click", handleClick);
  };
}
