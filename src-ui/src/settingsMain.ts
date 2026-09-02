import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { SettingsTabsComponent } from "./components/SettingsTabs";
import { FontService } from "./services/fontService";
import { ThemeService } from "./services/themeService";
import { UpdateService } from "./services/updateService";

class SettingsApp {
  private fontService: FontService;
  private themeService: ThemeService;
  private updateService: UpdateService;
  private tabsComponent: SettingsTabsComponent;
  private currentWindow = getCurrentWindow();
  private isAlwaysOnTop: boolean = false;

  constructor() {
    this.fontService = new FontService();
    this.themeService = new ThemeService();
    this.updateService = new UpdateService();

    const root = document.getElementById("settings-root");
    if (!root) throw new Error("Settings root container not found");

    const currentTheme = this.themeService.getTheme();
    const currentFont = this.fontService.getCurrentFont();
    const updateInfo = this.updateService.getUpdateInfo();

    this.applyTheme(currentTheme);
    invoke("sync_window_theme", { theme: currentTheme }).catch(console.error);

    this.tabsComponent = new SettingsTabsComponent(
      root,
      {
        theme: currentTheme,
        fontId: currentFont.id,
        isAlwaysOnTop: this.isAlwaysOnTop,
        fonts: this.fontService.fonts.map((f) => ({ id: f.id, name: f.name })),
        updateAvailable: !!updateInfo?.update_available,
        latestVersion: updateInfo?.latest_version,
      },
      {
        onThemeChange: (theme) => this.handleThemeChange(theme),
        onFontChange: (fontId) => this.handleFontChange(fontId),
        onAlwaysOnTopChange: (enabled) => this.handleAlwaysOnTopChange(enabled),
        onCheckUpdates: () => this.handleCheckUpdates(true),
        onStartDownload: () => this.handleStartDownload(),
        onInstallAndRestart: () => this.handleInstallAndRestart(),
        onClose: () => this.handleClose(),
      }
    );

    this.initListeners();

    // Fetch current always on top state immediately
    this.syncAlwaysOnTop();

    // Auto-check for updates silently on launch to ensure synchronization with main window
    this.handleCheckUpdates(false).catch(console.error);

    // Disable default browser context menu in compiled mode
    if (!import.meta.env.DEV) {
      window.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }

  private applyTheme(theme: "dark" | "light"): void {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }

  private async handleThemeChange(theme: "dark" | "light"): Promise<void> {
    if (this.themeService.getTheme() !== theme) {
      this.themeService.toggleTheme();
    }
    this.applyTheme(theme);
    this.tabsComponent.updateState({ theme });
    await invoke("sync_window_theme", { theme }).catch(console.error);
    await emit("cathet:theme-change", theme);
  }

  private async handleFontChange(fontId: string): Promise<void> {
    this.fontService.setFont(fontId);
    this.tabsComponent.updateState({ fontId });
    await emit("cathet:font-change", fontId);
  }

  private async handleAlwaysOnTopChange(enabled: boolean): Promise<void> {
    this.isAlwaysOnTop = enabled;
    this.tabsComponent.updateState({ isAlwaysOnTop: enabled });
    await invoke("set_always_on_top", { enabled }).catch(console.error);
    await emit("cathet:ontop-change", enabled);
  }

  private async syncAlwaysOnTop(): Promise<void> {
    try {
      const state = await invoke<boolean>("get_always_on_top");
      if (this.isAlwaysOnTop !== state) {
        this.isAlwaysOnTop = state;
        this.tabsComponent.updateState({ isAlwaysOnTop: state });
      }
    } catch (err) {
      console.error("Failed to sync always on top:", err);
    }
  }

  private async handleCheckUpdates(isManual: boolean = false): Promise<void> {
    const info = await this.updateService.checkForUpdates();
    if (info?.update_available) {
      this.tabsComponent.updateState({
        updateAvailable: true,
        latestVersion: info.latest_version,
      });
    } else if (isManual) {
      alert("Cathet is up to date (v1.0.0)");
    }
  }

  private async handleStartDownload(): Promise<void> {
    try {
      this.tabsComponent.setDownloadProgress(0);
      await this.updateService.startDownload((progress) => {
        this.tabsComponent.setDownloadProgress(progress.percent);
      });
      this.tabsComponent.setDownloadProgress(100);
    } catch (err) {
      alert(`Download failed: ${err}`);
      this.tabsComponent.updateState({ updateAvailable: true });
    }
  }

  private async handleInstallAndRestart(): Promise<void> {
    try {
      await this.updateService.installAndRestart();
    } catch (err) {
      alert(`Install failed: ${err}`);
    }
  }

  private async handleClose(): Promise<void> {
    try {
      await this.currentWindow.close();
    } catch (e) {
      console.error("Failed to close settings window:", e);
    }
  }

  private async initListeners(): Promise<void> {
    // Listen for theme changes from main window
    await listen<"dark" | "light">("cathet:theme-change", (event) => {
      this.applyTheme(event.payload);
      this.tabsComponent.updateState({ theme: event.payload });
    });

    // Listen for font changes from main window
    await listen<string>("cathet:font-change", (event) => {
      this.fontService.setFont(event.payload);
      this.tabsComponent.updateState({ fontId: event.payload });
    });

    // Listen for stay-on-top changes from other windows
    await listen<boolean>("cathet:ontop-change", (event) => {
      this.isAlwaysOnTop = event.payload;
      this.tabsComponent.updateState({ isAlwaysOnTop: event.payload });
    });

    // Re-sync when window gains focus or receives show event
    window.addEventListener("focus", () => {
      this.syncAlwaysOnTop();
    });

    await listen("cathet:settings-focused", () => {
      this.syncAlwaysOnTop();
    });

    // Listen for cross-window update status changes
    await listen<any>("cathet:update-status", (event) => {
      const info = event.payload;
      this.tabsComponent.updateState({
        updateAvailable: !!info?.update_available,
        latestVersion: info?.latest_version,
      });
    });
  }
}

// Initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
  new SettingsApp();
});
