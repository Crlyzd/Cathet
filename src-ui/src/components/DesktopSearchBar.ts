import { icons } from "../utils/monochromeIcons";
import { t } from "../services/i18nService";
import type { EditorComponent } from "./Editor";
import {
  findMatches,
  highlightMatches,
  clearHighlights,
  scrollToMatch,
} from "../utils/domSearch";

export class DesktopSearchBarComponent {
  private element: HTMLElement;
  private input: HTMLInputElement;
  private counter: HTMLElement;
  private btnPrev: HTMLButtonElement;
  private btnNext: HTMLButtonElement;
  private btnClose: HTMLButtonElement;
  private getActiveEditor: () => EditorComponent;
  private onCloseCallback?: () => void;
  private visible = false;
  private currentMatchIndex = -1;
  private totalMatches = 0;
  private matchRanges: Range[] = [];

  constructor(
    container: HTMLElement,
    getActiveEditor: () => EditorComponent,
    onClose?: () => void
  ) {
    this.getActiveEditor = getActiveEditor;
    this.onCloseCallback = onClose;

    this.element = document.createElement("div");
    this.element.className = "desktop-search-bar";
    this.element.style.display = "none";
    this.element.innerHTML = `
      <div class="desktop-search-inner">
        <span class="desktop-search-glyph">${icons.search}</span>
        <input type="text" class="desktop-search-field" placeholder="${t("home.findPlaceholder") || "Find in document..."}" spellcheck="false" autocomplete="off" />
        <span class="desktop-search-badge">0/0</span>
        <div class="desktop-search-nav">
          <button class="desktop-search-nav-btn" id="desktop-search-prev" title="Previous (Shift+Enter)">${icons.chevronUp}</button>
          <button class="desktop-search-nav-btn" id="desktop-search-next" title="Next (Enter)">${icons.chevronDown}</button>
          <button class="desktop-search-nav-btn btn-close" id="desktop-search-close" title="Close (Esc)">${icons.close}</button>
        </div>
      </div>
    `;

    this.input = this.element.querySelector(".desktop-search-field")!;
    this.counter = this.element.querySelector(".desktop-search-badge")!;
    this.btnPrev = this.element.querySelector("#desktop-search-prev")!;
    this.btnNext = this.element.querySelector("#desktop-search-next")!;
    this.btnClose = this.element.querySelector("#desktop-search-close")!;

    container.appendChild(this.element);
    this.bindEvents();
  }

  private bindEvents(): void {
    const preventUnfocus = (e: Event) => {
      if (e.target !== this.input) {
        e.preventDefault();
      }
    };
    this.element.addEventListener("mousedown", preventUnfocus);
    this.element.addEventListener("pointerdown", preventUnfocus);

    this.input.addEventListener("input", () => this.handleQueryChange());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) this.findPrevious();
        else this.findNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }
    });

    this.btnPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      this.findPrevious();
    });
    this.btnNext.addEventListener("click", (e) => {
      e.stopPropagation();
      this.findNext();
    });
    this.btnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hide();
    });
  }

  private handleQueryChange(): void {
    const q = this.input.value.trim();
    if (!q) {
      this.matchRanges = [];
      this.currentMatchIndex = -1;
      this.totalMatches = 0;
      this.counter.textContent = "0/0";
      clearHighlights();
      return;
    }

    const activeEditor = this.getActiveEditor();
    const editorEl = activeEditor.getEditorEl();
    const wrapperEl = activeEditor.getWrapperEl();

    const { ranges, total } = findMatches(editorEl, q);
    this.matchRanges = ranges;
    this.totalMatches = total;

    if (ranges.length > 0) {
      this.currentMatchIndex = 0;
      this.counter.textContent = `1/${total}`;
      highlightMatches(ranges, 0);
      scrollToMatch(wrapperEl, ranges[0], false);
    } else {
      this.currentMatchIndex = -1;
      this.counter.textContent = "0/0";
      clearHighlights();
    }
  }

  findNext(): void {
    if (this.matchRanges.length === 0) return;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matchRanges.length;
    this.counter.textContent = `${this.currentMatchIndex + 1}/${this.totalMatches}`;
    highlightMatches(this.matchRanges, this.currentMatchIndex);
    const activeEditor = this.getActiveEditor();
    scrollToMatch(activeEditor.getWrapperEl(), this.matchRanges[this.currentMatchIndex], true);
  }

  findPrevious(): void {
    if (this.matchRanges.length === 0) return;
    this.currentMatchIndex =
      this.currentMatchIndex <= 0
        ? this.matchRanges.length - 1
        : this.currentMatchIndex - 1;
    this.counter.textContent = `${this.currentMatchIndex + 1}/${this.totalMatches}`;
    highlightMatches(this.matchRanges, this.currentMatchIndex);
    const activeEditor = this.getActiveEditor();
    scrollToMatch(activeEditor.getWrapperEl(), this.matchRanges[this.currentMatchIndex], true);
  }

  show(initialQuery?: string): void {
    this.visible = true;
    this.element.style.display = "flex";
    if (initialQuery !== undefined) {
      this.input.value = initialQuery;
    }
    requestAnimationFrame(() => {
      this.input.focus();
      this.input.select();
    });
    if (this.input.value.trim()) {
      this.handleQueryChange();
    }
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.element.style.display = "none";
    this.input.blur();
    clearHighlights();
    const activeEditor = this.getActiveEditor();
    activeEditor.getEditorEl().focus();
    this.onCloseCallback?.();
  }

  isOpen(): boolean {
    return this.visible;
  }

  destroy(): void {
    clearHighlights();
    this.element.remove();
  }
}

