import { icons } from "../utils/monochromeIcons";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { APP_VERSION } from "../version";

export interface SettingsTabCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onAlwaysOnTopChange: (enabled: boolean) => void;
  onCheckUpdates: () => Promise<void>;
  onStartDownload: () => Promise<void>;
  onInstallAndRestart: () => Promise<void>;
  onClose: () => void;
}

export interface SettingsInitialState {
  theme: "dark" | "light";
  fontId: string;
  isAlwaysOnTop: boolean;
  fonts: { id: string; name: string }[];
  updateAvailable: boolean;
  latestVersion?: string;
}

export class SettingsTabsComponent {
  private container: HTMLElement;
  private callbacks: SettingsTabCallbacks;
  private state: SettingsInitialState;
  private activeTab: "settings" | "about" = "settings";

  private downloadState: "idle" | "downloading" | "ready" = "idle";
  private downloadPercent: number = 0;

  constructor(
    container: HTMLElement,
    initialState: SettingsInitialState,
    callbacks: SettingsTabCallbacks
  ) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;
    this.render();
  }

  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  public updateState(partial: Partial<SettingsInitialState>): void {
    this.state = { ...this.state, ...partial };
    if (Object.keys(partial).length === 1 && partial.fontId !== undefined) {
      this.updateFontUI(partial.fontId);
      return;
    }
    this.render();
  }

  private updateFontUI(fontId: string): void {
    const font = this.state.fonts.find((f) => f.id === fontId);
    const label = this.container.querySelector("#font-select-label");
    if (label && font) label.textContent = font.name;
    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      const isSelected = opt.getAttribute("data-font-id") === fontId;
      opt.classList.toggle("selected", isSelected);
      const existingCheck = opt.querySelector(".option-check");
      if (isSelected && !existingCheck) {
        const check = document.createElement("span");
        check.className = "option-check";
        check.innerHTML = icons.check;
        opt.appendChild(check);
      } else if (!isSelected && existingCheck) {
        existingCheck.remove();
      }
    });
  }

  public setDownloadProgress(percent: number): void {
    this.downloadState = percent >= 100 ? "ready" : "downloading";
    this.downloadPercent = percent;
    this.render();
  }

  private render(): void {
    let updateActionHtml = "";
    if (this.downloadState === "downloading") {
      updateActionHtml = `
        <div class="update-progress-wrap">
          <div class="update-progress-track">
            <div class="update-progress-fill" style="width: ${this.downloadPercent}%"></div>
          </div>
          <span class="update-progress-info">${this.downloadPercent.toFixed(0)}%</span>
        </div>
      `;
    } else if (this.downloadState === "ready") {
      updateActionHtml = `
        <button class="glass-btn update-ready" id="btn-restart-install">
          Restart & Install
        </button>
      `;
    } else if (this.state.updateAvailable) {
      updateActionHtml = `
        <button class="glass-btn update-ready" id="btn-start-download">
          Download Update
        </button>
      `;
    } else {
      updateActionHtml = `
        <button class="glass-btn" id="btn-check-updates">
          Check Updates
        </button>
      `;
    }

    this.container.innerHTML = `
      <div class="settings-window">
        <!-- Compact Draggable Header -->
        <div class="settings-header" id="settings-header" data-tauri-drag-region>
          <div class="settings-brand" data-tauri-drag-region>
            <div class="settings-app-icon" data-tauri-drag-region>
              <img src="/app-icon.png" class="settings-header-icon-img" alt="Cathet" data-tauri-drag-region />
            </div>
            <div class="settings-app-meta" data-tauri-drag-region>
              <span class="settings-app-title" data-tauri-drag-region>Cathet</span>
              <span class="settings-app-subtitle" data-tauri-drag-region>v${APP_VERSION} (x64)</span>
            </div>
          </div>
          <button class="settings-close-btn" id="settings-close-btn" title="Close">
            ${icons.close}
          </button>
        </div>

        <!-- Segmented Capsule Tab Control -->
        <div class="tabs-nav-wrap">
          <div class="segmented-nav">
            <button class="segmented-tab ${this.activeTab === "settings" ? "active" : ""}" id="tab-btn-settings">
              ${icons.settings}
              <span>Settings</span>
            </button>
            <button class="segmented-tab ${this.activeTab === "about" ? "active" : ""}" id="tab-btn-about">
              ${icons.about}
              <span>About</span>
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="settings-content">
          <!-- Settings Pane -->
          <div class="tab-pane ${this.activeTab === "settings" ? "active" : ""}" id="pane-settings">
            <div class="settings-card">
              <!-- Theme Row -->
              <div class="setting-item">
                <div class="setting-meta">
                  <span class="setting-title">Interface Theme</span>
                  <span class="setting-subtext">Dark or light appearance</span>
                </div>
                <div class="pill-toggle-group">
                  <button class="pill-toggle-btn ${this.state.theme === "dark" ? "active" : ""}" id="btn-theme-dark">
                    ${icons.moon}
                    <span>Dark</span>
                  </button>
                  <button class="pill-toggle-btn ${this.state.theme === "light" ? "active" : ""}" id="btn-theme-light">
                    ${icons.sun}
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <!-- Font Row -->
              <div class="setting-item">
                <div class="setting-meta">
                  <span class="setting-title">Editor Font</span>
                  <span class="setting-subtext">Writing & reading typography</span>
                </div>
                <div class="glass-select-container" id="font-select-container">
                  <button class="glass-select-trigger" id="font-select-trigger" type="button">
                    <span class="glass-select-label" id="font-select-label">${this.state.fonts.find((f) => f.id === this.state.fontId)?.name || "Segoe UI"}</span>
                    <span class="glass-select-arrow">${icons.chevronDown}</span>
                  </button>
                  <div class="glass-select-menu" id="font-select-menu">
                    ${this.state.fonts
                      .map(
                        (f) => `
                      <div class="glass-select-option ${f.id === this.state.fontId ? "selected" : ""}" data-font-id="${f.id}">
                        <span class="option-name">${f.name}</span>
                        ${f.id === this.state.fontId ? `<span class="option-check">${icons.check}</span>` : ""}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              </div>

              <!-- Stay on Top Row -->
              <div class="setting-item">
                <div class="setting-meta">
                  <span class="setting-title">Stay on Top</span>
                  <span class="setting-subtext">Pin window (Ctrl+T)</span>
                </div>
                <label class="switch-control">
                  <input type="checkbox" id="ontop-checkbox" ${this.state.isAlwaysOnTop ? "checked" : ""} />
                  <span class="switch-track"></span>
                </label>
              </div>

              <!-- Updates Row -->
              <div class="setting-item">
                <div class="setting-meta">
                  <span class="setting-title">Application Updates</span>
                  <span class="setting-subtext" id="update-status-text">
                    ${
                      this.downloadState === "downloading"
                        ? "Downloading update payload..."
                        : this.downloadState === "ready"
                        ? "Download complete!"
                        : this.state.updateAvailable
                        ? `v${this.state.latestVersion || "3.0"} ready`
                        : `Up to date (v${APP_VERSION})`
                    }
                  </span>
                </div>
                ${updateActionHtml}
              </div>
            </div>
          </div>

          <!-- Redesigned About Pane -->
          <div class="tab-pane ${this.activeTab === "about" ? "active" : ""}" id="pane-about">
            <div class="settings-card">
              <div class="about-box">
                <!-- App Title & Icon Header -->
                <div class="about-hero-header">
                  <img src="/app-icon.png" class="about-hero-icon-img" alt="Cathet" />
                  <span class="about-hero-title">Cathet</span>
                </div>

                <!-- Short App Description -->
                <div class="about-desc">
                  Lightweight, distraction-free text & markdown editor crafted with native Windows frosted glass.
                </div>

                <div class="about-hairline"></div>

                <!-- Author Row (matching Image 2) -->
                <div class="about-author-row">
                  <span>Made with</span>
                  <span class="minimal-heart-wrap">${icons.heart}</span>
                  <span>by</span>
                  <a class="author-name-link" id="link-author">Kaleksanan Bagus</a>
                </div>

                <!-- Coffee Row with Capsule (matching Image 2) -->
                <div class="about-coffee-row">
                  <span class="coffee-icon-wrap">${icons.coffee}</span>
                  <span class="coffee-label">Buy me a coffee:</span>
                  <div class="coffee-capsule">
                    <button class="capsule-link" id="link-saweria">
                      <span>Saweria</span>
                      ${icons.external}
                    </button>
                    <span class="capsule-slash">/</span>
                    <button class="capsule-link" id="link-paypal">
                      <span>PayPal</span>
                      ${icons.external}
                    </button>
                  </div>
                </div>

                <div class="about-hairline"></div>

                <!-- Standalone Bug Report -->
                <div class="about-bug-row">
                  <button class="standalone-bug-btn" id="link-bug">
                    <span class="bug-icon-wrap">${icons.bug}</span>
                    <span>Report an Issue or Bug</span>
                    ${icons.external}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Compact Footer Attribution -->
        <div class="settings-footer-bar">
          <span>Engine: Tauri v2 • Rust Tokio</span>
          <span>Webview2 & TypeScript</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Header drag handler (allows dragging anywhere in the titlebar, including text & icon)
    const header = this.container.querySelector("#settings-header");
    header?.addEventListener("mousedown", async (e: Event) => {
      const me = e as MouseEvent;
      if ((me.target as HTMLElement)?.closest("#settings-close-btn")) {
        return;
      }
      if (me.button === 0) {
        try {
          await getCurrentWindow().startDragging();
        } catch (err) {
          console.warn("Drag failed:", err);
        }
      }
    });

    // Tab Switching
    this.container.querySelector("#tab-btn-settings")?.addEventListener("click", () => {
      this.activeTab = "settings";
      this.render();
    });

    this.container.querySelector("#tab-btn-about")?.addEventListener("click", () => {
      this.activeTab = "about";
      this.render();
    });

    // Close button
    this.container.querySelector("#settings-close-btn")?.addEventListener("click", () => {
      this.callbacks.onClose();
    });

    // Theme toggles
    this.container.querySelector("#btn-theme-dark")?.addEventListener("click", () => {
      if (this.state.theme !== "dark") {
        this.callbacks.onThemeChange("dark");
      }
    });

    this.container.querySelector("#btn-theme-light")?.addEventListener("click", () => {
      if (this.state.theme !== "light") {
        this.callbacks.onThemeChange("light");
      }
    });

    // Custom Frosted Glass Font Dropdown
    const trigger = this.container.querySelector("#font-select-trigger") as HTMLButtonElement | null;
    const menu = this.container.querySelector("#font-select-menu") as HTMLElement | null;
    const selectContainer = this.container.querySelector("#font-select-container") as HTMLElement | null;

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu?.classList.contains("open");
      if (isOpen) {
        menu?.classList.remove("open");
        trigger.classList.remove("open");
      } else {
        menu?.classList.add("open");
        trigger.classList.add("open");
      }
    });

    // Close dropdown on outside click
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
    }
    this.outsideClickHandler = (e: MouseEvent) => {
      if (!selectContainer?.contains(e.target as Node)) {
        menu?.classList.remove("open");
        trigger?.classList.remove("open");
      }
    };
    document.addEventListener("click", this.outsideClickHandler);

    // Option selection
    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const fontId = opt.getAttribute("data-font-id");
        if (fontId) {
          menu?.classList.remove("open");
          trigger?.classList.remove("open");
          this.callbacks.onFontChange(fontId);
        }
      });
    });

    // Stay on top
    const ontopCheckbox = this.container.querySelector("#ontop-checkbox") as HTMLInputElement | null;
    ontopCheckbox?.addEventListener("change", () => {
      this.callbacks.onAlwaysOnTopChange(ontopCheckbox.checked);
    });

    // Check updates button
    this.container.querySelector("#btn-check-updates")?.addEventListener("click", async () => {
      const btn = this.container.querySelector("#btn-check-updates") as HTMLButtonElement | null;
      if (btn) btn.disabled = true;
      try {
        await this.callbacks.onCheckUpdates();
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    // Start download button
    this.container.querySelector("#btn-start-download")?.addEventListener("click", async () => {
      await this.callbacks.onStartDownload();
    });

    // Restart & Install button
    this.container.querySelector("#btn-restart-install")?.addEventListener("click", async () => {
      await this.callbacks.onInstallAndRestart();
    });

    // External Links (About Tab)
    this.container.querySelector("#link-author")?.addEventListener("click", () => {
      openUrl("https://kaleksananbagus.com/");
    });

    this.container.querySelector("#link-saweria")?.addEventListener("click", () => {
      openUrl("https://saweria.co/curlyzed");
    });

    this.container.querySelector("#link-paypal")?.addEventListener("click", () => {
      openUrl("https://paypal.me/BagusMassani");
    });

    this.container.querySelector("#link-bug")?.addEventListener("click", () => {
      openUrl("https://docs.google.com/forms/d/e/1FAIpQLSf9RoZ7ANybXnsOQMyCAFXxSB85rJxr2z767aPOk_gECioiMg/viewform");
    });
  }
}
