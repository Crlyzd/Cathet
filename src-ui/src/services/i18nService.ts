import { LOCALES, SUPPORTED_LOCALES, DEFAULT_LOCALE, LocaleMeta, TranslationDictionary } from "../locales";
import { globalEventBus } from "../utils/eventBus";
import { emit } from "@tauri-apps/api/event";

const STORAGE_KEY = "cathet_language";

export class I18nService {
  private static instance: I18nService | null = null;
  private currentLocale: string = DEFAULT_LOCALE;

  private constructor() {
    this.initLocale();
  }

  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  private initLocale(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) {
      this.currentLocale = saved;
      return;
    }

    // Try detecting system language
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith("id")) {
      this.currentLocale = "id";
    } else if (navLang.startsWith("jv")) {
      this.currentLocale = "jv-ngoko";
    } else {
      this.currentLocale = DEFAULT_LOCALE;
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public getSupportedLocales(): LocaleMeta[] {
    return SUPPORTED_LOCALES;
  }

  public getLocaleMeta(code = this.currentLocale): LocaleMeta {
    return (
      SUPPORTED_LOCALES.find((l) => l.code === code) ||
      SUPPORTED_LOCALES.find((l) => l.code === DEFAULT_LOCALE)!
    );
  }

  public setLocale(locale: string, syncWindow = true): void {
    if (!LOCALES[locale]) return;
    if (this.currentLocale === locale) return;

    this.currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    globalEventBus.emit("i18n:locale-change", locale);

    if (syncWindow) {
      emit("cathet:language-change", locale).catch(() => {});
    }
  }

  public t(path: string, params?: Record<string, string | number>): string {
    let value = this.lookup(LOCALES[this.currentLocale], path);

    // Fallback to default (English) if missing or empty
    if (!value && this.currentLocale !== DEFAULT_LOCALE) {
      value = this.lookup(LOCALES[DEFAULT_LOCALE], path);
    }

    if (!value) return path;

    if (params) {
      return Object.entries(params).reduce((str, [k, v]) => {
        return str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }, value);
    }

    return value;
  }

  private lookup(dict: TranslationDictionary, path: string): string | null {
    if (!dict) return null;
    const parts = path.split(".");
    let current: any = dict;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return typeof current === "string" ? current : null;
  }
}

export const i18n = I18nService.getInstance();
export const t = (path: string, params?: Record<string, string | number>): string =>
  i18n.t(path, params);

