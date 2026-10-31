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
import { MobileCoordinator } from "./services/mobileCoordinator";
import { PlatformService } from "./services/platformService";
import { NotesService } from "./services/notesService";
import { HomeCoordinator } from "./services/homeCoordinator";
import { globalEventBus } from "./utils/eventBus";
import { formatDisplayTitle } from "./utils/pathUtils";
import { registerShortcuts } from "./utils/shortcuts";
import { buildContextMenuItems } from "./utils/contextMenuItems";
import { buildMainMenuItems } from "./utils/mainMenuItems";
import { registerWindowSyncListeners } from "./utils/windowSync";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import tutorialContent from "./assets/tutorial.md?raw";

class CathetApp {
  private fileService = new FileService(); private windowService = new WindowService();
  private themeService = new ThemeService(); private fontService = new FontService();
  private updateService = new UpdateService(); private dragDropService = new DragDropService();
  private previewService = new PreviewService(); private dualPaneService = new DualPaneService();
  private topBar = new TopBarComponent("topbar-container", this.windowService);
  private popupMenu = new PopupMenuComponent("popup-container");
  private contextMenu = new ContextMenuComponent("contextmenu-container");
  private editor = new EditorComponent("editor-container");
  private dropOverlay = new DropOverlayComponent("app");
  private dualPaneView: DualPaneView | null = null;
  private mobileCoord: MobileCoordinator | null = null;
  private notesService = new NotesService();
  private homeCoord: HomeCoordinator | null = null;
  private currentFilePath: string | null = null;
  private isAlwaysOnTop = false;
  private isClosingDualPane = false;

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
      themeService: this.themeService, fontService: this.fontService, updateService: this.updateService, previewService: this.previewService,
      onFontChanged: (f) => { this.editor.setFontFamily(f); this.dualPaneView?.getEditorRight()?.setFontFamily(f); },
      onAlwaysOnTopChanged: (s) => { this.isAlwaysOnTop = s; },
      onUpdateAvailable: (a) => { this.topBar.setUpdateAvailable(a); },
      onLoadTutorial: () => this.loadTutorialDocument(),
      onSnapScrollChanged: (s) => {
        this.dualPaneService.setSnapScroll(s);
        this.dualPaneView?.setSnapScroll(s);
        const isLocked = this.dualPaneView ? this.dualPaneView.isSyncLocked() : true;
        this.mobileCoord?.setSyncState(s ? true : isLocked, s);
      },
    });

    this.mobileCoord = new MobileCoordinator({
      onToggleMarkdown: () => this.toggleMarkdown(), onSave: () => this.saveDocument(false),
      onSaveAs: () => this.saveDocument(true), onNewDocument: () => this.newDocument(),
      onOpen: () => this.fetchAndApply(() => this.fileService.promptOpen(), this.targetPane()),
      onToggleDualPane: () => this.toggleDualPane(), onOpenTutorial: () => this.loadTutorialDocument(),
      onFontChanged: (f) => { this.editor.setFontFamily(f); this.dualPaneView?.getEditorRight()?.setFontFamily(f); },
      onToggleSync: (mode) => {
        if (this.dualPaneView) {
          if (mode === "locked") {
            this.dualPaneService.setSnapScroll(false);
            this.dualPaneView.setSnapScroll(false);
            this.dualPaneView.setSyncLocked(true);
            this.mobileCoord?.updateSettingsSnapScroll(false);
          } else if (mode === "snap") {
            this.dualPaneService.setSnapScroll(true);
            this.dualPaneView.setSnapScroll(true);
            this.dualPaneView.setSyncLocked(true);
            this.mobileCoord?.updateSettingsSnapScroll(true);
          } else {
            this.dualPaneView.setSyncLocked(false);
          }
        }
      },
      onSnapScrollChanged: (s) => {
        this.dualPaneService.setSnapScroll(s);
        if (this.dualPaneView) {
          if (s) {
            this.dualPaneView.setSyncLocked(true);
            this.dualPaneView.setSnapScroll(true);
            this.mobileCoord?.setSyncState(true, true);
          } else {
            this.dualPaneView.setSnapScroll(false);
            this.mobileCoord?.setSyncState(this.dualPaneView.isSyncLocked(), false);
          }
        } else {
          this.mobileCoord?.setSyncState(true, s);
        }
      },
    });

    this.homeCoord = new HomeCoordinator({
      notesService: this.notesService,
      topBar: this.topBar,
      editor: this.editor,
      previewService: this.previewService,
      fontService: this.fontService,
      getMobileCoordinator: () => this.mobileCoord,
      onOpenExternalPicker: async () => {
        const res = await this.fileService.promptOpen();
        if (res) {
          const rawName = res.displayName || (res.path.startsWith("content://") ? (decodeURIComponent(res.path.split("/").pop() || "Untitled")) : (res.path.split(/[/\\]/).pop() || "Untitled"));
          const title = formatDisplayTitle(rawName);
          this.homeCoord?.openExternalFile(title);
          await this.applyLoadedFile(res, "left");
        } else if (this.fileService.getLastError()) {
          showGlassDialog({ type: "warning", title: "Cannot Open File", message: this.fileService.getLastError()! });
        }
      },
      onBeforeNavigateHome: () => this.autoSaveRightPane(),
      onNavigateHome: () => {
        if (this.dualPaneService.isDualPane()) this.toggleDualPane();
      },
      onNoteSelectedForEditor: (content, noteId, title) => {
        this.currentFilePath = `notes/${noteId}`;
        this.dualPaneService.setLeftPath(this.currentFilePath, title);
        const shouldPreview = this.previewService.shouldOpenInPreview(title);
        this.editor.loadDocument(content, this.currentFilePath, shouldPreview);
        this.mobileCoord?.setMarkdownState(shouldPreview);
      },
    });

    window.addEventListener("blur", () => {
      if (PlatformService.getInstance().isAndroid()) {
        this.homeCoord?.autoSaveCurrentNote();
        this.autoSaveRightPane();
      }
    });

    window.addEventListener("popstate", () => {
      if (this.homeCoord?.isSelectionModeActive()) {
        this.homeCoord.exitSelectionMode();
        return;
      }
      if (this.homeCoord && !this.homeCoord.isHomeActive()) {
        this.homeCoord.navigateBackToHome(false);
        return;
      }
      if (this.dualPaneView?.hasEmbeddedHome()) {
        this.dualPaneView.clearEmbeddedHome("left");
        this.dualPaneView.clearEmbeddedHome("right");
        this.dualPaneView.getHeaderLeft().setBackVisible(false);
        this.dualPaneView.getHeaderRight().setBackVisible(false);
        const hostLeft = this.dualPaneView.getHostLeft();
        if (!hostLeft.contains(this.editor.getWrapperEl())) {
          hostLeft.innerHTML = "";
          hostLeft.appendChild(this.editor.getWrapperEl());
        }
        if (this.dualPaneView.getEditorRight()) {
          const hostRight = this.dualPaneView.getHostRight();
          hostRight.innerHTML = "";
          hostRight.appendChild(this.dualPaneView.getEditorRight()!.getWrapperEl());
        } else {
          this.dualPaneView.showEmptyRightPane();
        }
        this.mobileCoord?.setActionBarVisible(true);
      }
    });

    this.registerShortcuts();
    this.initDragDrop();
    this.loadInitialFile();
    setTimeout(() => this.updateService.checkForUpdates(), 150);
  }

  private registerShortcuts(): void {
    registerShortcuts({
      onOpen: () => this.fetchAndApply(() => this.fileService.promptOpen(), this.targetPane()),
      onSave: () => this.saveDocument(false), onSaveAs: () => this.saveDocument(true),
      onNewWindow: () => this.windowService.openNewInstance(), onSettings: () => this.windowService.openSettingsWindow(),
      onToggleAlwaysOnTop: async () => { await emit("cathet:ontop-change", (this.isAlwaysOnTop = await this.windowService.toggleAlwaysOnTop())); },
      onToggleDualPane: () => this.toggleDualPane(), onToggleMarkdown: () => this.toggleMarkdown(),
      onToggleBold: () => this.getActiveEditor().toggleBold(), onToggleItalic: () => this.getActiveEditor().toggleItalic(), onToggleUnderline: () => this.getActiveEditor().toggleUnderline(),
      onSelectAll: () => this.getActiveEditor().selectAllClean(), onToggleWordWrap: () => this.getActiveEditor().toggleWordWrap(),
      onSearchWeb: () => { const t = this.getActiveEditor().getSelectedText().trim(); if (t) openUrl(`https://www.google.com/search?q=${encodeURIComponent(t)}`).catch(console.error); },
      onQuit: () => this.windowService.close(),
    });

    window.addEventListener("contextmenu", (e) => {
      if (this.homeCoord?.isHomeActive() || (e.target as HTMLElement)?.closest(".home-view-container")) {
        e.preventDefault();
        return;
      }
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

  private targetPane(): "left" | "right" {
    if (!this.dualPaneView) return "left";
    if (!this.dualPaneView.getEditorRight()) return "right";
    return this.dualPaneService.getActivePane();
  }
  private getActiveEditor(): EditorComponent { return this.dualPaneView ? this.dualPaneView.getActiveEditor() : this.editor; }

  private openMainMenu(x: number, y: number): void {
    this.contextMenu.hide();
    const ed = this.getActiveEditor();
    if (this.mobileCoord?.isMobile()) {
      this.mobileCoord.openMenu({
        isMarkdownPreview: ed.getIsMarkdownPreview(),
        isDualPane: this.dualPaneService.isDualPane(),
        canSave: ed.isModified(),
      });
      return;
    }
    this.popupMenu.toggle(x, y, buildMainMenuItems({
      isMarkdownPreview: ed.getIsMarkdownPreview(), isDualPane: this.dualPaneService.isDualPane(),
      hasUpdate: this.updateService.hasUpdate(), isUpToDate: !ed.isModified(),
      onNewWindow: () => this.windowService.openNewInstance(), onOpen: () => this.fetchAndApply(() => this.fileService.promptOpen(), this.targetPane()),
      onSave: () => this.saveDocument(false), onSaveAs: () => this.saveDocument(true),
      onToggleDualPane: () => this.toggleDualPane(), onToggleMarkdown: () => this.toggleMarkdown(),
      onOpenSettings: () => this.windowService.openSettingsWindow(), onQuit: () => this.windowService.close(),
    }));
  }

  private async autoSaveRightPane(): Promise<void> {
    if (!PlatformService.getInstance().isAndroid() || !this.dualPaneView) return;
    const edRight = this.dualPaneView.getEditorRight();
    if (!edRight) return;
    const text = edRight.getText().trim();
    if (!text) return;
    const rightPath = this.dualPaneService.getRightPath();
    const noteId = rightPath?.startsWith("notes/") ? rightPath.slice(6) : null;
    try {
      const saved = await this.notesService.saveNote(noteId, text, this.homeCoord?.getCurrentFolder() || "");
      if (saved) {
        this.dualPaneService.setRightPath(`notes/${saved.id}`, saved.title);
        edRight.markSaved();
      }
    } catch (err) {
      console.warn("Right pane auto-save skipped:", err);
    }
  }

  private async newDocument(): Promise<void> {
    const isRight = this.dualPaneView && this.dualPaneService.getActivePane() === "right";
    if (isRight && this.dualPaneView) {
      await this.autoSaveRightPane();
      this.dualPaneService.setRightPath(null);
      this.dualPaneView.mountRightEditor("", null, false, this.fontService.getCurrentFont().family);
      this.dualPaneView.setRightTitle("Untitled");
    } else {
      if (PlatformService.getInstance().isAndroid()) await this.homeCoord?.autoSaveCurrentNote();
      this.currentFilePath = null;
      this.homeCoord?.setCurrentNoteId(null);
      this.dualPaneService.setLeftPath(null);
      this.editor.loadDocument("", null, false);
      this.dualPaneView?.setLeftTitle("Untitled");
    }
    this.mobileCoord?.setMarkdownState(false);
    this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
  }

  private toggleDualPane(): void {
    if (this.isClosingDualPane) return;
    const host = document.getElementById("editor-container")!;
    if (!this.dualPaneService.isDualPane()) {
      this.dualPaneService.setDualPane(true);
      this.dualPaneService.setLeftPath(this.currentFilePath);
      this.editor.getWrapperEl().remove();
      this.dualPaneView = new DualPaneView(host, this.editor, {
        onOpenLeft: async () => {
          if (PlatformService.getInstance().isAndroid() && this.homeCoord) {
            await this.homeCoord.autoSaveCurrentNote();
            this.dualPaneView!.clearEmbeddedHome("left");
            const hostEl = this.dualPaneView!.getHostLeft();
            this.dualPaneView!.getHeaderLeft().setBackVisible(true);
            this.mobileCoord?.setActionBarVisible(false);
            window.history.pushState({ dualPicker: "left" }, "");
            const inst = this.homeCoord.createEmbeddedHome(hostEl, async (note) => {
              const read = await this.notesService.readNote(note.id);
              const content = read?.content || note.snippet;
              this.dualPaneView!.clearEmbeddedHome("left");
              this.dualPaneView!.getHeaderLeft().setBackVisible(false);
              this.mobileCoord?.setActionBarVisible(true);
              this.currentFilePath = `notes/${note.id}`;
              this.homeCoord?.setCurrentNoteId(note.id);
              const cleanTitle = formatDisplayTitle(note.title);
              this.dualPaneService.setLeftPath(this.currentFilePath, cleanTitle);
              const isMd = this.previewService.shouldOpenInPreview(cleanTitle);
              this.editor.loadDocument(content, this.currentFilePath, isMd);
              this.dualPaneView!.setLeftTitle(cleanTitle);
              this.dualPaneView!.setLeftPreviewActive(isMd);
            });
            this.dualPaneView!.setEmbeddedHome("left", inst);
          } else {
            this.fetchAndApply(() => this.fileService.promptOpen(), "left");
          }
        },
        onOpenRight: async () => {
          if (PlatformService.getInstance().isAndroid() && this.homeCoord) {
            await this.autoSaveRightPane();
            this.dualPaneView!.clearEmbeddedHome("right");
            const hostEl = this.dualPaneView!.getHostRight();
            this.dualPaneView!.getHeaderRight().setBackVisible(true);
            this.mobileCoord?.setActionBarVisible(false);
            window.history.pushState({ dualPicker: "right" }, "");
            const inst = this.homeCoord.createEmbeddedHome(hostEl, async (note) => {
              const read = await this.notesService.readNote(note.id);
              const content = read?.content || note.snippet;
              this.dualPaneView!.clearEmbeddedHome("right");
              this.dualPaneView!.getHeaderRight().setBackVisible(false);
              this.mobileCoord?.setActionBarVisible(true);
              const path = `notes/${note.id}`;
              const cleanTitle = formatDisplayTitle(note.title);
              this.dualPaneService.setRightPath(path, cleanTitle);
              const isMd = this.previewService.shouldOpenInPreview(cleanTitle);
              this.dualPaneView!.mountRightEditor(content, path, isMd, this.fontService.getCurrentFont().family);
            });
            this.dualPaneView!.setEmbeddedHome("right", inst);
          } else {
            this.fetchAndApply(() => this.fileService.promptOpen(), "right");
          }
        },
        onBackLeft: () => {
          this.dualPaneView!.clearEmbeddedHome("left");
          this.dualPaneView!.getHeaderLeft().setBackVisible(false);
          const hostEl = this.dualPaneView!.getHostLeft();
          hostEl.innerHTML = "";
          hostEl.appendChild(this.editor.getWrapperEl());
          this.mobileCoord?.setActionBarVisible(true);
        },
        onBackRight: () => {
          this.dualPaneView!.clearEmbeddedHome("right");
          this.dualPaneView!.getHeaderRight().setBackVisible(false);
          if (this.dualPaneView!.getEditorRight()) {
            const hostEl = this.dualPaneView!.getHostRight();
            hostEl.innerHTML = "";
            hostEl.appendChild(this.dualPaneView!.getEditorRight()!.getWrapperEl());
          } else {
            this.dualPaneView!.showEmptyRightPane();
          }
          this.mobileCoord?.setActionBarVisible(true);
        },
        onOpenFileRight: async () => { await this.autoSaveRightPane(); await this.fetchAndApply(() => this.fileService.promptOpen(), "right"); },
        onNewRight: async () => { await this.autoSaveRightPane(); this.dualPaneService.setRightPath(null); this.dualPaneView?.mountRightEditor("", null, false, this.fontService.getCurrentFont().family).focus(); this.topBar.setTitle(this.dualPaneService.getFormattedTitle()); },
        onCloseDualPane: () => this.toggleDualPane(), onActivePaneChange: (p) => this.dualPaneService.setActivePane(p),
        onTitleChange: () => this.topBar.setTitle(this.dualPaneService.getFormattedTitle()),
        onSyncChange: (s) => this.mobileCoord?.setSyncState(s, this.dualPaneService.getSnapScroll()),
      });
      this.dualPaneView.setLeftTitle(formatDisplayTitle(this.currentFilePath));
      this.dualPaneView.setSnapScroll(this.dualPaneService.getSnapScroll());
      this.mobileCoord?.setSyncState(this.dualPaneView.isSyncLocked(), this.dualPaneService.getSnapScroll());
      this.windowService.setMinSize(350, 350);
    } else {
      void this.autoSaveRightPane();
      this.dualPaneService.setDualPane(false);
      this.dualPaneService.setRightPath(null);
      this.dualPaneService.setActivePane("left");
      if (this.dualPaneView) {
        this.isClosingDualPane = true;
        this.dualPaneView.animateClose(() => {
          this.dualPaneView?.destroy();
          this.dualPaneView = null;
          host.innerHTML = "";
          host.appendChild(this.editor.getWrapperEl());
          this.windowService.setMinSize(200, 300);
          this.isClosingDualPane = false;
          if (!this.homeCoord?.isHomeActive()) {
            this.mobileCoord?.setActionBarVisible(true);
          }
        });
      } else {
        host.innerHTML = "";
        host.appendChild(this.editor.getWrapperEl());
        this.windowService.setMinSize(200, 300);
        if (!this.homeCoord?.isHomeActive()) {
          this.mobileCoord?.setActionBarVisible(true);
        }
      }
    }
    this.mobileCoord?.setDualPaneState(this.dualPaneService.isDualPane());
    this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
  }

  private toggleMarkdown(): void {
    if (this.dualPaneView) {
      if (this.dualPaneService.getActivePane() === "right") this.dualPaneView.toggleRightPreview();
      else this.dualPaneView.toggleLeftPreview();
    } else {
      this.editor.toggleMarkdownPreview();
    }
    this.mobileCoord?.setMarkdownState(this.getActiveEditor().getIsMarkdownPreview());
  }

  private async applyLoadedFile(res: FilePayload, pane: "left" | "right"): Promise<void> {
    const rawName = res.displayName || (res.path.startsWith("content://") ? (decodeURIComponent(res.path.split("/").pop() || "Untitled")) : (res.path.split(/[/\\]/).pop() || "Untitled"));
    const title = formatDisplayTitle(rawName);
    const preview = this.previewService.shouldOpenInPreview(rawName || res.path);
    const isWrap = (res.fileSize ?? res.file_size ?? 0) <= 3 * 1024 * 1024;
    let targetPath = res.path;
    if (PlatformService.getInstance().isAndroid() && !res.path.startsWith("notes/")) {
      const saved = await this.notesService.saveNote(null, res.content, this.homeCoord?.getCurrentFolder() || "", title);
      if (saved) {
        targetPath = `notes/${saved.id}`;
        if (pane === "left") this.homeCoord?.setCurrentNoteId(saved.id);
      }
    }
    if (pane === "right" && this.dualPaneView) {
      this.dualPaneService.setRightPath(targetPath, title);
      this.dualPaneView.getHeaderRight().setBackVisible(false);
      this.dualPaneView.mountRightEditor(res.content, targetPath, preview, this.fontService.getCurrentFont().family).setWordWrap(isWrap);
      this.dualPaneView.setRightTitle(title);
      this.mobileCoord?.setActionBarVisible(true);
    } else {
      this.currentFilePath = targetPath;
      this.dualPaneService.setLeftPath(targetPath, title);
      this.editor.loadDocument(res.content, targetPath, preview);
      this.editor.setWordWrap(isWrap);
      if (this.dualPaneView) {
        this.dualPaneView.clearEmbeddedHome("left");
        this.dualPaneView.getHeaderLeft().setBackVisible(false);
        const hostLeft = this.dualPaneView.getHostLeft();
        if (!hostLeft.contains(this.editor.getWrapperEl())) {
          hostLeft.innerHTML = "";
          hostLeft.appendChild(this.editor.getWrapperEl());
        }
        this.dualPaneView.setLeftTitle(title);
        this.dualPaneView.setLeftPreviewActive(preview);
        this.mobileCoord?.setActionBarVisible(true);
      }
    }
    this.mobileCoord?.setMarkdownState(preview);
    this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
  }

  private async fetchAndApply(action: () => Promise<FilePayload | null>, pane: "left" | "right"): Promise<void> {
    this.topBar.setLoading(true);
    const result = await action();
    this.topBar.setLoading(false);
    if (result) await this.applyLoadedFile(result, pane);
    else if (this.fileService.getLastError()) {
      showGlassDialog({ type: "warning", title: "Cannot Open File", message: this.fileService.getLastError()! });
    }
  }

  private async loadInitialFile(): Promise<void> {
    const result = await this.fileService.getInitialFile();
    if (result) {
      if (PlatformService.getInstance().isAndroid()) {
        const imported = await this.notesService.importExternalFile(result.path);
        if (imported) {
          this.homeCoord?.openNote(imported);
          return;
        }
      }
      await this.applyLoadedFile(result, "left");
    }
  }

  private async saveDocument(asNew: boolean): Promise<void> {
    const isRight = this.dualPaneView && this.dualPaneService.getActivePane() === "right";
    const curPath = isRight ? this.dualPaneService.getRightPath() : this.currentFilePath;
    const ed = this.getActiveEditor();
    if (!asNew && PlatformService.getInstance().isAndroid() && (!curPath || curPath.startsWith("notes/"))) {
      if (isRight) await this.autoSaveRightPane();
      else await this.homeCoord?.autoSaveCurrentNote();
      this.topBar.setTitle(this.dualPaneService.getFormattedTitle());
      return;
    }
    if (!asNew && !ed.isModified()) return;
    if (!asNew && curPath && await this.fileService.isFileReadonly(curPath)) {
      showGlassDialog({ type: "warning", title: "Read-Only File", message: 'This file is marked as read-only by Windows. Please use "Save As..." to save to a different file.' });
      return;
    }
    const text = ed.getText();
    const defaultName = (this.topBar.getTitle() || "Untitled").replace(/(\.txt|\.md)$/, "") + ".txt";
    const saved = asNew ? await this.fileService.promptSaveAs(text, defaultName) : await this.fileService.saveFile(curPath, text);
    if (saved) {
      ed.markSaved();
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
    this.mobileCoord?.setMarkdownState(true);
    this.topBar.setTitle("Cathet Tutorial.md");
  }
}
window.addEventListener("DOMContentLoaded", () => { new CathetApp(); });
