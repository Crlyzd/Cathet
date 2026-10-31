import { formatDisplayTitle } from "../utils/pathUtils";

/**
 * DualPaneService — Tracks Dual Pane state, active document paths, and title bar formatting.
 */
export class DualPaneService {
  private active: boolean = false;
  private leftPath: string | null = null;
  private rightPath: string | null = null;
  private leftTitle: string | null = null;
  private rightTitle: string | null = null;
  private activePane: "left" | "right" = "left";
  private snapScroll: boolean = false;

  constructor() {
    this.snapScroll = localStorage.getItem("cathet_snap_scroll") === "true";
  }

  getSnapScroll(): boolean {
    return this.snapScroll;
  }

  setSnapScroll(enabled: boolean): void {
    this.snapScroll = enabled;
    localStorage.setItem("cathet_snap_scroll", String(enabled));
  }

  isDualPane(): boolean {
    return this.active;
  }

  setDualPane(active: boolean): void {
    this.active = active;
  }

  setLeftPath(path: string | null, title?: string | null): void {
    this.leftPath = path;
    if (title !== undefined) this.leftTitle = title;
  }

  setLeftTitle(title: string | null): void {
    this.leftTitle = title;
  }

  getLeftPath(): string | null {
    return this.leftPath;
  }

  setRightPath(path: string | null, title?: string | null): void {
    this.rightPath = path;
    if (title !== undefined) this.rightTitle = title;
  }

  setRightTitle(title: string | null): void {
    this.rightTitle = title;
  }

  getRightPath(): string | null {
    return this.rightPath;
  }

  setActivePane(pane: "left" | "right"): void {
    this.activePane = pane;
  }

  getActivePane(): "left" | "right" {
    return this.activePane;
  }

  getActivePath(): string | null {
    return this.activePane === "right" ? this.rightPath : this.leftPath;
  }

  setActivePath(path: string | null): void {
    if (this.activePane === "right") {
      this.rightPath = path;
    } else {
      this.leftPath = path;
    }
  }

  getFormattedTitle(): string {
    const leftName = formatDisplayTitle(this.leftTitle || this.leftPath || "Untitled");
    if (!this.active) {
      return leftName;
    }
    const rightName = formatDisplayTitle(this.rightTitle || this.rightPath || "Empty");
    return `${leftName} ⇄ ${rightName} (Dual Pane)`;
  }
}
