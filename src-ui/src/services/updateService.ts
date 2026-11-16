import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { globalEventBus } from "../utils/eventBus";
import { showGlassDialog } from "../components/GlassDialog";
import { APP_VERSION } from "../version";

const STORAGE_KEY = "cathet_latest_update";
const LAST_CHECK_KEY = "cathet_last_update_check";
const LAUNCH_COUNT_KEY = "cathet_launch_count";

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

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v.trim().replace(/^v/i, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

/** Returns cached update info only if it matches the running app version; purges stale cache on upgrade. */
export function getValidCachedUpdate(): UpdateInfo | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const info = JSON.parse(saved) as UpdateInfo;
    const isStaleVersion =
      info?.current_version !== APP_VERSION ||
      (info?.update_available && !isNewerVersion(info.latest_version || "", APP_VERSION));
    if (isStaleVersion) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_CHECK_KEY);
      localStorage.removeItem(LAUNCH_COUNT_KEY);
      return null;
    }
    return info;
  } catch (_) {
    return null;
  }
}

export class UpdateService {
  private updateInfo: UpdateInfo | null = null;
  private isChecking: boolean = false;
  private isDownloading: boolean = false;
  private downloadedExePath: string | null = null;
  private readonly DEFAULT_RELEASE_URL = "https://github.com/Crlyzd/Cathet/releases/latest";

  constructor() {
    this.updateInfo = getValidCachedUpdate();
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) return this.updateInfo;
    this.isChecking = true;

    try {
      const info = await invoke<UpdateInfo>("check_for_updates");
      this.updateInfo = info;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(LAUNCH_COUNT_KEY, "0");
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

  /** Checks on every Nth app launch (with a minimum cooldown) or when maxAgeMs has elapsed. */
  async checkForUpdatesOccasionally(
    everyNLaunches = 5,
    minCooldownMs = 43_200_000,
    maxAgeMs = 604_800_000
  ): Promise<UpdateInfo | null> {
    let shouldCheck = false;
    try {
      const count = (Number(localStorage.getItem(LAUNCH_COUNT_KEY) || "0") || 0) + 1;
      localStorage.setItem(LAUNCH_COUNT_KEY, String(count));
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) || "0") || 0;
      const elapsed = last > 0 ? Date.now() - last : Infinity;
      shouldCheck = (count >= everyNLaunches && elapsed >= minCooldownMs) || elapsed >= maxAgeMs;
    } catch (_) {
      shouldCheck = true;
    }
    if (!shouldCheck) return this.updateInfo;
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      } else {
        localStorage.removeItem(STORAGE_KEY);
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
