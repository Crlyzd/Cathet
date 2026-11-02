import { NotesService, NoteItem } from "../../services/notesService";
import { ThemeService } from "../../services/themeService";
import { PlatformService } from "../../services/platformService";
import { BiometricService } from "../../services/biometricService";
import { executeCircularThemeTransition } from "../../utils/themeTransition";
import { OverscrollPullDownDetector } from "../../utils/overscrollPullDown";
import { invoke } from "@tauri-apps/api/core";
import { HomeHeaderComponent } from "./HomeHeader";
import { HomeCategoryTabsComponent } from "./HomeCategoryTabs";
import { HomeNoteGridComponent } from "./HomeNoteGrid";
import { HomeSelectionBarComponent } from "./HomeSelectionBar";
import { HomeFabComponent } from "./HomeFab";
import { HomeBatchActions } from "./HomeBatchActions";

export interface HomeViewOptions {
  containerId?: string;
  containerElement?: HTMLElement;
  notesService: NotesService;
  isEmbedded?: boolean;
  onOpenNote: (note: NoteItem, originRect?: DOMRect) => void;
  onNewNote: (folder: string, originRect?: DOMRect) => void;
  onOpenFile: (folder: string, originRect?: DOMRect) => void;
}

export class HomeViewComponent {
  private element: HTMLElement;
  private notesService: NotesService;
  private isEmbedded: boolean;
  private options: HomeViewOptions;

  private header!: HomeHeaderComponent;
  private categoryTabs!: HomeCategoryTabsComponent;
  private noteGrid!: HomeNoteGridComponent;
  private selectionBar?: HomeSelectionBarComponent;
  private fab?: HomeFabComponent;
  private pullDownDetector?: OverscrollPullDownDetector;
  private batchActions: HomeBatchActions;

  private activeFolder = "All";
  private searchQuery = "";
  private selectedNoteIds = new Set<string>();
  private isSelectionMode = false;
  private isPrivateMode = false;

  constructor(options: HomeViewOptions) {
    this.options = options;
    this.notesService = options.notesService;
    this.isEmbedded = !!options.isEmbedded;

    const parent = options.containerElement || document.getElementById(options.containerId || "app") || document.body;
    this.element = document.createElement("div");
    this.element.className = `home-view-container${this.isEmbedded ? " home-view-embedded" : ""}`;
    this.element.addEventListener("contextmenu", (e) => e.preventDefault());
    parent.appendChild(this.element);

    this.batchActions = new HomeBatchActions({
      notesService: this.notesService,
      getSelectedIds: () => Array.from(this.selectedNoteIds),
      isPrivateMode: () => this.isPrivateMode,
      onRefresh: () => this.renderGrid(),
      onExitSelection: () => this.exitSelectionMode(),
      onFolderCreated: (name) => { this.activeFolder = name; this.refresh(); },
    });

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
        onExitPrivateNotes: () => this.exitPrivateNotesMode(),
        onToggleTheme: (origin) => executeCircularThemeTransition(origin, () => {
          const newTheme = themeService.toggleTheme();
          this.header.setTheme(newTheme);
          invoke("sync_window_theme", { theme: newTheme }).catch(console.error);
        }),
      },
      themeService.getTheme()
    );

    this.categoryTabs = new HomeCategoryTabsComponent(this.element, {
      onSelectFolder: (f) => { this.activeFolder = f; this.renderGrid(); },
      onRequestNewFolder: () => this.batchActions.promptNewFolder(),
    });

    this.noteGrid = new HomeNoteGridComponent(
      this.element,
      {
        onOpenNote: (n, rect) => this.options.onOpenNote(n, rect),
        onSelectNote: (id, sel) => { if (sel) this.selectedNoteIds.add(id); else this.selectedNoteIds.delete(id); this.syncSelectionUI(); },
        onEnterSelectionMode: (id) => this.enterSelectionMode(id),
      },
      this.isEmbedded
    );

    if (!this.isEmbedded) {
      this.selectionBar = new HomeSelectionBarComponent(this.element, {
        onRename: () => this.batchActions.handleRename(),
        onHide: () => this.batchActions.handleHide(),
        onPin: () => this.batchActions.handlePin(),
        onMove: () => this.batchActions.handleMove(),
        onDelete: () => this.batchActions.handleDelete(),
      });

      this.fab = new HomeFabComponent(this.element, {
        onNewNote: (rect) => this.options.onNewNote(this.isPrivateMode ? "Hidden" : this.activeFolder, rect),
        onOpenFile: (rect) => this.options.onOpenFile(this.isPrivateMode ? "Hidden" : this.activeFolder, rect),
      });

      if (PlatformService.getInstance().isAndroid()) {
        this.pullDownDetector = new OverscrollPullDownDetector({
          container: this.element,
          scrollTarget: () => this.noteGrid.getScrollElement(),
          contentTarget: () => this.noteGrid.getScrollElement(),
          thresholdPx: 135,
          onTrigger: async () => {
            if (!this.isPrivateMode && !this.isSelectionMode && await BiometricService.getInstance().authenticate("Unlock Private Notes", "Confirm fingerprint or device PIN")) {
              this.enterPrivateNotesMode();
            }
          },
        });

        document.addEventListener("visibilitychange", () => { if (document.hidden && this.isPrivateMode) this.exitPrivateNotesMode(false); });
        window.addEventListener("blur", () => { if (this.isPrivateMode) this.exitPrivateNotesMode(false); });
      }
    }
  }

  async refresh(): Promise<void> {
    const reg = await this.notesService.fetchNotes();
    this.categoryTabs.setFolders(reg.folders, this.activeFolder);
    this.renderGrid();
  }

  private renderGrid(): void {
    const filtered = this.isPrivateMode
      ? this.notesService.filterNotes(this.searchQuery, "", true)
      : this.notesService.filterNotes(this.searchQuery, this.activeFolder, false);
    this.noteGrid.setNotes(filtered, this.isSelectionMode, this.selectedNoteIds);
    this.syncSelectionBars(filtered.length);
  }

  private syncSelectionUI(): void {
    const filtered = this.isPrivateMode
      ? this.notesService.filterNotes(this.searchQuery, "", true)
      : this.notesService.filterNotes(this.searchQuery, this.activeFolder, false);
    this.noteGrid.updateSelectionState(this.isSelectionMode, this.selectedNoteIds);
    this.syncSelectionBars(filtered.length);
  }

  private syncSelectionBars(totalCount: number): void {
    this.header.setSelectionMode(this.isSelectionMode, this.selectedNoteIds.size, totalCount);
    this.selectionBar?.setVisible(this.isSelectionMode);
    this.selectionBar?.setEnabled(this.selectedNoteIds.size > 0);
    this.selectionBar?.setSingleSelected(this.selectedNoteIds.size === 1);
  }

  isSelectionActive(): boolean { return this.isSelectionMode; }

  private enterSelectionMode(initialId: string): void {
    if (this.isEmbedded) return;
    this.isSelectionMode = true;
    this.selectedNoteIds = new Set([initialId]);
    if (this.fab) this.fab.setVisible(false);
    this.syncSelectionUI();
    window.history.pushState({ screen: "selection" }, "");
  }

  exitSelectionMode(syncHistory = true): void {
    if (syncHistory && window.history.state?.screen === "selection") { window.history.back(); return; }
    this.isSelectionMode = false;
    this.selectedNoteIds.clear();
    if (this.fab) this.fab.setVisible(true);
    this.syncSelectionUI();
  }

  enterPrivateNotesMode(): void {
    if (this.isPrivateMode) return;
    this.isPrivateMode = true;
    this.exitSelectionMode(false);
    this.categoryTabs.setVisible(false);
    this.header.setPrivateNotesMode(true);
    this.selectionBar?.setHiddenMode(true);
    this.renderGrid();
    window.history.pushState({ screen: "private_notes" }, "");
  }

  exitPrivateNotesMode(syncHistory = true): void {
    if (!this.isPrivateMode) return;
    if (syncHistory && window.history.state?.screen === "private_notes") { window.history.back(); return; }
    this.isPrivateMode = false;
    this.exitSelectionMode(false);
    this.header.setPrivateNotesMode(false);
    this.categoryTabs.setVisible(true);
    this.selectionBar?.setHiddenMode(false);
    this.renderGrid();
  }

  private toggleSelectAll(): void {
    const currentNotes = this.isPrivateMode
      ? this.notesService.filterNotes(this.searchQuery, "", true)
      : this.notesService.filterNotes(this.searchQuery, this.activeFolder, false);
    if (this.selectedNoteIds.size === currentNotes.length) this.selectedNoteIds.clear();
    else currentNotes.forEach((n) => this.selectedNoteIds.add(n.id));
    this.syncSelectionUI();
  }

  setVisible(visible: boolean, shouldRefresh = true): void {
    this.element.style.display = visible ? "flex" : "none";
    if (visible && shouldRefresh) this.refresh();
  }

  async showAndRefresh(): Promise<void> {
    this.element.style.display = "flex";
    await this.refresh();
  }

  animateEnter(): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.element.classList.remove("anim-home-enter");
    void this.element.offsetWidth;
    this.element.classList.add("anim-home-enter");
    const onEnd = () => this.element.classList.remove("anim-home-enter");
    this.element.addEventListener("animationend", onEnd, { once: true });
    setTimeout(onEnd, 200);
  }

  destroy(): void {
    this.pullDownDetector?.destroy();
    this.header.destroy();
    this.categoryTabs.destroy();
    this.noteGrid.destroy();
    this.selectionBar?.destroy();
    this.fab?.destroy();
    this.element.remove();
  }
}
