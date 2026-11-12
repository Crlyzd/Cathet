import { MenuItem } from "../components/PopupMenu";
import { t } from "../services/i18nService";

export interface MainMenuContext {
  isMarkdownPreview: boolean;
  isDualPane: boolean;
  hasUpdate: boolean;
  isUpToDate: boolean;
  onNewWindow: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onFind: () => void;
  onToggleDualPane: () => void;
  onToggleMarkdown: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

/**
 * buildMainMenuItems — Assembles the top-bar dot menu items for Cathet.
 */
export function buildMainMenuItems(ctx: MainMenuContext): MenuItem[] {
  return [
    { id: "new", label: t("menu.newWindow"), shortcut: "Ctrl+N", action: ctx.onNewWindow },
    { id: "open", label: t("menu.open"), shortcut: "Ctrl+O", action: ctx.onOpen },
    { id: "save", label: t("menu.save"), shortcut: "Ctrl+S", disabled: ctx.isUpToDate, action: ctx.onSave },
    { id: "saveas", label: t("menu.saveAs"), shortcut: "Ctrl+Shift+S", action: ctx.onSaveAs },
    { id: "find", label: t("menu.find") || "Find...", shortcut: "Ctrl+F", action: ctx.onFind },
    { id: "div_dual", label: "", isDivider: true },
    {
      id: "toggle_dualpane",
      label: ctx.isDualPane ? t("menu.exitDualPane") : t("menu.dualPane"),
      shortcut: "Ctrl+D",
      isActive: ctx.isDualPane,
      action: ctx.onToggleDualPane,
    },
    { id: "div_file", label: "", isDivider: true },
    {
      id: "toggle_markdown",
      label: ctx.isMarkdownPreview ? t("menu.markdownPreview") : t("menu.markdownEdit"),
      shortcut: "Ctrl+M",
      isActive: ctx.isMarkdownPreview,
      action: ctx.onToggleMarkdown,
    },
    { id: "div_settings", label: "", isDivider: true },
    { id: "settings", label: t("menu.settings"), shortcut: "Ctrl+,", isGlowing: ctx.hasUpdate, action: ctx.onOpenSettings },
    { id: "div_quit", label: "", isDivider: true },
    { id: "quit", label: t("menu.quit"), shortcut: "Esc", action: ctx.onQuit },
  ];
}
