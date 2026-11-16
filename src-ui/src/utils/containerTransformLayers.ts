/**
 * containerTransformLayers.ts — Overlay clone & WAAPI keyframe helpers for ContainerTransform.collapse().
 */

export type CollapseVariant = "tile" | "fab";

export interface CollapseOverlayLayer {
  clone: HTMLElement;
  anims: Animation[];
}

const EASING = "cubic-bezier(0.2, 0, 0, 1)";
const DURATION = 400;

const TILE_KEYFRAMES: Keyframe[] = [
  { transform: "translate3d(-84px, -150px, 0)", opacity: 0.25, offset: 0 },
  { transform: "translate3d(-64px, -143px, 0)", opacity: 1, offset: 0.1 },
  { transform: "translate3d(-36px, -118px, 0)", opacity: 1, offset: 0.3 },
  { transform: "translate3d(-16px, -78px, 0)", opacity: 1, offset: 0.55 },
  { transform: "translate3d(-5px, -33px, 0)", opacity: 1, offset: 0.78 },
  { transform: "translate3d(0px, 0px, 0)", opacity: 1, offset: 1 },
];

const FAB_KEYFRAMES: Keyframe[] = [
  { transform: "translate3d(0px, 44px, 0) scale(0.55)", opacity: 0 },
  { transform: "translate3d(0px, 0px, 0) scale(1)", opacity: 1 },
];

const FAB_ICON_KEYFRAMES: Keyframe[] = [
  { transform: "rotate(-135deg) scale(0.65)" },
  { transform: "rotate(0deg) scale(1)" },
];

/** Clones the target tile or FAB at z-index 210 above #workspace-shell and runs its embrace animation. */
export function createCollapseOverlayLayer(
  targetEl: HTMLElement,
  targetRect: DOMRect,
  variant: CollapseVariant = "tile"
): CollapseOverlayLayer {
  if (variant === "tile") targetEl.style.backgroundColor = "";

  const clone = targetEl.cloneNode(true) as HTMLElement;
  clone.classList.remove("touch-pressed");
  clone.removeAttribute("id");
  clone.style.transition = "none";
  clone.style.position = "fixed";
  clone.style.left = `${targetRect.left}px`;
  clone.style.top = `${targetRect.top}px`;
  clone.style.width = `${targetRect.width}px`;
  clone.style.height = `${targetRect.height}px`;
  clone.style.margin = "0";
  clone.style.zIndex = "210";
  clone.style.pointerEvents = "none";
  clone.style.visibility = "visible";
  clone.style.willChange = "transform, opacity";

  document.body.appendChild(clone);
  targetEl.style.visibility = "hidden";

  const timing: KeyframeAnimationOptions = { duration: DURATION, easing: EASING, fill: "forwards" };
  const anims: Animation[] = [
    clone.animate(variant === "fab" ? FAB_KEYFRAMES : TILE_KEYFRAMES, timing),
  ];

  if (variant === "fab") {
    const iconEl = clone.querySelector<HTMLElement | SVGElement>(".home-fab-icon");
    if (iconEl) {
      iconEl.style.transition = "none";
      iconEl.style.willChange = "transform";
      anims.push(iconEl.animate(FAB_ICON_KEYFRAMES, timing));
    }
  }

  return { clone, anims };
}
