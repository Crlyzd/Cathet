import { PlatformService } from "./platformService";
import { SettingsModalComponent } from "../components/SettingsModal";
import { MobileActionBarComponent } from "../components/MobileActionBar";
import { listen } from "@tauri-apps/api/event";

export interface MobileCoordinatorActions {
  onToggleMarkdown: () => void;
  onSave: () => void;
  onOpen: () => void;
  onToggleDualPane: () => void;
  onOpenTutorial: () => void;
  onFontChanged: (fontFamily: string) => void;
}

export class MobileCoordinator {
  private platform = PlatformService.getInstance();
  private settingsModal: SettingsModalComponent | null = null;
  private actionBar: MobileActionBarComponent | null = null;
  private actions: MobileCoordinatorActions;

  constructor(actions: MobileCoordinatorActions) {
    this.actions = actions;
    this.init();
  }

  private init(): void {
    this.platform.applyPlatformClasses();

    this.settingsModal = new SettingsModalComponent({
      onOpenTutorial: this.actions.onOpenTutorial,
      onFontChanged: this.actions.onFontChanged,
    });

    listen("cathet:open-settings-modal", () => {
      this.settingsModal?.show();
    }).catch(console.error);

    if (this.platform.isMobile()) {
      this.actionBar = new MobileActionBarComponent("app", {
        onToggleMarkdown: this.actions.onToggleMarkdown,
        onSave: this.actions.onSave,
        onOpen: this.actions.onOpen,
        onToggleDualPane: this.actions.onToggleDualPane,
        onOpenSettings: () => this.openSettings(),
      });
    }
  }

  openSettings(): void {
    this.settingsModal?.show();
  }

  setMarkdownState(isPreview: boolean): void {
    this.actionBar?.setMarkdownPreviewState(isPreview);
  }

  setDualPaneState(isDual: boolean): void {
    this.actionBar?.setDualPaneState(isDual);
  }

  isMobile(): boolean {
    return this.platform.isMobile();
  }
}

