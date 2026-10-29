import { globalEventBus } from "../utils/eventBus";

export interface MobileActionBarCallbacks {
  onToggleMarkdown: () => void;
  onSave: () => void;
  onOpen: () => void;
  onToggleDualPane: () => void;
  onOpenSettings: () => void;
}

export class MobileActionBarComponent {
  private element: HTMLElement;
  private callbacks: MobileActionBarCallbacks;
  private isPreview: boolean = false;
  private isDualPane: boolean = false;
  private btnMarkdown!: HTMLButtonElement;
  private btnDual!: HTMLButtonElement;

  constructor(containerId: string, callbacks: MobileActionBarCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "mobile-action-bar";
    this.element.id = "mobile-action-bar";

    this.render();
    const container = document.getElementById(containerId) || document.body;
    container.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="mobile-action-pill">
        <button class="mobile-action-btn" id="mobile-btn-open" title="Open Document">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        <button class="mobile-action-btn" id="mobile-btn-save" title="Save Document">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </button>

        <button class="mobile-action-btn" id="mobile-btn-markdown" title="Toggle Markdown Preview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>

        <button class="mobile-action-btn" id="mobile-btn-dual" title="Toggle Dual Pane">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
        </button>

        <button class="mobile-action-btn" id="mobile-btn-settings" title="Settings & About">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    `;

    this.btnMarkdown = this.element.querySelector("#mobile-btn-markdown")!;
    this.btnDual = this.element.querySelector("#mobile-btn-dual")!;
  }

  private bindEvents(): void {
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

  setMarkdownPreviewState(isPreview: boolean): void {
    this.isPreview = isPreview;
    this.btnMarkdown.classList.toggle("active", isPreview);
  }

  setDualPaneState(isDual: boolean): void {
    this.isDualPane = isDual;
    this.btnDual.classList.toggle("active", isDual);
  }

  destroy(): void {
    this.element.remove();
  }
}

