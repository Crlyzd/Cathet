import { serializeEditorContent, renderEditorTextWithPills } from "./base64Fold";

interface HistorySnapshot {
  text: string;
  caretOffset: number;
}

const MAX_HISTORY = 100;
const MAX_LARGE_HISTORY = 40;
const LARGE_DOC_THRESHOLD = 200_000;
const DEBOUNCE_MS = 500;

function isPlaceholderBr(br: HTMLElement): boolean {
  const parent = br.parentElement;
  if (!parent || parent.classList.contains("editor-content")) return false;
  return br === parent.lastElementChild;
}

function getCaretOffset(editorEl: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editorEl.contains(sel.anchorNode)) return 0;
  const { startContainer: targetNode, startOffset: targetOffset } = sel.getRangeAt(0);
  let offset = 0, found = false, seenContent = false;

  const walk = (node: Node): void => {
    if (found) return;
    if (node === targetNode && node.nodeType !== Node.ELEMENT_NODE) {
      offset += targetOffset; found = true; return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (len > 0) seenContent = true;
      offset += len;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el !== editorEl && (el.tagName === "DIV" || el.tagName === "P")) {
        if (seenContent) offset += 1;
        seenContent = true;
      } else if (el.tagName === "BR") {
        seenContent = true;
        if (!isPlaceholderBr(el)) offset += 1;
        if (node === targetNode) found = true;
        return;
      } else if (el.classList.contains("b64-pill-container")) {
        seenContent = true;
        offset += (el.getAttribute("data-raw") || "").length;
        if (node === targetNode) found = true;
        return;
      }
      for (let i = 0; i < el.childNodes.length; i++) {
        if (node === targetNode && i === targetOffset) { found = true; return; }
        walk(el.childNodes[i]);
        if (found) return;
      }
      if (node === targetNode) found = true;
    }
  };

  walk(editorEl);
  return offset;
}

function setCaretOffset(editorEl: HTMLElement, targetOffset: number): void {
  const sel = window.getSelection();
  if (!sel) return;

  let remaining = Math.max(0, targetOffset);
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      const el = node as HTMLElement;
      if (el.tagName === "BR" || el.classList.contains("b64-pill-container")) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });

  let node: Node | null, lastTextNode: Text | null = null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= len;
      lastTextNode = node as Text;
    } else {
      const el = node as HTMLElement;
      if (el.tagName === "BR") {
        if (remaining === 0) {
          const range = document.createRange();
          range.setStartBefore(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        remaining = Math.max(0, remaining - 1);
      } else if (el.classList.contains("b64-pill-container")) {
        remaining = Math.max(0, remaining - (el.getAttribute("data-raw") || "").length);
      }
    }
  }

  const fallback = document.createRange();
  if (lastTextNode) fallback.setStart(lastTextNode, lastTextNode.textContent?.length ?? 0);
  else fallback.selectNodeContents(editorEl);
  fallback.collapse(false);
  sel.removeAllRanges();
  sel.addRange(fallback);
}

/**
 * EditorHistory — Lossless snapshot-based Undo/Redo stack for EditorComponent.
 * Survives Markdown Preview toggles, Base64 image pastes, and focus transfers.
 */
export class EditorHistory {
  private editorEl: HTMLElement;
  private isPreview: () => boolean;
  private onApply: (text: string) => void;
  private snapshots: HistorySnapshot[] = [{ text: "", caretOffset: 0 }];
  private index = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRestoring = false;
  private isComposing = false;

  private inputHandler = (e: Event) => {
    if (this.isRestoring || this.isPreview()) return;
    const inputEvent = e as InputEvent;
    if (inputEvent.isComposing || this.isComposing) return;
    const immediate = inputEvent.inputType === "insertParagraph" || inputEvent.inputType === "insertLineBreak";
    this.record(immediate);
  };

  private compositionStartHandler = () => { this.isComposing = true; };
  private compositionEndHandler = () => {
    this.isComposing = false;
    if (!this.isRestoring && !this.isPreview()) this.record(false);
  };
  private blurHandler = () => {
    if (!this.isRestoring && !this.isPreview()) this.flushPending();
  };

  constructor(editorEl: HTMLElement, isPreview: () => boolean, onApply: (text: string) => void) {
    this.editorEl = editorEl;
    this.isPreview = isPreview;
    this.onApply = onApply;

    this.editorEl.addEventListener("input", this.inputHandler);
    this.editorEl.addEventListener("compositionstart", this.compositionStartHandler);
    this.editorEl.addEventListener("compositionend", this.compositionEndHandler);
    this.editorEl.addEventListener("blur", this.blurHandler);
  }

  reset(initialText: string): void {
    this.clearTimer();
    this.snapshots = [{ text: initialText, caretOffset: 0 }];
    this.index = 0;
  }

  record(immediate = false): void {
    if (this.isRestoring || this.isPreview()) return;
    this.clearTimer();
    if (immediate) {
      this.commitCurrent();
    } else {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.commitCurrent();
      }, DEBOUNCE_MS);
    }
  }

  canUndo(): boolean {
    return this.index > 0 || serializeEditorContent(this.editorEl) !== this.snapshots[this.index]?.text;
  }

  canRedo(): boolean { return this.index < this.snapshots.length - 1; }

  undo(): void {
    if (this.isPreview()) return;
    this.flushPending();
    if (this.index <= 0) return;
    this.restoreSnapshot(this.snapshots[--this.index]);
  }

  redo(): void {
    if (this.isPreview()) return;
    this.clearTimer();
    if (this.index >= this.snapshots.length - 1) return;
    this.restoreSnapshot(this.snapshots[++this.index]);
  }

  destroy(): void {
    this.clearTimer();
    this.editorEl.removeEventListener("input", this.inputHandler);
    this.editorEl.removeEventListener("compositionstart", this.compositionStartHandler);
    this.editorEl.removeEventListener("compositionend", this.compositionEndHandler);
    this.editorEl.removeEventListener("blur", this.blurHandler);
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) { clearTimeout(this.debounceTimer); this.debounceTimer = null; }
  }

  private flushPending(): void { this.clearTimer(); this.commitCurrent(); }

  private commitCurrent(): void {
    if (this.isRestoring || this.isPreview()) return;
    const text = serializeEditorContent(this.editorEl);
    const current = this.snapshots[this.index];
    if (current && current.text === text) return;

    this.snapshots = this.snapshots.slice(0, this.index + 1);
    this.snapshots.push({ text, caretOffset: getCaretOffset(this.editorEl) });

    const limit = text.length > LARGE_DOC_THRESHOLD ? MAX_LARGE_HISTORY : MAX_HISTORY;
    if (this.snapshots.length > limit) {
      this.snapshots = this.snapshots.slice(this.snapshots.length - limit);
    }
    this.index = this.snapshots.length - 1;
  }

  private restoreSnapshot(snapshot: HistorySnapshot): void {
    this.isRestoring = true;
    try {
      if (snapshot.text.includes("data:image/")) {
        this.editorEl.innerHTML = renderEditorTextWithPills(snapshot.text);
      } else {
        this.editorEl.innerText = snapshot.text;
      }
      this.onApply(snapshot.text);
      this.editorEl.focus({ preventScroll: true });
      setCaretOffset(this.editorEl, snapshot.caretOffset);
    } finally {
      this.isRestoring = false;
    }
  }
}
