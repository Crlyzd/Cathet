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

  showHome(): void {
    if (!this.homeView) return;
    this.isHomeVisible = true;
    this.topBar.setBackVisible(false);
    this.setEditorContainerVisible(false);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(false);
    this.homeView.setVisible(true);
  }

  async navigateBackToHome(): Promise<void> {
    try {
      await this.autoSaveCurrentNote();
    } catch (err) {
      console.warn("Auto-save skipped during navigation:", err);
    }
    this.options.onNavigateHome?.();
    this.showHome();
  }

  async autoSaveCurrentNote(): Promise<void> {
    const text = this.editor.getText().trim();
    if (!text) return; // Don't save empty notes

    const saved = await this.notesService.saveNote(this.currentNoteId, text, this.currentFolder);
    if (saved) {
      this.currentNoteId = saved.id;
      this.editor.markSaved();
    }
  }

  async openNote(note: NoteItem): Promise<void> {
    this.isHomeVisible = false;
    this.currentNoteId = note.id;
    this.currentFolder = note.folder;
    if (this.homeView) this.homeView.setVisible(false);

    this.setEditorContainerVisible(true);
    this.options.getMobileCoordinator?.()?.setActionBarVisible(true);
    this.topBar.setBackVisible(true);
    this.topBar.setTitle(note.title);

    let content = "";
    try {
      const res = await this.notesService.readNote(note.id);
      content = res?.content || note.snippet;
    } catch {
      content = note.snippet;
    }

    this.options.onNoteSelectedForEditor(content, note.id, note.title);
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
    this.editor.focus();
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
