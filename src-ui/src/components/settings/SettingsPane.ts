import { FontSelectComponent, FontOption } from "./FontSelect";
import { LanguageSelectComponent } from "./LanguageSelect";
import { BackdropSelectComponent } from "./BackdropSelect";
import { SolidColorPickerComponent } from "./SolidColorPicker";
import { PlatformService } from "../../services/platformService";
import { SUPPORTED_LOCALES } from "../../locales";
import { t } from "../../services/i18nService";
import { initAutoScroll } from "../../utils/autoScroll";
import { attachSliderWheel } from "../../utils/sliderWheel";
import { WindowsBackdropType, BackdropService } from "../../services/backdropService";
import { APP_VERSION } from "../../version";
import {
  renderAppearanceAccordion, renderEditorAccordion, renderSystemAccordion,
  bindAccordionToggles, AccordionRenderState,
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
  onSolidColorChange?: (color: string | null) => void;
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
  backdropOpacity?: number;
  solidColor?: string | null;
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
  private solidColorPicker: SolidColorPickerComponent | null = null;
  private autoScrollCleanup: (() => void) | null = null;
  private sliderWheelCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, state: SettingsPaneState, callbacks: SettingsPaneCallbacks) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.render();
  }

  public updateFontUI(fontId: string): void { this.fontSelect?.updateUI(fontId); }
  public updateLanguageUI(locale: string): void { this.languageSelect?.updateUI(locale); }
  public updateBackdropUI(mode: WindowsBackdropType): void { this.backdropSelect?.updateUI(mode); }

  public updateOpacityState(pct: number): void {
    this.state.backdropOpacity = pct;
    const slider = this.container.querySelector("#backdrop-opacity-slider") as HTMLInputElement | null;
    const badge = this.container.querySelector("#backdrop-opacity-val");
    if (slider && parseInt(slider.value, 10) !== pct) slider.value = String(pct);
    if (badge) badge.textContent = `${pct}%`;
  }

  public updateState(partial: Partial<SettingsPaneState>): void {
    this.state = { ...this.state, ...partial };
    if (partial.backdropOpacity !== undefined && !partial.windowsBackdrop && !partial.theme) {
      return this.updateOpacityState(partial.backdropOpacity);
    }
    if (partial.solidColor !== undefined && !partial.windowsBackdrop && !partial.theme) return;
    if (partial.fontId !== undefined && !partial.theme) return this.updateFontUI(partial.fontId);
    if (partial.locale !== undefined && !partial.theme) return this.updateLanguageUI(partial.locale);
    if (partial.windowsBackdrop !== undefined && !partial.theme) {
      this.updateBackdropUI(partial.windowsBackdrop);
      if (partial.backdropOpacity !== undefined) this.updateOpacityState(partial.backdropOpacity);
      return;
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
    this.sliderWheelCleanup?.();
    this.sliderWheelCleanup = null;

    const isLinux = PlatformService.getInstance().isLinux();
    const updateText = this.state.isStorePackage ? "Installed via Microsoft Store (Auto-Updated)"
      : this.state.downloadState === "downloading" ? "Downloading..."
      : this.state.downloadState === "ready" ? "Ready!"
      : this.state.updateAvailable ? `v${this.state.latestVersion || "3.0"} ready`
      : `Up to date (v${APP_VERSION})`;

    const accordionState: AccordionRenderState = {
      ...this.state,
      backdropOpacity: this.state.backdropOpacity !== undefined ? this.state.backdropOpacity : BackdropService.getInstance().getOpacityPercent(),
      updateText,
      updateHtml: this.getUpdateHtml(),
    };

    this.container.innerHTML = `<div class="settings-accordion-wrap">${renderAppearanceAccordion(accordionState)}${renderEditorAccordion(accordionState)}${renderSystemAccordion(accordionState)}</div>`;

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
            const isSolid = mode === "solid";
            const opacityItem = this.container.querySelector("#backdrop-opacity-item") as HTMLElement | null;
            const solidMount = this.container.querySelector("#solid-color-mount") as HTMLElement | null;
            if (opacityItem) opacityItem.style.display = isSolid ? "none" : "";
            if (solidMount) solidMount.style.display = isSolid ? "" : "none";
            this.callbacks.onWindowsBackdropChange?.(mode);
          }
        );
      }
    }

    const solidColorMount = this.container.querySelector("#solid-color-mount") as HTMLElement | null;
    if (solidColorMount) {
      this.solidColorPicker = new SolidColorPickerComponent(
        solidColorMount,
        this.state.theme === "dark",
        this.state.solidColor || null,
        (color) => this.callbacks.onSolidColorChange?.(color)
      );
    }

    this.bindEvents();
    bindAccordionToggles(this.container);
    this.autoScrollCleanup = initAutoScroll(this.container);
  }

  private bindEvents(): void {
    const onClk = (id: string, fn: () => void) => this.container.querySelector(id)?.addEventListener("click", fn);
    onClk("#btn-theme-dark", () => this.state.theme !== "dark" && this.callbacks.onThemeChange("dark"));
    onClk("#btn-theme-light", () => this.state.theme !== "light" && this.callbacks.onThemeChange("light"));
    onClk("#btn-backdrop-solid", () => { this.toggleSolidUI(true); this.callbacks.onLinuxBackdropChange?.("solid"); });
    onClk("#btn-backdrop-blur", () => { this.toggleSolidUI(false); this.callbacks.onLinuxBackdropChange?.("blur"); });

    const slider = this.container.querySelector("#backdrop-opacity-slider") as HTMLInputElement | null;
    const valBadge = this.container.querySelector("#backdrop-opacity-val");
    const sliderWrap = this.container.querySelector(".slider-control-wrap") as HTMLElement | null;
    slider?.addEventListener("input", () => {
      const val = parseInt(slider.value, 10);
      if (valBadge) valBadge.textContent = `${val}%`;
      this.state.backdropOpacity = val;
      this.callbacks.onBackdropOpacityChange?.(val);
    });
    if (sliderWrap && slider) {
      this.sliderWheelCleanup = attachSliderWheel(sliderWrap, slider, { step: 2, shiftStep: 5 });
    }

    const bind = (id: string, cb: (v: boolean) => void) => {
      (this.container.querySelector(id) as HTMLInputElement | null)?.addEventListener("change", (e) => cb((e.target as HTMLInputElement).checked));
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
    bindBtn("#btn-set-default-app", this.callbacks.onConfigureDefaultApp);
    bindBtn("#btn-unregister-default-app", this.callbacks.onUnregisterDefaultApp);
    bindBtn("#btn-check-updates", this.callbacks.onCheckUpdates);
    onClk("#btn-start-download", () => this.callbacks.onStartDownload());
    onClk("#btn-restart-install", () => this.callbacks.onInstallAndRestart());
  }

  private toggleSolidUI(isSolid: boolean): void {
    const op = this.container.querySelector("#backdrop-opacity-item") as HTMLElement | null;
    const sm = this.container.querySelector("#solid-color-mount") as HTMLElement | null;
    if (op) op.style.display = isSolid ? "none" : "";
    if (sm) sm.style.display = isSolid ? "" : "none";
  }

  private destroySelects(): void {
    this.fontSelect?.destroy(); this.fontSelect = null;
    this.languageSelect?.destroy(); this.languageSelect = null;
    this.backdropSelect?.destroy(); this.backdropSelect = null;
    this.solidColorPicker = null;
  }

  public destroy(): void {
    this.autoScrollCleanup?.(); this.autoScrollCleanup = null;
    this.sliderWheelCleanup?.(); this.sliderWheelCleanup = null;
    this.destroySelects();
  }
}
