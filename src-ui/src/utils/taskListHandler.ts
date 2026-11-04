/**
 * taskListHandler.ts — Interactive task list checkbox synchronization for Cathet.
 */

export function attachTaskCheckboxListener(
  editorEl: HTMLElement,
  getRawContent: () => string,
  setRawContent: (newContent: string) => void
): () => void {
  const handler = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target || !target.classList.contains("task-checkbox")) return;

    const lineIdx = parseInt(target.getAttribute("data-line") || "-1", 10);
    if (lineIdx < 0) return;

    const raw = getRawContent();
    const lines = raw.split(/\r?\n/);
    if (lines[lineIdx] === undefined) return;

    if (target.checked) {
      lines[lineIdx] = lines[lineIdx].replace(/^([-*+]\s+)\[ \]/, "$1[x]");
    } else {
      lines[lineIdx] = lines[lineIdx].replace(/^([-*+]\s+)\[[xX]\]/, "$1[ ]");
    }

    setRawContent(lines.join("\n"));
  };

  editorEl.addEventListener("change", handler);
  return () => editorEl.removeEventListener("change", handler);
}

