import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { globalEventBus } from "../utils/eventBus";

export interface UpdateInfo {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  download_url: string;
  release_notes: string;
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
      } catch (_) {}
      globalEventBus.emit("update:statusChanged", info);
      return info;
    } catch (err) {
      console.warn("Update check failed:", err);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  hasUpdate(): boolean {
    return !!this.updateInfo?.update_available;
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
      alert(`Update failed: ${err}`);
    }
  }
}
