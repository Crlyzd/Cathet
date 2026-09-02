import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export class WindowService {
  private appWindow = getCurrentWindow();

  /**
   * Toggles window Always-On-Top state (Ctrl+T).
   */
  async toggleAlwaysOnTop(): Promise<boolean> {
    try {
      const isTop = await invoke<boolean>("toggle_always_on_top");
      return isTop;
    } catch (err) {
      console.error("Failed to toggle always-on-top:", err);
      return false;
    }
  }

  /**
   * Starts native window drag.
   */
  startDragging(): void {
    try {
      this.appWindow.startDragging();
    } catch (err) {
      console.error("Failed to start window dragging:", err);
    }
  }

  /**
   * Spawns a new CleanPad process instance (Ctrl+N).
   */
  async openNewInstance(): Promise<void> {
    try {
      await invoke("open_new_instance");
    } catch (err) {
      console.error("Failed to launch new instance:", err);
    }
  }

  /**
   * Spawns or brings into focus the Settings & About window.
   */
  async openSettingsWindow(): Promise<void> {
    try {
      await invoke("open_settings_window");
    } catch (err) {
      console.error("Failed to open settings window:", err);
    }
  }

  /**
   * Quits application (ESC key).
   */
  async close(): Promise<void> {
    try {
      await this.appWindow.close();
    } catch (err) {
      console.error("Failed to close window:", err);
    }
  }
}


