import { ContextMenuItem } from "../components/ContextMenu";
import { EditorComponent } from "../components/Editor";
import { openUrl } from "@tauri-apps/plugin-opener";

export const contextIcons = {
  // Cut: Scissors with open handles
  cut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,

  // Copy: Two overlapping documents
  copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,

  // Paste: Clipboard with top clamp
  paste: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect></svg>`,

  // Undo: Fluent curved arrow counter-clockwise
  undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>`,

  // Redo: Fluent curved arrow clockwise
  redo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"></path><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"></path></svg>`,

  // Select All: 4 corner brackets framing 4 squares (matching Image 2)
  selectAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="13" y="8" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor"></rect></svg>`,

  // Word Wrap active: Fluent checkmark
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,

  // Search in web: Magnifying glass
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16" y2="16"></line></svg>`,
};

export function buildContextMenuItems(editor: EditorComponent): ContextMenuItem[] {
  const selectedText = editor.getSelectedText().trim();
  const hasSel = selectedText.length > 0;
  const isWrap = editor.isWordWrapEnabled();
  const isMd = editor.getIsMarkdownPreview();

  return [
    {
      id: "cut",
      label: "Cut",
      shortcut: "Ctrl+X",
      iconSvg: contextIcons.cut,
      disabled: !hasSel || isMd,
      action: () => editor.cut(),
    },
    {
      id: "copy",
      label: "Copy",
      shortcut: "Ctrl+C",
      iconSvg: contextIcons.copy,
      disabled: !hasSel,
      action: () => editor.copy(),
    },
    {
      id: "paste",
      label: "Paste",
      shortcut: "Ctrl+V",
      iconSvg: contextIcons.paste,
      disabled: isMd,
      action: () => editor.paste(),
    },
    {
      id: "undo",
      label: "Undo",
      shortcut: "Ctrl+Z",
      iconSvg: contextIcons.undo,
      disabled: isMd,
      action: () => editor.undo(),
    },
    {
      id: "redo",
      label: "Redo",
      shortcut: "Ctrl+Shift+Z",
      iconSvg: contextIcons.redo,
      disabled: isMd,
      action: () => editor.redo(),
    },
    {
      id: "selectAll",
      label: "Select All",
      shortcut: "Ctrl+A",
      iconSvg: contextIcons.selectAll,
      action: () => editor.selectAllClean(),
    },
    {
      id: "div_1",
      label: "",
      isDivider: true,
    },
    {
      id: "wordWrap",
      label: "Word Wrap",
      shortcut: "Alt+W",
      iconSvg: isWrap ? contextIcons.check : undefined,
      action: () => editor.toggleWordWrap(),
    },
    {
      id: "searchWeb",
      label: "Search in web",
      shortcut: "Ctrl+E",
      iconSvg: contextIcons.search,
      disabled: !hasSel,
      action: () => {
        if (selectedText) {
          openUrl(`https://www.google.com/search?q=${encodeURIComponent(selectedText)}`).catch(console.error);
        }
      },
    },
  ];
}
