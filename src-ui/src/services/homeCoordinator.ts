import { NotesService, NoteItem } from "./notesService";
import { HomeViewComponent } from "../components/home/HomeView";
import { TopBarComponent } from "../components/TopBar";
import { EditorComponent } from "../components/Editor";
import { PreviewService } from "./previewService";
import { FontService } from "./fontService";
import { PlatformService } from "./platformService";
import { globalEventBus } from "../utils/eventBus";
import { invoke } from "@tauri-apps/api/core";

export interface HomeCoordinatorOptions {
  notesService: NotesService;
  topBar: TopBarComponent;
  editor: EditorComponent;
  previewService: PreviewService;
  fontService: FontService;
  getMobileCoordinator?: () => any;
  onOpenExternalPicker: () => void;
  onNoteSelectedForEditor: (content: string, noteId: string, title: string) => void;
  onNavigateHome?: () => void;
}

export class HomeCoordinator {
  private notesService: NotesService;
  private topBar: TopBarComponent;
  private editor: EditorComponent;
  private previewService: PreviewService;
  private options: HomeCoordinatorOptions;
  private homeView: HomeViewComponent | null = null;

  private currentNoteId: string | null = null;
  private currentFolder = "";
  private isHomeVisible = false;
  private isOpeningNote = false;

  constructor(options: HomeCoordinatorOptions) {
    this.options = options;
    this.notesService = options.notesService;
    this.topBar = options.topBar;
    this.editor = options.editor;
    this.previewService = options.previewService;

    if (PlatformService.getInstance().isAndroid()) {
      this.initAndroidHome();
    }
  }

  private initAndroidHome(): void {
    const appEl = document.getElementById("app") || document.body;
    this.homeView = new HomeViewComponent({
      containerElement: appEl,
      notesService: this.notesService,
      onOpenNote: (note) => this.openNote(note),
      onNewNote: (folder) => this.openNewNote(folder),
      onOpenFile: (folder) => this.options.onOpenExternalPicker(),
    });

    globalEventBus.on("topbar:navigateHome", () => this.navigateBackToHome());
    this.showHome();
  }

  isHomeActive(): boolean {
    return this.isHomeVisible;
  }

  showHome(animate = false): void {
    if (!this.homeView) return;
    this.isHomeVisible = true;
    this.topBar.setBackVisible(false);
    this.setEditorContainerVisible(false);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);
    this.homeView.setVisible(true);
    if (animate) this.homeView.animateEnter?.();
  }

  async navigateBackToHome(): Promise<void> {
    try {
      await this.autoSaveCurrentNote();
    } catch (err) {
      console.warn("Auto-save skipped during navigation:", err);
    }

    const ed = document.getElementById("editor-container");
    const top = document.getElementById("topbar-container");
    const onExit = () => {
      ed?.classList.remove("anim-editor-exit");
      top?.classList.remove("anim-editor-exit");
      this.editor.loadDocument("", null, false);
      this.currentNoteId = null;
      this.options.onNavigateHome?.();
      this.showHome(true);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ed) {
      onExit();
    } else {
      ed.classList.add("anim-editor-exit");
      top?.classList.add("anim-editor-exit");
      let called = false;
      const finish = () => { if (!called) { called = true; onExit(); } };
      ed.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, 160);
    }
  }

  async autoSaveCurrentNote(): Promise<void> {
    if (this.isHomeVisible) return;
    const text = this.editor.getText().trim();
    if (!text) return; // Don't save empty notes

    const saved = await this.notesService.saveNote(this.currentNoteId, text, this.currentFolder);
    if (saved) {
      this.currentNoteId = saved.id;
      this.editor.markSaved();
    }
  }

  async openNote(note: NoteItem): Promise<void> {
    if (this.isOpeningNote) return;
    this.isOpeningNote = true;
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

      this.isHomeVisible = false;
      if (this.homeView) this.homeView.setVisible(false);

      this.setEditorContainerVisible(true);
      this.options.getMobileCoordinator?.()?.setActionBarVisible(true);

      this.triggerEditorEnterAnimation();
    } finally {
      this.isOpeningNote = false;
    }
  }

  openNewNote(folder = ""): void {
    this.isHomeVisible = false;
    this.currentNoteId = null;
    this.currentFolder = folder === "All" ? "" : folder;
    if (this.homeView) this.homeView.setVisible(false);

    this.setEditorContainerVisible(true);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(true);
    this.topBar.setBackVisible(true);
    this.topBar.setTitle("Untitled Note");

    this.editor.loadDocument("", null, false);
    this.triggerEditorEnterAnimation();
    this.editor.focus();
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

    const clearAnim = () => {
      ed.classList.remove("anim-editor-enter");
      top?.classList.remove("anim-editor-enter");
    };
    ed.addEventListener("animationend", clearAnim, { once: true });
    setTimeout(clearAnim, 250);
  }

  getCurrentNoteId(): string | null {
    return this.currentNoteId;
  }

  setCurrentNoteId(id: string | null): void {
    this.currentNoteId = id;
  }

  private setEditorContainerVisible(visible: boolean): void {
    const edContainer = document.getElementById("editor-container");
    const topContainer = document.getElementById("topbar-container");
    if (edContainer) edContainer.style.display = visible ? "block" : "none";
    if (topContainer) topContainer.style.display = visible ? "block" : "none";
  }

  createEmbeddedHome(container: HTMLElement, onSelect: (note: NoteItem) => void): HomeViewComponent {
    return new HomeViewComponent({
      containerElement: container,
      notesService: this.notesService,
      isEmbedded: true,
      onOpenNote: onSelect,
      onNewNote: () => {},
      onOpenFile: () => {},
    });
  }
}
