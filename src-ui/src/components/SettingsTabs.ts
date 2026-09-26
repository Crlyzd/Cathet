import { icons } from "../utils/monochromeIcons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { APP_VERSION } from "../version";
import {
  SettingsPaneComponent,
  SettingsPaneCallbacks,
  SettingsPaneState,
} from "./settings/SettingsPane";
import { AboutPaneComponent } from "./settings/AboutPane";
import { FontOption } from "./settings/FontSelect";

export interface SettingsTabCallbacks extends SettingsPaneCallbacks {
  onOpenTutorial: () => void;
  onClose: () => void;
}

export interface SettingsInitialState {
  theme: "dark" | "light";
  fontId: string;
  isAlwaysOnTop: boolean;
  fonts: FontOption[];
  updateAvailable: boolean;
  latestVersion?: string;
  isRegistered?: boolean;
  currentExePath?: string;
  registeredExePath?: string | null;
}

export class SettingsTabsComponent {
  private container: HTMLElement;
  private callbacks: SettingsTabCallbacks;
  private state: SettingsInitialState;
  private activeTab: "settings" | "about" = "settings";

  private downloadState: "idle" | "downloading" | "ready" = "idle";
  private downloadPercent: number = 0;

  private settingsPane: SettingsPaneComponent | null = null;
  private aboutPane: AboutPaneComponent | null = null;

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

  public updateState(partial: Partial<SettingsInitialState>): void {
    this.state = { ...this.state, ...partial };
    this.settingsPane?.updateState({
      ...partial,
      downloadState: this.downloadState,
      downloadPercent: this.downloadPercent,
    });
  }

  public setDownloadProgress(percent: number): void {
    this.downloadState = percent >= 100 ? "ready" : "downloading";
    this.downloadPercent = percent;
    this.settingsPane?.updateState({
      downloadState: this.downloadState,
      downloadPercent: this.downloadPercent,
    });
  }

  private render(): void {
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
          <div class="settings-header-actions">
            <button class="settings-header-btn" id="btn-header-tutorial" title="Open Interactive Tutorial & Shortcuts">
              ${icons.book}
              <span>Tutorial</span>
            </button>
            <button class="settings-close-btn" id="settings-close-btn" title="Close">
              ${icons.close}
            </button>
          </div>
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
          <div class="tab-pane ${this.activeTab === "settings" ? "active" : ""}" id="pane-settings"></div>
          <div class="tab-pane ${this.activeTab === "about" ? "active" : ""}" id="pane-about"></div>
        </div>
      </div>
    `;

    const settingsContainer = this.container.querySelector("#pane-settings") as HTMLElement;
    const aboutContainer = this.container.querySelector("#pane-about") as HTMLElement;

    if (settingsContainer) {
      const paneState: SettingsPaneState = {
        ...this.state,
        downloadState: this.downloadState,
        downloadPercent: this.downloadPercent,
      };
      this.settingsPane = new SettingsPaneComponent(settingsContainer, paneState, this.callbacks);
    }

    if (aboutContainer) {
      this.aboutPane = new AboutPaneComponent(aboutContainer);
    }

    this.bindEvents();
  }

  private switchTab(tab: "settings" | "about"): void {
    this.activeTab = tab;
    const btnSettings = this.container.querySelector("#tab-btn-settings");
    const btnAbout = this.container.querySelector("#tab-btn-about");
    const paneSettings = this.container.querySelector("#pane-settings");
    const paneAbout = this.container.querySelector("#pane-about");

    btnSettings?.classList.toggle("active", tab === "settings");
    btnAbout?.classList.toggle("active", tab === "about");
    paneSettings?.classList.toggle("active", tab === "settings");
    paneAbout?.classList.toggle("active", tab === "about");
  }

  private bindEvents(): void {
    const header = this.container.querySelector("#settings-header");
    header?.addEventListener("mousedown", async (e: Event) => {
      const me = e as MouseEvent;
      if (
        (me.target as HTMLElement)?.closest("#settings-close-btn") ||
        (me.target as HTMLElement)?.closest("#btn-header-tutorial")
      ) {
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

    this.container.querySelector("#tab-btn-settings")?.addEventListener("click", () => {
      this.switchTab("settings");
    });

    this.container.querySelector("#tab-btn-about")?.addEventListener("click", () => {
      this.switchTab("about");
    });

    this.container.querySelector("#settings-close-btn")?.addEventListener("click", () => {
      this.callbacks.onClose();
    });

    this.container.querySelector("#btn-header-tutorial")?.addEventListener("click", () => {
      this.callbacks.onOpenTutorial();
    });
  }

  public destroy(): void {
    this.settingsPane?.destroy();
    this.settingsPane = null;
    this.aboutPane = null;
  }
}
