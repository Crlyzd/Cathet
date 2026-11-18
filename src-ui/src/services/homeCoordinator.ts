import { NotesService, NoteItem } from "./notesService";
import { HomeViewComponent } from "../components/home/HomeView";
import { TopBarComponent } from "../components/TopBar";
import { EditorComponent } from "../components/Editor";
import { PreviewService } from "./previewService";
import { FontService } from "./fontService";
import { PlatformService } from "./platformService";
import { ThemeService } from "./themeService";
import { ContainerTransform } from "../utils/containerTransform";
import { setEditorShellVisible, triggerEditorEnterAnimation } from "../utils/containerTransformLayers";
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
  onDualNotesSelectedForEditor?: (
    left: { content: string; noteId: string; title: string },
    right: { content: string; noteId: string; title: string }
  ) => void;
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
  private isNavigatingHome = false;
  private activeSavePromise: Promise<void> | null = null;
  private lastOriginRect: DOMRect | null = null;

  constructor(options: HomeCoordinatorOptions) {
    this.options = options; this.notesService = options.notesService;
    this.topBar = options.topBar; this.editor = options.editor;
    if (PlatformService.getInstance().isAndroid()) this.initAndroidHome();
  }

  private initAndroidHome(): void {
    const appEl = document.getElementById("app") || document.body;
    this.homeView = new HomeViewComponent({
      containerElement: appEl,
      notesService: this.notesService,
      onOpenNote: (note, rect) => this.openNote(note, rect),
      onOpenDualNotes: (left, right, rect) => this.openDualNotes(left, right, rect),
      onNewNote: (folder, rect) => this.openNewNote(folder, rect),
      onOpenFile: (folder) => { this.currentFolder = folder === "All" ? "" : folder; this.options.onOpenExternalPicker(); },
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
    setEditorShellVisible(false);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);
    this.homeView.setVisible(true, shouldRefresh);
    if (animate) this.homeView.animateEnter?.();
  }

  async navigateBackToHome(syncHistory = true): Promise<void> {
    if (syncHistory && window.history.state?.screen === "editor") { window.history.back(); return; }
    if (this.isNavigatingHome) return;
    this.isNavigatingHome = true;

    const ed = document.getElementById("editor-container");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onExit = () => {
      document.body.classList.remove("is-animating-transform");
      this.isNavigatingHome = false;
      this.editor.clearDocument();
      this.currentNoteId = null; this.lastOriginRect = null;
      this.options.onNavigateHome?.();
      this.showHome(false, false);
    };

    if (!reduced && ed) { document.body.classList.add("is-animating-transform"); setEditorShellVisible(true); }
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);

    try {
      (document.activeElement as HTMLElement)?.blur();
      this.editor.blur();
      await this.autoSaveCurrentNote();
      await this.options.onBeforeNavigateHome?.();
    } catch (err) { console.warn("Auto-save skipped:", err); }

    if (reduced || !ed) { onExit(); return; }
    this.homeView?.showAndRefresh();

    const targetCard = this.currentNoteId ? document.querySelector<HTMLElement>(`.home-note-card[data-id="${CSS.escape(this.currentNoteId)}"]`) : null;
    const fabEl = document.querySelector<HTMLElement>("#home-fab-main, .home-fab-btn");
    const theme = ThemeService.getInstance().getTheme();

    if (targetCard) {
      let rect = targetCard.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) { targetCard.scrollIntoView({ block: "nearest" }); rect = targetCard.getBoundingClientRect(); }
      if ((rect.width === 0 || rect.height === 0) && this.lastOriginRect) rect = this.lastOriginRect;
      ContainerTransform.collapse({ targetRect: rect, theme, targetBorderRadius: 16, cardEl: targetCard, onComplete: onExit });
    } else if (fabEl || this.lastOriginRect) {
      let rect = fabEl ? fabEl.getBoundingClientRect() : null;
      if (!rect || rect.width === 0 || rect.height === 0) rect = this.lastOriginRect || new DOMRect(window.innerWidth - 76, window.innerHeight - 90, 58, 58);
      ContainerTransform.collapse({ targetRect: rect, theme, targetBorderRadius: 29, cardEl: fabEl, collapseVariant: "fab", onComplete: onExit });
    } else onExit();
  }

  async autoSaveCurrentNote(): Promise<void> {
    if (this.activeSavePromise) return this.activeSavePromise;
    if (this.isHomeVisible || (this.currentNoteId && !this.editor.isModified())) return;
    const text = this.editor.getText().trim();
    if (!text) return;
    this.activeSavePromise = (async () => {
      try {
        const saved = await this.notesService.saveNote(this.currentNoteId, text, this.currentFolder);
        if (saved) { this.currentNoteId = saved.id; this.editor.markSaved(); }
      } finally { this.activeSavePromise = null; }
    })();
    return this.activeSavePromise;
  }

  private pushEditorHistory(): void {
    if (window.history.state?.screen === "selection") window.history.replaceState({ screen: "editor" }, "");
    else window.history.pushState({ screen: "editor" }, "");
  }

  private launchWithTransform(originRect: DOMRect | null | undefined, borderRadius: number, cardEl: HTMLElement | null, afterExpand?: () => void): void {
    const theme = ThemeService.getInstance().getTheme();
    if (originRect && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.classList.add("is-animating-transform");
      setEditorShellVisible(true);
      ContainerTransform.expand({
        originRect, theme, borderRadius, cardEl,
        onComplete: () => { this.showEditorView(); afterExpand?.(); },
      });
    } else {
      if (cardEl) cardEl.style.backgroundColor = "";
      this.showEditorView();
      triggerEditorEnterAnimation();
      afterExpand?.();
    }
  }

  private async openNoteFlow(primary: NoteItem, originRect: DOMRect | undefined, applyContent: () => Promise<void>): Promise<void> {
    if (this.isOpeningNote || this.isNavigatingHome) return;
    this.isOpeningNote = true;
    this.lastOriginRect = originRect || null;
    const theme = ThemeService.getInstance().getTheme();
    const cardEl = document.querySelector<HTMLElement>(`.home-note-card[data-id="${CSS.escape(primary.id)}"]`);
    if (cardEl) cardEl.style.backgroundColor = theme === "light" ? "#f8fafc" : "#0f1117";
    try {
      (document.activeElement as HTMLElement)?.blur();
      window.getSelection()?.removeAllRanges();
      await applyContent();
      this.currentNoteId = primary.id;
      this.currentFolder = primary.isHidden ? "Hidden" : primary.folder;
      this.isHomeVisible = false;
      this.topBar.setBackVisible(true);
      this.pushEditorHistory();
      this.launchWithTransform(originRect, 16, cardEl);
    } finally {
      this.isOpeningNote = false;
    }
  }

  private async readNoteContent(note: NoteItem): Promise<string> {
    try { const res = await this.notesService.readNote(note.id); return res?.content || note.snippet; }
    catch { return note.snippet; }
  }

  async openNote(note: NoteItem, originRect?: DOMRect): Promise<void> {
    await this.openNoteFlow(note, originRect, async () => {
      const content = await this.readNoteContent(note);
      this.options.onNoteSelectedForEditor(content, note.id, note.title);
      this.topBar.setTitle(note.title);
    });
  }

  async openDualNotes(left: NoteItem, right: NoteItem, originRect?: DOMRect): Promise<void> {
    await this.openNoteFlow(left, originRect, async () => {
      const [leftContent, rightContent] = await Promise.all([this.readNoteContent(left), this.readNoteContent(right)]);
      this.options.onDualNotesSelectedForEditor?.(
        { content: leftContent, noteId: left.id, title: left.title },
        { content: rightContent, noteId: right.id, title: right.title }
      );
    });
  }

  openNewNote(folder = "", originRect?: DOMRect): void {
    if (this.isNavigatingHome) return;
    this.currentNoteId = null;
    this.currentFolder = folder === "All" ? "" : folder;
    this.isHomeVisible = false;
    const fabEl = document.querySelector<HTMLElement>("#home-fab-main, .home-fab-btn");
    this.lastOriginRect = originRect || fabEl?.getBoundingClientRect() || null;
    this.topBar.setTitle("Untitled Note");
    this.topBar.setBackVisible(true);
    this.editor.loadDocument("", null, false);
    this.pushEditorHistory();
    this.launchWithTransform(this.lastOriginRect, 29, null, () => this.editor.focus());
  }

  openExternalFile(title: string): void {
    this.currentNoteId = null;
    this.lastOriginRect = document.querySelector<HTMLElement>("#home-fab-main, .home-fab-btn")?.getBoundingClientRect() || null;
    this.topBar.setTitle(title); this.topBar.setBackVisible(true);
    this.showEditorView();
    window.history.pushState({ screen: "editor" }, "");
  }

  private showEditorView(): void {
    this.isHomeVisible = false;
    if (this.homeView) this.homeView.setVisible(false);
    setEditorShellVisible(true);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(true);
  }

  getCurrentNoteId(): string | null { return this.currentNoteId; }
  setCurrentNoteId(id: string | null): void { this.currentNoteId = id; }
  getCurrentFolder(): string { return this.currentFolder; }

  createEmbeddedHome(container: HTMLElement, onSelect: (note: NoteItem) => void): HomeViewComponent {
    return new HomeViewComponent({ containerElement: container, notesService: this.notesService, isEmbedded: true, onOpenNote: onSelect, onNewNote: () => { }, onOpenFile: () => { } });
  }
}
