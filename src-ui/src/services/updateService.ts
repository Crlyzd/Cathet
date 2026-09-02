import { invoke } from "@tauri-apps/api/core";
import { globalEventBus } from "../utils/eventBus";

export interface UpdateInfo {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  download_url: string;
  release_notes: string;
}

export class UpdateService {
  private updateInfo: UpdateInfo | null = null;
  private isChecking: boolean = false;
  private isInstalling: boolean = false;

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) return this.updateInfo;
    this.isChecking = true;

    try {
      const info = await invoke<UpdateInfo>("check_for_updates");
      this.updateInfo = info;
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

  async installUpdate(): Promise<void> {
    if (!this.updateInfo?.download_url || this.isInstalling) return;
    this.isInstalling = true;
    globalEventBus.emit("update:installing", true);

    try {
      await invoke("download_and_install_update", {
        downloadUrl: this.updateInfo.download_url,
      });
    } catch (err) {
      this.isInstalling = false;
      globalEventBus.emit("update:installing", false);
      alert(`Update failed: ${err}`);
    }
  }
}
