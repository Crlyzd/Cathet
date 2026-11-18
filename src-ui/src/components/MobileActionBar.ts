import { icons } from "../utils/monochromeIcons";
import { formatIcons } from "../utils/contextMenuItems";
import { FormatAction } from "../utils/formatUtils";
import { MobileFormatBarComponent } from "./MobileFormatBar";
import { MobileSearchBarComponent } from "./MobileSearchBar";
import { bindLongPress } from "../utils/touchGesture";
import { t } from "../services/i18nService";
import { pushBackLayer, removeBackLayer } from "../utils/backStack";

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
  private isShown = true;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  private enterTimer: ReturnType<typeof setTimeout> | null = null;
  private syncCleanup: (() => void) | null = null;
  private btnFormat!: HTMLButtonElement;
  private btnMarkdown!: HTMLButtonElement;
  private btnDual!: HTMLButtonElement;
  private btnSettings: HTMLButtonElement | null = null;
  private btnSync: HTMLButtonElement | null = null;

  constructor(containerId: string, callbacks: MobileActionBarCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "mobile-action-bar";
    this.element.id = "mobile-action-bar";

    this.render();
    this.pill = this.element.querySelector(".mobile-action-pill")!;
    this.formatBar = new MobileFormatBarComponent(this.element, (a) => this.callbacks.onFormat?.(a), () => this.setFormatMode(false));
    this.searchBar = new MobileSearchBarComponent(this.element, () => this.callbacks.getActiveEditor?.(), () => this.setSearchMode(false));

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
        <button class="mobile-action-btn" id="mobile-btn-markdown" title="${t("menu.markdownPreview")}">${icons.eye}</button>
        <button class="mobile-action-btn" id="mobile-btn-format" title="${t("context.format")}">${formatIcons.formatAa}</button>
        <button class="mobile-action-btn" id="mobile-btn-dual" title="${t("menu.dualPane")}">${icons.dualpane}</button>
        <button class="mobile-action-btn" id="mobile-btn-settings" title="${t("menu.settings")}">${icons.settings}</button>
      </div>
    `;

    this.btnFormat = this.element.querySelector("#mobile-btn-format")!;
    this.btnMarkdown = this.element.querySelector("#mobile-btn-markdown")!;
    this.btnDual = this.element.querySelector("#mobile-btn-dual")!;
    this.btnSettings = this.element.querySelector("#mobile-btn-settings");
  }

  private bindEvents(): void {
    this.pill.addEventListener("mousedown", (e) => e.preventDefault());
    this.pill.addEventListener("click", (e) => {
      if (this.isSmall) { e.stopPropagation(); this.expand(); return; }
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
    this.btnSettings?.addEventListener("click", () => this.callbacks.onOpenSettings());
  }

  private applyOverlayMode(cls: string, layerId: string, enabled: boolean, onBack: () => void): void {
    this.element.classList.toggle(cls, enabled);
    if (enabled) {
      if (this.collapseTimer) clearTimeout(this.collapseTimer);
      this.isSmall = false;
      this.element.classList.remove("is-small");
      pushBackLayer(layerId, onBack);
    } else {
      removeBackLayer(layerId);
      this.scheduleAutoCollapse(3500);
    }
  }

  setFormatMode(enabled: boolean): void {
    if (this.isFormatMode === enabled) return;
    this.isFormatMode = enabled;
    if (enabled && this.isSearchMode) this.setSearchMode(false);
    this.applyOverlayMode("is-format-mode", "mobile-format-bar", enabled, () => this.setFormatMode(false));
  }

  setSearchMode(enabled: boolean): void {
    if (this.isSearchMode === enabled) return;
    this.isSearchMode = enabled;
    if (enabled && this.isFormatMode) this.setFormatMode(false);
    this.applyOverlayMode("is-search-mode", "mobile-search-bar", enabled, () => this.setSearchMode(false));
    if (enabled) this.searchBar.show(); else this.searchBar.hide();
  }

  toggleSearchMode(): void {
    this.setSearchMode(!this.isSearchMode);
  }

  isSearchBarOpen(): boolean { return this.isSearchMode; }

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
      const toggle = (e: Event, nextMode: MobileSyncMode, vibrate = false) => {
        e.stopPropagation();
        this.scheduleAutoCollapse();
        this.isTogglingSync = true;
        this.syncMode = nextMode;
        if (vibrate) { try { if ("vibrate" in navigator) navigator.vibrate(30); } catch (_) {} }
        this.updateSyncButton();
        try { this.callbacks.onToggleSync?.(this.syncMode); }
        finally { setTimeout(() => { this.isTogglingSync = false; }, 80); }
      };
      this.syncCleanup = bindLongPress(this.btnSync, {
        thresholdMs: 400,
        onClick: (e) => toggle(e, this.syncMode === "paused" ? "locked" : "paused"),
        onLongPress: (e) => toggle(e, this.syncMode === "snap" ? "locked" : "snap", true),
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
    if (this.isKeyboardOpen || this.isFormatMode || this.isSearchMode) return;
    this.collapseTimer = setTimeout(() => this.collapse(), delayMs);
  }

  collapse(): void {
    if (this.isKeyboardOpen || this.isFormatMode || this.isSearchMode) return;
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
    if (this.btnSettings) this.btnSettings.style.display = isDual ? "none" : "";
    this.updateSyncButton();
  }

  setSyncState(isLocked: boolean, snapScroll?: boolean): void {
    if (this.isTogglingSync) return;
    this.syncMode = !isLocked ? "paused" : snapScroll ? "snap" : "locked";
    this.updateSyncButton();
  }

  setVisible(visible: boolean): void {
    const wasShown = this.isShown;
    this.isShown = visible;
    this.element.style.display = visible ? "flex" : "none";
    if (this.enterTimer) { clearTimeout(this.enterTimer); this.enterTimer = null; }
    this.element.classList.remove("is-entering");
    if (visible && !wasShown && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void this.element.offsetWidth;
      this.element.classList.add("is-entering");
      this.enterTimer = setTimeout(() => { this.element.classList.remove("is-entering"); this.enterTimer = null; }, 320);
    }
  }

  destroy(): void {
    removeBackLayer("mobile-format-bar"); removeBackLayer("mobile-search-bar");
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
    if (this.enterTimer) clearTimeout(this.enterTimer);
    if (this.syncCleanup) { this.syncCleanup(); this.syncCleanup = null; }
    this.formatBar.destroy();
    this.searchBar.destroy();
    this.element.remove();
  }
}
