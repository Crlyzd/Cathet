import { PlatformService } from "./platformService";
import { SettingsModalComponent } from "../components/SettingsModal";
import { MobileActionBarComponent, MobileSyncMode } from "../components/MobileActionBar";
import { MobileMenuDrawerComponent, MobileDrawerState } from "../components/MobileMenuDrawer";
import { listen } from "@tauri-apps/api/event";

export interface MobileCoordinatorActions {
  onToggleMarkdown: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onNewDocument: () => void;
  onOpen: () => void;
  onToggleDualPane: () => void;
  onOpenTutorial: () => void;
  onFontChanged: (fontFamily: string) => void;
  onToggleSync?: (mode: MobileSyncMode) => void;
  onSnapScrollChanged?: (enabled: boolean) => void;
}

export class MobileCoordinator {
  private platform = PlatformService.getInstance();
  private settingsModal: SettingsModalComponent | null = null;
  private menuDrawer: MobileMenuDrawerComponent | null = null;
  private actionBar: MobileActionBarComponent | null = null;
  private actions: MobileCoordinatorActions;

  constructor(actions: MobileCoordinatorActions) {
    this.actions = actions;
    this.init();
  }

  private init(): void {
    this.platform.applyPlatformClasses();

    if (this.platform.isMobile()) {
      this.actionBar = new MobileActionBarComponent("app", {
        onToggleMarkdown: this.actions.onToggleMarkdown,
        onSave: this.actions.onSave,
        onOpen: this.actions.onOpen,
        onToggleDualPane: this.actions.onToggleDualPane,
        onOpenSettings: () => this.openSettings(),
        onToggleSync: (mode) => this.actions.onToggleSync?.(mode),
      });

      // Auto-collapse dock on editor scrolling so it never obscures reading or typing
      document.addEventListener("scroll", () => this.actionBar?.collapse(), { capture: true, passive: true });
    }

    // Stagger heavy secondary modals (Settings & Drawer) off Frame 0 to eliminate cold boot jank
    const mountSecondary = () => {
      if (!this.settingsModal) {
        this.settingsModal = new SettingsModalComponent({
          onOpenTutorial: this.actions.onOpenTutorial,
          onFontChanged: this.actions.onFontChanged,
          onSnapScrollChange: (enabled) => this.actions.onSnapScrollChanged?.(enabled),
        });
      }
      if (this.platform.isMobile() && !this.menuDrawer) {
        this.menuDrawer = new MobileMenuDrawerComponent({
          onNewDocument: this.actions.onNewDocument,
          onOpen: this.actions.onOpen,
          onSave: this.actions.onSave,
          onSaveAs: this.actions.onSaveAs,
          onToggleDualPane: this.actions.onToggleDualPane,
          onToggleMarkdown: this.actions.onToggleMarkdown,
          onOpenSettings: () => this.openSettings(),
        });
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(mountSecondary);
    } else {
      setTimeout(mountSecondary, 350);
    }

    listen("cathet:open-settings-modal", () => {
      this.openSettings();
    }).catch(console.error);
  }

  openSettings(): void {
    if (!this.settingsModal) {
      this.settingsModal = new SettingsModalComponent({
        onOpenTutorial: this.actions.onOpenTutorial,
        onFontChanged: this.actions.onFontChanged,
        onSnapScrollChange: (enabled) => this.actions.onSnapScrollChanged?.(enabled),
      });
    }
    this.menuDrawer?.hideInstant();
    this.settingsModal.show();
  }

  openMenu(state: MobileDrawerState): void {
    this.menuDrawer?.show(state);
  }

  isMenuOpen(): boolean {
    return !!this.menuDrawer?.isOpen();
  }

  setMarkdownState(isPreview: boolean): void {
    this.actionBar?.setMarkdownPreviewState(isPreview);
  }

  setDualPaneState(isDual: boolean): void {
    this.actionBar?.setDualPaneState(isDual);
  }

  setActionBarVisible(visible: boolean): void {
    this.actionBar?.setVisible(visible);
  }

  setSyncState(isLocked: boolean, snapScroll?: boolean): void {
    this.actionBar?.setSyncState(isLocked, snapScroll);
  }

  isMobile(): boolean {
    return this.platform.isMobile();
  }

  updateSettingsSnapScroll(enabled: boolean): void {
    this.settingsModal?.updateSnapScroll(enabled);
  }

  destroy(): void {
    this.settingsModal?.destroy();
    this.menuDrawer?.destroy();
    this.actionBar?.destroy();
  }
}
