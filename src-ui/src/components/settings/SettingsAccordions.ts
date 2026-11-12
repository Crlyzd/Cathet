import { icons } from "../../utils/monochromeIcons";
import { t } from "../../services/i18nService";
import { PlatformService } from "../../services/platformService";
import { WindowsBackdropType } from "../../services/backdropService";

const STORAGE_KEY_OPEN_ACCORDION = "cathet_open_accordion";

export interface AccordionRenderState {
  theme: "dark" | "light";
  fontId: string;
  locale: string;
  isAlwaysOnTop: boolean;
  alwaysPreview: boolean;
  snapScroll: boolean;
  linuxBackdrop?: "solid" | "blur";
  windowsBackdrop?: WindowsBackdropType;
  backdropOpacity: number; // 15 to 100
  isRegistered?: boolean;
  registeredExePath?: string | null;
  currentExePath?: string;
  updateHtml: string;
}

export function getOpenAccordionId(): string {
  return localStorage.getItem(STORAGE_KEY_OPEN_ACCORDION) || "appearance";
}

export function setOpenAccordionId(id: string): void {
  localStorage.setItem(STORAGE_KEY_OPEN_ACCORDION, id);
}

export function bindAccordionToggles(container: HTMLElement): void {
  const headers = container.querySelectorAll(".accordion-header");
  headers.forEach((header) => {
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const group = header.closest(".accordion-group") as HTMLElement | null;
      if (!group) return;
      const groupId = group.dataset.accordionId || "";
      const isOpen = group.classList.contains("is-open");

      // Optional: accordion mode (close others or multi-open)
      // Toggle current
      group.classList.toggle("is-open", !isOpen);
      if (!isOpen && groupId) {
        setOpenAccordionId(groupId);
      }
    });
  });
}

export function renderAppearanceAccordion(state: AccordionRenderState): string {
  const isLinux = PlatformService.getInstance().isLinux();
  const openId = getOpenAccordionId();
  const isOpen = openId === "appearance";
  const isSolid = isLinux
    ? state.linuxBackdrop !== "blur"
    : state.windowsBackdrop === "solid";

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
            <input type="range" class="glass-range-slider" min="15" max="100" value="${state.backdropOpacity}" id="backdrop-opacity-slider" />
            <span class="slider-val-badge" id="backdrop-opacity-val">${state.backdropOpacity}%</span>
          </div>
        </div>

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
  const openId = getOpenAccordionId();
  const isOpen = openId === "editor";

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
      </div>
    </div>
  `;
}

export function renderSystemAccordion(state: AccordionRenderState): string {
  const isMobile = PlatformService.getInstance().isMobile();
  const openId = getOpenAccordionId();
  const isOpen = openId === "system";
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
            <span class="setting-subtext default-app-path" title="${activePath}">
              <span class="subtext-content">${defaultAppSubtext}</span>
            </span>
          </div>
          <button class="glass-btn ${state.isRegistered ? "registered" : ""}" id="btn-default-app" style="white-space: nowrap;">
            ${state.isRegistered ? t("settings.removeDefault") : t("settings.setDefault")}
          </button>
        </div>` : ""}

        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${t("settings.updateTitle")}</span>
            <span class="setting-subtext update-status-text">
              <span class="subtext-content">${state.updateHtml}</span>
            </span>
          </div>
          <div id="update-action-mount"></div>
        </div>
      </div>
    </div>
  `;
}
