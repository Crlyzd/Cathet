import { FormatAction } from "./formatUtils";

export interface ShortcutHandlers {
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onNewWindow: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleMarkdown: () => void;
  onSelectAll: () => void;
  onQuit: () => void;
  onSettings?: () => void;
  onToggleWordWrap?: () => void;
  onSearchWeb?: () => void;
  onFind?: () => void;
  onFindNext?: () => void;
  onFindPrevious?: () => void;
  onToggleDualPane?: () => void;
  onFormat?: (action: FormatAction) => void;
}

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handlers.onQuit();
      return;
    }

    if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) handlers.onFindPrevious?.();
      else handlers.onFindNext?.();
      return;
    }

    if (e.altKey && !e.ctrlKey && (e.key === "w" || e.key === "W")) {
      e.preventDefault();
      handlers.onToggleWordWrap?.();
      return;
    }

    if (!e.ctrlKey) return;

    if (e.key === ",") {
      e.preventDefault();
      handlers.onSettings?.();
      return;
    }

    if (e.key === "`") {
      e.preventDefault();
      handlers.onFormat?.("code");
      return;
    }

    if (e.key === "\\") {
      e.preventDefault();
      handlers.onFormat?.("clear");
      return;
    }

    const key = e.key.toUpperCase();

    // Ctrl + Alt + Key (Headings, Rule & Tier 2 Extended Markdown)
    if (e.altKey && !e.shiftKey) {
      const altActions: Record<string, FormatAction> = {
        "1": "h1", "2": "h2", "3": "h3", R: "rule",
        S: "subscript", P: "superscript", M: "displayMath",
        A: "alertNote", F: "footnote", D: "details", Y: "frontmatter",
      };
      const altAction = altActions[key];
      if (altAction) {
        e.preventDefault();
        handlers.onFormat?.(altAction);
        return;
      }
    }

    // Ctrl + Shift + Key
    if (e.shiftKey && !e.altKey) {
      switch (key) {
        case "W": e.preventDefault(); handlers.onToggleWordWrap?.(); return;
        case "S": e.preventDefault(); handlers.onSaveAs(); return;
        case "X": e.preventDefault(); handlers.onFormat?.("strike"); return;
        case "H": e.preventDefault(); handlers.onFormat?.("highlight"); return;
        case "M": e.preventDefault(); handlers.onFormat?.("math"); return;
        case "U": e.preventDefault(); handlers.onFormat?.("bullet"); return;
        case "O": e.preventDefault(); handlers.onFormat?.("number"); return;
        case "T": e.preventDefault(); handlers.onFormat?.("task"); return;
        case "Q": e.preventDefault(); handlers.onFormat?.("quote"); return;
        case "C": e.preventDefault(); handlers.onFormat?.("codeblock"); return;
        case "B": e.preventDefault(); handlers.onFormat?.("table"); return;
        case "I": e.preventDefault(); handlers.onFormat?.("image"); return;
      }
      return;
    }

    switch (key) {
      case "D": e.preventDefault(); handlers.onToggleDualPane?.(); break;
      case "S": e.preventDefault(); handlers.onSave(); break;
      case "O": e.preventDefault(); handlers.onOpen(); break;
      case "N": e.preventDefault(); handlers.onNewWindow(); break;
      case "T": e.preventDefault(); handlers.onToggleAlwaysOnTop(); break;
      case "M": e.preventDefault(); handlers.onToggleMarkdown(); break;
      case "F": e.preventDefault(); handlers.onFind?.(); break;
      case "E": e.preventDefault(); handlers.onSearchWeb?.(); break;
      case "A": e.preventDefault(); handlers.onSelectAll(); break;
      case "B": e.preventDefault(); handlers.onFormat ? handlers.onFormat("bold") : handlers.onToggleBold(); break;
      case "I": e.preventDefault(); handlers.onFormat ? handlers.onFormat("italic") : handlers.onToggleItalic(); break;
      case "K": e.preventDefault(); handlers.onFormat?.("link"); break;
      case "U": e.preventDefault(); handlers.onToggleUnderline(); break;
    }
  };

  window.addEventListener("keydown", keyHandler);
  return () => window.removeEventListener("keydown", keyHandler);
}
