import { TopBarComponent } from "./components/TopBar";
import { PopupMenuComponent, MenuItem } from "./components/PopupMenu";
import { ContextMenuComponent } from "./components/ContextMenu";
import { EditorComponent } from "./components/Editor";
import { FileService } from "./services/fileService";
import { WindowService } from "./services/windowService";
import { ThemeService } from "./services/themeService";
import { FontService } from "./services/fontService";
import { UpdateService } from "./services/updateService";
import { globalEventBus } from "./utils/eventBus";
import { registerShortcuts } from "./utils/shortcuts";
import { buildContextMenuItems } from "./utils/contextMenuItems";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

class CathetApp {
  private fileService: FileService;
  private windowService: WindowService;
  private themeService: ThemeService;
  private fontService: FontService;
  private updateService: UpdateService;

  private topBar: TopBarComponent;
  private popupMenu: PopupMenuComponent;
  private contextMenu: ContextMenuComponent;
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
    this.contextMenu = new ContextMenuComponent("contextmenu-container");
    this.editor = new EditorComponent("editor-container");

    this.init();
  }

  private init(): void {
    this.topBar.setTitle("Untitled");

    // Sync native DWM window theme on start
    invoke("sync_window_theme", { theme: this.themeService.getTheme() }).catch(console.error);

    // Event bus listeners
    globalEventBus.on("topbar:toggleMenu", (pos: { x: number; y: number }) => {
      this.openMainMenu(pos.x, pos.y);
    });

    globalEventBus.on("editor:toggleMarkdown", () => {
      this.editor.toggleMarkdownPreview();
    });

    globalEventBus.on("window:toggleAlwaysOnTop", async () => {
      const state = await this.windowService.toggleAlwaysOnTop();
      this.isAlwaysOnTop = state;
      await emit("cathet:ontop-change", state);
    });

    globalEventBus.on("update:statusChanged", async (info: any) => {
      this.topBar.setUpdateAvailable(!!info?.update_available);
      await emit("cathet:update-status", info).catch(console.error);
    });

    // Cross-window synchronization
    listen<"dark" | "light">("cathet:theme-change", (event) => {
      if (this.themeService.getTheme() !== event.payload) {
        this.themeService.toggleTheme();
      }
      invoke("sync_window_theme", { theme: event.payload }).catch(console.error);
    });

    listen<string>("cathet:font-change", (event) => {
      this.fontService.setFont(event.payload);
    });

    listen<boolean>("cathet:ontop-change", (event) => {
      this.isAlwaysOnTop = event.payload;
    });

    // Register keyboard shortcuts
    registerShortcuts({
      onOpen: () => this.handleOpen(),
      onSave: () => this.handleSave(),
      onSaveAs: () => this.handleSaveAs(),
      onNewWindow: () => this.windowService.openNewInstance(),
      onSettings: () => this.windowService.openSettingsWindow(),
      onToggleAlwaysOnTop: async () => {
        const state = await this.windowService.toggleAlwaysOnTop();
        this.isAlwaysOnTop = state;
        await emit("cathet:ontop-change", state);
      },
      onToggleMarkdown: () => {
        this.editor.toggleMarkdownPreview();
      },
      onToggleBold: () => this.editor.toggleBold(),
      onToggleItalic: () => this.editor.toggleItalic(),
      onToggleUnderline: () => this.editor.toggleUnderline(),
      onSelectAll: () => this.editor.selectAllClean(),
      onToggleWordWrap: () => this.editor.toggleWordWrap(),
      onSearchWeb: () => {
        const text = this.editor.getSelectedText().trim();
        if (text) {
          openUrl(`https://www.google.com/search?q=${encodeURIComponent(text)}`).catch(console.error);
        }
      },
      onQuit: () => this.windowService.close(),
    });

    // Right-click context menu: suppressed in compiled mode & replaced with Windows 11 context menu
    window.addEventListener("contextmenu", (e) => {
      if (!import.meta.env.DEV) {
        e.preventDefault();
        this.contextMenu.show(e.clientX, e.clientY, buildContextMenuItems(this.editor));
      } else if (e.altKey) {
        // In dev live mode, Alt + Right-Click allows testing the custom context menu
        e.preventDefault();
        this.contextMenu.show(e.clientX, e.clientY, buildContextMenuItems(this.editor));
      }
      // In dev live mode without Alt, native browser context menu remains active for inspection
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

    // Immediate background check for updates on app launch
    setTimeout(() => {
      this.updateService.checkForUpdates();
    }, 150);
  }

  private openMainMenu(x: number, y: number): void {
    const isMd = this.editor.getIsMarkdownPreview();
    const hasUpdate = this.updateService.hasUpdate();

    const items: MenuItem[] = [
      { id: "new", label: "New Window", shortcut: "Ctrl+N", action: () => this.windowService.openNewInstance() },
      { id: "open", label: "Open...", shortcut: "Ctrl+O", action: () => this.handleOpen() },
      { id: "save", label: "Save", shortcut: "Ctrl+S", action: () => this.handleSave() },
      { id: "saveas", label: "Save As...", shortcut: "Ctrl+Shift+S", action: () => this.handleSaveAs() },
      { id: "div_file", label: "", isDivider: true },
      {
        id: "toggle_markdown",
        label: isMd ? "Markdown: Preview" : "Markdown: Edit",
        shortcut: "Ctrl+M",
        action: () => {
          this.editor.toggleMarkdownPreview();
        },
      },
      { id: "div_settings", label: "", isDivider: true },
      {
        id: "settings",
        label: "Settings",
        shortcut: "Ctrl+,",
        isGlowing: hasUpdate,
        action: () => this.windowService.openSettingsWindow(),
      },
      { id: "div_quit", label: "", isDivider: true },
      { id: "quit", label: "Quit", shortcut: "Esc", action: () => this.windowService.close() },
    ];

    this.popupMenu.toggle(x, y, items);
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
