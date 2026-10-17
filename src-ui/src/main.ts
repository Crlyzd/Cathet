import { TopBarComponent } from "./components/TopBar";
import { PopupMenuComponent } from "./components/PopupMenu";
import { ContextMenuComponent } from "./components/ContextMenu";
import { EditorComponent } from "./components/Editor";
import { DropOverlayComponent } from "./components/DropOverlay";
import { DualPaneView } from "./components/dualpane/DualPaneView";
import { showGlassDialog } from "./components/GlassDialog";
import { FileService, FilePayload } from "./services/fileService";
import { WindowService } from "./services/windowService";
import { ThemeService } from "./services/themeService";
import { FontService } from "./services/fontService";
import { UpdateService } from "./services/updateService";
import { DragDropService } from "./services/dragDropService";
import { PreviewService } from "./services/previewService";
import { DualPaneService } from "./services/dualPaneService";
import { globalEventBus } from "./utils/eventBus";
import { registerShortcuts } from "./utils/shortcuts";
import { buildContextMenuItems } from "./utils/contextMenuItems";
import { buildMainMenuItems } from "./utils/mainMenuItems";
import { registerWindowSyncListeners } from "./utils/windowSync";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import tutorialContent from "./assets/tutorial.md?raw";

class CathetApp {
  private fileService = new FileService();
  private windowService = new WindowService();
  private themeService = new ThemeService();
  private fontService = new FontService();
  private updateService = new UpdateService();
  private dragDropService = new DragDropService();
  private previewService = new PreviewService();
  private dualPaneService = new DualPaneService();
  private topBar = new TopBarComponent("topbar-container", this.windowService);
  private popupMenu = new PopupMenuComponent("popup-container");
  private contextMenu = new ContextMenuComponent("contextmenu-container");
  private editor = new EditorComponent("editor-container");
  private dropOverlay = new DropOverlayComponent("app");
  private dualPaneView: DualPaneView | null = null;
  private currentFilePath: string | null = null;
  private isAlwaysOnTop = false;

  constructor() { this.init(); }

  private init(): void {
    this.topBar.setTitle("Untitled");
    this.editor.setFontFamily(this.fontService.getCurrentFont().family);
    invoke("sync_window_theme", { theme: this.themeService.getTheme() }).catch(console.error);
    if (this.updateService.hasUpdate()) this.topBar.setUpdateAvailable(true);

    globalEventBus.on("topbar:toggleMenu", (pos: { x: number; y: number }) => this.openMainMenu(pos.x, pos.y));
    globalEventBus.on("editor:toggleMarkdown", () => this.toggleMarkdown());
    globalEventBus.on("window:toggleAlwaysOnTop", async () => {
      await emit("cathet:ontop-change", (this.isAlwaysOnTop = await this.windowService.toggleAlwaysOnTop()));
    });
    globalEventBus.on("update:statusChanged", (i: any) => this.topBar.setUpdateAvailable(!!i?.update_available));

    registerWindowSyncListeners({
      themeService: this.themeService,
      fontService: this.fontService,
      updateService: this.updateService,
      previewService: this.previewService,
      onFontChanged: (f) => { this.editor.setFontFamily(f); this.dualPaneView?.getEditorRight()?.setFontFamily(f); },
      onAlwaysOnTopChanged: (state) => { this.isAlwaysOnTop = state; },
      onUpdateAvailable: (available) => { this.topBar.setUpdateAvailable(available); },
      onLoadTutorial: () => this.loadTutorialDocument(),
      onSnapScrollChanged: (state) => {
        this.dualPaneService.setSnapScroll(state);
        this.dualPaneView?.setSnapScroll(state);
      },
    });

    this.registerShortcuts();
    this.initDragDrop();
    this.loadInitialFile();
    setTimeout(() => this.updateService.checkForUpdates(), 150);
  }

  private registerShortcuts(): void {
    registerShortcuts({
      onOpen: () => this.fetchAndApply(() => this.fileService.promptOpen(), this.targetPane()),
      onSave: () => this.saveDocument(false),
      onSaveAs: () => this.saveDocument(true),
      onNewWindow: () => this.windowService.openNewInstance(),
      onSettings: () => this.windowService.openSettingsWindow(),
      onToggleAlwaysOnTop: async () => { await emit("cathet:ontop-change", (this.isAlwaysOnTop = await this.windowService.toggleAlwaysOnTop())); },
      onToggleDualPane: () => this.toggleDualPane(),
      onToggleMarkdown: () => this.toggleMarkdown(),
      onToggleBold: () => this.getActiveEditor().toggleBold(),
      onToggleItalic: () => this.getActiveEditor().toggleItalic(),
      onToggleUnderline: () => this.getActiveEditor().toggleUnderline(),
      onSelectAll: () => this.getActiveEditor().selectAllClean(),
      onToggleWordWrap: () => this.getActiveEditor().toggleWordWrap(),
      onSearchWeb: () => { const t = this.getActiveEditor().getSelectedText().trim(); if (t) openUrl(`https://www.google.com/search?q=${encodeURIComponent(t)}`).catch(console.error); },
      onQuit: () => this.windowService.close(),
    });

    window.addEventListener("contextmenu", (e) => {
      if (!import.meta.env.DEV || e.altKey) {
        e.preventDefault();
        const ed = this.getActiveEditor();
        ed.syncCaretToPoint(e.clientX, e.clientY);
        this.popupMenu.hide();
        this.contextMenu.show(e.clientX, e.clientY, buildContextMenuItems(ed));
      }
    });
  }

  private initDragDrop(): void {
    const updateOverlay = (pos?: { x: number; y: number }) => {
      if (!this.dualPaneView || !pos) this.dropOverlay.updateSpatialTarget(false);
      else this.dropOverlay.updateSpatialTarget(true, this.dualPaneView.getSplitterPosition(), pos.x, window.innerWidth);
    };
    this.dragDropService.init({
      onDragStateChange: (dragging, pos) => {
        if (dragging) { updateOverlay(pos); this.dropOverlay.show(); }
        else this.dropOverlay.hide();
      },
      onDragOver: (pos) => updateOverlay(pos),
      onFileDrop: (filePath, pos) => {
        this.dropOverlay.hide();
        const pane = this.dualPaneView ? this.dualPaneView.handleSpatialDrop(pos) : "left";
        this.fetchAndApply(() => this.fileService.loadFile(filePath), pane);
      },
    });
  }

  private targetPane(): "left" | "right" { return this.dualPaneView ? this.dualPaneService.getActivePane() : "left"; }
  private getActiveEditor(): EditorComponent { return this.dualPaneView ? this.dualPaneView.getActiveEditor() : this.editor; }

  private openMainMenu(x: number, y: number): void {
    this.contextMenu.hide();
    this.popupMenu.toggle(x, y, buildMainMenuItems({
      isMarkdownPreview: this.getActiveEditor().getIsMarkdownPreview(),
      isDualPane: this.dualPaneService.isDualPane(),
      hasUpdate: this.updateService.hasUpdate(),
      onNewWindow: () => this.windowService.openNewInstance(), onOpen: () => this.fetchAndApply(() => this.fileService.promptOpen(), this.targetPane()),
      onSave: () => this.saveDocument(false), onSaveAs: () => this.saveDocument(true),
      onToggleDualPane: () => this.toggleDualPane(), onToggleMarkdown: () => this.toggleMarkdown(),
      onOpenSettings: () => this.windowService.openSettingsWindow(), onQuit: () => this.windowService.close(),
    }));
  }

  private toggleDualPane(): void {
    const host = document.getElementById("editor-container")!;
    if (!this.dualPaneService.isDualPane()) {
      this.dualPaneService.setDualPane(true);
      this.dualPaneService.setLeftPath(this.currentFilePath);
      this.editor.getWrapperEl().remove();
      this.dualPaneView = new DualPaneView(host, this.editor, {
        onOpenLeft: () => this.fetchAndApply(() => this.fileService.promptOpen(), "left"),
        onOpenRight: () => this.fetchAndApply(() => this.fileService.promptOpen(), "right"),
        onNewRight: () => { this.dualPaneService.setRightPath(null); this.dualPaneView?.mountRightEditor("", null, false, this.fontService.getCurrentFont().family).focus(); this.topBar.setTitle(this.dualPaneService.getFormattedTitle()); },
        onCloseDualPane: () => this.toggleDualPane(),
        onActivePaneChange: (p) => this.dualPaneService.setActivePane(p),
        onTitleChange: () => this.topBar.setTitle(this.dualPaneService.getFormattedTitle()),
      });
      this.dualPaneView.setLeftTitle(this.currentFilePath?.split(/[/\\]/).pop() || "Untitled");
      this.dualPaneView.setSnapScroll(this.dualPaneService.getSnapScroll());
      this.windowService.setMinSize(350, 350);
    } else {
      this.dualPaneService.setDualPane(false);
      this.dualPaneService.setRightPath(null);
      this.dualPaneService.setActivePane("left");
      this.dualPaneView?.destroy();
      this.dualPaneView = null;
      host.innerHTML = "";
      host.appendChild(this.editor.getWrapperEl());
      this.windowService.setMinSize(200, 300);
    }
    this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
  }

  private toggleMarkdown(): void {
    if (this.dualPaneView) {
      if (this.dualPaneService.getActivePane() === "right") this.dualPaneView.toggleRightPreview();
      else this.dualPaneView.toggleLeftPreview();
    } else {
      this.editor.toggleMarkdownPreview();
    }
  }

  private applyLoadedFile(res: FilePayload, pane: "left" | "right"): void {
    const preview = this.previewService.shouldOpenInPreview(res.path);
    const isWrap = (res.fileSize ?? res.file_size ?? 0) <= 3 * 1024 * 1024;
    const name = res.path.split(/[/\\]/).pop() || "Untitled";

    if (pane === "right" && this.dualPaneView) {
      this.dualPaneService.setRightPath(res.path);
      const ed = this.dualPaneView.mountRightEditor(res.content, res.path, preview, this.fontService.getCurrentFont().family);
      ed.setWordWrap(isWrap);
    } else {
      this.currentFilePath = res.path;
      this.dualPaneService.setLeftPath(res.path);
      this.editor.loadDocument(res.content, res.path, preview);
      this.editor.setWordWrap(isWrap);
      this.dualPaneView?.setLeftTitle(name);
      this.dualPaneView?.setLeftPreviewActive(preview);
    }
    this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
  }

  private async fetchAndApply(action: () => Promise<FilePayload | null>, pane: "left" | "right"): Promise<void> {
    this.topBar.setLoading(true);
    const result = await action();
    this.topBar.setLoading(false);
    if (result) this.applyLoadedFile(result, pane);
    else if (this.fileService.getLastError()) {
      showGlassDialog({ type: "warning", title: "Cannot Open File", message: this.fileService.getLastError()! });
    }
  }

  private async loadInitialFile(): Promise<void> {
    const result = await this.fileService.getInitialFile();
    if (result) this.applyLoadedFile(result, "left");
  }

  private async saveDocument(asNew: boolean): Promise<void> {
    const isRight = this.dualPaneView && this.dualPaneService.getActivePane() === "right";
    const curPath = isRight ? this.dualPaneService.getRightPath() : this.currentFilePath;
    const text = this.getActiveEditor().getText();
    const saved = asNew ? await this.fileService.promptSaveAs(text) : await this.fileService.saveFile(curPath, text);
    if (saved) {
      const name = saved.split(/[/\\]/).pop() || "Untitled";
      if (isRight && this.dualPaneView) {
        this.dualPaneService.setRightPath(saved);
        this.dualPaneView.setRightTitle(name);
      } else {
        this.currentFilePath = saved;
        this.dualPaneService.setLeftPath(saved);
        this.dualPaneView?.setLeftTitle(name);
      }
      this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
    }
  }

  private loadTutorialDocument(): void {
    this.currentFilePath = null;
    this.dualPaneService.setLeftPath(null);
    this.editor.loadDocument(tutorialContent, null, true);
    this.editor.setWordWrap(true);
    this.dualPaneView?.setLeftPreviewActive(true);
    this.topBar.setTitle("Cathet Tutorial.md");
  }
}
window.addEventListener("DOMContentLoaded", () => { new CathetApp(); });
