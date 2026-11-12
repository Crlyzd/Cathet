import { FontSelectComponent, FontOption } from "./FontSelect";
import { LanguageSelectComponent } from "./LanguageSelect";
import { BackdropSelectComponent } from "./BackdropSelect";
import { PlatformService } from "../../services/platformService";
import { SUPPORTED_LOCALES } from "../../locales";
import { t } from "../../services/i18nService";
import { initAutoScroll } from "../../utils/autoScroll";
import { WindowsBackdropType } from "../../services/backdropService";
import {
  renderAppearanceAccordion,
  renderEditorAccordion,
  renderSystemAccordion,
  bindAccordionToggles,
  AccordionRenderState,
} from "./SettingsAccordions";

export interface SettingsPaneCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onLanguageChange: (locale: string) => void;
  onAlwaysOnTopChange: (enabled: boolean) => void;
  onAlwaysPreviewChange: (enabled: boolean) => void;
  onSnapScrollChange: (enabled: boolean) => void;
  onLinuxBackdropChange?: (mode: "solid" | "blur") => void;
  onWindowsBackdropChange?: (mode: WindowsBackdropType) => void;
  onBackdropOpacityChange?: (percent: number) => void;
  onConfigureDefaultApp: () => Promise<void>;
  onUnregisterDefaultApp: () => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  onStartDownload: () => Promise<void>;
  onInstallAndRestart: () => Promise<void>;
}

export interface SettingsPaneState {
  theme: "dark" | "light";
  fontId: string;
  locale: string;
  isAlwaysOnTop: boolean;
  alwaysPreview: boolean;
  snapScroll: boolean;
  linuxBackdrop?: "solid" | "blur";
  windowsBackdrop?: WindowsBackdropType;
  backdropOpacity?: number; // 15 to 100
  fonts: FontOption[];
  updateAvailable: boolean;
  latestVersion?: string;
  isRegistered?: boolean;
  currentExePath?: string;
  registeredExePath?: string | null;
  downloadState: "idle" | "downloading" | "ready";
  downloadPercent: number;
  isStorePackage?: boolean;
}

export class SettingsPaneComponent {
  private container: HTMLElement;
  private state: SettingsPaneState;
  private callbacks: SettingsPaneCallbacks;
  private fontSelect: FontSelectComponent | null = null;
  private languageSelect: LanguageSelectComponent | null = null;
  private backdropSelect: BackdropSelectComponent | null = null;
  private autoScrollCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, state: SettingsPaneState, callbacks: SettingsPaneCallbacks) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.render();
  }

  public updateFontUI(fontId: string): void { this.fontSelect?.updateUI(fontId); }
  public updateLanguageUI(locale: string): void { this.languageSelect?.updateUI(locale); }
  public updateBackdropUI(mode: WindowsBackdropType): void { this.backdropSelect?.updateUI(mode); }

  public updateState(partial: Partial<SettingsPaneState>): void {
    this.state = { ...this.state, ...partial };
    if (Object.keys(partial).length === 1) {
      if (partial.fontId !== undefined) return this.updateFontUI(partial.fontId);
      if (partial.locale !== undefined) return this.updateLanguageUI(partial.locale);
      if (partial.windowsBackdrop !== undefined) return this.updateBackdropUI(partial.windowsBackdrop);
    }
    this.render();
  }

  private getUpdateHtml(): string {
    const { downloadState, downloadPercent, updateAvailable, isStorePackage } = this.state;
    if (isStorePackage) return `<span class="update-store-badge">Managed by Store</span>`;
    if (downloadState === "downloading") {
      return `<div class="update-progress-wrap"><div class="update-progress-track"><div class="update-progress-fill" style="width: ${downloadPercent}%"></div></div><span class="update-progress-info">${downloadPercent.toFixed(0)}%</span></div>`;
    }
    if (downloadState === "ready") return `<button class="glass-btn update-ready" id="btn-restart-install">${t("settings.restartInstall")}</button>`;
    if (updateAvailable) return `<button class="glass-btn update-ready" id="btn-start-download">${t("settings.downloadUpdate")}</button>`;
    return `<button class="glass-btn" id="btn-check-updates">${t("settings.checkUpdates")}</button>`;
  }

  private render(): void {
    this.destroySelects();
    this.autoScrollCleanup?.();

    const isLinux = PlatformService.getInstance().isLinux();
    const accordionState: AccordionRenderState = {
      theme: this.state.theme,
      fontId: this.state.fontId,
      locale: this.state.locale,
      isAlwaysOnTop: this.state.isAlwaysOnTop,
      alwaysPreview: this.state.alwaysPreview,
      snapScroll: this.state.snapScroll,
      linuxBackdrop: this.state.linuxBackdrop,
      windowsBackdrop: this.state.windowsBackdrop,
      backdropOpacity: this.state.backdropOpacity || 65,
      isRegistered: this.state.isRegistered,
      registeredExePath: this.state.registeredExePath,
      currentExePath: this.state.currentExePath,
      updateHtml: this.getUpdateHtml(),
    };

    this.container.innerHTML = `
      <div class="settings-accordion-wrap">
        ${renderAppearanceAccordion(accordionState)}
        ${renderEditorAccordion(accordionState)}
        ${renderSystemAccordion(accordionState)}
      </div>
    `;

    const langMount = this.container.querySelector("#language-select-mount") as HTMLElement | null;
    if (langMount) {
      this.languageSelect = new LanguageSelectComponent(
        langMount, SUPPORTED_LOCALES, this.state.locale,
        (locale) => this.callbacks.onLanguageChange(locale)
      );
    }

    const fontMount = this.container.querySelector("#font-select-mount") as HTMLElement | null;
    if (fontMount) {
      this.fontSelect = new FontSelectComponent(
        fontMount, this.state.fonts, this.state.fontId,
        (fontId) => this.callbacks.onFontChange(fontId)
      );
    }

    if (!isLinux) {
      const backdropMount = this.container.querySelector("#backdrop-select-mount") as HTMLElement | null;
      if (backdropMount) {
        this.backdropSelect = new BackdropSelectComponent(
          backdropMount,
          this.state.windowsBackdrop || "acrylic",
          (mode) => {
            const opacityItem = this.container.querySelector("#backdrop-opacity-item") as HTMLElement | null;
            if (opacityItem) opacityItem.style.display = mode === "solid" ? "none" : "";
            this.callbacks.onWindowsBackdropChange?.(mode);
          }
        );
      }
    }

    this.bindEvents();
    bindAccordionToggles(this.container);
    this.autoScrollCleanup = initAutoScroll(this.container);
  }

  private bindEvents(): void {
    this.container.querySelector("#btn-theme-dark")?.addEventListener("click", () => {
      if (this.state.theme !== "dark") this.callbacks.onThemeChange("dark");
    });
    this.container.querySelector("#btn-theme-light")?.addEventListener("click", () => {
      if (this.state.theme !== "light") this.callbacks.onThemeChange("light");
    });
    this.container.querySelector("#btn-backdrop-solid")?.addEventListener("click", () => {
      const opacityItem = this.container.querySelector("#backdrop-opacity-item") as HTMLElement | null;
      if (opacityItem) opacityItem.style.display = "none";
      this.callbacks.onLinuxBackdropChange?.("solid");
    });
    this.container.querySelector("#btn-backdrop-blur")?.addEventListener("click", () => {
      const opacityItem = this.container.querySelector("#backdrop-opacity-item") as HTMLElement | null;
      if (opacityItem) opacityItem.style.display = "";
      this.callbacks.onLinuxBackdropChange?.("blur");
    });

    const slider = this.container.querySelector("#backdrop-opacity-slider") as HTMLInputElement | null;
    const valBadge = this.container.querySelector("#backdrop-opacity-val");
    if (slider) {
      slider.addEventListener("input", () => {
        const val = parseInt(slider.value, 10);
        if (valBadge) valBadge.textContent = `${val}%`;
        this.callbacks.onBackdropOpacityChange?.(val);
      });
    }

    const bind = (id: string, cb: (v: boolean) => void) => {
      (this.container.querySelector(id) as HTMLInputElement | null)?.addEventListener("change", (e) => {
        cb((e.target as HTMLInputElement).checked);
      });
    };
    bind("#ontop-checkbox", this.callbacks.onAlwaysOnTopChange);
    bind("#always-preview-checkbox", this.callbacks.onAlwaysPreviewChange);
    bind("#snap-scroll-checkbox", this.callbacks.onSnapScrollChange);

    const bindBtn = (id: string, action: () => Promise<void>) => {
      this.container.querySelector(id)?.addEventListener("click", async (e) => {
        const btn = e.currentTarget as HTMLButtonElement | null;
        if (btn) btn.disabled = true;
        try { await action(); } finally { if (btn) btn.disabled = false; }
      });
    };
    bindBtn("#btn-default-app", this.callbacks.onConfigureDefaultApp);
    bindBtn("#btn-check-updates", this.callbacks.onCheckUpdates);
    this.container.querySelector("#btn-start-download")?.addEventListener("click", () => this.callbacks.onStartDownload());
    this.container.querySelector("#btn-restart-install")?.addEventListener("click", () => this.callbacks.onInstallAndRestart());
  }

  private destroySelects(): void {
    this.fontSelect?.destroy(); this.fontSelect = null;
    this.languageSelect?.destroy(); this.languageSelect = null;
    this.backdropSelect?.destroy(); this.backdropSelect = null;
  }

  public destroy(): void {
    this.autoScrollCleanup?.(); this.autoScrollCleanup = null;
    this.destroySelects();
  }
}
