import { icons } from "../utils/monochromeIcons";
import { t } from "../services/i18nService";
import type { EditorComponent } from "./Editor";

export class MobileSearchBarComponent {
  private element: HTMLElement;
  private input: HTMLInputElement;
  private counter: HTMLElement;
  private btnPrev: HTMLButtonElement;
  private btnNext: HTMLButtonElement;
  private btnClose: HTMLButtonElement;
  private getActiveEditor: () => EditorComponent;
  private onCloseCallback: () => void;
  private visible = false;
  private currentMatch = 0;
  private totalMatches = 0;

  constructor(
    container: HTMLElement,
    getActiveEditor: () => EditorComponent,
    onClose: () => void
  ) {
    this.getActiveEditor = getActiveEditor;
    this.onCloseCallback = onClose;

    this.element = document.createElement("div");
    this.element.className = "mobile-search-ribbon";
    this.element.style.display = "none";
    this.element.innerHTML = `
      <div class="mobile-search-inner">
        <span class="mobile-search-glyph">${icons.search}</span>
        <input type="text" class="mobile-search-field" placeholder="${t("home.searchPlaceholder") || "Find in document..."}" spellcheck="false" autocomplete="off" />
        <span class="mobile-search-badge">0/0</span>
        <div class="mobile-search-nav">
          <button class="mobile-search-nav-btn" id="mobile-search-prev" title="Previous">${icons.chevronUp}</button>
          <button class="mobile-search-nav-btn" id="mobile-search-next" title="Next">${icons.chevronDown}</button>
          <button class="mobile-search-nav-btn btn-close" id="mobile-search-close" title="Close">${icons.close}</button>
        </div>
      </div>
    `;

    this.input = this.element.querySelector(".mobile-search-field")!;
    this.counter = this.element.querySelector(".mobile-search-badge")!;
    this.btnPrev = this.element.querySelector("#mobile-search-prev")!;
    this.btnNext = this.element.querySelector("#mobile-search-next")!;
    this.btnClose = this.element.querySelector("#mobile-search-close")!;

    container.appendChild(this.element);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener("mousedown", (e) => e.stopPropagation());

    this.input.addEventListener("input", () => this.handleQueryChange());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) this.findPrevious(); else this.findNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }
    });

    this.btnPrev.addEventListener("click", (e) => { e.stopPropagation(); this.findPrevious(); });
    this.btnNext.addEventListener("click", (e) => { e.stopPropagation(); this.findNext(); });
    this.btnClose.addEventListener("click", (e) => { e.stopPropagation(); this.hide(); });
  }

  private handleQueryChange(): void {
    const q = this.input.value.trim();
    if (!q) {
      this.totalMatches = 0;
      this.currentMatch = 0;
      this.counter.textContent = "0/0";
      return;
    }

    const text = this.getActiveEditor().getText();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    this.totalMatches = matches ? matches.length : 0;
    this.currentMatch = this.totalMatches > 0 ? 1 : 0;
    this.counter.textContent = `${this.currentMatch}/${this.totalMatches}`;

    if (this.totalMatches > 0 && typeof (window as any).find === "function") {
      (window as any).find(q, false, false, true);
    }
  }

  findNext(): void {
    const q = this.input.value.trim();
    if (!q || typeof (window as any).find !== "function") return;
    const found = (window as any).find(q, false, false, true);
    if (found && this.totalMatches > 0) {
      this.currentMatch = (this.currentMatch % this.totalMatches) + 1;
      this.counter.textContent = `${this.currentMatch}/${this.totalMatches}`;
    }
  }

  findPrevious(): void {
    const q = this.input.value.trim();
    if (!q || typeof (window as any).find !== "function") return;
    const found = (window as any).find(q, false, true, true);
    if (found && this.totalMatches > 0) {
      this.currentMatch = this.currentMatch <= 1 ? this.totalMatches : this.currentMatch - 1;
      this.counter.textContent = `${this.currentMatch}/${this.totalMatches}`;
    }
  }

  show(): void {
    this.visible = true;
    this.element.style.display = "flex";
    this.input.focus();
    this.input.select();
    if (this.input.value.trim()) {
      this.handleQueryChange();
    }
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.element.style.display = "none";
    this.input.blur();
    this.onCloseCallback();
  }

  isOpen(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.element.remove();
  }
}
