import { MobileSettingsView } from "./MobileSettingsView";
import { FontService } from "../services/fontService";
import { ThemeService } from "../services/themeService";
import { PreviewService } from "../services/previewService";
import { DualPaneService } from "../services/dualPaneService";
import { I18nService } from "../services/i18nService";
import { UpdateService } from "../services/updateService";
import { globalEventBus } from "../utils/eventBus";
import { pushBackLayer, removeBackLayer } from "../utils/backStack";
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
  private isVisible = false;
  private callbacks: SettingsModalCallbacks;

  private fontService = new FontService();
  private themeService = new ThemeService();
  private previewService = new PreviewService();
  private dualPaneService = new DualPaneService();
  private i18n = I18nService.getInstance();
  private updateService = new UpdateService();
  private updateHandler = (info: any) => {
    this.settingsView?.updateState({ updateInfo: info, isCheckingUpdate: false });
  };

  constructor(callbacks: SettingsModalCallbacks) {
    this.callbacks = callbacks;
    this.overlay = document.createElement("div");
    this.overlay.id = "mobile-settings-overlay";
    this.overlay.className = "settings-modal-overlay";
    this.overlay.inert = true;
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.innerHTML = `
      <div class="settings-modal-sheet" id="mobile-settings-sheet">
        <div class="settings-modal-drag-indicator"></div>
        <div id="settings-modal-content" class="settings-modal-content"></div>
      </div>
    `;
    this.contentContainer = this.overlay.querySelector("#settings-modal-content")!;
    document.body.appendChild(this.overlay);

    this.bindEvents();
    this.schedulePreMount();
  }

  private schedulePreMount(): void {
    const preMount = () => { if (!this.settingsView) this.ensureSettingsView(); };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preMount);
    } else {
      setTimeout(preMount, 120);
    }
  }

  private ensureSettingsView(): void {
    if (this.settingsView) return;
    const currentTheme = this.themeService.getTheme();
    const currentFont = this.fontService.getCurrentFont();
    const isHighRefresh = localStorage.getItem("cathet:high-refresh") !== "false";

    this.settingsView = new MobileSettingsView(
      this.contentContainer,
      {
        theme: currentTheme,
        fontId: currentFont.id,
        locale: this.i18n.getLocale(),
        alwaysPreview: this.previewService.getAlwaysPreview(),
        previewMinimap: this.previewService.getPreviewMinimap(),
        previewBookmarks: this.previewService.getPreviewBookmarks(),
        snapScroll: this.dualPaneService.getSnapScroll(),
        highRefreshRate: isHighRefresh,
        fonts: this.fontService.fonts.map((f) => ({ id: f.id, name: f.name })),
        updateInfo: this.updateService.getUpdateInfo(),
        isCheckingUpdate: false,
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
        onLanguageChange: async (locale) => {
          this.i18n.setLocale(locale);
          this.settingsView?.updateState({ locale });
        },
        onAlwaysPreviewChange: async (enabled) => {
          this.previewService.setAlwaysPreview(enabled);
          this.settingsView?.updateState({ alwaysPreview: enabled });
          await emit("cathet:always-preview-change", enabled);
        },
        onPreviewMinimapChange: async (enabled) => {
          this.previewService.setPreviewMinimap(enabled);
          this.settingsView?.updateState({ previewMinimap: enabled });
          window.dispatchEvent(new CustomEvent("cathet:preview-minimap-change", { detail: enabled }));
        },
        onPreviewBookmarksChange: async (enabled) => {
          this.previewService.setPreviewBookmarks(enabled);
          this.settingsView?.updateState({ previewBookmarks: enabled });
          window.dispatchEvent(new CustomEvent("cathet:preview-bookmarks-change", { detail: enabled }));
        },
        onSnapScrollChange: async (enabled) => {
          this.dualPaneService.setSnapScroll(enabled);
          this.settingsView?.updateState({ snapScroll: enabled });
          this.callbacks.onSnapScrollChange?.(enabled);
          await emit("cathet:snap-scroll-change", enabled);
        },
        onHighRefreshRateChange: async (enabled) => {
          localStorage.setItem("cathet:high-refresh", enabled ? "true" : "false");
          this.settingsView?.updateState({ highRefreshRate: enabled });
          await invoke("set_refresh_rate", { hz: enabled ? 120 : 60 }).catch(console.error);
        },
        onOpenTutorial: () => {
          this.hide();
          this.callbacks.onOpenTutorial();
        },
        onCheckUpdate: async () => {
          this.settingsView?.updateState({ isCheckingUpdate: true });
          const info = await this.updateService.checkForUpdates();
          this.settingsView?.updateState({ updateInfo: info ?? this.updateService.getUpdateInfo(), isCheckingUpdate: false });
        },
        onOpenUpdate: () => this.updateService.openAndroidUpdateUrl(),
        onClose: () => this.hide(),
      }
    );
  }

  private bindEvents(): void {
    globalEventBus.on("update:statusChanged", this.updateHandler);
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.hide();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) this.hide();
    });
  }

  show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    pushBackLayer("settings-modal", () => this.hide());
    this.overlay.inert = false;
    this.overlay.setAttribute("aria-hidden", "false");

    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
      active.blur();
    }

    this.ensureSettingsView();
    this.settingsView?.updateState({
      theme: this.themeService.getTheme(),
      fontId: this.fontService.getCurrentFont().id,
      locale: this.i18n.getLocale(),
      alwaysPreview: this.previewService.getAlwaysPreview(),
      previewMinimap: this.previewService.getPreviewMinimap(),
      previewBookmarks: this.previewService.getPreviewBookmarks(),
      snapScroll: this.dualPaneService.getSnapScroll(),
      highRefreshRate: localStorage.getItem("cathet:high-refresh") !== "false",
      updateInfo: this.updateService.getUpdateInfo(),
    });

    requestAnimationFrame(() => {
      if (!this.isVisible) return;
      requestAnimationFrame(() => {
        if (this.isVisible) this.overlay.classList.add("visible");
      });
    });
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    removeBackLayer("settings-modal");
    this.overlay.classList.remove("visible");
    this.overlay.inert = true;
    this.overlay.setAttribute("aria-hidden", "true");
  }

  toggle(): void {
    if (this.isVisible) this.hide();
    else this.show();
  }

  updateSnapScroll(enabled: boolean): void {
    this.dualPaneService.setSnapScroll(enabled);
    this.settingsView?.updateState({ snapScroll: enabled });
  }

  destroy(): void {
    removeBackLayer("settings-modal");
    globalEventBus.off("update:statusChanged", this.updateHandler);
    this.settingsView?.destroy();
    this.overlay.remove();
  }
}
