import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { UnlistenFn } from "@tauri-apps/api/event";

export interface DragDropHandlers {
  onFileDrop: (filePath: string) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

/**
 * DragDropService — Handles Tauri v2 native OLE file drag-and-drop events.
 */
export class DragDropService {
  private unlisten: UnlistenFn | null = null;
  private domDragOverHandler: (e: DragEvent) => void;
  private domDropHandler: (e: DragEvent) => void;

  constructor() {
    // Prevent Chromium WebView2 from navigating to dropped files
    this.domDragOverHandler = (e: DragEvent) => e.preventDefault();
    this.domDropHandler = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", this.domDragOverHandler);
    window.addEventListener("drop", this.domDropHandler);
  }

  async init(handlers: DragDropHandlers): Promise<void> {
    try {
      const appWindow = getCurrentWebviewWindow();
      this.unlisten = await appWindow.onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "enter" || payload.type === "over") {
          handlers.onDragStateChange?.(true);
        } else if (payload.type === "drop") {
          handlers.onDragStateChange?.(false);
          const paths = payload.paths;
          if (paths && paths.length > 0) {
            handlers.onFileDrop(paths[0]);
          }
        } else {
          // 'leave'
          handlers.onDragStateChange?.(false);
        }
      });
    } catch (err) {
      console.error("Failed to initialize native drag-and-drop listener:", err);
    }
  }

  destroy(): void {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    window.removeEventListener("dragover", this.domDragOverHandler);
    window.removeEventListener("drop", this.domDropHandler);
  }
}
