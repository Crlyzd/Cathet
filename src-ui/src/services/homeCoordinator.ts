import { NotesService, NoteItem } from "./notesService";
import { HomeViewComponent } from "../components/home/HomeView";
import { TopBarComponent } from "../components/TopBar";
import { EditorComponent } from "../components/Editor";
import { PreviewService } from "./previewService";
import { FontService } from "./fontService";
import { PlatformService } from "./platformService";
import { ThemeService } from "./themeService";
import { ContainerTransform } from "../utils/containerTransform";
import { globalEventBus } from "../utils/eventBus";

export interface HomeCoordinatorOptions {
  notesService: NotesService;
  topBar: TopBarComponent;
  editor: EditorComponent;
  previewService: PreviewService;
  fontService: FontService;
  getMobileCoordinator?: () => any;
  onOpenExternalPicker: () => void;
  onNoteSelectedForEditor: (content: string, noteId: string, title: string) => void;
  onBeforeNavigateHome?: () => Promise<void>;
  onNavigateHome?: () => void;
}

export class HomeCoordinator {
  private notesService: NotesService;
  private topBar: TopBarComponent;
  private editor: EditorComponent;
  private options: HomeCoordinatorOptions;
  private homeView: HomeViewComponent | null = null;

  private currentNoteId: string | null = null;
  private currentFolder = "";
  private isHomeVisible = false;
  private isOpeningNote = false;
  private lastOriginRect: DOMRect | null = null;

  constructor(options: HomeCoordinatorOptions) {
    this.options = options;
    this.notesService = options.notesService;
    this.topBar = options.topBar;
    this.editor = options.editor;
    if (PlatformService.getInstance().isAndroid()) this.initAndroidHome();
  }

  private initAndroidHome(): void {
    const appEl = document.getElementById("app") || document.body;
    this.homeView = new HomeViewComponent({
      containerElement: appEl,
      notesService: this.notesService,
      onOpenNote: (note, rect) => this.openNote(note, rect),
      onNewNote: (folder, rect) => this.openNewNote(folder, rect),
      onOpenFile: () => this.options.onOpenExternalPicker(),
    });

    globalEventBus.on("topbar:navigateHome", () => this.navigateBackToHome());
    this.showHome();
  }

  isHomeActive(): boolean { return this.isHomeVisible; }
  isSelectionModeActive(): boolean { return this.homeView?.isSelectionActive() ?? false; }
  exitSelectionMode(): void { this.homeView?.exitSelectionMode(false); }

  showHome(animate = false, shouldRefresh = true): void {
    if (!this.homeView) return;
    this.isHomeVisible = true;
    this.topBar.setBackVisible(false);
    this.setEditorContainerVisible(false);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);
    this.homeView.setVisible(true, shouldRefresh);
    if (animate) this.homeView.animateEnter?.();
  }

  async navigateBackToHome(syncHistory = true): Promise<void> {
    if (syncHistory && window.history.state?.screen === "editor") {
      window.history.back();
      return;
    }

    try {
      await this.autoSaveCurrentNote();
      await this.options.onBeforeNavigateHome?.();
    } catch (err) { console.warn("Auto-save skipped:", err); }

    const ed = document.getElementById("editor-container");
    const onExit = () => {
      document.body.classList.remove("is-animating-transform");
      this.editor.loadDocument("", null, false);
      this.currentNoteId = null;
      this.lastOriginRect = null;
      this.options.onNavigateHome?.();
      this.showHome(false, false);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ed) { onExit(); return; }

    document.body.classList.add("is-animating-transform");
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);
    await this.homeView?.showAndRefresh();
    this.setEditorContainerVisible(true);

    const targetCard = this.currentNoteId
      ? document.querySelector<HTMLElement>(`.home-note-card[data-id="${this.currentNoteId}"]`)
      : null;
    const fabEl = document.querySelector<HTMLElement>("#home-fab-main") || document.querySelector<HTMLElement>(".home-fab-btn");
    const theme = ThemeService.getInstance().getTheme();

    if (targetCard) {
      let rect = targetCard.getBoundingClientRect();
      if ((rect.width === 0 || rect.height === 0) && this.lastOriginRect) rect = this.lastOriginRect;
      ContainerTransform.collapse({ targetRect: rect, theme, targetBorderRadius: 16, cardEl: targetCard, onComplete: onExit });
    } else if (fabEl || this.lastOriginRect) {
      let rect = fabEl ? fabEl.getBoundingClientRect() : null;
      if (!rect || rect.width === 0 || rect.height === 0) {
        rect = this.lastOriginRect || new DOMRect(window.innerWidth - 76, window.innerHeight - 90, 58, 58);
      }
      ContainerTransform.collapse({ targetRect: rect, theme, targetBorderRadius: 29, onComplete: onExit });
    } else {
      onExit();
    }
  }

  async autoSaveCurrentNote(): Promise<void> {
    if (this.isHomeVisible) return;
    const text = this.editor.getText().trim();
    if (!text) return;
    const saved = await this.notesService.saveNote(this.currentNoteId, text, this.currentFolder);
    if (saved) { this.currentNoteId = saved.id; this.editor.markSaved(); }
  }

  async openNote(note: NoteItem, originRect?: DOMRect): Promise<void> {
    if (this.isOpeningNote) return;
    this.isOpeningNote = true;
    this.lastOriginRect = originRect || null;
    const theme = ThemeService.getInstance().getTheme();
    const cardEl = document.querySelector<HTMLElement>(`.home-note-card[data-id="${note.id}"]`);
    if (cardEl) cardEl.style.backgroundColor = theme === "light" ? "#f8fafc" : "#0f1117";

    try {
      (document.activeElement as HTMLElement)?.blur();
      window.getSelection()?.removeAllRanges();

      let content = "";
      try {
        const res = await this.notesService.readNote(note.id);
        content = res?.content || note.snippet;
      } catch {
        content = note.snippet;
      }

      this.currentNoteId = note.id;
      this.currentFolder = note.folder;
      this.options.onNoteSelectedForEditor(content, note.id, note.title);
      this.topBar.setTitle(note.title);
      this.topBar.setBackVisible(true);
      window.history.pushState({ screen: "editor" }, "");

      if (originRect && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.body.classList.add("is-animating-transform");
        this.setEditorContainerVisible(true);
        ContainerTransform.expand({
          originRect, theme, borderRadius: 16, cardEl,
          onComplete: () => { this.showEditorView(); },
        });
      } else {
        if (cardEl) cardEl.style.backgroundColor = "";
        this.showEditorView();
        this.triggerEditorEnterAnimation();
      }
    } finally {
      this.isOpeningNote = false;
    }
  }

  openNewNote(folder = "", originRect?: DOMRect): void {
    this.currentNoteId = null;
    this.currentFolder = folder === "All" ? "" : folder;
    const fabEl = document.querySelector<HTMLElement>("#home-fab-main") || document.querySelector<HTMLElement>(".home-fab-btn");
    this.lastOriginRect = originRect || fabEl?.getBoundingClientRect() || null;
    this.topBar.setTitle("Untitled Note");
    this.topBar.setBackVisible(true);
    this.editor.loadDocument("", null, false);
    window.history.pushState({ screen: "editor" }, "");

    if (this.lastOriginRect && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const theme = ThemeService.getInstance().getTheme();
      document.body.classList.add("is-animating-transform");
      this.setEditorContainerVisible(true);
      ContainerTransform.expand({
        originRect: this.lastOriginRect, theme, borderRadius: 29,
        onComplete: () => { this.showEditorView(); this.editor.focus(); },
      });
    } else {
      this.showEditorView();
      this.triggerEditorEnterAnimation();
      this.editor.focus();
    }
  }

  openExternalFile(title: string): void {
    this.currentNoteId = null;
    this.currentFolder = "";
    const fabEl = document.querySelector<HTMLElement>("#home-fab-main") || document.querySelector<HTMLElement>(".home-fab-btn");
    this.lastOriginRect = fabEl?.getBoundingClientRect() || null;
    this.topBar.setTitle(title);
    this.topBar.setBackVisible(true);
    this.showEditorView();
    window.history.pushState({ screen: "editor" }, "");
  }

  private showEditorView(): void {
    this.isHomeVisible = false;
    if (this.homeView) this.homeView.setVisible(false);
    this.setEditorContainerVisible(true);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(true);
  }

  private triggerEditorEnterAnimation(): void {
    const ed = document.getElementById("editor-container");
    const top = document.getElementById("topbar-container");
    if (!ed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ed.classList.remove("anim-editor-enter", "anim-editor-exit");
    top?.classList.remove("anim-editor-enter", "anim-editor-exit");
    void ed.offsetWidth;
    ed.classList.add("anim-editor-enter");
    top?.classList.add("anim-editor-enter");
    const clear = () => { ed.classList.remove("anim-editor-enter"); top?.classList.remove("anim-editor-enter"); };
    ed.addEventListener("animationend", clear, { once: true });
    setTimeout(clear, 250);
  }

  getCurrentNoteId(): string | null { return this.currentNoteId; }
  setCurrentNoteId(id: string | null): void { this.currentNoteId = id; }
  getCurrentFolder(): string { return this.currentFolder; }

  private setEditorContainerVisible(visible: boolean): void {
    const shell = document.getElementById("workspace-shell");
    const ed = document.getElementById("editor-container");
    const top = document.getElementById("topbar-container");
    if (shell) shell.style.display = visible ? "flex" : "none";
    if (ed) ed.style.display = visible ? "block" : "none";
    if (top) { top.style.display = visible ? "block" : "none"; if (!visible) top.style.zIndex = ""; }
  }

  createEmbeddedHome(container: HTMLElement, onSelect: (note: NoteItem) => void): HomeViewComponent {
    return new HomeViewComponent({ containerElement: container, notesService: this.notesService, isEmbedded: true, onOpenNote: onSelect, onNewNote: () => {}, onOpenFile: () => {} });
  }
}
