import { EditorComponent } from "../Editor";
import { DualPaneHeader } from "./DualPaneHeader";
import { DualPaneSplitter } from "./DualPaneSplitter";
import { DualPaneEmptyDropzone } from "./DualPaneEmptyDropzone";
import { SyncScrollController } from "../../utils/syncScrollController";

export interface DualPaneCallbacks {
  onOpenLeft: () => void;
  onOpenRight: () => void;
  onCloseDualPane: () => void;
  onActivePaneChange: (pane: "left" | "right") => void;
  onTitleChange: () => void;
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
  private scrollSync: SyncScrollController;

  private activePane: "left" | "right" = "left";
  private callbacks: DualPaneCallbacks;

  constructor(container: HTMLElement, editorLeft: EditorComponent, callbacks: DualPaneCallbacks) {
    this.container = container;
    this.editorLeft = editorLeft;
    this.callbacks = callbacks;
    this.scrollSync = new SyncScrollController();

    this.rootEl = document.createElement("div");
    this.rootEl.className = "dualpane-container";

    // Left Pane
    this.leftPaneEl = document.createElement("div");
    this.leftPaneEl.className = "dualpane-pane dualpane-pane-left active-pane";
    this.headerLeft = new DualPaneHeader({
      title: "Untitled",
      badgeText: "Primary",
      showCloseBtn: false,
      onTogglePreview: () => this.toggleLeftPreview(),
      onOpen: () => this.callbacks.onOpenLeft(),
    });
    this.leftHostEl = document.createElement("div");
    this.leftHostEl.className = "dualpane-editor-host";
    this.leftPaneEl.appendChild(this.headerLeft.getElement());
    this.leftPaneEl.appendChild(this.leftHostEl);

    // Splitter
    this.splitter = new DualPaneSplitter(
      this.rootEl,
      (pct) => this.setSplitRatio(pct),
      () => this.scrollSync.toggleLock(),
      this.scrollSync.isLocked()
    );

    // Right Pane
    this.rightPaneEl = document.createElement("div");
    this.rightPaneEl.className = "dualpane-pane dualpane-pane-right";
    this.headerRight = new DualPaneHeader({
      title: "Empty",
      badgeText: "Secondary",
      showCloseBtn: true,
      onTogglePreview: () => this.toggleRightPreview(),
      onOpen: () => this.callbacks.onOpenRight(),
      onClose: () => this.callbacks.onCloseDualPane(),
    });
    this.rightHostEl = document.createElement("div");
    this.rightHostEl.className = "dualpane-editor-host";
    this.rightPaneEl.appendChild(this.headerRight.getElement());
    this.rightPaneEl.appendChild(this.rightHostEl);

    // Mount structure
    this.rootEl.appendChild(this.leftPaneEl);
    this.rootEl.appendChild(this.splitter.getElement());
    this.rootEl.appendChild(this.rightPaneEl);
    this.container.appendChild(this.rootEl);

    // Re-mount left editor into leftHostEl
    this.leftHostEl.appendChild(this.editorLeft.getWrapperEl());

    // Show empty placeholder in right pane initially
    this.showEmptyRightPane();

    this.bindEvents();
  }

  private bindEvents(): void {
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

  getActivePane(): "left" | "right" {
    return this.activePane;
  }

  getEditorLeft(): EditorComponent {
    return this.editorLeft;
  }

  getEditorRight(): EditorComponent | null {
    return this.editorRight;
  }

  getActiveEditor(): EditorComponent {
    return this.activePane === "right" && this.editorRight ? this.editorRight : this.editorLeft;
  }

  setLeftTitle(title: string): void {
    this.headerLeft.setTitle(title);
  }

  setRightTitle(title: string): void {
    this.headerRight.setTitle(title);
  }

  toggleLeftPreview(): void {
    const isMd = this.editorLeft.toggleMarkdownPreview();
    this.headerLeft.setPreviewActive(isMd);
    this.scrollSync.resync("left");
  }

  toggleRightPreview(): void {
    if (!this.editorRight) return;
    const isMd = this.editorRight.toggleMarkdownPreview();
    this.headerRight.setPreviewActive(isMd);
    this.scrollSync.resync("right");
  }

  showEmptyRightPane(): void {
    if (this.editorRight) {
      this.scrollSync.detach();
      this.editorRight.destroy();
      this.editorRight = null;
    }
    this.rightHostEl.innerHTML = "";
    this.headerRight.setTitle("Empty");
    this.headerRight.setPreviewActive(false);

    this.emptyDropzone = new DualPaneEmptyDropzone(() => this.callbacks.onOpenRight());
    this.rightHostEl.appendChild(this.emptyDropzone.getElement());
  }

  mountRightEditor(content: string, path: string | null, shouldPreview: boolean, font: string): EditorComponent {
    if (this.emptyDropzone) {
      this.emptyDropzone.destroy();
      this.emptyDropzone = null;
    }
    this.rightHostEl.innerHTML = "";

    this.editorRight = new EditorComponent(this.rightHostEl);
    this.editorRight.setFontFamily(font);
    this.editorRight.loadDocument(content, path, shouldPreview);
    this.headerRight.setPreviewActive(shouldPreview);

    const name = path ? path.split(/[/\\]/).pop() || "Untitled" : "Untitled";
    this.headerRight.setTitle(name);

    // Attach synchronized scrolling
    this.scrollSync.attach(this.editorLeft.getWrapperEl(), this.editorRight.getWrapperEl());
    this.setActivePane("right");
    return this.editorRight;
  }

  handleSpatialDrop(position?: { x: number; y: number }): "left" | "right" {
    if (!position) {
      return !this.editorRight ? "right" : this.activePane;
    }
    const splitterRect = this.splitter.getElement().getBoundingClientRect();
    return position.x < splitterRect.left ? "left" : "right";
  }

  destroy(): void {
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
