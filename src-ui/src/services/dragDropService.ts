import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { UnlistenFn } from "@tauri-apps/api/event";

export interface DragDropHandlers {
  onFileDrop: (filePath: string, position?: { x: number; y: number }) => void;
  onDragStateChange?: (isDragging: boolean, position?: { x: number; y: number }) => void;
  onDragOver?: (position: { x: number; y: number }) => void;
}

/**
 * DragDropService — Handles Tauri v2 native OLE file drag-and-drop events with cursor tracking.
 */
export class DragDropService {
  private unlisten: UnlistenFn | null = null;
  private domDragOverHandler: (e: DragEvent) => void;
  private domDropHandler: (e: DragEvent) => void;
  private currentHandlers: DragDropHandlers | null = null;

  constructor() {
    this.domDragOverHandler = (e: DragEvent) => {
      e.preventDefault();
      this.currentHandlers?.onDragOver?.({ x: e.clientX, y: e.clientY });
    };
    this.domDropHandler = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", this.domDragOverHandler);
    window.addEventListener("drop", this.domDropHandler);
  }

  async init(handlers: DragDropHandlers): Promise<void> {
    this.currentHandlers = handlers;
    try {
      const appWindow = getCurrentWebviewWindow();
      this.unlisten = await appWindow.onDragDropEvent((event) => {
        const payload = event.payload;
        const dpr = window.devicePixelRatio || 1;
        const pos = (payload as any).position
          ? { x: (payload as any).position.x / dpr, y: (payload as any).position.y / dpr }
          : undefined;

        if (payload.type === "enter" || payload.type === "over") {
          handlers.onDragStateChange?.(true, pos);
          if (pos) handlers.onDragOver?.(pos);
        } else if (payload.type === "drop") {
          handlers.onDragStateChange?.(false);
          const paths = payload.paths;
          if (paths && paths.length > 0) {
            handlers.onFileDrop(paths[0], pos);
          }
        } else {
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
    this.currentHandlers = null;
    window.removeEventListener("dragover", this.domDragOverHandler);
    window.removeEventListener("drop", this.domDropHandler);
  }
}
