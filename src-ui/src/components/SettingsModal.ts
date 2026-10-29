import { SettingsTabsComponent, SettingsInitialState } from "./SettingsTabs";
import { FontService } from "../services/fontService";
import { ThemeService } from "../services/themeService";
import { UpdateService } from "../services/updateService";
import { PreviewService } from "../services/previewService";
import { DualPaneService } from "../services/dualPaneService";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface SettingsModalCallbacks {
  onOpenTutorial: () => void;
  onFontChanged?: (fontFamily: string) => void;
}

export class SettingsModalComponent {
  private overlay: HTMLElement;
  private contentContainer: HTMLElement;
  private tabsComponent: SettingsTabsComponent | null = null;
  private isVisible: boolean = false;
  private callbacks: SettingsModalCallbacks;

  private fontService = new FontService();
  private themeService = new ThemeService();
  private updateService = new UpdateService();
  private previewService = new PreviewService();
  private dualPaneService = new DualPaneService();

  constructor(callbacks: SettingsModalCallbacks) {
    this.callbacks = callbacks;
    this.overlay = document.createElement("div");
    this.overlay.id = "mobile-settings-overlay";
    this.overlay.className = "settings-modal-overlay";
    this.overlay.innerHTML = `
      <div class="settings-modal-sheet" id="mobile-settings-sheet">
        <div class="settings-modal-drag-indicator"></div>
        <div id="settings-modal-content" class="settings-modal-content"></div>
      </div>
    `;
    this.contentContainer = this.overlay.querySelector("#settings-modal-content")!;
    document.body.appendChild(this.overlay);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    if (!this.tabsComponent) {
      const currentTheme = this.themeService.getTheme();
      const currentFont = this.fontService.getCurrentFont();
      const updateInfo = this.updateService.getUpdateInfo();

      const initialState: SettingsInitialState = {
        theme: currentTheme,
        fontId: currentFont.id,
        isAlwaysOnTop: false,
        alwaysPreview: this.previewService.getAlwaysPreview(),
        snapScroll: this.dualPaneService.getSnapScroll(),
        fonts: this.fontService.fonts.map((f) => ({ id: f.id, name: f.name })),
        updateAvailable: !!updateInfo?.update_available,
        latestVersion: updateInfo?.latest_version,
      };

      this.tabsComponent = new SettingsTabsComponent(
        this.contentContainer,
        initialState,
        {
          onThemeChange: async (theme) => {
            if (this.themeService.getTheme() !== theme) {
              this.themeService.toggleTheme();
            }
            document.documentElement.setAttribute("data-theme", theme);
            document.body.setAttribute("data-theme", theme);
            this.tabsComponent?.updateState({ theme });
            await invoke("sync_window_theme", { theme }).catch(console.error);
            await emit("cathet:theme-change", theme);
          },
          onFontChange: async (fontId) => {
            this.fontService.setFont(fontId);
            this.tabsComponent?.updateState({ fontId });
            this.callbacks.onFontChanged?.(this.fontService.getCurrentFont().family);
            await emit("cathet:font-change", fontId);
          },
          onAlwaysOnTopChange: () => {},
          onAlwaysPreviewChange: async (enabled) => {
            this.previewService.setAlwaysPreview(enabled);
            this.tabsComponent?.updateState({ alwaysPreview: enabled });
            await emit("cathet:always-preview-change", enabled);
          },
          onSnapScrollChange: async (enabled) => {
            this.dualPaneService.setSnapScroll(enabled);
            this.tabsComponent?.updateState({ snapScroll: enabled });
            await emit("cathet:snap-scroll-change", enabled);
          },
          onCheckUpdates: async () => {
            await this.updateService.checkForUpdates();
            const info = this.updateService.getUpdateInfo();
            this.tabsComponent?.updateState({
              updateAvailable: !!info?.update_available,
              latestVersion: info?.latest_version,
            });
          },
          onStartDownload: async () => {},
          onInstallAndRestart: async () => {},
          onConfigureDefaultApp: async () => {},
          onUnregisterDefaultApp: async () => {},
          onOpenTutorial: () => {
            this.hide();
            this.callbacks.onOpenTutorial();
          },
          onClose: () => this.hide(),
        }
      );
    }

    this.overlay.classList.add("visible");
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.overlay.classList.remove("visible");
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    this.tabsComponent?.destroy();
    this.overlay.remove();
  }
}
