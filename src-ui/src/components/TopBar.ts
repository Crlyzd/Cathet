import { WindowService } from "../services/windowService";
import { globalEventBus } from "../utils/eventBus";

export class TopBarComponent {
  private container: HTMLElement;
  private progressLine!: HTMLElement;
  private dotBtn!: HTMLElement;
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
      <div class="topbar">
        <div class="dot-btn" id="topbar-dot-btn" title="Menu & Settings">●</div>
        <div class="topbar-drag-area" id="topbar-drag-area">Untitled</div>
        <div class="progress-bar-line" id="topbar-progress-line"></div>
      </div>
    `;

    this.progressLine = document.getElementById("topbar-progress-line")!;
    this.dotBtn = document.getElementById("topbar-dot-btn")!;
    this.titleArea = document.getElementById("topbar-drag-area")!;

    this.bindEvents();
  }

  private bindEvents(): void {
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
      if (me.button === 0) {
        me.preventDefault();
        this.windowService.startDragging();
      }
    });
  }

  setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.progressLine.classList.add("loading");
    } else {
      this.progressLine.classList.remove("loading");
    }
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
