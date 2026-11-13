import { icons } from "../utils/monochromeIcons";
import { APP_VERSION } from "../version";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SUPPORTED_LOCALES } from "../locales";
import { t } from "../services/i18nService";
import { attachHeartSprout } from "../utils/heartSprout";

export interface MobileSettingsState {
  theme: "dark" | "light";
  fontId: string;
  locale: string;
  alwaysPreview: boolean;
  snapScroll: boolean;
  highRefreshRate: boolean;
  fonts: { id: string; name: string }[];
}

export interface MobileSettingsCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onLanguageChange: (locale: string) => void;
  onAlwaysPreviewChange: (enabled: boolean) => void;
  onSnapScrollChange: (enabled: boolean) => void;
  onHighRefreshRateChange: (enabled: boolean) => void;
  onOpenTutorial: () => void;
  onClose: () => void;
}

export class MobileSettingsView {
  private container: HTMLElement;
  private state: MobileSettingsState;
  private callbacks: MobileSettingsCallbacks;
  private heartSproutCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, initialState: MobileSettingsState, callbacks: MobileSettingsCallbacks) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;
    this.render();
  }

  public updateState(partial: Partial<MobileSettingsState>): void {
    this.state = { ...this.state, ...partial };
    this.container.querySelector("#tile-theme-dark")?.classList.toggle("active", this.state.theme === "dark");
    this.container.querySelector("#tile-theme-light")?.classList.toggle("active", this.state.theme === "light");
    const fontSel = this.container.querySelector("#mobile-font-select") as HTMLSelectElement | null;
    if (fontSel && fontSel.value !== this.state.fontId) fontSel.value = this.state.fontId;
    const langSel = this.container.querySelector("#mobile-lang-select") as HTMLSelectElement | null;
    if (langSel && langSel.value !== this.state.locale) langSel.value = this.state.locale;
    const chkPreview = this.container.querySelector("#chk-always-preview") as HTMLInputElement | null;
    if (chkPreview) chkPreview.checked = this.state.alwaysPreview;
    const chkSnap = this.container.querySelector("#chk-snap-scroll") as HTMLInputElement | null;
    if (chkSnap) chkSnap.checked = this.state.snapScroll;
    const chkRefresh = this.container.querySelector("#chk-high-refresh") as HTMLInputElement | null;
    if (chkRefresh) chkRefresh.checked = this.state.highRefreshRate;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="mobile-settings-nav">
        <span class="mobile-settings-nav-title">${t("settings.title")}</span>
        <button class="mobile-settings-btn-done" id="btn-mobile-done">${t("common.done")}</button>
      </div>

      <div class="mobile-settings-scroll">
        <!-- Appearance Section -->
        <div>
          <div class="mobile-settings-section-title">${t("settings.appearance")}</div>
          <div class="mobile-settings-card">
            <div class="mobile-theme-cards">
              <div class="mobile-theme-tile tile-dark ${this.state.theme === "dark" ? "active" : ""}" id="tile-theme-dark">
                ${icons.moon}
                <span class="mobile-theme-tile-label">${t("settings.themeDark")}</span>
              </div>
              <div class="mobile-theme-tile tile-light ${this.state.theme === "light" ? "active" : ""}" id="tile-theme-light">
                ${icons.sun}
                <span class="mobile-theme-tile-label">${t("settings.themeLight")}</span>
              </div>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.language")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.languageSub")}</span>
              </div>
              <select class="mobile-font-btn" id="mobile-lang-select">
                ${SUPPORTED_LOCALES.map((l) => `<option value="${l.code}" ${l.code === this.state.locale ? "selected" : ""}>${l.nativeName}</option>`).join("")}
              </select>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.editorFont")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.fontSub")}</span>
              </div>
              <select class="mobile-font-btn" id="mobile-font-select">
                ${this.state.fonts.map((f) => `<option value="${f.id}" ${f.id === this.state.fontId ? "selected" : ""}>${f.name}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Editor Preferences Section -->
        <div>
          <div class="mobile-settings-section-title">${t("settings.preferences")}</div>
          <div class="mobile-settings-card">
            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.alwaysPreview")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.alwaysPreviewSub")}</span>
              </div>
              <label class="switch-control">
                <input type="checkbox" id="chk-always-preview" ${this.state.alwaysPreview ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.snapScroll")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.snapScrollSub")}</span>
              </div>
              <label class="switch-control">
                <input type="checkbox" id="chk-snap-scroll" ${this.state.snapScroll ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.highRefresh")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.highRefreshSub")}</span>
              </div>
              <label class="switch-control">
                <input type="checkbox" id="chk-high-refresh" ${this.state.highRefreshRate ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>

            <div class="mobile-settings-row" id="row-open-tutorial" style="cursor: pointer;">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">${t("settings.interactiveGuide")}</span>
                <span class="mobile-settings-row-subtitle">${t("settings.interactiveGuideSub")}</span>
              </div>
              <span style="color: var(--col-accent); font-weight: 600; font-size: 13px;">›</span>
            </div>
          </div>
        </div>

        <!-- About & Support Section -->
        <div>
          <div class="mobile-settings-section-title">${t("settings.about")}</div>
          <div class="mobile-settings-card mobile-about-card">
            <div class="mobile-about-brand">
              <img src="/app-icon.png" alt="Cathet" decoding="async" />
              <div>
                <div class="mobile-about-title">Cathet</div>
                <div class="mobile-about-version">v${APP_VERSION} (Android)</div>
              </div>
            </div>
            <div class="mobile-about-desc">${t("settings.aboutDesc")}</div>
            <div class="about-hairline"></div>
            <div class="about-author-row">
              <span>Made with</span>
              <span class="minimal-heart-wrap" id="btn-mobile-sprout-heart" role="button" title="Send love">${icons.heart}</span>
              <span>by</span>
              <span class="author-name-text">Kaleksanan Bagus</span>
            </div>
            <div class="mobile-about-actions">
              <button class="mobile-about-btn" id="btn-about-github">${icons.github}<span>GitHub ↗</span></button>
              <button class="mobile-about-btn" id="btn-about-website">${icons.globe}<span>Website ↗</span></button>
              <button class="mobile-about-btn" id="btn-about-saweria">${icons.coffee}<span>Saweria ↗</span></button>
              <button class="mobile-about-btn" id="btn-about-kofi">${icons.coffee}<span>Ko-fi ↗</span></button>
            </div>
            <button class="mobile-about-btn" id="btn-about-bug" style="width: 100%; margin-top: 2px;">
              ${icons.bug}<span>Report an Issue or Bug ↗</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector("#btn-mobile-done")?.addEventListener("click", () => this.callbacks.onClose());
    this.container.querySelector("#tile-theme-dark")?.addEventListener("click", () => {
      if (this.state.theme !== "dark") this.callbacks.onThemeChange("dark");
    });
    this.container.querySelector("#tile-theme-light")?.addEventListener("click", () => {
      if (this.state.theme !== "light") this.callbacks.onThemeChange("light");
    });

    const langSel = this.container.querySelector("#mobile-lang-select") as HTMLSelectElement | null;
    langSel?.addEventListener("change", () => {
      if (langSel.value) this.callbacks.onLanguageChange(langSel.value);
    });

    const fontSel = this.container.querySelector("#mobile-font-select") as HTMLSelectElement | null;
    fontSel?.addEventListener("change", () => {
      if (fontSel.value) this.callbacks.onFontChange(fontSel.value);
    });

    const bind = (id: string, cb: (v: boolean) => void) => {
      (this.container.querySelector(id) as HTMLInputElement | null)?.addEventListener("change", (e) => {
        cb((e.target as HTMLInputElement).checked);
      });
    };
    bind("#chk-always-preview", this.callbacks.onAlwaysPreviewChange);
    bind("#chk-snap-scroll", this.callbacks.onSnapScrollChange);
    bind("#chk-high-refresh", this.callbacks.onHighRefreshRateChange);

    this.container.querySelector("#row-open-tutorial")?.addEventListener("click", () => this.callbacks.onOpenTutorial());

    const openLink = (id: string, url: string) => {
      this.container.querySelector(`#${id}`)?.addEventListener("click", () => openUrl(url).catch(console.error));
    };
    openLink("btn-about-github", "https://github.com/Crlyzd/Cathet");
    openLink("btn-about-website", "https://kaleksanan.my.id");
    openLink("btn-about-saweria", "https://saweria.co/crlyzd");
    openLink("btn-about-kofi", "https://ko-fi.com/curlyzed");
    openLink("btn-about-bug", "https://github.com/Crlyzd/Cathet/issues/new");

    const heartBtn = this.container.querySelector("#btn-mobile-sprout-heart") as HTMLElement | null;
    const aboutCard = this.container.querySelector(".mobile-about-card") as HTMLElement | null;
    if (heartBtn && aboutCard) {
      this.heartSproutCleanup?.();
      this.heartSproutCleanup = attachHeartSprout(heartBtn, aboutCard);
    }
  }

  destroy(): void {
    this.heartSproutCleanup?.();
    this.heartSproutCleanup = null;
    this.container.innerHTML = "";
  }
}
