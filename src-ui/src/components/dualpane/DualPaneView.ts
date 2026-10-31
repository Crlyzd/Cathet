import { EditorComponent } from "../Editor";
import { DualPaneHeader } from "./DualPaneHeader";
import { DualPaneSplitter } from "./DualPaneSplitter";
import { DualPaneEmptyDropzone } from "./DualPaneEmptyDropzone";
import { SyncScrollController } from "../../utils/syncScrollController";
import { formatDisplayTitle } from "../../utils/pathUtils";

export interface DualPaneCallbacks {
  onOpenLeft: () => void;
  onOpenRight: () => void;
  onOpenFileRight?: () => void;
  onNewRight?: () => void;
  onCloseDualPane: () => void;
  onActivePaneChange: (pane: "left" | "right") => void;
  onTitleChange: () => void;
  onSyncChange?: (isLocked: boolean) => void;
  onBackLeft?: () => void;
  onBackRight?: () => void;
}

/**
 * DualPaneView — Orchestrates the side-by-side layout, dual editors, and scroll synchronization.
 */
export class DualPaneView {
  private container: HTMLElement;
  private rootEl: HTMLElement;
  private leftPaneEl: HTMLElement;
  private rightPaneEl: HTMLElement;
  private leftHostEl: HTMLElement;
  private rightHostEl: HTMLElement;
  private headerLeft: DualPaneHeader;
  private headerRight: DualPaneHeader;
  private splitter: DualPaneSplitter;
  private emptyDropzone: DualPaneEmptyDropzone | null = null;
  private editorLeft: EditorComponent;
  private editorRight: EditorComponent | null = null;
  private scrollSync = new SyncScrollController();
  private activePane: "left" | "right" = "left";
  private callbacks: DualPaneCallbacks;
  private embeddedHomeLeft: any = null;
  private embeddedHomeRight: any = null;

  constructor(container: HTMLElement, editorLeft: EditorComponent, callbacks: DualPaneCallbacks) {
    this.container = container;
    this.editorLeft = editorLeft;
    this.callbacks = callbacks;

    this.rootEl = document.createElement("div");
    this.rootEl.className = "dualpane-container";

    this.leftPaneEl = document.createElement("div");
    this.leftPaneEl.className = "dualpane-pane dualpane-pane-left active-pane";
    this.headerLeft = new DualPaneHeader({
      title: "Untitled", badgeText: "Primary", showCloseBtn: false,
      onTogglePreview: () => this.toggleLeftPreview(),
      onOpen: () => this.callbacks.onOpenLeft(),
      onBack: () => this.callbacks.onBackLeft?.(),
    });
    this.headerLeft.setPreviewActive(this.editorLeft.getIsMarkdownPreview());
    this.leftHostEl = document.createElement("div");
    this.leftHostEl.className = "dualpane-editor-host";
    this.leftPaneEl.append(this.headerLeft.getElement(), this.leftHostEl);

    this.splitter = new DualPaneSplitter(
      this.rootEl, (pct) => this.setSplitRatio(pct),
      () => { const l = this.scrollSync.toggleLock(); this.callbacks.onSyncChange?.(l); return l; },
      this.scrollSync.isLocked()
    );

    this.rightPaneEl = document.createElement("div");
    this.rightPaneEl.className = "dualpane-pane dualpane-pane-right";
    this.headerRight = new DualPaneHeader({
      title: "Empty", badgeText: "Secondary", showCloseBtn: true,
      onTogglePreview: () => this.toggleRightPreview(),
      onOpen: () => this.callbacks.onOpenRight(),
      onClose: () => this.callbacks.onCloseDualPane(),
      onBack: () => this.callbacks.onBackRight?.(),
    });
    this.rightHostEl = document.createElement("div");
    this.rightHostEl.className = "dualpane-editor-host";
    this.rightPaneEl.append(this.headerRight.getElement(), this.rightHostEl);

    this.rootEl.append(this.leftPaneEl, this.splitter.getElement(), this.rightPaneEl);
    this.container.appendChild(this.rootEl);

    this.rightPaneEl.classList.add("entering");
    this.splitter.getElement().classList.add("entering");
    const onEnter = () => {
      this.rightPaneEl.classList.remove("entering");
      this.splitter.getElement().classList.remove("entering");
    };
    this.rightPaneEl.addEventListener("animationend", onEnter, { once: true });
    setTimeout(onEnter, 250);

    this.leftHostEl.appendChild(this.editorLeft.getWrapperEl());
    this.showEmptyRightPane();

    this.leftPaneEl.addEventListener("mousedown", () => this.setActivePane("left"));
    this.rightPaneEl.addEventListener("mousedown", () => this.setActivePane("right"));
  }

  setSplitRatio(leftPercent: number): void {
    this.leftPaneEl.style.flex = `0 0 ${leftPercent}%`;
  }

  setActivePane(pane: "left" | "right"): void {
    if (this.activePane === pane) return;
    this.activePane = pane;
    this.leftPaneEl.classList.toggle("active-pane", pane === "left");
    this.rightPaneEl.classList.toggle("active-pane", pane === "right");
    this.callbacks.onActivePaneChange(pane);
  }

  getActivePane(): "left" | "right" { return this.activePane; }
  getEditorLeft(): EditorComponent { return this.editorLeft; }
  getEditorRight(): EditorComponent | null { return this.editorRight; }
  getActiveEditor(): EditorComponent {
    return this.activePane === "right" && this.editorRight ? this.editorRight : this.editorLeft;
  }

  setLeftTitle(title: string): void { this.headerLeft.setTitle(formatDisplayTitle(title)); }
  setRightTitle(title: string): void { this.headerRight.setTitle(formatDisplayTitle(title)); }
  setLeftPreviewActive(active: boolean): void { this.headerLeft.setPreviewActive(active); }

  setSnapScroll(enabled: boolean): void { this.scrollSync.setSnapScroll(enabled); this.splitter.setSnapScroll(enabled); }
  toggleLock(): boolean {
    const locked = this.scrollSync.toggleLock();
    this.splitter.setSyncLocked(locked);
    this.callbacks.onSyncChange?.(locked);
    return locked;
  }
  setSyncLocked(locked: boolean): void {
    if (this.scrollSync.isLocked() !== locked) this.scrollSync.toggleLock();
    this.splitter.setSyncLocked(locked);
    this.callbacks.onSyncChange?.(locked);
  }
  isSyncLocked(): boolean { return this.scrollSync.isLocked(); }
  toggleLeftPreview(): void {
    this.headerLeft.setPreviewActive(this.editorLeft.toggleMarkdownPreview());
    this.scrollSync.resync("left");
  }
  toggleRightPreview(): void {
    if (!this.editorRight) return;
    this.headerRight.setPreviewActive(this.editorRight.toggleMarkdownPreview());
    this.scrollSync.resync("right");
  }

  setEmbeddedHome(pane: "left" | "right", instance: any): void {
    const cur = pane === "left" ? this.embeddedHomeLeft : this.embeddedHomeRight;
    if (cur && cur !== instance) cur.destroy?.();
    if (pane === "left") this.embeddedHomeLeft = instance; else this.embeddedHomeRight = instance;
  }

  clearEmbeddedHome(pane: "left" | "right"): void {
    const cur = pane === "left" ? this.embeddedHomeLeft : this.embeddedHomeRight;
    cur?.destroy?.();
    if (pane === "left") this.embeddedHomeLeft = null; else this.embeddedHomeRight = null;
    (pane === "left" ? this.leftHostEl : this.rightHostEl).innerHTML = "";
  }

  hasEmbeddedHome(): boolean {
    return !!(this.embeddedHomeLeft || this.embeddedHomeRight);
  }

  showEmptyRightPane(): void {
    if (this.editorRight) {
      this.scrollSync.detach();
      this.editorRight.destroy();
      this.editorRight = null;
      this.editorLeft.setTouchZoomOptions(undefined);
    }
    this.clearEmbeddedHome("right");
    if (this.emptyDropzone) { this.emptyDropzone.destroy(); this.emptyDropzone = null; }
    this.headerRight.setTitle("Empty");
    this.headerRight.setPreviewActive(false);

    this.emptyDropzone = new DualPaneEmptyDropzone({
      onOpen: () => this.callbacks.onOpenRight(),
      onOpenFile: () => this.callbacks.onOpenFileRight?.(),
      onNew: () => this.callbacks.onNewRight?.(),
    });
    this.rightHostEl.appendChild(this.emptyDropzone.getElement());
  }

  mountRightEditor(content: string, path: string | null, shouldPreview: boolean, font: string): EditorComponent {
    this.clearEmbeddedHome("right");
    if (this.emptyDropzone) { this.emptyDropzone.destroy(); this.emptyDropzone = null; }
    this.rightHostEl.innerHTML = "";
    this.editorRight = new EditorComponent(this.rightHostEl);
    this.editorRight.setFontFamily(font);
    this.editorRight.loadDocument(content, path, shouldPreview);
    this.headerRight.setPreviewActive(shouldPreview);
    this.headerRight.setTitle(formatDisplayTitle(path || "Untitled"));

    this.scrollSync.attach(this.editorLeft.getWrapperEl(), this.editorRight.getWrapperEl());
    const zOpt = (sibling: () => EditorComponent | null) => ({ isSyncActive: () => this.isSyncLocked(), getSiblingEditor: sibling });
    this.editorLeft.setTouchZoomOptions(zOpt(() => this.editorRight));
    this.editorRight.setTouchZoomOptions(zOpt(() => this.editorLeft));
    this.setActivePane("right");
    return this.editorRight;
  }

  handleSpatialDrop(pos?: { x: number; y: number }): "left" | "right" {
    if (!pos) return !this.editorRight ? "right" : this.activePane;
    return pos.x < this.splitter.getElement().getBoundingClientRect().left ? "left" : "right";
  }

  getHostLeft(): HTMLElement { return this.leftHostEl; }
  getHostRight(): HTMLElement { return this.rightHostEl; }
  getHeaderLeft(): DualPaneHeader { return this.headerLeft; }
  getHeaderRight(): DualPaneHeader { return this.headerRight; }
  getSplitterPosition(): number { return this.splitter.getElement().getBoundingClientRect().left; }
  animateClose(callback: () => void): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      callback();
      return;
    }
    this.rightPaneEl.classList.add("exiting");
    this.splitter.getElement().classList.add("exiting");
    let called = false;
    const finish = () => { if (!called) { called = true; callback(); } };
    this.rightPaneEl.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 170);
  }

  destroy(): void {
    this.clearEmbeddedHome("left");
    this.clearEmbeddedHome("right");
    this.editorLeft.setTouchZoomOptions(undefined);
    this.scrollSync.detach();
    if (this.emptyDropzone) this.emptyDropzone.destroy();
    if (this.editorRight) {
      this.editorRight.destroy();
      this.editorRight = null;
    }
    this.headerLeft.destroy();
    this.headerRight.destroy();
    this.splitter.destroy();
    this.rootEl.remove();
  }
}
