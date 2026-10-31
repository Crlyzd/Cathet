import { icons } from "../utils/monochromeIcons";

export type MobileSyncMode = "locked" | "snap" | "paused";

const SYNC_CYCLE: Record<MobileSyncMode, MobileSyncMode> = {
  paused: "locked",
  locked: "snap",
  snap: "paused",
};

export interface MobileActionBarCallbacks {
  onToggleMarkdown: () => void;
  onSave: () => void;
  onOpen: () => void;
  onToggleDualPane: () => void;
  onOpenSettings: () => void;
  onToggleSync?: (mode: MobileSyncMode) => void;
}

export class MobileActionBarComponent {
  private element: HTMLElement;
  private pill: HTMLElement;
  private callbacks: MobileActionBarCallbacks;
  private isPreview: boolean = false;
  private isDualPane: boolean = false;
  private syncMode: MobileSyncMode = "locked";
  private isTogglingSync: boolean = false;
  private isSmall: boolean = false;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
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
    const container = document.getElementById(containerId) || document.body;
    container.appendChild(this.element);
    this.bindEvents();
    this.scheduleAutoCollapse(4000);
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="mobile-action-pill">
        <button class="mobile-dock-trigger" id="mobile-dock-trigger" title="Expand Actions">
          ${icons.ellipsis}
        </button>
        <button class="mobile-action-btn" id="mobile-btn-open" title="Open Document">
          ${icons.folder}
        </button>
        <button class="mobile-action-btn" id="mobile-btn-save" title="Save Document">
          ${icons.save}
        </button>
        <button class="mobile-action-btn" id="mobile-btn-markdown" title="Toggle Markdown Preview">
          ${icons.eye}
        </button>
        <button class="mobile-action-btn" id="mobile-btn-dual" title="Toggle Dual Pane">
          ${icons.dualpane}
        </button>
        <button class="mobile-action-btn" id="mobile-btn-settings" title="Settings & About">
          ${icons.settings}
        </button>
      </div>
    `;

    this.btnMarkdown = this.element.querySelector("#mobile-btn-markdown")!;
    this.btnDual = this.element.querySelector("#mobile-btn-dual")!;
  }

  private bindEvents(): void {
    this.pill.addEventListener("click", (e) => {
      if (this.isSmall) {
        e.stopPropagation();
        this.expand();
        return;
      }
      this.scheduleAutoCollapse();
    });

    this.element.querySelector("#mobile-btn-open")?.addEventListener("click", () => {
      this.callbacks.onOpen();
    });

    this.element.querySelector("#mobile-btn-save")?.addEventListener("click", () => {
      this.callbacks.onSave();
    });

    this.btnMarkdown.addEventListener("click", () => {
      this.callbacks.onToggleMarkdown();
    });

    this.btnDual.addEventListener("click", () => {
      this.callbacks.onToggleDualPane();
    });

    this.element.querySelector("#mobile-btn-settings")?.addEventListener("click", () => {
      this.callbacks.onOpenSettings();
    });
  }

  private updateSyncButton(): void {
    if (!this.isDualPane) {
      if (this.btnSync) {
        this.btnSync.remove();
        this.btnSync = null;
      }
      return;
    }

    if (!this.btnSync) {
      this.btnSync = document.createElement("button");
      this.btnSync.className = "mobile-action-btn btn-sync";
      this.btnSync.id = "mobile-btn-sync";
      this.btnSync.addEventListener("click", (e) => {
        e.stopPropagation();
        this.scheduleAutoCollapse();
        this.isTogglingSync = true;
        this.syncMode = SYNC_CYCLE[this.syncMode] || "locked";
        this.updateSyncButton();
        try {
          this.callbacks.onToggleSync?.(this.syncMode);
        } finally {
          setTimeout(() => {
            this.isTogglingSync = false;
          }, 80);
        }
      });
      this.btnDual.insertAdjacentElement("afterend", this.btnSync);
    }

    const isLocked = this.syncMode !== "paused";
    const isSnap = this.syncMode === "snap";

    this.btnSync.classList.toggle("active", isLocked);
    this.btnSync.classList.toggle("blue-galaxy", isSnap);
    this.btnSync.innerHTML = isLocked ? icons.link : icons.unlink;

    if (this.syncMode === "locked") {
      this.btnSync.title = "Sync Scroll: Standard (Locked)";
    } else if (this.syncMode === "snap") {
      this.btnSync.title = "Sync Scroll: Snap Scroll (Locked)";
    } else {
      this.btnSync.title = "Sync Scroll: Paused";
    }
  }

  scheduleAutoCollapse(delayMs: number = 3500): void {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
    }
    this.collapseTimer = setTimeout(() => {
      this.collapse();
    }, delayMs);
  }

  collapse(): void {
    this.isSmall = true;
    this.element.classList.add("is-small");
  }

  expand(): void {
    this.isSmall = false;
    this.element.classList.remove("is-small");
    this.scheduleAutoCollapse(3500);
  }

  notifyInteraction(): void {
    if (!this.isSmall) {
      this.scheduleAutoCollapse(3500);
    }
  }

  setMarkdownPreviewState(isPreview: boolean): void {
    this.isPreview = isPreview;
    this.btnMarkdown.classList.toggle("active", isPreview);
  }

  setDualPaneState(isDual: boolean): void {
    this.isDualPane = isDual;
    this.btnDual.classList.toggle("active", isDual);
    this.updateSyncButton();
  }

  setSyncState(isLocked: boolean, snapScroll?: boolean): void {
    if (this.isTogglingSync) return;
    if (!isLocked) {
      this.syncMode = "paused";
    } else if (snapScroll) {
      this.syncMode = "snap";
    } else {
      this.syncMode = "locked";
    }
    this.updateSyncButton();
  }

  getSyncMode(): MobileSyncMode {
    return this.syncMode;
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? "block" : "none";
  }

  destroy(): void {
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
    this.element.remove();
  }
}

