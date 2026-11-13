import { t } from "../../services/i18nService";
import { bindLongPress } from "../../utils/touchGesture";

export interface HomeCategoryTabsCallbacks {
  onSelectFolder: (folder: string) => void;
  onRequestNewFolder: () => void;
  onDeleteFolder?: (folder: string) => void;
  onRenameFolder?: (folder: string) => void;
  onEditModeChange?: (isEditing: boolean) => void;
}

export class HomeCategoryTabsComponent {
  private element: HTMLElement;
  private callbacks: HomeCategoryTabsCallbacks;
  private activeFolder = "All";
  private folders: string[] = [];
  private isEditMode = false;
  private unbindCleanups: (() => void)[] = [];
  private outsideDownHandler: ((e: PointerEvent) => void) | null = null;

  constructor(container: HTMLElement, callbacks: HomeCategoryTabsCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "home-category-tabs";
    container.appendChild(this.element);
    this.render();
  }

  setFolders(folders: string[], active = "All"): void {
    this.folders = folders.filter((f) => f && f.toLowerCase() !== "hidden" && f.toLowerCase() !== "all");
    this.activeFolder = this.folders.includes(active) || active === "All" ? active : "All";
    if (this.folders.length === 0 && this.isEditMode) {
      this.setEditMode(false, false);
    }
    this.render();
  }

  setActiveFolder(folder: string): void {
    this.activeFolder = folder;
    const chips = this.element.querySelectorAll(".home-tab-chip");
    chips.forEach((c) => {
      const f = c.getAttribute("data-folder");
      c.classList.toggle("active", f === folder);
    });
  }

  isEditModeActive(): boolean {
    return this.isEditMode;
  }

  setEditMode(active: boolean, notify = true): void {
    if (this.isEditMode === active) return;
    if (active && this.folders.length === 0) return;
    this.isEditMode = active;
    this.element.classList.toggle("is-editing-folders", active);

    const customChips = this.element.querySelectorAll<HTMLElement>(
      '.home-tab-chip[data-custom="true"]'
    );
    customChips.forEach((chip, idx) => {
      chip.classList.toggle("is-wiggling", active);
      chip.style.animationDelay = active ? (idx % 2 === 0 ? "0ms" : "-65ms") : "";
    });

    if (active) {
      this.bindOutsideDismiss();
    } else {
      this.unbindOutsideDismiss();
    }

    if (notify) {
      this.callbacks.onEditModeChange?.(active);
    }
  }

  private bindOutsideDismiss(): void {
    this.unbindOutsideDismiss();
    this.outsideDownHandler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.home-tab-chip[data-custom="true"]')) return;
      if (target.closest(".folder-modal-backdrop")) return;
      this.setEditMode(false);
    };
    document.addEventListener("pointerdown", this.outsideDownHandler, true);
  }

  private unbindOutsideDismiss(): void {
    if (this.outsideDownHandler) {
      document.removeEventListener("pointerdown", this.outsideDownHandler, true);
      this.outsideDownHandler = null;
    }
  }

  private render(): void {
    this.unbindCleanups.forEach((fn) => fn());
    this.unbindCleanups = [];
    this.element.innerHTML = "";

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "home-tabs-scroll";

    const allChip = this.createAllChip(this.activeFolder === "All");
    scrollWrapper.appendChild(allChip);

    this.folders.forEach((folder, idx) => {
      const chip = this.createCustomChip(folder, this.activeFolder === folder, idx);
      scrollWrapper.appendChild(chip);
    });

    const addChip = document.createElement("button");
    addChip.className = "home-tab-chip home-tab-add";
    addChip.title = t("home.createFolder");
    addChip.innerHTML = `<span class="home-tab-add-icon">+</span>`;
    addChip.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isEditMode) this.setEditMode(false);
      this.callbacks.onRequestNewFolder();
    });
    scrollWrapper.appendChild(addChip);

    this.element.appendChild(scrollWrapper);
  }

  private createAllChip(isActive: boolean): HTMLElement {
    const chip = document.createElement("button");
    chip.className = `home-tab-chip${isActive ? " active" : ""}`;
    chip.setAttribute("data-folder", "All");
    chip.textContent = t("home.allNotes");

    const cleanup = bindLongPress(chip, {
      thresholdMs: 420,
      moveTolerancePx: 10,
      onLongPress: () => {
        if (!this.isEditMode && this.folders.length > 0) this.setEditMode(true);
      },
      onClick: () => {
        if (this.isEditMode) this.setEditMode(false);
        this.setActiveFolder("All");
        this.callbacks.onSelectFolder("All");
      },
    });
    this.unbindCleanups.push(cleanup);
    return chip;
  }

  private createCustomChip(folderId: string, isActive: boolean, idx: number): HTMLElement {
    const chip = document.createElement("button");
    chip.className = `home-tab-chip${isActive ? " active" : ""}${this.isEditMode ? " is-wiggling" : ""}`;
    chip.setAttribute("data-folder", folderId);
    chip.setAttribute("data-custom", "true");
    if (this.isEditMode) {
      chip.style.animationDelay = idx % 2 === 0 ? "0ms" : "-65ms";
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "home-tab-label";
    labelSpan.textContent = folderId;
    chip.appendChild(labelSpan);

    const delBadge = document.createElement("span");
    delBadge.className = "home-tab-delete-badge";
    delBadge.setAttribute("role", "button");
    delBadge.setAttribute("aria-label", `Delete ${folderId}`);
    delBadge.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    const onBadgeDown = (e: Event) => {
      e.stopPropagation();
    };
    const onBadgeClick = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        if ("vibrate" in navigator) navigator.vibrate(20);
      } catch {}
      this.callbacks.onDeleteFolder?.(folderId);
    };
    delBadge.addEventListener("pointerdown", onBadgeDown);
    delBadge.addEventListener("click", onBadgeClick);

    chip.appendChild(delBadge);

    const cleanup = bindLongPress(chip, {
      thresholdMs: 420,
      moveTolerancePx: 10,
      onLongPress: () => {
        if (!this.isEditMode) this.setEditMode(true);
      },
      onClick: () => {
        if (this.isEditMode) {
          this.callbacks.onRenameFolder?.(folderId);
          return;
        }
        this.setActiveFolder(folderId);
        this.callbacks.onSelectFolder(folderId);
      },
    });

    this.unbindCleanups.push(cleanup, () => {
      delBadge.removeEventListener("pointerdown", onBadgeDown);
      delBadge.removeEventListener("click", onBadgeClick);
    });
    return chip;
  }

  setVisible(visible: boolean): void {
    if (!visible && this.isEditMode) this.setEditMode(false);
    this.element.style.display = visible ? "block" : "none";
  }

  destroy(): void {
    this.unbindOutsideDismiss();
    this.unbindCleanups.forEach((fn) => fn());
    this.unbindCleanups = [];
    this.element.remove();
  }
}
