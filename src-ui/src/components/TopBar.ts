import { WindowService } from "../services/windowService";
import { globalEventBus } from "../utils/eventBus";

export class TopBarComponent {
  private container: HTMLElement;
  private progressLine!: HTMLElement;
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
      <div class="topbar" data-tauri-drag-region>
        <div class="dot-btn" id="topbar-dot-btn" title="Menu">●</div>
        <div class="topbar-drag-area" id="topbar-drag-area" data-tauri-drag-region>CleanPad</div>
        <div class="progress-bar-line" id="topbar-progress-line"></div>
      </div>
    `;

    this.progressLine = document.getElementById("topbar-progress-line")!;
    this.bindEvents();
  }

  private bindEvents(): void {
    const dotBtn = document.getElementById("topbar-dot-btn")!;
    const dragArea = document.getElementById("topbar-drag-area")!;

    // Dot button toggle popup menu
    dotBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = dotBtn.getBoundingClientRect();
      globalEventBus.emit("topbar:toggleMenu", { x: rect.left, y: rect.bottom });
    });

    // Middle-click (button === 1) and Left-click (button === 0) drag topbar window movement
    const handleDrag = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 0) {
        e.preventDefault();
        this.windowService.startDragging();
      }
    };

    dragArea.addEventListener("mousedown", handleDrag);
    dragArea.addEventListener("auxclick", handleDrag);
  }

  /**
   * Shows or hides file loading progress animation line.
   */
  setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.progressLine.classList.add("loading");
    } else {
      this.progressLine.classList.remove("loading");
    }
  }

  /**
   * Sets top bar title.
   */
  setTitle(title: string): void {
    const dragArea = document.getElementById("topbar-drag-area");
    if (dragArea) {
      dragArea.textContent = title ? `CleanPad — ${title}` : "CleanPad";
    }
  }
}
