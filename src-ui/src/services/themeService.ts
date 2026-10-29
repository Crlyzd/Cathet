import { globalEventBus } from "../utils/eventBus";

export type Theme = "dark" | "light";

export class ThemeService {
  private static instance: ThemeService | null = null;
  private currentTheme: Theme = "dark";
  private readonly STORAGE_KEY = "cathet_theme";

  constructor() {
    if (ThemeService.instance) {
      return ThemeService.instance;
    }

    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      this.currentTheme = saved;
    } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      this.currentTheme = "light";
    }

    this.applyTheme(this.currentTheme);
    this.bindSystemPreferenceListener();
    ThemeService.instance = this;
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private bindSystemPreferenceListener(): void {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", (e) => {
      // Auto-adapt to OS theme changes if user hasn't set an explicit preference
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        this.setTheme(e.matches ? "light" : "dark");
      }
    });
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
    document.body.setAttribute("data-theme", theme);
    const root = document.getElementById("app");
    if (root) {
      root.setAttribute("data-theme", theme);
    }
  }
}
