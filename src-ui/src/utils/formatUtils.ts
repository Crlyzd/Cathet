import { EditorComponent } from "../components/Editor";
import { ImageInsertModalComponent } from "../components/ImageInsertModal";
import { processAndInsertImageFile, insertHtmlAtCaretOrEnd } from "./editorPasteHandler";

export type FormatAction =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "highlight"
  | "math"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "task"
  | "quote"
  | "codeblock"
  | "link"
  | "image"
  | "table"
  | "rule"
  | "clear";

const INLINE_TOKENS: Partial<Record<FormatAction, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
  highlight: ["==", "=="],
  math: ["$", "$"],
};

const LINE_PREFIXES: Partial<Record<FormatAction, string>> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  bullet: "- ",
  task: "- [ ] ",
  quote: "> ",
};

function moveCaretBackward(chars: number): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  for (let i = 0; i < chars; i++) {
    sel.modify?.("move", "backward", "character");
  }
}

function ensureEditorSelection(editorEl: HTMLElement): Selection | null {
  editorEl.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return null;
  if (sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode)) {
    const range = document.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return sel;
}

function stripMarkdownTokens(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^-\s+\[[ xX]\]\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|~~|==)(.*?)\1/g, "$2")
    .replace(/(\*|`|\$)(.*?)\1/g, "$2");
}

function transformLines(text: string, action: FormatAction): string {
  const lines = text.split("\n");
  if (action === "number") {
    const allNumbered = lines.every((l) => /^\d+\.\s+/.test(l));
    return lines
      .map((l, idx) => (allNumbered ? l.replace(/^\d+\.\s+/, "") : `${idx + 1}. ${l.replace(/^\d+\.\s+/, "")}`))
      .join("\n");
  }
  const prefix = LINE_PREFIXES[action] || "";
  if (action === "h1" || action === "h2" || action === "h3") {
    return lines
      .map((l) => (l.startsWith(prefix) ? l.slice(prefix.length) : `${prefix}${l.replace(/^#{1,6}\s+/, "")}`))
      .join("\n");
  }
  const allPrefixed = lines.every((l) => l.startsWith(prefix));
  return lines.map((l) => (allPrefixed ? l.slice(prefix.length) : `${prefix}${l}`)).join("\n");
}

function expandCollapsedToCurrentLine(sel: Selection): boolean {
  if (sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return false;

  const content = node.textContent;
  const offset = range.startOffset;
  const lineStart = content.lastIndexOf("\n", offset - 1) + 1;
  const nextNl = content.indexOf("\n", offset);
  const lineEnd = nextNl === -1 ? content.length : nextNl;
  if (lineStart === lineEnd) return false;

  const lineRange = document.createRange();
  lineRange.setStart(node, lineStart);
  lineRange.setEnd(node, lineEnd);
  sel.removeAllRanges();
  sel.addRange(lineRange);
  return true;
}

export function applyMarkdownFormat(editor: EditorComponent, action: FormatAction): void {
  if (editor.getIsMarkdownPreview()) return;
  const editorEl = editor.getEditorEl();
  const sel = ensureEditorSelection(editorEl);
  if (!sel) return;

  const selectedText = sel.toString();
  const hasSelection = selectedText.length > 0;

  // 1. Inline Wrapping
  if (INLINE_TOKENS[action]) {
    const [prefix, suffix] = INLINE_TOKENS[action]!;
    if (hasSelection) {
      const isAlreadyWrapped =
        selectedText.startsWith(prefix) &&
        selectedText.endsWith(suffix) &&
        selectedText.length >= prefix.length + suffix.length;
      const replacement = isAlreadyWrapped
        ? selectedText.slice(prefix.length, selectedText.length - suffix.length)
        : `${prefix}${selectedText}${suffix}`;
      document.execCommand("insertText", false, replacement);
    } else {
      document.execCommand("insertText", false, `${prefix}${suffix}`);
      moveCaretBackward(suffix.length);
    }
    editor.setRawContent(editor.getText());
    return;
  }

  // 2. Line Prefixing (Headings, Lists, Quote)
  if (action in LINE_PREFIXES || action === "number") {
    if (hasSelection || expandCollapsedToCurrentLine(sel)) {
      const current = sel.toString();
      document.execCommand("insertText", false, transformLines(current, action));
    } else {
      const prefix = action === "number" ? "1. " : LINE_PREFIXES[action]!;
      document.execCommand("insertText", false, prefix);
    }
    editor.setRawContent(editor.getText());
    return;
  }

  // 3. Blocks, Inserts & Clear
  switch (action) {
    case "codeblock":
      if (hasSelection) {
        document.execCommand("insertText", false, `\`\`\`\n${selectedText}\n\`\`\``);
      } else {
        document.execCommand("insertText", false, "```\n\n```");
        moveCaretBackward(4);
      }
      break;
    case "link":
      if (hasSelection) {
        document.execCommand("insertText", false, `[${selectedText}](https://)`);
        moveCaretBackward(1);
      } else {
        document.execCommand("insertText", false, "[](https://)");
        moveCaretBackward(11);
      }
      break;
    case "image": {
      const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
      new ImageInsertModalComponent({
        onInsert: async (res) => {
          if (savedRange && editorEl.contains(savedRange.commonAncestorContainer)) {
            const currentSel = window.getSelection();
            currentSel?.removeAllRanges();
            currentSel?.addRange(savedRange);
          }
          if (res.file) {
            await processAndInsertImageFile(res.file, editorEl, (newContent) => {
              editor.setRawContent(newContent);
            });
          } else if (res.markdown) {
            insertHtmlAtCaretOrEnd(editorEl, res.markdown);
            editor.setRawContent(editor.getText());
          }
        },
      });
      return;
    }
    case "table":
      document.execCommand(
        "insertText",
        false,
        "\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n"
      );
      break;
    case "rule":
      document.execCommand("insertText", false, "\n---\n");
      break;
    case "clear":
      if (hasSelection || expandCollapsedToCurrentLine(sel)) {
        document.execCommand("insertText", false, stripMarkdownTokens(sel.toString()));
      }
      break;
  }

  editor.setRawContent(editor.getText());
}
