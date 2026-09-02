import { MenuItem } from "./PopupMenu";
import { ThemeService } from "../services/themeService";
import { FontService } from "../services/fontService";
import { UpdateService } from "../services/updateService";
import { globalEventBus } from "../utils/eventBus";
import { APP_VERSION } from "../version";

export class SettingsMenuBuilder {
  private themeService: ThemeService;
  private fontService: FontService;
  private updateService: UpdateService;
  private isMarkdownMode: boolean = false;
  private isAlwaysOnTop: boolean = false;

  constructor(
    themeService: ThemeService,
    fontService: FontService,
    updateService: UpdateService
  ) {
    this.themeService = themeService;
    this.fontService = fontService;
    this.updateService = updateService;
  }

  setMarkdownMode(enabled: boolean): void {
    this.isMarkdownMode = enabled;
  }

  setAlwaysOnTop(enabled: boolean): void {
    this.isAlwaysOnTop = enabled;
  }

  buildSettingsItems(onFontSubmenu: () => void): MenuItem[] {
    const currentTheme = this.themeService.getTheme();
    const currentFont = this.fontService.getCurrentFont();
    const updateInfo = this.updateService.getUpdateInfo();
    const hasUpdate = !!updateInfo?.update_available;

    const items: MenuItem[] = [
      {
        id: "toggle_markdown",
        label: this.isMarkdownMode ? "Markdown: Preview" : "Markdown: Edit",
        shortcut: "Ctrl+M",
        action: () => {
          globalEventBus.emit("editor:toggleMarkdown");
        },
      },
      {
        id: "settings_divider_1",
        label: "",
        isDivider: true,
      },
      {
        id: "toggle_theme",
        label: `Theme: ${currentTheme === "dark" ? "Dark 🌙" : "Light ☀️"}`,
        action: () => {
          this.themeService.toggleTheme();
        },
      },
      {
        id: "select_font",
        label: `Font: ${currentFont.name}`,
        badge: "›",
        action: onFontSubmenu,
      },
      {
        id: "toggle_ontop",
        label: `Stay on Top: ${this.isAlwaysOnTop ? "On" : "Off"}`,
        shortcut: "Ctrl+T",
        action: () => {
          globalEventBus.emit("window:toggleAlwaysOnTop");
        },
      },
      {
        id: "settings_divider_2",
        label: "",
        isDivider: true,
      },
      {
        id: "check_update",
        label: hasUpdate
          ? `Update v${updateInfo.latest_version} Available!`
          : "Check for Updates",
        isGlowing: hasUpdate,
        badge: hasUpdate ? "NEW" : undefined,
        action: async () => {
          if (hasUpdate) {
            await this.updateService.installUpdate();
          } else {
            const info = await this.updateService.checkForUpdates();
            if (!info?.update_available) {
              const ver = info?.current_version || APP_VERSION;
              alert(`Cathet is up to date (v${ver})`);
            }
          }
        },
      },
    ];

    return items;
  }

  buildFontMenuItems(onSelectFont: (fontId: string) => void): MenuItem[] {
    const current = this.fontService.getCurrentFont();
    return this.fontService.fonts.map((f) => ({
      id: `font_${f.id}`,
      label: f.name,
      badge: f.id === current.id ? "✓" : undefined,
      action: () => onSelectFont(f.id),
    }));
  }
}
