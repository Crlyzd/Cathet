import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { PlatformService } from "./platformService";

export type WindowsBackdropType = "acrylic" | "mica" | "mica_alt" | "transparent" | "solid";
export type LinuxBackdropType = "blur" | "solid";

export interface BackdropPayload {
  windowsBackdrop?: WindowsBackdropType;
  linuxBackdrop?: LinuxBackdropType;
  opacity?: number; // 15 to 100 percent
}

const STORAGE_KEY_WIN_BACKDROP = "cathet_windows_backdrop";
const STORAGE_KEY_OPACITY = "cathet_backdrop_opacity";
const STORAGE_KEY_LINUX_BACKDROP = "cathet_linux_backdrop";

export class BackdropService {
  private static instance: BackdropService | null = null;
  private initialized = false;

  static getInstance(): BackdropService {
    if (!BackdropService.instance) {
      BackdropService.instance = new BackdropService();
    }
    return BackdropService.instance;
  }

  getWindowsBackdrop(): WindowsBackdropType {
    const saved = localStorage.getItem(STORAGE_KEY_WIN_BACKDROP);
    if (saved === "mica" || saved === "mica_alt" || saved === "transparent" || saved === "solid") {
      return saved;
    }
    return "acrylic";
  }

  getLinuxBackdrop(): LinuxBackdropType {
    const saved = localStorage.getItem(STORAGE_KEY_LINUX_BACKDROP);
    return saved === "blur" ? "blur" : "solid";
  }

  getOpacityPercent(): number {
    const saved = localStorage.getItem(STORAGE_KEY_OPACITY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 15 && parsed <= 100) {
        return parsed;
      }
    }
    // Default 65% for balanced glass visibility and text contrast
    return 65;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const platform = PlatformService.getInstance();
    if (platform.isMobile()) return;

    this.applyAll();

    listen<BackdropPayload>("cathet:backdrop-update", (event) => {
      const payload = event.payload;
      if (payload.windowsBackdrop) {
        localStorage.setItem(STORAGE_KEY_WIN_BACKDROP, payload.windowsBackdrop);
      }
      if (payload.linuxBackdrop) {
        localStorage.setItem(STORAGE_KEY_LINUX_BACKDROP, payload.linuxBackdrop);
      }
      if (payload.opacity !== undefined) {
        localStorage.setItem(STORAGE_KEY_OPACITY, String(payload.opacity));
      }
      this.applyAll();
    }).catch(console.error);

    if (!platform.isLinux()) {
      try {
        await invoke("set_window_backdrop", { backdrop: this.getWindowsBackdrop() });
      } catch (err) {
        console.warn("Failed to apply initial window backdrop:", err);
      }
    }
  }

  applyAll(): void {
    const platform = PlatformService.getInstance();
    if (platform.isMobile()) return;

    const opacityPercent = this.getOpacityPercent();
    const opacityFraction = (opacityPercent / 100).toFixed(2);

    if (platform.isLinux()) {
      const linuxMode = this.getLinuxBackdrop();
      document.body.classList.remove("de-blur", "de-solid");
      document.body.classList.add(linuxMode === "blur" ? "de-blur" : "de-solid");
      document.documentElement.style.setProperty("--backdrop-opacity", opacityFraction);
    } else {
      const winMode = this.getWindowsBackdrop();
      document.body.setAttribute("data-backdrop", winMode);
      // For Acrylic/Mica, tint is subtle overlay (1 - opacity)
      // When opacity is 100%, background is fully solid
      // When opacity is 15%, background has 0.15 tint so glass shines through
      document.documentElement.style.setProperty("--backdrop-tint-opacity", opacityFraction);
    }
  }

  async setWindowsBackdrop(mode: WindowsBackdropType): Promise<void> {
    localStorage.setItem(STORAGE_KEY_WIN_BACKDROP, mode);
    this.applyAll();

    try {
      await invoke("set_window_backdrop", { backdrop: mode });
    } catch (err) {
      console.warn("Failed to set window backdrop in backend:", err);
    }

    try {
      await emit("cathet:backdrop-update", { windowsBackdrop: mode });
    } catch (err) {
      console.warn("Failed to emit backdrop update:", err);
    }
  }

  async setLinuxBackdrop(mode: LinuxBackdropType): Promise<void> {
    localStorage.setItem(STORAGE_KEY_LINUX_BACKDROP, mode);
    this.applyAll();

    try {
      await emit("cathet:backdrop-update", { linuxBackdrop: mode });
    } catch (err) {
      console.warn("Failed to emit linux backdrop update:", err);
    }
  }

  async setOpacityPercent(percent: number): Promise<void> {
    const clamped = Math.max(15, Math.min(100, Math.round(percent)));
    localStorage.setItem(STORAGE_KEY_OPACITY, String(clamped));
    this.applyAll();

    try {
      await emit("cathet:backdrop-update", { opacity: clamped });
    } catch (err) {
      console.warn("Failed to emit opacity update:", err);
    }
  }
}
