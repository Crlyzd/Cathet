import { icons } from "../../utils/monochromeIcons";
import { APP_VERSION } from "../../version";
import { FontSelectComponent, FontOption } from "./FontSelect";
import { LanguageSelectComponent } from "./LanguageSelect";
import { PlatformService } from "../../services/platformService";
import { SUPPORTED_LOCALES } from "../../locales";
import { t } from "../../services/i18nService";
import { initAutoScroll } from "../../utils/autoScroll";

export interface SettingsPaneCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onLanguageChange: (locale: string) => void;
  onAlwaysOnTopChange: (enabled: boolean) => void;
  onAlwaysPreviewChange: (enabled: boolean) => void;
  onSnapScrollChange: (enabled: boolean) => void;
  onLinuxBackdropChange?: (mode: "solid" | "blur") => void;
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
  private autoScrollCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, state: SettingsPaneState, callbacks: SettingsPaneCallbacks) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.render();
  }

  public updateFontUI(fontId: string): void { this.fontSelect?.updateUI(fontId); }
  public updateLanguageUI(locale: string): void { this.languageSelect?.updateUI(locale); }

  public updateState(partial: Partial<SettingsPaneState>): void {
    this.state = { ...this.state, ...partial };
    if (Object.keys(partial).length === 1) {
      if (partial.fontId !== undefined) return this.updateFontUI(partial.fontId);
      if (partial.locale !== undefined) return this.updateLanguageUI(partial.locale);
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
    const isMobile = PlatformService.getInstance().isMobile();
    const isLinux = PlatformService.getInstance().isLinux();
    const activePath = this.state.registeredExePath || this.state.currentExePath || "";
    const defaultAppSubtext = activePath ? `${this.state.isRegistered ? "Registered: " : "Path: "}${activePath}` : t("settings.defaultApp");
    const updateText = this.state.isStorePackage ? "Installed via Microsoft Store (Auto-Updated)"
      : this.state.downloadState === "downloading" ? "Downloading..."
      : this.state.downloadState === "ready" ? "Ready!"
      : this.state.updateAvailable ? `v${this.state.latestVersion || "3.0"} ready`
      : `Up to date (v${APP_VERSION})`;

    this.container.innerHTML = `
      <div class="settings-card">
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.theme")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.themeSub")}</span></span>
          </div>
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${this.state.theme === "dark" ? "active" : ""}" id="btn-theme-dark">${icons.moon}<span>${t("settings.themeDark")}</span></button>
            <button class="pill-toggle-btn ${this.state.theme === "light" ? "active" : ""}" id="btn-theme-light">${icons.sun}<span>${t("settings.themeLight")}</span></button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.language")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.languageSub")}</span></span>
          </div>
          <div id="language-select-mount"></div>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.editorFont")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.fontSub")}</span></span>
          </div>
          <div id="font-select-mount"></div>
        </div>

        ${!isMobile ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.stayOnTop")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.stayOnTopSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="ontop-checkbox" ${this.state.isAlwaysOnTop ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>` : ""}

        ${isLinux ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Window Backdrop</span>
            <span class="setting-subtext"><span class="subtext-content">Solid canvas or translucent glass</span></span>
          </div>
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${this.state.linuxBackdrop !== "blur" ? "active" : ""}" id="btn-backdrop-solid"><span>Solid</span></button>
            <button class="pill-toggle-btn ${this.state.linuxBackdrop === "blur" ? "active" : ""}" id="btn-backdrop-blur"><span>Translucent</span></button>
          </div>
        </div>` : ""}

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.alwaysPreview")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.alwaysPreviewSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="always-preview-checkbox" ${this.state.alwaysPreview ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.snapScroll")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.snapScrollSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="snap-scroll-checkbox" ${this.state.snapScroll ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        ${!isMobile ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.defaultApp")}</span>
            <span class="setting-subtext" id="default-app-subtext" title="${defaultAppSubtext}">
              <span class="subtext-content">${defaultAppSubtext}</span>
            </span>
          </div>
          <div class="default-app-actions">
            ${this.state.isRegistered
              ? `<button class="glass-btn" id="btn-unregister-default-app">${t("settings.unregister")}</button>`
              : `<button class="glass-btn" id="btn-set-default-app">${t("settings.setAsDefault")}</button>`}
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.appUpdates")}</span>
            <span class="setting-subtext" id="update-status-text">
              <span class="subtext-content">${updateText}</span>
            </span>
          </div>
          ${this.getUpdateHtml()}
        </div>` : ""}
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

    this.bindEvents();
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
      this.callbacks.onLinuxBackdropChange?.("solid");
    });
    this.container.querySelector("#btn-backdrop-blur")?.addEventListener("click", () => {
      this.callbacks.onLinuxBackdropChange?.("blur");
    });

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
    bindBtn("#btn-set-default-app", this.callbacks.onConfigureDefaultApp);
    bindBtn("#btn-unregister-default-app", this.callbacks.onUnregisterDefaultApp);
    bindBtn("#btn-check-updates", this.callbacks.onCheckUpdates);
    this.container.querySelector("#btn-start-download")?.addEventListener("click", () => this.callbacks.onStartDownload());
    this.container.querySelector("#btn-restart-install")?.addEventListener("click", () => this.callbacks.onInstallAndRestart());
  }

  private destroySelects(): void {
    this.fontSelect?.destroy(); this.fontSelect = null;
    this.languageSelect?.destroy(); this.languageSelect = null;
  }

  public destroy(): void {
    this.autoScrollCleanup?.(); this.autoScrollCleanup = null;
    this.destroySelects();
  }
}
