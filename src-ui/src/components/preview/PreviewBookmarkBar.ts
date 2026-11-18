/**
 * PreviewBookmarkBar.ts — Frosted-glass reading bookmark pill & quick-jump popover for Preview mode.
 */
import { bookmarkService, PreviewBookmark } from "../../services/bookmarkService";
import { icons } from "../../utils/monochromeIcons";

export class PreviewBookmarkBar {
  private rootEl: HTMLElement;
  private btnJump!: HTMLButtonElement;
  private btnAdd!: HTMLButtonElement;
  private btnList!: HTMLButtonElement;
  private popoverEl!: HTMLElement;
  private docKey: string | null = null;
  private enabled = true;
  private isPreview = false;
  private onBookmarksChanged: (bookmarks: PreviewBookmark[]) => void;
  private wrapperEl: HTMLElement;
  private editorEl: HTMLElement;
  private outsideHandler = (e: PointerEvent): void => {
    if (!this.rootEl.contains(e.target as Node)) {
      this.popoverEl.classList.add("hidden");
    }
  };

  constructor(
    host: HTMLElement,
    wrapperEl: HTMLElement,
    editorEl: HTMLElement,
    onBookmarksChanged: (bookmarks: PreviewBookmark[]) => void
  ) {
    this.wrapperEl = wrapperEl;
    this.editorEl = editorEl;
    this.onBookmarksChanged = onBookmarksChanged;

    this.rootEl = document.createElement("div");
    this.rootEl.className = "preview-bookmark-bar";
    this.rootEl.innerHTML = `
      <div class="preview-bookmark-pill">
        <button type="button" class="preview-bm-btn preview-bm-jump" title="Jump to latest reading bookmark"></button>
        <span class="preview-bm-divider"></span>
        <button type="button" class="preview-bm-btn preview-bm-add" title="Save bookmark at current spot">+</button>
        <span class="preview-bm-divider preview-bm-list-sep"></span>
        <button type="button" class="preview-bm-btn preview-bm-list" title="Saved bookmarks"></button>
      </div>
      <div class="preview-bookmark-popover hidden"></div>
    `;
    host.appendChild(this.rootEl);

    this.btnJump = this.rootEl.querySelector(".preview-bm-jump")!;
    this.btnAdd = this.rootEl.querySelector(".preview-bm-add")!;
    this.btnList = this.rootEl.querySelector(".preview-bm-list")!;
    this.popoverEl = this.rootEl.querySelector(".preview-bookmark-popover")!;

    this.bindEvents();
    this.updateVisibility();
  }

  getElement(): HTMLElement {
    return this.rootEl;
  }

  private bindEvents(): void {
    this.btnJump.addEventListener("click", (e) => {
      e.stopPropagation();
      const latest = bookmarkService.getLatestBookmark(this.docKey);
      if (!latest) {
        this.saveCurrentBookmark();
        return;
      }
      this.jumpToBookmark(latest);
    });

    this.btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      this.saveCurrentBookmark();
    });

    this.btnList.addEventListener("click", (e) => {
      e.stopPropagation();
      this.popoverEl.classList.toggle("hidden");
    });

    this.popoverEl.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const jumpBtn = target.closest<HTMLElement>("[data-bm-jump]");
      if (jumpBtn) {
        const id = jumpBtn.getAttribute("data-bm-jump");
        const found = bookmarkService.getBookmarks(this.docKey).find((b) => b.id === id);
        if (found) this.jumpToBookmark(found);
        this.popoverEl.classList.add("hidden");
        return;
      }
      const delBtn = target.closest<HTMLElement>("[data-bm-del]");
      if (delBtn) {
        const id = delBtn.getAttribute("data-bm-del") || "";
        const next = bookmarkService.removeBookmark(this.docKey, id);
        this.renderState(next);
        this.onBookmarksChanged(next);
      }
    });

    document.addEventListener("pointerdown", this.outsideHandler, true);
  }

  setState(isPreview: boolean, docKey: string | null, enabled: boolean): void {
    if (this.docKey === null && docKey) {
      bookmarkService.migrateDocKey(null, docKey);
    }
    this.isPreview = isPreview;
    this.docKey = docKey;
    this.enabled = enabled;
    this.popoverEl.classList.add("hidden");
    this.updateVisibility();
    if (isPreview && enabled) {
      const list = bookmarkService.getBookmarks(this.docKey);
      this.renderState(list);
      this.onBookmarksChanged(list);
    }
  }

  updateVisibility(): void {
    const show = this.enabled && this.isPreview && this.wrapperEl.scrollHeight > this.wrapperEl.clientHeight * 1.15;
    this.rootEl.style.display = show ? "flex" : "none";
    if (!show) this.popoverEl.classList.add("hidden");
  }

  private saveCurrentBookmark(): void {
    const maxScroll = Math.max(1, this.wrapperEl.scrollHeight - this.wrapperEl.clientHeight);
    const ratio = this.wrapperEl.scrollTop / maxScroll;
    const blocks = Array.from(this.editorEl.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,blockquote,pre,li"));
    const visible = blocks.find((el) => el.offsetTop >= this.wrapperEl.scrollTop + 16) || blocks[0];
    const text = (visible?.textContent || "").replace(/\s+/g, " ").trim();
    const label = text.slice(0, 22) || `${Math.round(ratio * 100)}%`;
    bookmarkService.addBookmark(this.docKey, ratio, label, text);
    const next = bookmarkService.getBookmarks(this.docKey);
    this.renderState(next);
    this.onBookmarksChanged(next);
    try { if ("vibrate" in navigator) navigator.vibrate(15); } catch {}
  }

  private jumpToBookmark(bm: PreviewBookmark): void {
    const blocks = Array.from(this.editorEl.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,p,blockquote,pre,li"));
    let targetEl: HTMLElement | undefined;
    if (bm.snippet) {
      targetEl = blocks.find((el) => (el.textContent || "").replace(/\s+/g, " ").trim().startsWith(bm.snippet.slice(0, 32)));
    }
    const maxScroll = Math.max(1, this.wrapperEl.scrollHeight - this.wrapperEl.clientHeight);
    const targetTop = targetEl ? Math.max(0, targetEl.offsetTop - 20) : bm.scrollRatio * maxScroll;
    this.wrapperEl.scrollTo({ top: targetTop, behavior: "smooth" });

    const pulseTarget = targetEl || blocks.find((el) => el.offsetTop >= targetTop - 10);
    if (pulseTarget) {
      pulseTarget.classList.remove("preview-bookmark-arrive");
      void pulseTarget.offsetWidth;
      pulseTarget.classList.add("preview-bookmark-arrive");
    }
  }

  private renderState(list: PreviewBookmark[]): void {
    const latest = list[0];
    this.btnJump.innerHTML = latest
      ? `${icons.bookmarkFilled}<span>${Math.round(latest.scrollRatio * 100)}%</span>`
      : `${icons.bookmark}<span>Save</span>`;

    const hasList = list.length > 0;
    this.btnList.style.display = hasList ? "inline-flex" : "none";
    this.rootEl.querySelector<HTMLElement>(".preview-bm-list-sep")!.style.display = hasList ? "block" : "none";
    this.btnList.textContent = `${list.length}▾`;

    this.popoverEl.innerHTML = list.map((b) => `
      <div class="preview-bm-row">
        <button type="button" class="preview-bm-row-jump" data-bm-jump="${b.id}">
          <span class="preview-bm-row-title">${this.escapeHtml(b.label)}</span>
          <span class="preview-bm-row-pct">${Math.round(b.scrollRatio * 100)}%</span>
        </button>
        <button type="button" class="preview-bm-row-del" data-bm-del="${b.id}" aria-label="Remove">×</button>
      </div>
    `).join("");
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
  }

  destroy(): void {
    document.removeEventListener("pointerdown", this.outsideHandler, true);
    this.rootEl.remove();
  }
}
