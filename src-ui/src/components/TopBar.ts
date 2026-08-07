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

    // Dot button toggle popup menu on click
    dotBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = dotBtn.getBoundingClientRect();
      globalEventBus.emit("topbar:toggleMenu", { x: rect.left, y: rect.bottom });
    });

    // Explicit pointerdown and mousedown listener for window dragging on left click
    const handleDragStart = (e: MouseEvent | PointerEvent) => {
      if (e.button === 0) {
        this.windowService.startDragging();
      }
    };

    dragArea.addEventListener("pointerdown", handleDragStart as EventListener);
    dragArea.addEventListener("mousedown", handleDragStart as EventListener);
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
