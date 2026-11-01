import { icons } from "../utils/monochromeIcons";

export interface MobileDrawerState {
  isMarkdownPreview: boolean;
  isDualPane: boolean;
  canSave: boolean;
}

export interface MobileDrawerCallbacks {
  onNewDocument: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onToggleDualPane: () => void;
  onToggleMarkdown: () => void;
  onOpenSettings: () => void;
}

/**
 * MobileMenuDrawer — Touch-first bottom action drawer for Cathet on Android/Mobile.
 * Replaces desktop contextual popup menu on mobile devices.
 */
export class MobileMenuDrawerComponent {
  private overlay: HTMLElement;
  private isVisible: boolean = false;
  private callbacks: MobileDrawerCallbacks;

  constructor(callbacks: MobileDrawerCallbacks) {
    this.callbacks = callbacks;
    this.overlay = document.createElement("div");
    this.overlay.className = "mobile-drawer-overlay";
    this.overlay.id = "mobile-menu-drawer-overlay";

    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });
  }

  show(state: MobileDrawerState): void {
    this.overlay.innerHTML = `
      <div class="mobile-drawer-sheet" id="mobile-drawer-sheet">
        <div class="mobile-drawer-drag-indicator"></div>
        <div class="mobile-drawer-header">Document Actions</div>

        <div class="mobile-drawer-item" id="drawer-item-new">
          <div class="mobile-drawer-item-left">
            <span>${icons.file}</span>
            <span>New Document</span>
          </div>
        </div>

        <div class="mobile-drawer-item" id="drawer-item-open">
          <div class="mobile-drawer-item-left">
            <span>${icons.folder}</span>
            <span>Open File...</span>
          </div>
        </div>

        <div class="mobile-drawer-item" id="drawer-item-save" style="${state.canSave ? "" : "opacity: 0.5;"}">
          <div class="mobile-drawer-item-left">
            <span>${icons.save}</span>
            <span>Save</span>
          </div>
        </div>

        <div class="mobile-drawer-item" id="drawer-item-saveas">
          <div class="mobile-drawer-item-left">
            <span>${icons.save}</span>
            <span>Save As...</span>
          </div>
        </div>

        <div class="mobile-drawer-divider"></div>

        <div class="mobile-drawer-item" id="drawer-item-dual">
          <div class="mobile-drawer-item-left">
            <span>${icons.dualpane}</span>
            <span>Dual Pane Split</span>
          </div>
          <span class="mobile-drawer-pill-badge ${state.isDualPane ? "active" : ""}">
            ${state.isDualPane ? "ACTIVE" : "OFF"}
          </span>
        </div>

        <div class="mobile-drawer-item" id="drawer-item-markdown">
          <div class="mobile-drawer-item-left">
            <span>${icons.eye}</span>
            <span>Markdown Mode</span>
          </div>
          <span class="mobile-drawer-pill-badge ${state.isMarkdownPreview ? "active" : ""}">
            ${state.isMarkdownPreview ? "PREVIEW" : "EDIT"}
          </span>
        </div>

        <div class="mobile-drawer-divider"></div>

        <div class="mobile-drawer-item" id="drawer-item-settings">
          <div class="mobile-drawer-item-left">
            <span>${icons.settings}</span>
            <span>Settings & About</span>
          </div>
        </div>
      </div>
    `;

    (document.activeElement as HTMLElement)?.blur();
    window.getSelection()?.removeAllRanges();
    document.body.classList.add("is-modal-open");

    this.attachItemHandlers(state);
    void this.overlay.offsetHeight;
    this.overlay.classList.add("visible");
    this.isVisible = true;
  }

  private attachItemHandlers(state: MobileDrawerState): void {
    const bindItem = (id: string, action: () => void) => {
      this.overlay.querySelector(`#${id}`)?.addEventListener("click", () => {
        this.hide();
        action();
      });
    };

    bindItem("drawer-item-new", this.callbacks.onNewDocument);
    bindItem("drawer-item-open", this.callbacks.onOpen);
    if (state.canSave) {
      bindItem("drawer-item-save", this.callbacks.onSave);
    }
    bindItem("drawer-item-saveas", this.callbacks.onSaveAs);
    bindItem("drawer-item-dual", this.callbacks.onToggleDualPane);
    bindItem("drawer-item-markdown", this.callbacks.onToggleMarkdown);
    bindItem("drawer-item-settings", this.callbacks.onOpenSettings);
  }

  hideInstant(): void {
    if (!this.isVisible) return;
    this.overlay.style.transition = "none";
    const sheet = this.overlay.querySelector(".mobile-drawer-sheet") as HTMLElement | null;
    if (sheet) sheet.style.transition = "none";
    this.overlay.classList.remove("visible");
    this.isVisible = false;
    document.body.classList.remove("is-modal-open");
    requestAnimationFrame(() => {
      this.overlay.style.transition = "";
      if (sheet) sheet.style.transition = "";
    });
  }

  hide(): void {
    if (!this.isVisible) return;
    this.overlay.classList.remove("visible");
    document.body.classList.remove("is-modal-open");
    this.isVisible = false;
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.overlay.remove();
  }
}
