import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { PlatformService } from "./platformService";

export type WindowsBackdropType = "acrylic" | "mica" | "mica_alt" | "transparent" | "solid";
export type LinuxBackdropType = "blur" | "solid";

export interface BackdropPayload {
  windowsBackdrop?: WindowsBackdropType;
  linuxBackdrop?: LinuxBackdropType;
  opacity?: number;
  solidColor?: string | null;
}

const STORAGE_KEY_WIN_BACKDROP = "cathet_windows_backdrop";
const STORAGE_KEY_LINUX_BACKDROP = "cathet_linux_backdrop";
const STORAGE_KEY_SOLID_COLOR = "cathet_solid_color";

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

  getOpacityPercent(forMode?: WindowsBackdropType | LinuxBackdropType): number {
    const mode = forMode || (PlatformService.getInstance().isLinux() ? this.getLinuxBackdrop() : this.getWindowsBackdrop());
    const saved = localStorage.getItem(`cathet_opacity_${mode}`);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
    // Acrylic defaults to 0% tint (pure raw frosted glass); others default to 50%
    return mode === "acrylic" ? 0 : 50;
  }

  getSolidColor(): string | null {
    return localStorage.getItem(STORAGE_KEY_SOLID_COLOR);
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
        const mode = platform.isLinux() ? this.getLinuxBackdrop() : this.getWindowsBackdrop();
        localStorage.setItem(`cathet_opacity_${mode}`, String(payload.opacity));
      }
      if (payload.solidColor !== undefined) {
        if (payload.solidColor) {
          localStorage.setItem(STORAGE_KEY_SOLID_COLOR, payload.solidColor);
        } else {
          localStorage.removeItem(STORAGE_KEY_SOLID_COLOR);
        }
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
    const customSolidColor = this.getSolidColor();

    if (customSolidColor) {
      document.documentElement.style.setProperty("--col-solid-bg", customSolidColor);
    } else {
      document.documentElement.style.removeProperty("--col-solid-bg");
    }

    if (platform.isLinux()) {
      const linuxMode = this.getLinuxBackdrop();
      document.body.classList.remove("de-blur", "de-solid");
      document.body.classList.add(linuxMode === "blur" ? "de-blur" : "de-solid");
      document.documentElement.style.setProperty("--backdrop-opacity", opacityFraction);
    } else {
      const winMode = this.getWindowsBackdrop();
      document.body.setAttribute("data-backdrop", winMode);
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
    const platform = PlatformService.getInstance();
    const mode = platform.isLinux() ? this.getLinuxBackdrop() : this.getWindowsBackdrop();
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    localStorage.setItem(`cathet_opacity_${mode}`, String(clamped));
    this.applyAll();

    try {
      await emit("cathet:backdrop-update", { opacity: clamped });
    } catch (err) {
      console.warn("Failed to emit opacity update:", err);
    }
  }

  async setSolidColor(color: string | null): Promise<void> {
    if (color) {
      localStorage.setItem(STORAGE_KEY_SOLID_COLOR, color);
    } else {
      localStorage.removeItem(STORAGE_KEY_SOLID_COLOR);
    }
    this.applyAll();

    try {
      await emit("cathet:backdrop-update", { solidColor: color });
    } catch (err) {
      console.warn("Failed to emit solid color update:", err);
    }
  }

  async getWindowsAccentColor(): Promise<string> {
    try {
      return await invoke<string>("get_windows_accent_color");
    } catch (err) {
      console.warn("Failed to query Windows accent color:", err);
      return "#0078d4";
    }
  }
}
