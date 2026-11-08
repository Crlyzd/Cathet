import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";

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

export type LinuxBackdropMode = "solid" | "blur";
const STORAGE_KEY_BACKDROP = "cathet_linux_backdrop";

export function getLinuxBackdropPreference(): LinuxBackdropMode {
  const saved = localStorage.getItem(STORAGE_KEY_BACKDROP);
  return saved === "blur" ? "blur" : "solid";
}

export function applyLinuxBackdrop(mode: LinuxBackdropMode): void {
  document.body.classList.remove("de-blur", "de-solid");
  document.body.classList.add(mode === "blur" ? "de-blur" : "de-solid");
}

export async function setLinuxBackdropPreference(mode: LinuxBackdropMode): Promise<void> {
  localStorage.setItem(STORAGE_KEY_BACKDROP, mode);
  applyLinuxBackdrop(mode);
  try {
    await emit("cathet:linux-backdrop-change", mode);
  } catch (err) {
    console.warn("Failed to emit backdrop change:", err);
  }
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
 * 1. Defaults to clean Solid Slate backdrop; respects user-toggled translucent glass.
 * 2. Queries KDE Plasma / XDG Desktop Portal custom accent color and applies CSS tokens.
 * 3. Mounts 4px invisible edge-resize handles on the main frameless window.
 */
export async function initLinuxDesktop(): Promise<void> {
  if (initialized) return;
  initialized = true;

  mountEdgeResizeHandles();
  applyLinuxBackdrop(getLinuxBackdropPreference());

  listen<LinuxBackdropMode>("cathet:linux-backdrop-change", (event) => {
    applyLinuxBackdrop(event.payload);
  }).catch(console.error);

  try {
    const info = await invoke<LinuxDesktopInfo>("get_linux_desktop_info");
    if (!info || !info.isLinux) return;

    if (info.accentColor) {
      document.documentElement.style.setProperty("--col-accent", info.accentColor);
      document.documentElement.style.setProperty("--col-quote-border", info.accentColor);
    }
  } catch (err) {
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
