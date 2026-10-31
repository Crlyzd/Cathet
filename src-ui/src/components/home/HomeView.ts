import { NotesService, NoteItem } from "../../services/notesService";
import { ThemeService } from "../../services/themeService";
import { executeCircularThemeTransition } from "../../utils/themeTransition";
import { invoke } from "@tauri-apps/api/core";
import { HomeHeaderComponent } from "./HomeHeader";
import { HomeCategoryTabsComponent } from "./HomeCategoryTabs";
import { HomeNoteGridComponent } from "./HomeNoteGrid";
import { HomeSelectionBarComponent } from "./HomeSelectionBar";
import { HomeFabComponent } from "./HomeFab";
import { FolderModalComponent } from "./FolderModal";

export interface HomeViewOptions {
  containerId?: string;
  containerElement?: HTMLElement;
  notesService: NotesService;
  isEmbedded?: boolean;
  onOpenNote: (note: NoteItem) => void;
  onNewNote: (folder: string) => void;
  onOpenFile: (folder: string) => void;
}

export class HomeViewComponent {
  private element: HTMLElement;
  private notesService: NotesService;
  private isEmbedded: boolean;
  private options: HomeViewOptions;

  private header!: HomeHeaderComponent;
  private categoryTabs!: HomeCategoryTabsComponent;
  private noteGrid!: HomeNoteGridComponent;
  private selectionBar!: HomeSelectionBarComponent;
  private fab?: HomeFabComponent;

  private activeFolder = "All";
  private searchQuery = "";
  private selectedNoteIds = new Set<string>();
  private isSelectionMode = false;

  constructor(options: HomeViewOptions) {
    this.options = options;
    this.notesService = options.notesService;
    this.isEmbedded = !!options.isEmbedded;

    const parent = options.containerElement || document.getElementById(options.containerId || "app") || document.body;
    this.element = document.createElement("div");
    this.element.className = `home-view-container${this.isEmbedded ? " home-view-embedded" : ""}`;
    parent.appendChild(this.element);

    this.initSubcomponents();
    this.refresh();
  }

  private initSubcomponents(): void {
    const themeService = ThemeService.getInstance();
    this.header = new HomeHeaderComponent(
      this.element,
      {
        onSearch: (q) => { this.searchQuery = q; this.renderGrid(); },
        onCancelSelection: () => this.exitSelectionMode(),
        onToggleSelectAll: () => this.toggleSelectAll(),
        onToggleTheme: (origin) => {
          executeCircularThemeTransition(origin, () => {
            const newTheme = themeService.toggleTheme();
            this.header.setTheme(newTheme);
            invoke("sync_window_theme", { theme: newTheme }).catch(console.error);
          });
        },
      },
      themeService.getTheme()
    );

    this.categoryTabs = new HomeCategoryTabsComponent(this.element, {
      onSelectFolder: (f) => { this.activeFolder = f; this.renderGrid(); },
      onRequestNewFolder: () => this.promptNewFolder(),
    });

    this.noteGrid = new HomeNoteGridComponent(this.element, {
      onOpenNote: (n) => this.options.onOpenNote(n),
      onSelectNote: (id, sel) => this.handleSelectNote(id, sel),
      onEnterSelectionMode: (id) => this.enterSelectionMode(id),
    });

    this.selectionBar = new HomeSelectionBarComponent(this.element, {
      onHide: () => this.handleHideSelected(),
      onPin: () => this.handlePinSelected(),
      onMove: () => this.handleMoveSelected(),
      onDelete: () => this.handleDeleteSelected(),
    });

    if (!this.isEmbedded) {
      this.fab = new HomeFabComponent(this.element, {
        onNewNote: () => this.options.onNewNote(this.activeFolder),
        onOpenFile: () => this.options.onOpenFile(this.activeFolder),
      });
    }
  }

  async refresh(): Promise<void> {
    const reg = await this.notesService.fetchNotes();
    this.categoryTabs.setFolders(reg.folders, this.activeFolder);
    this.renderGrid();
  }

  private renderGrid(): void {
    const filtered = this.notesService.filterNotes(this.searchQuery, this.activeFolder);
    this.noteGrid.setNotes(filtered, this.isSelectionMode, this.selectedNoteIds);
    this.header.setSelectionMode(this.isSelectionMode, this.selectedNoteIds.size, filtered.length);
    this.selectionBar.setVisible(this.isSelectionMode && this.selectedNoteIds.size > 0);
  }

  private enterSelectionMode(initialId: string): void {
    this.isSelectionMode = true;
    this.selectedNoteIds = new Set([initialId]);
    if (this.fab) this.fab.setVisible(false);
    this.renderGrid();
  }

  exitSelectionMode(): void {
    this.isSelectionMode = false;
    this.selectedNoteIds.clear();
    if (this.fab) this.fab.setVisible(true);
    this.renderGrid();
  }

  private handleSelectNote(id: string, selected: boolean): void {
    if (selected) this.selectedNoteIds.add(id); else this.selectedNoteIds.delete(id);
    if (this.selectedNoteIds.size === 0) this.exitSelectionMode(); else this.renderGrid();
  }

  private toggleSelectAll(): void {
    const currentNotes = this.notesService.filterNotes(this.searchQuery, this.activeFolder);
    if (this.selectedNoteIds.size === currentNotes.length) this.selectedNoteIds.clear();
    else currentNotes.forEach((n) => this.selectedNoteIds.add(n.id));
    if (this.selectedNoteIds.size === 0) this.exitSelectionMode(); else this.renderGrid();
  }

  private promptNewFolder(): void {
    new FolderModalComponent({
      mode: "create",
      onConfirm: async (name) => {
        if (await this.notesService.createFolder(name)) {
          this.activeFolder = name;
          await this.refresh();
        }
      },
    });
  }

  private async handleHideSelected(): Promise<void> {
    const ids = Array.from(this.selectedNoteIds);
    await this.notesService.setHidden(ids, true);
    this.exitSelectionMode();
  }

  private async handlePinSelected(): Promise<void> {
    const ids = Array.from(this.selectedNoteIds);
    const reg = this.notesService.getRegistry();
    const allPinned = ids.every((id) => reg.notes[id]?.isPinned);
    await this.notesService.setPinned(ids, !allPinned);
    this.exitSelectionMode();
  }

  private handleMoveSelected(): void {
    const ids = Array.from(this.selectedNoteIds);
    const reg = this.notesService.getRegistry();
    new FolderModalComponent({
      mode: "move",
      existingFolders: reg.folders,
      onConfirm: async (dest) => {
        await this.notesService.moveNotes(ids, dest);
        this.exitSelectionMode();
      },
    });
  }

  private async handleDeleteSelected(): Promise<void> {
    const ids = Array.from(this.selectedNoteIds);
    if (confirm(`Delete ${ids.length} selected note(s)?`)) {
      await this.notesService.deleteNotes(ids);
      this.exitSelectionMode();
    }
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? "flex" : "none";
    if (visible) this.refresh();
  }

  destroy(): void {
    this.header.destroy();
    this.categoryTabs.destroy();
    this.noteGrid.destroy();
    this.selectionBar.destroy();
    this.fab?.destroy();
    this.element.remove();
  }
}

