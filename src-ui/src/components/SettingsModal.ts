import { MobileSettingsView } from "./MobileSettingsView";
import { FontService } from "../services/fontService";
import { ThemeService } from "../services/themeService";
import { PreviewService } from "../services/previewService";
import { DualPaneService } from "../services/dualPaneService";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export interface SettingsModalCallbacks {
  onOpenTutorial: () => void;
  onFontChanged?: (fontFamily: string) => void;
  onSnapScrollChange?: (enabled: boolean) => void;
}

export class SettingsModalComponent {
  private overlay: HTMLElement;
  private contentContainer: HTMLElement;
  private settingsView: MobileSettingsView | null = null;
  private isVisible: boolean = false;
  private callbacks: SettingsModalCallbacks;

  private fontService = new FontService();
  private themeService = new ThemeService();
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

    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
    document.body.classList.add("is-modal-open");

    if (!this.settingsView) {
      const currentTheme = this.themeService.getTheme();
      const currentFont = this.fontService.getCurrentFont();

      this.settingsView = new MobileSettingsView(
        this.contentContainer,
        {
          theme: currentTheme,
          fontId: currentFont.id,
          alwaysPreview: this.previewService.getAlwaysPreview(),
          snapScroll: this.dualPaneService.getSnapScroll(),
          fonts: this.fontService.fonts.map((f) => ({ id: f.id, name: f.name })),
        },
        {
          onThemeChange: async (theme) => {
            this.themeService.setTheme(theme);
            this.settingsView?.updateState({ theme });
            await invoke("sync_window_theme", { theme }).catch(console.error);
            await emit("cathet:theme-change", theme);
          },
          onFontChange: async (fontId) => {
            this.fontService.setFont(fontId);
            this.settingsView?.updateState({ fontId });
            this.callbacks.onFontChanged?.(this.fontService.getCurrentFont().family);
            await emit("cathet:font-change", fontId);
          },
          onAlwaysPreviewChange: async (enabled) => {
            this.previewService.setAlwaysPreview(enabled);
            this.settingsView?.updateState({ alwaysPreview: enabled });
            await emit("cathet:always-preview-change", enabled);
          },
          onSnapScrollChange: async (enabled) => {
            this.dualPaneService.setSnapScroll(enabled);
            this.settingsView?.updateState({ snapScroll: enabled });
            this.callbacks.onSnapScrollChange?.(enabled);
            await emit("cathet:snap-scroll-change", enabled);
          },
          onOpenTutorial: () => {
            this.hide();
            this.callbacks.onOpenTutorial();
          },
          onClose: () => this.hide(),
        }
      );
    } else {
      this.settingsView.updateState({
        theme: this.themeService.getTheme(),
        fontId: this.fontService.getCurrentFont().id,
        alwaysPreview: this.previewService.getAlwaysPreview(),
        snapScroll: this.dualPaneService.getSnapScroll(),
      });
    }

    void this.overlay.offsetHeight;
    this.overlay.classList.add("visible");
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.overlay.classList.remove("visible");
    document.body.classList.remove("is-modal-open");
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateSnapScroll(enabled: boolean): void {
    this.dualPaneService.setSnapScroll(enabled);
    this.settingsView?.updateState({ snapScroll: enabled });
  }

  destroy(): void {
    this.settingsView?.destroy();
    this.overlay.remove();
  }
}
