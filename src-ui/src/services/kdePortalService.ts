import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

export interface LinuxDesktopInfo {
  isLinux: boolean;
  supportsBlur: boolean;
  accentColor: string | null;
}

const RESIZE_EDGES: Array<{ cls: string; dir: ResizeDirection }> = [
  { cls: "resize-top", dir: "North" },
  { cls: "resize-bottom", dir: "South" },
  { cls: "resize-left", dir: "West" },
  { cls: "resize-right", dir: "East" },
  { cls: "resize-top-left", dir: "NorthWest" },
  { cls: "resize-top-right", dir: "NorthEast" },
  { cls: "resize-bottom-left", dir: "SouthWest" },
  { cls: "resize-bottom-right", dir: "SouthEast" },
];

let initialized = false;

/**
 * Initializes Linux desktop environment integration:
 * 1. Detects KDE Plasma / Hyprland blur support vs. GNOME / Ubuntu solid backdrop.
 * 2. Queries KDE Plasma / XDG Desktop Portal custom accent color and applies CSS tokens.
 * 3. Mounts 4px invisible edge-resize handles on the main frameless window.
 */
export async function initLinuxDesktop(): Promise<void> {
  if (initialized) return;
  initialized = true;

  mountEdgeResizeHandles();

  try {
    const info = await invoke<LinuxDesktopInfo>("get_linux_desktop_info");
    if (!info || !info.isLinux) return;

    document.body.classList.remove("de-blur", "de-solid");
    document.body.classList.add(info.supportsBlur ? "de-blur" : "de-solid");

    if (info.accentColor) {
      document.documentElement.style.setProperty("--col-accent", info.accentColor);
      document.documentElement.style.setProperty("--col-quote-border", info.accentColor);
    }
  } catch (err) {
    // Default to de-blur (KDE Plasma translucent frosted fallback) if IPC fails
    document.body.classList.add("de-blur");
    console.warn("Failed to query Linux desktop environment info:", err);
  }
}

function mountEdgeResizeHandles(): void {
  const root = document.getElementById("app");
  if (!root || root.querySelector(".window-resize-edge")) return;

  const appWindow = getCurrentWindow();
  for (const edge of RESIZE_EDGES) {
    const grip = document.createElement("div");
    grip.className = `window-resize-edge ${edge.cls}`;
    grip.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault();
        e.stopPropagation();
        appWindow.startResizeDragging(edge.dir).catch(console.error);
      }
    });
    root.appendChild(grip);
  }
}
