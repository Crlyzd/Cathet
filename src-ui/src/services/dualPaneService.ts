/**
 * DualPaneService — Tracks Dual Pane state, active document paths, and title bar formatting.
 */
export class DualPaneService {
  private active: boolean = false;
  private leftPath: string | null = null;
  private rightPath: string | null = null;
  private activePane: "left" | "right" = "left";

  isDualPane(): boolean {
    return this.active;
  }

  setDualPane(active: boolean): void {
    this.active = active;
  }

  setLeftPath(path: string | null): void {
    this.leftPath = path;
  }

  getLeftPath(): string | null {
    return this.leftPath;
  }

  setRightPath(path: string | null): void {
    this.rightPath = path;
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
    const leftName = this.leftPath ? this.leftPath.split(/[/\\]/).pop() || "Untitled" : "Untitled";
    if (!this.active) {
      return leftName;
    }
    const rightName = this.rightPath ? this.rightPath.split(/[/\\]/).pop() || "Untitled" : "Empty";
    return `${leftName} ⇄ ${rightName} (Dual Pane)`;
  }
}
