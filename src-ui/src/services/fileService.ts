import { invoke } from "@tauri-apps/api/core";

export interface FilePayload {
  path: string;
  content: string;
  fileSize: number;
}

export class FileService {
  /**
   * Prompts user with native Open File dialog and loads text content.
   */
  async promptOpen(): Promise<FilePayload | null> {
    try {
      const result = await invoke<FilePayload | null>("show_open_dialog");
      return result;
    } catch (err) {
      console.error("Failed to open file dialog:", err);
      return null;
    }
  }

  /**
   * Loads text content from given path via async Rust command.
   */
  async loadFile(path: string): Promise<FilePayload | null> {
    try {
      return await invoke<FilePayload>("read_text_file", { path });
    } catch (err) {
      console.error("Failed to load file:", err);
      return null;
    }
  }

  /**
   * Saves text or HTML content to path. If path is empty, calls Save As dialog.
   */
  async saveFile(currentPath: string | null, content: string): Promise<string | null> {
    try {
      let targetPath = currentPath;
      if (!targetPath) {
        targetPath = await invoke<string | null>("show_save_dialog");
        if (!targetPath) return null;
      }
      await invoke("write_text_file", { path: targetPath, content });
      return targetPath;
    } catch (err) {
      console.error("Failed to save file:", err);
      return null;
    }
  }

  /**
   * Prompts user with native Save As file dialog and saves content.
   */
  async promptSaveAs(content: string): Promise<string | null> {
    try {
      const targetPath = await invoke<string | null>("show_save_dialog");
      if (!targetPath) return null;
      await invoke("write_text_file", { path: targetPath, content });
      return targetPath;
    } catch (err) {
      console.error("Failed to prompt save as:", err);
      return null;
    }
  }
}
