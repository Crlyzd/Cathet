import { TopBarComponent } from "./components/TopBar";
import { PopupMenuComponent, MenuItem } from "./components/PopupMenu";
import { EditorComponent } from "./components/Editor";
import { FileService } from "./services/fileService";
import { WindowService } from "./services/windowService";
import { globalEventBus } from "./utils/eventBus";
import { registerShortcuts } from "./utils/shortcuts";

class App {
  private fileService: FileService;
  private windowService: WindowService;
  private topBar: TopBarComponent;
  private popupMenu: PopupMenuComponent;
  private editor: EditorComponent;
  private currentFilePath: string | null = null;

  constructor() {
    this.fileService = new FileService();
    this.windowService = new WindowService();

    this.topBar = new TopBarComponent("topbar-container", this.windowService);
    this.popupMenu = new PopupMenuComponent("popup-container");
    this.editor = new EditorComponent("editor-container");

    this.init();
  }

  private init(): void {
    // Listen for top bar dot menu toggle
    globalEventBus.on("topbar:toggleMenu", (pos: { x: number; y: number }) => {
      const menuItems: MenuItem[] = [
        {
          id: "open",
          label: "Open",
          shortcut: "Ctrl+O",
          action: () => this.handleOpen(),
        },
        {
          id: "save",
          label: "Save",
          shortcut: "Ctrl+S",
          action: () => this.handleSave(),
        },
        {
          id: "saveas",
          label: "Save As",
          shortcut: "Ctrl+Shift+S",
          action: () => this.handleSaveAs(),
        },
      ];
      this.popupMenu.toggle(pos.x, pos.y, menuItems);
    });

    // Register hotkeys matching CleanPad C++
    registerShortcuts({
      onOpen: () => this.handleOpen(),
      onSave: () => this.handleSave(),
      onSaveAs: () => this.handleSaveAs(),
      onNewWindow: () => this.windowService.openNewInstance(),
      onToggleAlwaysOnTop: () => this.windowService.toggleAlwaysOnTop(),
      onToggleBold: () => this.editor.toggleBold(),
      onToggleItalic: () => this.editor.toggleItalic(),
      onToggleUnderline: () => this.editor.toggleUnderline(),
      onSelectAll: () => this.editor.selectAllClean(),
      onQuit: () => this.windowService.close(),
    });

    // Listen for drag-and-drop file drop onto webview
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // @ts-ignore path parameter provided by webview
        if (file.path) {
          // @ts-ignore
          this.loadFileFromPath(file.path);
        }
      }
    });

    window.addEventListener("dragover", (e) => e.preventDefault());
  }

  private async handleOpen(): Promise<void> {
    this.topBar.setLoading(true);
    const result = await this.fileService.promptOpen();
    this.topBar.setLoading(false);

    if (result) {
      this.currentFilePath = result.path;
      this.editor.setContent(result.content);
      this.topBar.setTitle(result.path.split(/[/\\]/).pop() || "");
      // Disable word wrap if > 3MB
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
      this.topBar.setTitle(result.path.split(/[/\\]/).pop() || "");
      this.editor.setWordWrap(result.fileSize <= 3 * 1024 * 1024);
    }
  }

  private async handleSave(): Promise<void> {
    const content = this.editor.getText();
    const savedPath = await this.fileService.saveFile(this.currentFilePath, content);
    if (savedPath) {
      this.currentFilePath = savedPath;
      this.topBar.setTitle(savedPath.split(/[/\\]/).pop() || "");
    }
  }

  private async handleSaveAs(): Promise<void> {
    const content = this.editor.getText();
    const savedPath = await this.fileService.promptSaveAs(content);
    if (savedPath) {
      this.currentFilePath = savedPath;
      this.topBar.setTitle(savedPath.split(/[/\\]/).pop() || "");
    }
  }
}

// Bootstrap Application on DOM load
window.addEventListener("DOMContentLoaded", () => {
  new App();
});
