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
}

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  const keyHandler = (e: KeyboardEvent) => {
    // ESC -> Quit
    if (e.key === "Escape") {
      e.preventDefault();
      handlers.onQuit();
      return;
    }

    // Alt+W or Ctrl+Shift+W -> Toggle Word Wrap (avoids NVIDIA overlay Alt+Z conflict)
    if (e.altKey && (e.key === "w" || e.key === "W")) {
      e.preventDefault();
      handlers.onToggleWordWrap?.();
      return;
    }

    if (e.ctrlKey && e.shiftKey && (e.key === "w" || e.key === "W")) {
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

    const key = e.key.toUpperCase();

    if (e.shiftKey && key === "S") {
      e.preventDefault();
      handlers.onSaveAs();
      return;
    }

    switch (key) {
      case "S":
        e.preventDefault();
        handlers.onSave();
        break;
      case "O":
        e.preventDefault();
        handlers.onOpen();
        break;
      case "N":
        e.preventDefault();
        handlers.onNewWindow();
        break;
      case "T":
        e.preventDefault();
        handlers.onToggleAlwaysOnTop();
        break;
      case "M":
        e.preventDefault();
        handlers.onToggleMarkdown();
        break;
      case "E":
        e.preventDefault();
        handlers.onSearchWeb?.();
        break;
      case "A":
        e.preventDefault();
        handlers.onSelectAll();
        break;
      case "B":
        e.preventDefault();
        handlers.onToggleBold();
        break;
      case "I":
        e.preventDefault();
        handlers.onToggleItalic();
        break;
      case "U":
        e.preventDefault();
        handlers.onToggleUnderline();
        break;
    }
  };

  window.addEventListener("keydown", keyHandler);
  return () => window.removeEventListener("keydown", keyHandler);
}
