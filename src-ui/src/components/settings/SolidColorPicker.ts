import { icons } from "../../utils/monochromeIcons";
import { BackdropService } from "../../services/backdropService";
import { PlatformService } from "../../services/platformService";
import { GlassColorPickerComponent } from "./GlassColorPicker";

export const DARK_SOLID_PRESETS = [
  { name: "Slate", hex: "#0f1117" },
  { name: "Zinc", hex: "#18181b" },
  { name: "Navy", hex: "#0f172a" },
  { name: "Forest", hex: "#062e24" },
  { name: "Wine", hex: "#2e0814" },
];

export const LIGHT_SOLID_PRESETS = [
  { name: "White", hex: "#ffffff" },
  { name: "Slate", hex: "#f8fafc" },
  { name: "Cream", hex: "#fefce8" },
  { name: "Mint", hex: "#f0fdf4" },
  { name: "Lavender", hex: "#faf5ff" },
];

export class SolidColorPickerComponent {
  private container: HTMLElement;
  private isDark: boolean;
  private currentColor: string | null;
  private onSelectColor: (color: string | null) => void;
  private glassPicker: GlassColorPickerComponent | null = null;
  private showCustomPicker = false;

  constructor(
    container: HTMLElement,
    isDark: boolean,
    currentColor: string | null,
    onSelectColor: (color: string | null) => void
  ) {
    this.container = container;
    this.isDark = isDark;
    this.currentColor = currentColor;
    this.onSelectColor = onSelectColor;
    this.render();
  }

  public render(): void {
    const backdropService = BackdropService.getInstance();
    const isMatchOs = backdropService.getMatchOsColor();
    const isWindows = !PlatformService.getInstance().isLinux() && !PlatformService.getInstance().isMobile();
    const presets = this.isDark ? DARK_SOLID_PRESETS : LIGHT_SOLID_PRESETS;
    const defaultColor = this.isDark ? "#0f1117" : "#f8fafc";
    const activeColor = this.currentColor || defaultColor;

    const swatchesHtml = presets.map((p) => {
      const isSelected = !isMatchOs && this.currentColor?.toLowerCase() === p.hex.toLowerCase();
      return `
        <button class="solid-color-swatch ${isSelected ? "selected" : ""}" 
          style="background-color: ${p.hex};" 
          title="${p.name} (${p.hex})" 
          data-color="${p.hex}">
          ${isSelected ? `<span class="swatch-check">${icons.check}</span>` : ""}
        </button>
      `;
    }).join("");

    this.container.innerHTML = `
      <div class="solid-opaque-customizer">
        <div class="setting-item">
          <div class="setting-meta">
            <span class="setting-title">${isWindows ? "Match Windows Color" : "Match System Color"}</span>
            <span class="setting-subtext"><span class="subtext-content">Derive solid canvas tint from OS theme</span></span>
          </div>
          <label class="switch-control">
            <input type="checkbox" id="match-os-color-switch" ${isMatchOs ? "checked" : ""} />
            <span class="switch-track"></span>
          </label>
        </div>

        <div id="solid-manual-palette-section" style="${isMatchOs ? "display: none;" : ""}">
          <div class="setting-item">
            <div class="setting-meta">
              <span class="setting-title">Canvas Color</span>
              <span class="setting-subtext"><span class="subtext-content">Calibrated ${this.isDark ? "dark" : "light"} presets</span></span>
            </div>
            <div class="solid-palette-controls">
              <div class="solid-color-swatches">${swatchesHtml}</div>
              <div class="solid-color-actions">
                <button class="glass-btn ${this.showCustomPicker ? "active" : ""}" id="btn-toggle-custom-picker" title="Custom color picker">
                  ${icons.settings}
                  <span>Custom</span>
                </button>
                ${this.currentColor ? `<button class="glass-btn solid-reset-btn" id="btn-reset-solid-color" title="Reset to default">${icons.close}</button>` : ""}
              </div>
            </div>
          </div>

          <div id="glass-color-picker-mount" style="${!this.showCustomPicker ? "display: none;" : ""}"></div>
        </div>
      </div>
    `;

    if (this.showCustomPicker && !isMatchOs) {
      const mount = this.container.querySelector("#glass-color-picker-mount") as HTMLElement | null;
      if (mount) {
        this.glassPicker = new GlassColorPickerComponent(mount, activeColor, (hex) => {
          this.currentColor = hex;
          this.onSelectColor(hex);
        });
      }
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    const backdropService = BackdropService.getInstance();

    const osSwitch = this.container.querySelector("#match-os-color-switch") as HTMLInputElement | null;
    osSwitch?.addEventListener("change", async () => {
      const enabled = osSwitch.checked;
      await backdropService.setMatchOsColor(enabled);
      const manualSection = this.container.querySelector("#solid-manual-palette-section") as HTMLElement | null;
      if (manualSection) manualSection.style.display = enabled ? "none" : "";
    });

    const swatches = this.container.querySelectorAll(".solid-color-swatch");
    swatches.forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.getAttribute("data-color");
        if (color) {
          this.currentColor = color;
          this.onSelectColor(color);
          this.render();
        }
      });
    });

    this.container.querySelector("#btn-toggle-custom-picker")?.addEventListener("click", () => {
      this.showCustomPicker = !this.showCustomPicker;
      this.render();
    });

    this.container.querySelector("#btn-reset-solid-color")?.addEventListener("click", () => {
      this.currentColor = null;
      this.onSelectColor(null);
      this.render();
    });
  }
}
