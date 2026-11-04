import { ContextMenuItem } from "../components/ContextMenu";
import { EditorComponent } from "../components/Editor";
import { applyMarkdownFormat, FormatAction } from "./formatUtils";
import { openUrl } from "@tauri-apps/plugin-opener";

export const contextIcons = {
  cut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
  copy: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
  paste: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect></svg>`,
  undo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>`,
  redo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"></path><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"></path></svg>`,
  selectAll: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="13" y="8" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor"></rect><rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor"></rect></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16" y2="16"></line></svg>`,
};

export const formatIcons = {
  formatAa: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h6"/><path d="M14 20h7"/><path d="M6.9 15h6.2"/><path d="m3 20 6-16 6 16"/><path d="M18 12v8"/><path d="M15 15h6"/></svg>`,
  bold: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
  italic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  strike: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  highlight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`,
  math: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4H6l6 8-6 8h12"/></svg>`,
  heading: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/></svg>`,
  h1: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,
  h2: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
  h3: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>`,
  bullet: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  number: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  task: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
  quote: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
  codeblock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 6 12 9 15"/><polyline points="15 9 18 12 15 15"/></svg>`,
  link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
  table: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  rule: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
  clear: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
};

function buildFormatSubmenu(editor: EditorComponent): ContextMenuItem[] {
  const run = (act: FormatAction) => () => applyMarkdownFormat(editor, act);

  return [
    {
      id: "fmt_style",
      label: "Style",
      iconSvg: formatIcons.bold,
      submenu: [
        { id: "fmt_bold", label: "Bold", shortcut: "Ctrl+B", iconSvg: formatIcons.bold, action: run("bold") },
        { id: "fmt_italic", label: "Italic", shortcut: "Ctrl+I", iconSvg: formatIcons.italic, action: run("italic") },
        { id: "fmt_strike", label: "Strikethrough", shortcut: "Ctrl+Shift+X", iconSvg: formatIcons.strike, action: run("strike") },
        { id: "fmt_code", label: "Inline Code", shortcut: "Ctrl+`", iconSvg: formatIcons.code, action: run("code") },
        { id: "fmt_highlight", label: "Highlight", shortcut: "Ctrl+Shift+H", iconSvg: formatIcons.highlight, action: run("highlight") },
        { id: "fmt_math", label: "Inline Math", shortcut: "Ctrl+Shift+M", iconSvg: formatIcons.math, action: run("math") },
      ],
    },
    {
      id: "fmt_headings",
      label: "Headings",
      iconSvg: formatIcons.heading,
      submenu: [
        { id: "fmt_h1", label: "Heading 1", shortcut: "Ctrl+Alt+1", iconSvg: formatIcons.h1, action: run("h1") },
        { id: "fmt_h2", label: "Heading 2", shortcut: "Ctrl+Alt+2", iconSvg: formatIcons.h2, action: run("h2") },
        { id: "fmt_h3", label: "Heading 3", shortcut: "Ctrl+Alt+3", iconSvg: formatIcons.h3, action: run("h3") },
      ],
    },
    {
      id: "fmt_lists",
      label: "Lists",
      iconSvg: formatIcons.bullet,
      submenu: [
        { id: "fmt_bullet", label: "Bullet List", shortcut: "Ctrl+Shift+U", iconSvg: formatIcons.bullet, action: run("bullet") },
        { id: "fmt_number", label: "Numbered List", shortcut: "Ctrl+Shift+O", iconSvg: formatIcons.number, action: run("number") },
        { id: "fmt_task", label: "Task List", shortcut: "Ctrl+Shift+T", iconSvg: formatIcons.task, action: run("task") },
      ],
    },
    {
      id: "fmt_insert",
      label: "Insert",
      iconSvg: formatIcons.table,
      submenu: [
        { id: "fmt_quote", label: "Blockquote", shortcut: "Ctrl+Shift+Q", iconSvg: formatIcons.quote, action: run("quote") },
        { id: "fmt_codeblock", label: "Code Block", shortcut: "Ctrl+Shift+C", iconSvg: formatIcons.codeblock, action: run("codeblock") },
        { id: "fmt_link", label: "Hyperlink", shortcut: "Ctrl+K", iconSvg: formatIcons.link, action: run("link") },
        { id: "fmt_image", label: "Image...", shortcut: "Ctrl+Shift+I", iconSvg: formatIcons.image, action: run("image") },
        { id: "fmt_table", label: "Table", shortcut: "Ctrl+Shift+B", iconSvg: formatIcons.table, action: run("table") },
        { id: "fmt_rule", label: "Horizontal Rule", shortcut: "Ctrl+Alt+R", iconSvg: formatIcons.rule, action: run("rule") },
      ],
    },
    { id: "fmt_div", label: "", isDivider: true },
    {
      id: "fmt_clear",
      label: "Clear Formatting",
      shortcut: "Ctrl+\\",
      iconSvg: formatIcons.clear,
      action: run("clear"),
    },
  ];
}

export function buildContextMenuItems(editor: EditorComponent): ContextMenuItem[] {
  const selectedText = editor.getSelectedText().trim();
  const hasSel = selectedText.length > 0;
  const isWrap = editor.isWordWrapEnabled();
  const isMd = editor.getIsMarkdownPreview();

  return [
    { id: "cut", label: "Cut", shortcut: "Ctrl+X", iconSvg: contextIcons.cut, disabled: !hasSel || isMd, action: () => editor.cut() },
    { id: "copy", label: "Copy", shortcut: "Ctrl+C", iconSvg: contextIcons.copy, disabled: !hasSel, action: () => editor.copy() },
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", iconSvg: contextIcons.paste, disabled: isMd, action: () => editor.paste() },
    { id: "undo", label: "Undo", shortcut: "Ctrl+Z", iconSvg: contextIcons.undo, disabled: isMd, action: () => editor.undo() },
    { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", iconSvg: contextIcons.redo, disabled: isMd, action: () => editor.redo() },
    { id: "selectAll", label: "Select All", shortcut: "Ctrl+A", iconSvg: contextIcons.selectAll, action: () => editor.selectAllClean() },
    { id: "div_fmt", label: "", isDivider: true },
    {
      id: "format",
      label: "Format",
      iconSvg: formatIcons.formatAa,
      disabled: isMd,
      submenu: buildFormatSubmenu(editor),
    },
    { id: "div_1", label: "", isDivider: true },
    { id: "wordWrap", label: "Word Wrap", shortcut: "Alt+W", iconSvg: isWrap ? contextIcons.check : undefined, action: () => editor.toggleWordWrap() },
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
