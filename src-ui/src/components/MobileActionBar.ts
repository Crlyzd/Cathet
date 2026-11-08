import { icons } from "../utils/monochromeIcons";
import { formatIcons } from "../utils/contextMenuItems";
import { FormatAction } from "../utils/formatUtils";
import { MobileFormatBarComponent } from "./MobileFormatBar";
import { MobileSearchBarComponent } from "./MobileSearchBar";
import { bindLongPress } from "../utils/touchGesture";
import { t } from "../services/i18nService";

export type MobileSyncMode = "locked" | "snap" | "paused";

export interface MobileActionBarCallbacks {
  onToggleMarkdown: () => void;
  onSave: () => void;
  onOpen: () => void;
  onToggleDualPane: () => void;
  onOpenSettings: () => void;
  onFormat?: (action: FormatAction) => void;
  onToggleSync?: (mode: MobileSyncMode) => void;
  getActiveEditor?: () => any;
}

export class MobileActionBarComponent {
  private element: HTMLElement;
  private pill: HTMLElement;
  private formatBar: MobileFormatBarComponent;
  private searchBar: MobileSearchBarComponent;
  private callbacks: MobileActionBarCallbacks;
  private isPreview = false;
  private isDualPane = false;
  private isFormatMode = false;
  private isSearchMode = false;
  private isKeyboardOpen = false;
  private syncMode: MobileSyncMode = "locked";
  private isTogglingSync = false;
  private isSmall = false;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  private syncCleanup: (() => void) | null = null;
  private btnFormat!: HTMLButtonElement;
  private btnMarkdown!: HTMLButtonElement;
  private btnDual!: HTMLButtonElement;
  private btnSync: HTMLButtonElement | null = null;

  constructor(containerId: string, callbacks: MobileActionBarCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "mobile-action-bar";
    this.element.id = "mobile-action-bar";

    this.render();
    this.pill = this.element.querySelector(".mobile-action-pill")!;
    this.formatBar = new MobileFormatBarComponent(
      this.element,
      (action) => this.callbacks.onFormat?.(action),
      () => this.setFormatMode(false)
    );
    this.searchBar = new MobileSearchBarComponent(
      this.element,
      () => this.callbacks.getActiveEditor?.(),
      () => this.setSearchMode(false)
    );

    const container = document.getElementById(containerId) || document.body;
    container.appendChild(this.element);
    this.bindEvents();
    this.scheduleAutoCollapse(4000);
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="mobile-action-pill">
        <button class="mobile-dock-trigger" id="mobile-dock-trigger" title="Expand Actions">${icons.ellipsis}</button>
        <button class="mobile-action-btn" id="mobile-btn-open" title="${t("menu.open")}">${icons.folder}</button>
        <button class="mobile-action-btn" id="mobile-btn-save" title="${t("menu.save")}">${icons.save}</button>
        <button class="mobile-action-btn" id="mobile-btn-search" title="${t("home.searchPlaceholder") || "Find"}">${icons.search}</button>
        <button class="mobile-action-btn" id="mobile-btn-format" title="${t("context.format")}">${formatIcons.formatAa}</button>
        <button class="mobile-action-btn" id="mobile-btn-markdown" title="${t("menu.markdownPreview")}">${icons.eye}</button>
        <button class="mobile-action-btn" id="mobile-btn-dual" title="${t("menu.dualPane")}">${icons.dualpane}</button>
        <button class="mobile-action-btn" id="mobile-btn-settings" title="${t("menu.settings")}">${icons.settings}</button>
      </div>
    `;

    this.btnFormat = this.element.querySelector("#mobile-btn-format")!;
    this.btnMarkdown = this.element.querySelector("#mobile-btn-markdown")!;
    this.btnDual = this.element.querySelector("#mobile-btn-dual")!;
  }

  private bindEvents(): void {
    this.pill.addEventListener("mousedown", (e) => e.preventDefault());
    this.pill.addEventListener("click", (e) => {
      if (this.isSmall) {
        e.stopPropagation();
        this.expand();
        return;
      }
      this.scheduleAutoCollapse();
    });

    this.element.querySelector("#mobile-btn-open")?.addEventListener("click", () => this.callbacks.onOpen());
    this.element.querySelector("#mobile-btn-save")?.addEventListener("click", () => this.callbacks.onSave());
    this.element.querySelector("#mobile-btn-search")?.addEventListener("click", () => this.toggleSearchMode());
    this.btnFormat.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.isPreview) this.setFormatMode(true);
    });
    this.btnMarkdown.addEventListener("click", () => this.callbacks.onToggleMarkdown());
    this.btnDual.addEventListener("click", () => this.callbacks.onToggleDualPane());
    this.element.querySelector("#mobile-btn-settings")?.addEventListener("click", () => this.callbacks.onOpenSettings());
  }

  setFormatMode(enabled: boolean): void {
    this.isFormatMode = enabled;
    this.element.classList.toggle("is-format-mode", enabled);
    if (enabled) {
      if (this.collapseTimer) clearTimeout(this.collapseTimer);
      this.isSmall = false;
      this.element.classList.remove("is-small");
      if (this.isSearchMode) this.setSearchMode(false);
    } else {
      this.scheduleAutoCollapse(3500);
    }
  }

  setSearchMode(enabled: boolean): void {
    this.isSearchMode = enabled;
    this.element.classList.toggle("is-search-mode", enabled);
    if (enabled) {
      if (this.collapseTimer) clearTimeout(this.collapseTimer);
      this.isSmall = false;
      this.element.classList.remove("is-small");
      if (this.isFormatMode) this.setFormatMode(false);
      this.searchBar.show();
    } else {
      this.searchBar.hide();
      this.scheduleAutoCollapse(3500);
    }
  }

  toggleSearchMode(): void {
    this.setSearchMode(!this.isSearchMode);
  }

  setKeyboardOpen(isOpen: boolean): void {
    this.isKeyboardOpen = isOpen;
    if (isOpen) {
      if (this.collapseTimer) clearTimeout(this.collapseTimer);
      if (this.isSmall) this.expand();
    } else {
      if (this.isFormatMode) this.setFormatMode(false);
      else this.scheduleAutoCollapse(3500);
    }
  }

  private updateSyncButton(): void {
    if (!this.isDualPane) {
      if (this.syncCleanup) { this.syncCleanup(); this.syncCleanup = null; }
      this.btnSync?.remove();
      this.btnSync = null;
      return;
    }

    if (!this.btnSync) {
      this.btnSync = document.createElement("button");
      this.btnSync.className = "mobile-action-btn btn-sync";
      this.btnSync.id = "mobile-btn-sync";
      this.syncCleanup = bindLongPress(this.btnSync, {
        thresholdMs: 400,
        onClick: (e) => {
          e.stopPropagation();
          this.scheduleAutoCollapse();
          this.isTogglingSync = true;
          this.syncMode = this.syncMode === "paused" ? "locked" : "paused";
          this.updateSyncButton();
          try { this.callbacks.onToggleSync?.(this.syncMode); }
          finally { setTimeout(() => { this.isTogglingSync = false; }, 80); }
        },
        onLongPress: (e) => {
          e.stopPropagation();
          this.scheduleAutoCollapse();
          this.isTogglingSync = true;
          this.syncMode = this.syncMode === "snap" ? "locked" : "snap";
          try { if ("vibrate" in navigator) navigator.vibrate(30); } catch (_) {}
          this.updateSyncButton();
          try { this.callbacks.onToggleSync?.(this.syncMode); }
          finally { setTimeout(() => { this.isTogglingSync = false; }, 80); }
        },
      });
      this.btnDual.insertAdjacentElement("afterend", this.btnSync);
    }

    const isLocked = this.syncMode !== "paused";
    const isSnap = this.syncMode === "snap";
    this.btnSync.classList.toggle("active", isLocked);
    this.btnSync.classList.toggle("blue-galaxy", isSnap);
    this.btnSync.innerHTML = isLocked ? icons.link : icons.unlink;
    this.btnSync.title = this.syncMode === "locked"
      ? t("dualpane.lockStandard")
      : this.syncMode === "snap"
        ? t("dualpane.snapLocked")
        : t("dualpane.scrollPaused");
  }

  scheduleAutoCollapse(delayMs = 3500): void {
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
    if (this.isKeyboardOpen || this.isFormatMode) return;
    this.collapseTimer = setTimeout(() => this.collapse(), delayMs);
  }

  collapse(): void {
    if (this.isKeyboardOpen || this.isFormatMode) return;
    this.isSmall = true;
    this.element.classList.add("is-small");
  }

  expand(): void {
    this.isSmall = false;
    this.element.classList.remove("is-small");
    this.scheduleAutoCollapse(3500);
  }

  setMarkdownPreviewState(isPreview: boolean): void {
    this.isPreview = isPreview;
    this.btnMarkdown.classList.toggle("active", isPreview);
    this.btnFormat.classList.toggle("disabled", isPreview);
    if (isPreview && this.isFormatMode) this.setFormatMode(false);
  }

  setDualPaneState(isDual: boolean): void {
    this.isDualPane = isDual;
    this.btnDual.classList.toggle("active", isDual);
    this.updateSyncButton();
  }

  setSyncState(isLocked: boolean, snapScroll?: boolean): void {
    if (this.isTogglingSync) return;
    this.syncMode = !isLocked ? "paused" : snapScroll ? "snap" : "locked";
    this.updateSyncButton();
  }

  setVisible(visible: boolean): void { this.element.style.display = visible ? "flex" : "none"; }

  destroy(): void {
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
    if (this.syncCleanup) { this.syncCleanup(); this.syncCleanup = null; }
    this.formatBar.destroy();
    this.searchBar.destroy();
    this.element.remove();
  }
}
