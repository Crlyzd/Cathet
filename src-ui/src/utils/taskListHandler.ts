/**
 * taskListHandler.ts — Interactive preview handlers for Cathet (task checkboxes, code copy, internal #anchors).
 */
import { editorCopy } from "./editorClipboard";

const copyTimers = new WeakMap<HTMLButtonElement, number>();

export function attachTaskCheckboxListener(
  editorEl: HTMLElement,
  getRawContent: () => string,
  setRawContent: (newContent: string) => void
): () => void {
  const changeHandler = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target || !target.classList.contains("task-checkbox")) return;

    const lineIdx = parseInt(target.getAttribute("data-line") || "-1", 10);
    if (lineIdx < 0) return;

    const raw = getRawContent();
    const lines = raw.split(/\r?\n/);
    if (lines[lineIdx] === undefined) return;

    if (target.checked) {
      lines[lineIdx] = lines[lineIdx].replace(/^(\s*(?:[-*+]|\d+\.)\s+)\[ \]/, "$1[x]");
    } else {
      lines[lineIdx] = lines[lineIdx].replace(/^(\s*(?:[-*+]|\d+\.)\s+)\[[xX]\]/, "$1[ ]");
    }

    setRawContent(lines.join("\n"));
  };

  const clickHandler = (e: MouseEvent) => {
    if (!editorEl.classList.contains("markdown-preview")) return;
    const el = e.target as HTMLElement | null;
    if (!el) return;

    const copyBtn = el.closest<HTMLButtonElement>(".md-code-copy");
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const codeEl = copyBtn.closest(".md-code-block")?.querySelector("pre code");
      const codeText = codeEl?.textContent || "";
      void editorCopy(codeText);

      const prevTimer = copyTimers.get(copyBtn);
      if (prevTimer) window.clearTimeout(prevTimer);
      copyBtn.textContent = "Copied ✓";
      copyBtn.classList.add("copied");
      const timer = window.setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
        copyTimers.delete(copyBtn);
      }, 1400);
      copyTimers.set(copyBtn, timer);
      return;
    }

    const anchor = el.closest<HTMLAnchorElement>('a[href^="#"]');
    if (anchor) {
      const targetId = (anchor.getAttribute("href") || "").slice(1);
      if (!targetId) return;
      const dest = editorEl.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`);
      if (dest) {
        e.preventDefault();
        dest.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  editorEl.addEventListener("change", changeHandler);
  editorEl.addEventListener("click", clickHandler);
  return () => {
    editorEl.removeEventListener("change", changeHandler);
    editorEl.removeEventListener("click", clickHandler);
  };
}

