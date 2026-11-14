import { formatIcons } from "./contextMenuItems";
import { FormatAction } from "./formatUtils";

export interface FormatButtonDef {
  action?: FormatAction;
  title?: string;
  iconSvg?: string;
  isDivider?: boolean;
  hasAlertMenu?: boolean;
}

export const FORMAT_BUTTONS: FormatButtonDef[] = [
  { action: "bold", title: "Bold (Ctrl+B)", iconSvg: formatIcons.bold },
  { action: "italic", title: "Italic (Ctrl+I)", iconSvg: formatIcons.italic },
  { action: "strike", title: "Strikethrough (Ctrl+Shift+X)", iconSvg: formatIcons.strike },
  { action: "code", title: "Inline Code (Ctrl+`)", iconSvg: formatIcons.code },
  { action: "highlight", title: "Highlight (Ctrl+Shift+H)", iconSvg: formatIcons.highlight },
  { action: "math", title: "Inline Math (Ctrl+Shift+M)", iconSvg: formatIcons.math },
  { action: "subscript", title: "Subscript (Ctrl+Alt+S)", iconSvg: formatIcons.subscript },
  { action: "superscript", title: "Superscript (Ctrl+Alt+P)", iconSvg: formatIcons.superscript },
  { isDivider: true },
  { action: "h1", title: "Heading 1 (Ctrl+Alt+1)", iconSvg: formatIcons.h1 },
  { action: "h2", title: "Heading 2 (Ctrl+Alt+2)", iconSvg: formatIcons.h2 },
  { action: "h3", title: "Heading 3 (Ctrl+Alt+3)", iconSvg: formatIcons.h3 },
  { isDivider: true },
  { action: "bullet", title: "Bullet List (Ctrl+Shift+U)", iconSvg: formatIcons.bullet },
  { action: "number", title: "Numbered List (Ctrl+Shift+O)", iconSvg: formatIcons.number },
  { action: "task", title: "Task List (Ctrl+Shift+T)", iconSvg: formatIcons.task },
  { isDivider: true },
  { action: "quote", title: "Blockquote (Ctrl+Shift+Q)", iconSvg: formatIcons.quote },
  { action: "codeblock", title: "Code Block (Ctrl+Shift+C)", iconSvg: formatIcons.codeblock },
  { action: "link", title: "Hyperlink (Ctrl+K)", iconSvg: formatIcons.link },
  { action: "image", title: "Insert Image (Ctrl+Shift+I)", iconSvg: formatIcons.image },
  { action: "table", title: "Insert Table (Ctrl+Shift+B)", iconSvg: formatIcons.table },
  { action: "rule", title: "Horizontal Rule (Ctrl+Alt+R)", iconSvg: formatIcons.rule },
  { action: "alertNote", title: "Insert Alert (Ctrl+Alt+A)", iconSvg: formatIcons.alert, hasAlertMenu: true },
  { action: "displayMath", title: "Display Math (Ctrl+Alt+M)", iconSvg: formatIcons.displayMath },
  { action: "footnote", title: "Insert Footnote (Ctrl+Alt+F)", iconSvg: formatIcons.footnote },
  { action: "details", title: "Collapsible Details (Ctrl+Alt+D)", iconSvg: formatIcons.details },
  { action: "frontmatter", title: "YAML Frontmatter (Ctrl+Alt+Y)", iconSvg: formatIcons.frontmatter },
  { isDivider: true },
  { action: "clear", title: "Clear Formatting (Ctrl+\\)", iconSvg: formatIcons.clear },
];
