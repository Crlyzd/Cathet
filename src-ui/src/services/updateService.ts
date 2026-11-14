import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { globalEventBus } from "../utils/eventBus";
import { showGlassDialog } from "../components/GlassDialog";

export interface UpdateInfo {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  download_url: string;
  release_url?: string;
  release_notes: string;
  is_store_package?: boolean;
}

export interface DownloadProgress {
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
}

export class UpdateService {
  private updateInfo: UpdateInfo | null = null;
  private isChecking: boolean = false;
  private isDownloading: boolean = false;
  private downloadedExePath: string | null = null;
  private readonly STORAGE_KEY = "cathet_latest_update";
  private readonly LAST_CHECK_KEY = "cathet_last_update_check";
  private readonly DEFAULT_RELEASE_URL = "https://github.com/Crlyzd/Cathet/releases/latest";

  constructor() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.updateInfo = JSON.parse(saved);
      }
    } catch (_) {}
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) return this.updateInfo;
    this.isChecking = true;

    try {
      const info = await invoke<UpdateInfo>("check_for_updates");
      this.updateInfo = info;
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info));
        localStorage.setItem(this.LAST_CHECK_KEY, String(Date.now()));
      } catch (_) {}
      globalEventBus.emit("update:statusChanged", info);
      await emit("cathet:update-status", info).catch(console.error);
      return info;
    } catch (err) {
      console.warn("Update check failed:", err);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  async checkForUpdatesOccasionally(intervalMs = 86_400_000): Promise<UpdateInfo | null> {
    try {
      const last = Number(localStorage.getItem(this.LAST_CHECK_KEY) || "0");
      if (last > 0 && Date.now() - last < intervalMs) {
        return this.updateInfo;
      }
    } catch (_) {}
    return this.checkForUpdates();
  }

  async openAndroidUpdateUrl(): Promise<void> {
    const targetUrl =
      this.updateInfo?.download_url ||
      this.updateInfo?.release_url ||
      this.DEFAULT_RELEASE_URL;
    await openUrl(targetUrl).catch(console.error);
  }

  setUpdateInfo(info: UpdateInfo | null): void {
    this.updateInfo = info;
    try {
      if (info) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(info));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (_) {}
    globalEventBus.emit("update:statusChanged", info);
  }

  getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  hasUpdate(): boolean {
    return !!this.updateInfo?.update_available;
  }

  isStorePackage(): boolean {
    return !!this.updateInfo?.is_store_package;
  }

  async startDownload(onProgress: (prog: DownloadProgress) => void): Promise<string | null> {
    if (!this.updateInfo?.download_url || this.isDownloading) return null;
    this.isDownloading = true;

    const unlisten = await listen<DownloadProgress>("update:progress", (event) => {
      onProgress(event.payload);
    });

    try {
      const tempPath = await invoke<string>("download_update_payload", {
        downloadUrl: this.updateInfo.download_url,
      });
      this.downloadedExePath = tempPath;
      return tempPath;
    } catch (err) {
      console.error("Update download failed:", err);
      throw err;
    } finally {
      this.isDownloading = false;
      unlisten();
    }
  }

  async installAndRestart(): Promise<void> {
    if (!this.downloadedExePath) {
      throw new Error("No downloaded update found to install.");
    }
    await invoke("install_and_restart", { tempPath: this.downloadedExePath });
  }

  async installUpdate(): Promise<void> {
    if (!this.updateInfo?.download_url) return;
    try {
      await invoke("download_and_install_update", {
        downloadUrl: this.updateInfo.download_url,
      });
    } catch (err) {
      await showGlassDialog({
        title: "Update Error",
        message: `Update failed: ${err}`,
        type: "error",
      });
    }
  }
}
