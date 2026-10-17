import { MenuItem } from "../components/PopupMenu";

export interface MainMenuContext {
  isMarkdownPreview: boolean;
  isDualPane: boolean;
  hasUpdate: boolean;
  isUpToDate: boolean;
  onNewWindow: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
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
    { id: "new", label: "New Window", shortcut: "Ctrl+N", action: ctx.onNewWindow },
    { id: "open", label: "Open...", shortcut: "Ctrl+O", action: ctx.onOpen },
    { id: "save", label: "Save", shortcut: "Ctrl+S", disabled: ctx.isUpToDate, action: ctx.onSave },
    { id: "saveas", label: "Save As...", shortcut: "Ctrl+Shift+S", action: ctx.onSaveAs },
    { id: "div_dual", label: "", isDivider: true },
    {
      id: "toggle_dualpane",
      label: ctx.isDualPane ? "Exit Dual Pane" : "Dual Pane",
      shortcut: "Ctrl+D",
      isActive: ctx.isDualPane,
      action: ctx.onToggleDualPane,
    },
    { id: "div_file", label: "", isDivider: true },
    {
      id: "toggle_markdown",
      label: ctx.isMarkdownPreview ? "Markdown: Preview" : "Markdown: Edit",
      shortcut: "Ctrl+M",
      isActive: ctx.isMarkdownPreview,
      action: ctx.onToggleMarkdown,
    },
    { id: "div_settings", label: "", isDivider: true },
    { id: "settings", label: "Settings", shortcut: "Ctrl+,", isGlowing: ctx.hasUpdate, action: ctx.onOpenSettings },
    { id: "div_quit", label: "", isDivider: true },
    { id: "quit", label: "Quit", shortcut: "Esc", action: ctx.onQuit },
  ];
}
