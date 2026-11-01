import { icons } from "../utils/monochromeIcons";
import { APP_VERSION } from "../version";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface MobileSettingsState {
  theme: "dark" | "light";
  fontId: string;
  alwaysPreview: boolean;
  snapScroll: boolean;
  fonts: { id: string; name: string }[];
}

export interface MobileSettingsCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onAlwaysPreviewChange: (enabled: boolean) => void;
  onSnapScrollChange: (enabled: boolean) => void;
  onOpenTutorial: () => void;
  onClose: () => void;
}

/**
 * MobileSettingsView — Mobile-native preferences bottom sheet for Cathet Android.
 * Replaces the desktop window layout with touch-first inset grouped sections.
 */
export class MobileSettingsView {
  private container: HTMLElement;
  private state: MobileSettingsState;
  private callbacks: MobileSettingsCallbacks;

  constructor(
    container: HTMLElement,
    initialState: MobileSettingsState,
    callbacks: MobileSettingsCallbacks
  ) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;
    this.render();
  }

  public updateState(partial: Partial<MobileSettingsState>): void {
    this.state = { ...this.state, ...partial };
    this.container.querySelector("#tile-theme-dark")?.classList.toggle("active", this.state.theme === "dark");
    this.container.querySelector("#tile-theme-light")?.classList.toggle("active", this.state.theme === "light");
    const fontSelect = this.container.querySelector("#mobile-font-select") as HTMLSelectElement | null;
    if (fontSelect && fontSelect.value !== this.state.fontId) fontSelect.value = this.state.fontId;
    const chkPreview = this.container.querySelector("#chk-always-preview") as HTMLInputElement | null;
    if (chkPreview) chkPreview.checked = this.state.alwaysPreview;
    const chkSnap = this.container.querySelector("#chk-snap-scroll") as HTMLInputElement | null;
    if (chkSnap) chkSnap.checked = this.state.snapScroll;
  }

  private render(): void {
    const currentFont =
      this.state.fonts.find((f) => f.id === this.state.fontId)?.name ||
      "Segoe UI";

    this.container.innerHTML = `
      <div class="mobile-settings-nav">
        <span class="mobile-settings-nav-title">Settings</span>
        <button class="mobile-settings-btn-done" id="btn-mobile-done">Done</button>
      </div>

      <div class="mobile-settings-scroll">
        <!-- Appearance Section -->
        <div>
          <div class="mobile-settings-section-title">Appearance</div>
          <div class="mobile-settings-card">
            <div class="mobile-theme-cards">
              <div class="mobile-theme-tile tile-dark ${this.state.theme === "dark" ? "active" : ""}" id="tile-theme-dark">
                ${icons.moon}
                <span class="mobile-theme-tile-label">Dark Mode</span>
              </div>
              <div class="mobile-theme-tile tile-light ${this.state.theme === "light" ? "active" : ""}" id="tile-theme-light">
                ${icons.sun}
                <span class="mobile-theme-tile-label">Light Mode</span>
              </div>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">Editor Typography</span>
                <span class="mobile-settings-row-subtitle">Writing & reading font</span>
              </div>
              <select class="mobile-font-btn" id="mobile-font-select">
                ${this.state.fonts
                  .map(
                    (f) =>
                      `<option value="${f.id}" ${f.id === this.state.fontId ? "selected" : ""}>${f.name}</option>`
                  )
                  .join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Editor Preferences Section -->
        <div>
          <div class="mobile-settings-section-title">Editor Preferences</div>
          <div class="mobile-settings-card">
            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">Always Open in Preview</span>
                <span class="mobile-settings-row-subtitle">Open markdown files rendered</span>
              </div>
              <label class="switch-control">
                <input type="checkbox" id="chk-always-preview" ${this.state.alwaysPreview ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>

            <div class="mobile-settings-row">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">Dual Pane Snap Scroll</span>
                <span class="mobile-settings-row-subtitle">Snap follower pane on re-lock</span>
              </div>
              <label class="switch-control">
                <input type="checkbox" id="chk-snap-scroll" ${this.state.snapScroll ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>

            <div class="mobile-settings-row" id="row-open-tutorial" style="cursor: pointer;">
              <div class="mobile-settings-row-left">
                <span class="mobile-settings-row-title">Offline Interactive Guide</span>
                <span class="mobile-settings-row-subtitle">Markdown tips & shortcut reference</span>
              </div>
              <span style="color: var(--col-accent); font-weight: 600; font-size: 13px;">View ›</span>
            </div>
          </div>
        </div>

        <!-- About & Support Section -->
        <div>
          <div class="mobile-settings-section-title">About & Support</div>
          <div class="mobile-settings-card mobile-about-card">
            <div class="mobile-about-brand">
              <img src="/app-icon.png" alt="Cathet" decoding="async" />
              <div>
                <div class="mobile-about-title">Cathet</div>
                <div class="mobile-about-version">v${APP_VERSION} (Android)</div>
              </div>
            </div>

            <div class="mobile-about-desc">
              Lightweight, distraction-free text & markdown editor crafted for speed and elegance.
              Made with ❤️ by <strong>Kaleksanan Bagus</strong>.
            </div>

            <div class="mobile-about-actions">
              <button class="mobile-about-btn" id="btn-about-github">
                ${icons.github}<span>GitHub ↗</span>
              </button>
              <button class="mobile-about-btn" id="btn-about-website">
                ${icons.globe}<span>Website ↗</span>
              </button>
              <button class="mobile-about-btn" id="btn-about-saweria">
                ${icons.coffee}<span>Saweria ↗</span>
              </button>
              <button class="mobile-about-btn" id="btn-about-paypal">
                ${icons.coffee}<span>PayPal ↗</span>
              </button>
            </div>

            <button class="mobile-about-btn" id="btn-about-bug" style="width: 100%; margin-top: 2px;">
              ${icons.bug}<span>Report an Issue or Bug ↗</span>
            </button>

            <div class="mobile-about-meta">
              Engine: Tauri v2 • Android WebView & TypeScript
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector("#btn-mobile-done")?.addEventListener("click", () => {
      this.callbacks.onClose();
    });

    this.container.querySelector("#tile-theme-dark")?.addEventListener("click", () => {
      if (this.state.theme !== "dark") this.callbacks.onThemeChange("dark");
    });

    this.container.querySelector("#tile-theme-light")?.addEventListener("click", () => {
      if (this.state.theme !== "light") this.callbacks.onThemeChange("light");
    });

    const fontSelect = this.container.querySelector("#mobile-font-select") as HTMLSelectElement | null;
    fontSelect?.addEventListener("change", () => {
      if (fontSelect.value) this.callbacks.onFontChange(fontSelect.value);
    });

    const chkPreview = this.container.querySelector("#chk-always-preview") as HTMLInputElement | null;
    chkPreview?.addEventListener("change", () => {
      this.callbacks.onAlwaysPreviewChange(chkPreview.checked);
    });

    const chkSnap = this.container.querySelector("#chk-snap-scroll") as HTMLInputElement | null;
    chkSnap?.addEventListener("change", () => {
      this.callbacks.onSnapScrollChange(chkSnap.checked);
    });

    this.container.querySelector("#row-open-tutorial")?.addEventListener("click", () => {
      this.callbacks.onOpenTutorial();
    });

    const openLink = (id: string, url: string) => {
      this.container.querySelector(`#${id}`)?.addEventListener("click", () => {
        openUrl(url).catch(console.error);
      });
    };

    openLink("btn-about-github", "https://github.com/Crlyzd/Cathet");
    openLink("btn-about-website", "https://kaleksanan.my.id");
    openLink("btn-about-saweria", "https://saweria.co/crlyzd");
    openLink("btn-about-paypal", "https://paypal.me/kaleksanan");
    openLink("btn-about-bug", "https://github.com/Crlyzd/Cathet/issues/new");
  }

  destroy(): void {
    this.container.innerHTML = "";
  }
}
