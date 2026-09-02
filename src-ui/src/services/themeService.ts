import { globalEventBus } from "../utils/eventBus";

export type Theme = "dark" | "light";

export class ThemeService {
  private currentTheme: Theme = "dark";
  private readonly STORAGE_KEY = "cathet_theme";

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      this.currentTheme = saved;
    }
    this.applyTheme(this.currentTheme);
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  toggleTheme(): Theme {
    const next = this.currentTheme === "dark" ? "light" : "dark";
    this.setTheme(next);
    return next;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme(theme);
    globalEventBus.emit("theme:changed", theme);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute("data-theme", theme);
    const root = document.getElementById("app");
    if (root) {
      root.setAttribute("data-theme", theme);
    }
  }
}
