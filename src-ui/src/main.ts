import { TopBarComponent } from "./components/TopBar";
import { PopupMenuComponent, MenuItem } from "./components/PopupMenu";
import { SettingsMenuBuilder } from "./components/SettingsMenu";
import { EditorComponent } from "./components/Editor";
import { FileService } from "./services/fileService";
import { WindowService } from "./services/windowService";
import { ThemeService } from "./services/themeService";
import { FontService } from "./services/fontService";
import { UpdateService } from "./services/updateService";
import { globalEventBus } from "./utils/eventBus";
import { registerShortcuts } from "./utils/shortcuts";

class CathetApp {
  private fileService: FileService;
  private windowService: WindowService;
  private themeService: ThemeService;
  private fontService: FontService;
  private updateService: UpdateService;

  private topBar: TopBarComponent;
  private popupMenu: PopupMenuComponent;
  private settingsBuilder: SettingsMenuBuilder;
  private editor: EditorComponent;

  private currentFilePath: string | null = null;
  private isAlwaysOnTop: boolean = false;

  constructor() {
    this.fileService = new FileService();
    this.windowService = new WindowService();
    this.themeService = new ThemeService();
    this.fontService = new FontService();
    this.updateService = new UpdateService();

    this.topBar = new TopBarComponent("topbar-container", this.windowService);
    this.popupMenu = new PopupMenuComponent("popup-container");
    this.editor = new EditorComponent("editor-container");
    this.settingsBuilder = new SettingsMenuBuilder(
      this.themeService,
      this.fontService,
      this.updateService
    );

    this.init();
  }

  private init(): void {
    this.topBar.setTitle("Untitled");

    // Event bus listeners
    globalEventBus.on("topbar:toggleMenu", (pos: { x: number; y: number }) => {
      this.openMainMenu(pos.x, pos.y);
    });

    globalEventBus.on("editor:toggleMarkdown", () => {
      const isMd = this.editor.toggleMarkdownPreview();
      this.settingsBuilder.setMarkdownMode(isMd);
    });

    globalEventBus.on("window:toggleAlwaysOnTop", async () => {
      const state = await this.windowService.toggleAlwaysOnTop();
      this.isAlwaysOnTop = state;
      this.settingsBuilder.setAlwaysOnTop(state);
    });

    globalEventBus.on("update:statusChanged", (info: any) => {
      this.topBar.setUpdateAvailable(!!info?.update_available);
    });

    // Register keyboard shortcuts
    registerShortcuts({
      onOpen: () => this.handleOpen(),
      onSave: () => this.handleSave(),
      onSaveAs: () => this.handleSaveAs(),
      onNewWindow: () => this.windowService.openNewInstance(),
      onToggleAlwaysOnTop: async () => {
        const state = await this.windowService.toggleAlwaysOnTop();
        this.isAlwaysOnTop = state;
        this.settingsBuilder.setAlwaysOnTop(state);
      },
      onToggleMarkdown: () => {
        const isMd = this.editor.toggleMarkdownPreview();
        this.settingsBuilder.setMarkdownMode(isMd);
      },
      onToggleBold: () => this.editor.toggleBold(),
      onToggleItalic: () => this.editor.toggleItalic(),
      onToggleUnderline: () => this.editor.toggleUnderline(),
      onSelectAll: () => this.editor.selectAllClean(),
      onQuit: () => this.windowService.close(),
    });

    // Drag and drop loading
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // @ts-ignore
        if (file.path) this.loadFileFromPath(file.path);
      }
    });
    window.addEventListener("dragover", (e) => e.preventDefault());

    // Background check for updates (non-blocking)
    setTimeout(() => {
      this.updateService.checkForUpdates();
    }, 1500);
  }

  private openMainMenu(x: number, y: number): void {
    const fileItems: MenuItem[] = [
      { id: "new", label: "New Window", shortcut: "Ctrl+N", action: () => this.windowService.openNewInstance() },
      { id: "open", label: "Open...", shortcut: "Ctrl+O", action: () => this.handleOpen() },
      { id: "save", label: "Save", shortcut: "Ctrl+S", action: () => this.handleSave() },
      { id: "saveas", label: "Save As...", shortcut: "Ctrl+Shift+S", action: () => this.handleSaveAs() },
      { id: "div_file", label: "", isDivider: true },
    ];

    const settingsItems = this.settingsBuilder.buildSettingsItems(() => {
      this.openFontMenu(x, y);
    });

    const quitItem: MenuItem[] = [
      { id: "div_quit", label: "", isDivider: true },
      { id: "quit", label: "Quit", shortcut: "Esc", action: () => this.windowService.close() },
    ];

    this.popupMenu.toggle(x, y, [...fileItems, ...settingsItems, ...quitItem]);
  }

  private openFontMenu(x: number, y: number): void {
    const fontItems = this.settingsBuilder.buildFontMenuItems((fontId) => {
      this.fontService.setFont(fontId);
    });
    this.popupMenu.show(x, y, fontItems);
  }

  private async handleOpen(): Promise<void> {
    this.topBar.setLoading(true);
    const result = await this.fileService.promptOpen();
    this.topBar.setLoading(false);

    if (result) {
      this.currentFilePath = result.path;
      this.editor.setContent(result.content);
      const fileName = result.path.split(/[/\\]/).pop() || "Untitled";
      this.topBar.setTitle(fileName);
      this.editor.setWordWrap(result.fileSize <= 3 * 1024 * 1024);
    }
  }

  private async loadFileFromPath(path: string): Promise<void> {
    this.topBar.setLoading(true);
    const result = await this.fileService.loadFile(path);
    this.topBar.setLoading(false);

    if (result) {
      this.currentFilePath = result.path;
      this.editor.setContent(result.content);
      const fileName = result.path.split(/[/\\]/).pop() || "Untitled";
      this.topBar.setTitle(fileName);
      this.editor.setWordWrap(result.fileSize <= 3 * 1024 * 1024);
    }
  }

  private async handleSave(): Promise<void> {
    const content = this.editor.getText();
    const savedPath = await this.fileService.saveFile(this.currentFilePath, content);
    if (savedPath) {
      this.currentFilePath = savedPath;
      const fileName = savedPath.split(/[/\\]/).pop() || "Untitled";
      this.topBar.setTitle(fileName);
    }
  }

  private async handleSaveAs(): Promise<void> {
    const content = this.editor.getText();
    const savedPath = await this.fileService.promptSaveAs(content);
    if (savedPath) {
      this.currentFilePath = savedPath;
      const fileName = savedPath.split(/[/\\]/).pop() || "Untitled";
      this.topBar.setTitle(fileName);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new CathetApp();
});
