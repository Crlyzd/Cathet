import { icons } from "../../utils/monochromeIcons";
import { APP_VERSION } from "../../version";
import { FontSelectComponent, FontOption } from "./FontSelect";

export interface SettingsPaneCallbacks {
  onThemeChange: (theme: "dark" | "light") => void;
  onFontChange: (fontId: string) => void;
  onAlwaysOnTopChange: (enabled: boolean) => void;
  onAlwaysPreviewChange: (enabled: boolean) => void;
  onConfigureDefaultApp: () => Promise<void>;
  onUnregisterDefaultApp: () => Promise<void>;
  onCheckUpdates: () => Promise<void>;
  onStartDownload: () => Promise<void>;
  onInstallAndRestart: () => Promise<void>;
}

export interface SettingsPaneState {
  theme: "dark" | "light";
  fontId: string;
  isAlwaysOnTop: boolean;
  alwaysPreview: boolean;
  fonts: FontOption[];
  updateAvailable: boolean;
  latestVersion?: string;
  isRegistered?: boolean;
  currentExePath?: string;
  registeredExePath?: string | null;
  downloadState: "idle" | "downloading" | "ready";
  downloadPercent: number;
}

export class SettingsPaneComponent {
  private container: HTMLElement;
  private state: SettingsPaneState;
  private callbacks: SettingsPaneCallbacks;
  private fontSelect: FontSelectComponent | null = null;

  constructor(container: HTMLElement, state: SettingsPaneState, callbacks: SettingsPaneCallbacks) {
    this.container = container;
    this.state = state;
    this.callbacks = callbacks;
    this.render();
  }

  public updateFontUI(fontId: string): void {
    this.fontSelect?.updateUI(fontId);
  }

  public updateState(partial: Partial<SettingsPaneState>): void {
    this.state = { ...this.state, ...partial };
    if (Object.keys(partial).length === 1 && partial.fontId !== undefined) {
      this.updateFontUI(partial.fontId);
      return;
    }
    this.render();
  }

  private getUpdateHtml(): string {
    if (this.state.downloadState === "downloading") {
      return `
        <div class="update-progress-wrap">
          <div class="update-progress-track">
            <div class="update-progress-fill" style="width: ${this.state.downloadPercent}%"></div>
          </div>
          <span class="update-progress-info">${this.state.downloadPercent.toFixed(0)}%</span>
        </div>`;
    }
    if (this.state.downloadState === "ready") {
      return `<button class="glass-btn update-ready" id="btn-restart-install">Restart & Install</button>`;
    }
    if (this.state.updateAvailable) {
      return `<button class="glass-btn update-ready" id="btn-start-download">Download Update</button>`;
    }
    return `<button class="glass-btn" id="btn-check-updates">Check Updates</button>`;
  }

  private render(): void {
    if (this.fontSelect) {
      this.fontSelect.destroy();
      this.fontSelect = null;
    }

    const activePath = this.state.registeredExePath || this.state.currentExePath || "";
    const prefix = this.state.isRegistered ? "Registered: " : "Path: ";
    const truncated = activePath.length > 28 ? "..." + activePath.slice(-25) : activePath;
    const defaultAppSubtext = activePath ? `${prefix}${truncated}` : "Set as default for .txt & .md";

    this.container.innerHTML = `
      <div class="settings-card">
        <!-- Theme Row -->
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Interface Theme</span>
            <span class="setting-subtext">Dark or light appearance</span>
          </div>
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${this.state.theme === "dark" ? "active" : ""}" id="btn-theme-dark">
              ${icons.moon}<span>Dark</span>
            </button>
            <button class="pill-toggle-btn ${this.state.theme === "light" ? "active" : ""}" id="btn-theme-light">
              ${icons.sun}<span>Light</span>
            </button>
          </div>
        </div>

        <!-- Font Row -->
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Editor Font</span>
            <span class="setting-subtext">Writing & reading typography</span>
          </div>
          <div id="font-select-mount"></div>
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

        <!-- Markdown Preview Row -->
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Markdown Preview</span>
            <span class="setting-subtext">Always open in preview mode</span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="always-preview-checkbox" ${this.state.alwaysPreview ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        <!-- Default Application Row -->
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Default Application</span>
            <span class="setting-subtext" id="default-app-subtext" title="${prefix}${activePath}">
              ${defaultAppSubtext}
            </span>
          </div>
          <div class="default-app-actions">
            ${
              this.state.isRegistered
                ? `<button class="glass-btn" id="btn-unregister-default-app" title="Remove Cathet file associations">Unregister</button>`
                : `<button class="glass-btn" id="btn-set-default-app">Set as Default</button>`
            }
          </div>
        </div>

        <!-- Updates Row -->
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Application Updates</span>
            <span class="setting-subtext" id="update-status-text">
              ${
                this.state.downloadState === "downloading"
                  ? "Downloading update payload..."
                  : this.state.downloadState === "ready"
                  ? "Download complete!"
                  : this.state.updateAvailable
                  ? `v${this.state.latestVersion || "3.0"} ready`
                  : `Up to date (v${APP_VERSION})`
              }
            </span>
          </div>
          ${this.getUpdateHtml()}
        </div>
      </div>
    `;

    const fontMount = this.container.querySelector("#font-select-mount") as HTMLElement | null;
    if (fontMount) {
      this.fontSelect = new FontSelectComponent(
        fontMount,
        this.state.fonts,
        this.state.fontId,
        (fontId) => this.callbacks.onFontChange(fontId)
      );
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector("#btn-theme-dark")?.addEventListener("click", () => {
      if (this.state.theme !== "dark") this.callbacks.onThemeChange("dark");
    });

    this.container.querySelector("#btn-theme-light")?.addEventListener("click", () => {
      if (this.state.theme !== "light") this.callbacks.onThemeChange("light");
    });

    const ontopCheckbox = this.container.querySelector("#ontop-checkbox") as HTMLInputElement | null;
    ontopCheckbox?.addEventListener("change", () => {
      this.callbacks.onAlwaysOnTopChange(ontopCheckbox.checked);
    });

    const previewCheckbox = this.container.querySelector("#always-preview-checkbox") as HTMLInputElement | null;
    previewCheckbox?.addEventListener("change", () => {
      this.callbacks.onAlwaysPreviewChange(previewCheckbox.checked);
    });

    const bindAsyncBtn = (id: string, action: () => Promise<void>) => {
      this.container.querySelector(id)?.addEventListener("click", async (e) => {
        const btn = e.currentTarget as HTMLButtonElement | null;
        if (btn) btn.disabled = true;
        try {
          await action();
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    };

    bindAsyncBtn("#btn-set-default-app", () => this.callbacks.onConfigureDefaultApp());
    bindAsyncBtn("#btn-unregister-default-app", () => this.callbacks.onUnregisterDefaultApp());
    bindAsyncBtn("#btn-check-updates", () => this.callbacks.onCheckUpdates());

    this.container.querySelector("#btn-start-download")?.addEventListener("click", () => this.callbacks.onStartDownload());
    this.container.querySelector("#btn-restart-install")?.addEventListener("click", () => this.callbacks.onInstallAndRestart());
  }

  public destroy(): void {
    this.fontSelect?.destroy();
    this.fontSelect = null;
  }
}
