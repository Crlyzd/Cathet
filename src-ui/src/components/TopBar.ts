import { WindowService } from "../services/windowService";
import { globalEventBus } from "../utils/eventBus";

export class TopBarComponent {
  private container: HTMLElement;
  private progressLine!: HTMLElement;
  private dotBtn!: HTMLElement;
  private backBtn!: HTMLElement;
  private titleArea!: HTMLElement;
  private windowService: WindowService;

  constructor(containerId: string, windowService: WindowService) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found.`);
    this.container = el;
    this.windowService = windowService;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="topbar" id="topbar-header">
        <div class="dot-btn" id="topbar-dot-btn" title="Menu & Settings">
          <span class="dot-icon"></span>
        </div>
        <div class="topbar-drag-area" id="topbar-drag-area">Untitled</div>
        <div class="back-btn" id="topbar-back-btn" style="display: none;" title="Back to Notes">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        <div class="progress-bar-line" id="topbar-progress-line"></div>
      </div>
    `;

    this.progressLine = document.getElementById("topbar-progress-line")!;
    this.dotBtn = document.getElementById("topbar-dot-btn")!;
    this.backBtn = document.getElementById("topbar-back-btn")!;
    this.titleArea = document.getElementById("topbar-drag-area")!;

    this.bindEvents();
  }

  setBackVisible(visible: boolean): void {
    if (this.backBtn) {
      this.backBtn.style.display = visible ? "flex" : "none";
    }
  }

  private bindEvents(): void {
    this.backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      globalEventBus.emit("topbar:navigateHome");
    });
    this.dotBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    this.dotBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = this.dotBtn.getBoundingClientRect();
      globalEventBus.emit("topbar:toggleMenu", { x: rect.left, y: rect.bottom });
    });

    const topbar = this.container.querySelector(".topbar");
    topbar?.addEventListener("mousedown", (e: Event) => {
      const me = e as MouseEvent;
      if ((me.target as HTMLElement)?.closest("#topbar-dot-btn")) {
        return;
      }
      if (me.button === 0 && me.detail === 1) {
        me.preventDefault();
        this.windowService.startDragging();
      }
    });

    topbar?.addEventListener("dblclick", (e: Event) => {
      const me = e as MouseEvent;
      if ((me.target as HTMLElement)?.closest("#topbar-dot-btn")) {
        return;
      }
      this.windowService.toggleMaximize();
    });
  }

  setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.progressLine.classList.add("loading");
    } else {
      this.progressLine.classList.remove("loading");
    }
  }

  getTitle(): string {
    return this.titleArea.textContent || "Untitled";
  }

  /**
   * Sets top bar title strictly to document file name (e.g. Untitled or notes.md)
   */
  setTitle(fileName: string): void {
    const cleanName = fileName ? fileName.trim() : "Untitled";
    this.titleArea.textContent = cleanName;
  }

  /**
   * Lights up the top bar dot button with glowing notification animation.
   */
  setUpdateAvailable(isAvailable: boolean): void {
    if (isAvailable) {
      this.dotBtn.classList.add("glow-update");
      this.dotBtn.title = "Update Available! Click to open settings.";
    } else {
      this.dotBtn.classList.remove("glow-update");
      this.dotBtn.title = "Menu & Settings";
    }
  }
}
