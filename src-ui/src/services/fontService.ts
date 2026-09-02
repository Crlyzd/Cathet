import { globalEventBus } from "../utils/eventBus";

export interface FontOption {
  id: string;
  name: string;
  family: string;
}

export class FontService {
  private readonly STORAGE_KEY = "cathet_font";

  readonly fonts: FontOption[] = [
    { id: "segoe", name: "Segoe UI", family: "'Segoe UI', system-ui, sans-serif" },
    { id: "noto", name: "Noto Sans", family: "'Noto Sans', sans-serif" },
    { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif" },
    { id: "cascadia", name: "Cascadia Code", family: "'Cascadia Code', monospace" },
    { id: "consolas", name: "Consolas", family: "'Consolas', monospace" },
    { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
    { id: "jetbrains", name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
    { id: "fira", name: "Fira Code", family: "'Fira Code', monospace" },
    { id: "arial", name: "Arial", family: "Arial, sans-serif" },
  ];

  private currentFont: FontOption;

  constructor() {
    const savedId = localStorage.getItem(this.STORAGE_KEY);
    const matched = this.fonts.find((f) => f.id === savedId);
    this.currentFont = matched || this.fonts[0];
    this.applyFont(this.currentFont);
  }

  getCurrentFont(): FontOption {
    return this.currentFont;
  }

  setFont(fontId: string): void {
    const matched = this.fonts.find((f) => f.id === fontId);
    if (matched) {
      this.currentFont = matched;
      localStorage.setItem(this.STORAGE_KEY, fontId);
      this.applyFont(matched);
      globalEventBus.emit("font:changed", matched);
    }
  }

  private applyFont(font: FontOption): void {
    document.documentElement.style.setProperty("--font-editor", font.family);
    const app = document.getElementById("app");
    if (app) {
      app.style.setProperty("--font-editor", font.family);
    }
  }
}
