/**
 * containerTransform.ts — 120fps True Workspace Container Morph & Xiaomi Dual-Layer Collapse
 * Expand: Scales and clips #workspace-shell from the tapped tile/FAB rect to full screen.
 * Collapse: Glides the target tile clone from a top-left offset into its slot (z-index: 210)
 * while #workspace-shell shrinks behind it (z-index: 200), matching Xiaomi HyperOS choreography.
 */

export interface ExpandContainerOptions {
  originRect: DOMRect;
  theme?: "dark" | "light";
  borderRadius?: number;
  cardEl?: HTMLElement | null;
  onReady?: () => void;
  onComplete: () => void;
}

export interface CollapseContainerOptions {
  targetRect: DOMRect;
  theme?: "dark" | "light";
  targetBorderRadius?: number;
  cardEl?: HTMLElement | null;
  onReady?: () => void;
  onComplete: () => void;
}

export class ContainerTransform {
  private static activeAnim: Animation | null = null;
  private static activeCleanup: (() => void) | null = null;

  private static cancelActive(): void {
    if (this.activeAnim) {
      this.activeAnim.cancel();
      this.activeAnim = null;
    }
    if (this.activeCleanup) {
      this.activeCleanup();
      this.activeCleanup = null;
    }
  }

  static expand(options: ExpandContainerOptions): void {
    const { originRect, theme = "dark", borderRadius = 16, cardEl, onReady, onComplete } = options;
    const workspaceEl = document.getElementById("workspace-shell");

    this.cancelActive();

    if (!workspaceEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.remove("is-animating-transform");
      onReady?.();
      onComplete();
      return;
    }

    document.body.classList.add("is-animating-transform");

    const editorBg = theme === "light" ? "#f8fafc" : "#0f1117";
    if (cardEl) {
      cardEl.style.backgroundColor = editorBg;
      cardEl.style.visibility = "hidden";
    }

    workspaceEl.style.transform = "";
    workspaceEl.style.clipPath = "";
    workspaceEl.style.zIndex = "200";
    workspaceEl.style.transformOrigin = "0 0";
    workspaceEl.style.backgroundColor = editorBg;
    workspaceEl.style.willChange = "transform, clip-path";

    const fullRect = workspaceEl.getBoundingClientRect();
    const W = fullRect.width || window.innerWidth;
    const H = fullRect.height || window.innerHeight;
    const s = Math.max(originRect.width / W, originRect.height / H, 0.05);
    const insetRight = Math.max(0, W - originRect.width / s);
    const insetBottom = Math.max(0, H - originRect.height / s);
    const localRadius = borderRadius / s;
    const dx = originRect.left - fullRect.left;
    const dy = originRect.top - fullRect.top;

    onReady?.();

    const anim = workspaceEl.animate(
      [
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${s})`,
          clipPath: `inset(0px ${insetRight}px ${insetBottom}px 0px round ${localRadius}px)`,
        },
        {
          transform: "translate3d(0px, 0px, 0) scale(1)",
          clipPath: "inset(0px 0px 0px 0px round 0px)",
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      }
    );

    this.activeAnim = anim;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this.activeAnim === anim) this.activeAnim = null;
      if (this.activeCleanup === finish) this.activeCleanup = null;
      document.body.classList.remove("is-animating-transform");
      workspaceEl.style.transform = "";
      workspaceEl.style.clipPath = "";
      workspaceEl.style.willChange = "";
      workspaceEl.style.zIndex = "";
      workspaceEl.style.backgroundColor = "";
      if (cardEl) {
        cardEl.style.visibility = "";
        cardEl.style.backgroundColor = "";
      }
      onComplete();
    };

    this.activeCleanup = finish;
    anim.onfinish = finish;
    anim.oncancel = finish;
  }

  static collapse(options: CollapseContainerOptions): void {
    const { targetRect, theme = "dark", targetBorderRadius = 16, cardEl, onReady, onComplete } = options;
    const workspaceEl = document.getElementById("workspace-shell");

    this.cancelActive();

    if (!workspaceEl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.remove("is-animating-transform");
      onReady?.();
      onComplete();
      return;
    }

    document.body.classList.add("is-animating-transform");

    const editorBg = theme === "light" ? "#f8fafc" : "#0f1117";
    let tileClone: HTMLElement | null = null;
    let tileAnim: Animation | null = null;

    if (cardEl) {
      cardEl.style.backgroundColor = "";
      tileClone = cardEl.cloneNode(true) as HTMLElement;
      tileClone.classList.remove("touch-pressed");
      tileClone.style.position = "fixed";
      tileClone.style.left = `${targetRect.left}px`;
      tileClone.style.top = `${targetRect.top}px`;
      tileClone.style.width = `${targetRect.width}px`;
      tileClone.style.height = `${targetRect.height}px`;
      tileClone.style.margin = "0";
      tileClone.style.zIndex = "210";
      tileClone.style.pointerEvents = "none";
      tileClone.style.visibility = "visible";
      tileClone.style.willChange = "transform, opacity";
      document.body.appendChild(tileClone);
      cardEl.style.visibility = "hidden";
    }

    workspaceEl.style.transform = "";
    workspaceEl.style.clipPath = "";
    workspaceEl.style.zIndex = "200";
    workspaceEl.style.transformOrigin = "0 0";
    workspaceEl.style.backgroundColor = editorBg;
    workspaceEl.style.willChange = "transform, clip-path";

    const topBarEl = document.getElementById("topbar-container");
    const editorContainerEl = document.getElementById("editor-container");
    const innerAnims: Animation[] = [];
    for (const child of [topBarEl, editorContainerEl]) {
      if (child) innerAnims.push(child.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" }));
    }

    const fullRect = workspaceEl.getBoundingClientRect();
    const W = fullRect.width || window.innerWidth;
    const H = fullRect.height || window.innerHeight;
    const s = Math.max(targetRect.width / W, targetRect.height / H, 0.05);
    const insetRight = Math.max(0, W - targetRect.width / s);
    const insetBottom = Math.max(0, H - targetRect.height / s);
    const localRadius = targetBorderRadius / s;
    const dx = targetRect.left - fullRect.left;
    const dy = targetRect.top - fullRect.top;

    onReady?.();

    if (tileClone) {
      tileAnim = tileClone.animate(
        [
          { transform: "translate3d(-84px, -150px, 0)", opacity: 0.25, offset: 0 },
          { transform: "translate3d(-64px, -143px, 0)", opacity: 1, offset: 0.1 },
          { transform: "translate3d(-36px, -118px, 0)", opacity: 1, offset: 0.3 },
          { transform: "translate3d(-16px, -78px, 0)", opacity: 1, offset: 0.55 },
          { transform: "translate3d(-5px, -33px, 0)", opacity: 1, offset: 0.78 },
          { transform: "translate3d(0px, 0px, 0)", opacity: 1, offset: 1 },
        ],
        { duration: 400, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" }
      );
    }

    const anim = workspaceEl.animate(
      [
        { transform: "translate3d(0px, 0px, 0) scale(1)", clipPath: "inset(0px 0px 0px 0px round 0px)" },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${s})`, clipPath: `inset(0px ${insetRight}px ${insetBottom}px 0px round ${localRadius}px)` },
      ],
      { duration: 400, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    );

    this.activeAnim = anim;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this.activeAnim === anim) this.activeAnim = null;
      if (this.activeCleanup === finish) this.activeCleanup = null;
      document.body.classList.remove("is-animating-transform");
      innerAnims.forEach((a) => a.cancel());
      tileAnim?.cancel();
      tileClone?.remove();
      workspaceEl.style.transform = "";
      workspaceEl.style.clipPath = "";
      workspaceEl.style.willChange = "";
      workspaceEl.style.zIndex = "";
      workspaceEl.style.backgroundColor = "";
      if (cardEl) {
        cardEl.style.visibility = "";
        cardEl.style.backgroundColor = "";
      }
      onComplete();
    };

    this.activeCleanup = finish;
    anim.onfinish = finish;
    anim.oncancel = finish;
  }
}
