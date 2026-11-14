import { icons } from "../../utils/monochromeIcons";
import { t } from "../../services/i18nService";
import { PlatformService } from "../../services/platformService";
import { WindowsBackdropType } from "../../services/backdropService";
import { FormatBarPosition } from "../../services/formatBarService";

const STORAGE_KEY_OPEN_ACCORDIONS = "cathet_open_accordions";
export const ALL_ACCORDION_IDS = ["appearance", "editor", "system"] as const;
export type AccordionId = typeof ALL_ACCORDION_IDS[number];
const DEFAULT_OPEN_ACCORDIONS: AccordionId[] = ["appearance", "editor"];

export interface AccordionRenderState {
  theme: "dark" | "light";
  fontId: string; locale: string;
  isAlwaysOnTop: boolean; alwaysPreview: boolean; snapScroll: boolean;
  formatBarPosition?: FormatBarPosition;
  linuxBackdrop?: "solid" | "blur"; windowsBackdrop?: WindowsBackdropType;
  backdropOpacity: number; isRegistered?: boolean;
  registeredExePath?: string | null; currentExePath?: string;
  updateText: string; updateHtml: string;
}

export function getOpenAccordionIds(): AccordionId[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_OPEN_ACCORDIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 2 && parsed.every((id) => ALL_ACCORDION_IDS.includes(id))) {
        return parsed as AccordionId[];
      }
    }
  } catch (_) {}
  return [...DEFAULT_OPEN_ACCORDIONS];
}

export function setOpenAccordionIds(ids: AccordionId[]): void {
  localStorage.setItem(STORAGE_KEY_OPEN_ACCORDIONS, JSON.stringify(ids));
}

export function bindAccordionToggles(container: HTMLElement): void {
  const headers = container.querySelectorAll(".accordion-header");
  headers.forEach((header) => {
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const group = header.closest(".accordion-group") as HTMLElement | null;
      if (!group) return;
      const clickedId = group.dataset.accordionId as AccordionId | undefined;
      if (!clickedId || !ALL_ACCORDION_IDS.includes(clickedId)) return;

      const currentOpen = getOpenAccordionIds();
      let nextOpen: AccordionId[];

      if (currentOpen.includes(clickedId)) {
        if (currentOpen.length > 2) {
          nextOpen = currentOpen.filter((id) => id !== clickedId);
        } else {
          const closedId = ALL_ACCORDION_IDS.find((id) => !currentOpen.includes(id)) || "system";
          nextOpen = [currentOpen.find((id) => id !== clickedId)!, closedId];
        }
      } else {
        nextOpen = [...currentOpen, clickedId];
      }

      setOpenAccordionIds(nextOpen);

      const allGroups = container.querySelectorAll<HTMLElement>(".accordion-group");
      allGroups.forEach((g) => {
        const id = g.dataset.accordionId as AccordionId;
        g.classList.toggle("is-open", nextOpen.includes(id));
      });
    });
  });
}

export function renderAppearanceAccordion(state: AccordionRenderState): string {
  const isLinux = PlatformService.getInstance().isLinux();
  const openIds = getOpenAccordionIds();
  const isOpen = openIds.includes("appearance");
  const isSolid = isLinux ? state.linuxBackdrop !== "blur" : state.windowsBackdrop === "solid";

  return `
    <div class="accordion-group ${isOpen ? "is-open" : ""}" data-accordion-id="appearance">
      <div class="accordion-header">
        <div class="accordion-title-wrap">
          <span class="accordion-icon">${icons.eye}</span>
          <span class="accordion-title">Appearance</span>
        </div>
        <span class="accordion-chevron">${icons.chevronDown}</span>
      </div>
      <div class="accordion-body">
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.theme")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.themeSub")}</span></span>
          </div>
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${state.theme === "dark" ? "active" : ""}" id="btn-theme-dark">${icons.moon}<span>${t("settings.themeDark")}</span></button>
            <button class="pill-toggle-btn ${state.theme === "light" ? "active" : ""}" id="btn-theme-light">${icons.sun}<span>${t("settings.themeLight")}</span></button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">Window Backdrop</span>
            <span class="setting-subtext"><span class="subtext-content">${isLinux ? "Solid canvas or translucent glass" : "DWM material & frosted glass"}</span></span>
          </div>
          ${isLinux ? `
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${state.linuxBackdrop !== "blur" ? "active" : ""}" id="btn-backdrop-solid"><span>Solid</span></button>
            <button class="pill-toggle-btn ${state.linuxBackdrop === "blur" ? "active" : ""}" id="btn-backdrop-blur"><span>Translucent</span></button>
          </div>` : `
          <div id="backdrop-select-mount"></div>`}
        </div>

        <div class="setting-item" id="backdrop-opacity-item" style="${isSolid ? "display: none;" : ""}">
          <div class="setting-meta">
            <span class="setting-title">Backdrop Opacity</span>
            <span class="setting-subtext"><span class="subtext-content">Adjust glass clarity & tint</span></span>
          </div>
          <div class="slider-control-wrap">
            <input type="range" class="glass-range-slider" min="0" max="100" value="${state.backdropOpacity}" id="backdrop-opacity-slider" />
            <span class="slider-val-badge" id="backdrop-opacity-val">${state.backdropOpacity}%</span>
          </div>
        </div>

        <div id="solid-color-mount" style="${!isSolid ? "display: none;" : ""}"></div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.editorFont")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.fontSub")}</span></span>
          </div>
          <div id="font-select-mount"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderEditorAccordion(state: AccordionRenderState): string {
  const isMobile = PlatformService.getInstance().isMobile();
  const openIds = getOpenAccordionIds();
  const isOpen = openIds.includes("editor");

  return `
    <div class="accordion-group ${isOpen ? "is-open" : ""}" data-accordion-id="editor">
      <div class="accordion-header">
        <div class="accordion-title-wrap">
          <span class="accordion-icon">${icons.dualpane}</span>
          <span class="accordion-title">Editor & Dual-Pane</span>
        </div>
        <span class="accordion-chevron">${icons.chevronDown}</span>
      </div>
      <div class="accordion-body">
        ${!isMobile ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.stayOnTop")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.stayOnTopSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="ontop-checkbox" ${state.isAlwaysOnTop ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>` : ""}

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.alwaysPreview")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.alwaysPreviewSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="always-preview-checkbox" ${state.alwaysPreview ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.snapScroll")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.snapScrollSub")}</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="snap-scroll-checkbox" ${state.snapScroll ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        ${!isMobile ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.formatToolbarPos") || "Format Toolbar"}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.formatToolbarPosSub") || "Dock position (Ctrl+/)"}</span></span>
          </div>
          <div class="pill-toggle-group">
            <button class="pill-toggle-btn ${state.formatBarPosition === "top" ? "active" : ""}" id="btn-format-pos-top"><span>${t("settings.posTop") || "Top"}</span></button>
            <button class="pill-toggle-btn ${(state.formatBarPosition || "bottom") === "bottom" ? "active" : ""}" id="btn-format-pos-bottom"><span>${t("settings.posBottom") || "Bottom"}</span></button>
            <button class="pill-toggle-btn ${state.formatBarPosition === "left" ? "active" : ""}" id="btn-format-pos-left"><span>${t("settings.posLeft") || "Left"}</span></button>
          </div>
        </div>` : ""}
      </div>
    </div>
  `;
}

export function renderSystemAccordion(state: AccordionRenderState): string {
  const isMobile = PlatformService.getInstance().isMobile();
  const openIds = getOpenAccordionIds();
  const isOpen = openIds.includes("system");
  const activePath = state.registeredExePath || state.currentExePath || "";
  const defaultAppSubtext = activePath ? `${state.isRegistered ? "Registered: " : "Path: "}${activePath}` : t("settings.defaultApp");

  return `
    <div class="accordion-group ${isOpen ? "is-open" : ""}" data-accordion-id="system">
      <div class="accordion-header">
        <div class="accordion-title-wrap">
          <span class="accordion-icon">${icons.settings}</span>
          <span class="accordion-title">System & Updates</span>
        </div>
        <span class="accordion-chevron">${icons.chevronDown}</span>
      </div>
      <div class="accordion-body">
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.language")}</span>
            <span class="setting-subtext"><span class="subtext-content">${t("settings.languageSub")}</span></span>
          </div>
          <div id="language-select-mount"></div>
        </div>

        ${!isMobile ? `
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.defaultApp")}</span>
            <span class="setting-subtext" id="default-app-subtext" title="${activePath}">
              <span class="subtext-content">${defaultAppSubtext}</span>
            </span>
          </div>
          <div class="default-app-actions">
            ${state.isRegistered
              ? `<button class="glass-btn" id="btn-unregister-default-app">${t("settings.unregister")}</button>`
              : `<button class="glass-btn" id="btn-set-default-app">${t("settings.setAsDefault")}</button>`}
          </div>
        </div>` : ""}

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.appUpdates")}</span>
            <span class="setting-subtext" id="update-status-text">
              <span class="subtext-content">${state.updateText}</span>
            </span>
          </div>
          ${state.updateHtml}
        </div>
      </div>
    </div>
  `;
}
