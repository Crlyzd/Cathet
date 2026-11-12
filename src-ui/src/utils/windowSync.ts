import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { ThemeService } from "../services/themeService";
import { FontService } from "../services/fontService";
import { UpdateService } from "../services/updateService";
import { PreviewService } from "../services/previewService";
import { I18nService } from "../services/i18nService";
import { BackdropService } from "../services/backdropService";

export interface WindowSyncContext {
  themeService: ThemeService;
  fontService: FontService;
  updateService: UpdateService;
  previewService: PreviewService;
  onFontChanged: (fontFamily: string) => void;
  onAlwaysOnTopChanged: (state: boolean) => void;
  onUpdateAvailable: (available: boolean) => void;
  onLoadTutorial: () => void;
  onSnapScrollChanged?: (enabled: boolean) => void;
  onLanguageChanged?: (locale: string) => void;
}

/**
 * registerWindowSyncListeners — Listens for cross-window events and syncs state.
 */
export function registerWindowSyncListeners(ctx: WindowSyncContext): void {
  listen<"dark" | "light">("cathet:theme-change", (e) => {
    if (ctx.themeService.getTheme() !== e.payload) ctx.themeService.setTheme(e.payload);
    BackdropService.getInstance().applyAll(e.payload);
    invoke("sync_window_theme", { theme: e.payload }).catch(console.error);
  });

  listen<string>("cathet:font-change", (e) => {
    ctx.fontService.setFont(e.payload);
    ctx.onFontChanged(ctx.fontService.getCurrentFont().family);
  });

  listen<string>("cathet:language-change", (e) => {
    I18nService.getInstance().setLocale(e.payload, false);
    ctx.onLanguageChanged?.(e.payload);
  });

  listen<boolean>("cathet:ontop-change", (e) => {
    ctx.onAlwaysOnTopChanged(e.payload);
  });

  listen<boolean>("cathet:always-preview-change", (e) => {
    ctx.previewService.setAlwaysPreview(e.payload);
  });

  listen<boolean>("cathet:snap-scroll-change", (e) => {
    ctx.onSnapScrollChanged?.(e.payload);
  });

  listen<any>("cathet:update-status", (e) => {
    ctx.updateService.setUpdateInfo(e.payload);
    ctx.onUpdateAvailable(!!e.payload?.update_available);
  });

  listen("cathet:load-tutorial", () => {
    ctx.onLoadTutorial();
  });
}
