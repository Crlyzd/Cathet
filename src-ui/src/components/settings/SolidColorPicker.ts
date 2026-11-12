import { icons } from "../../utils/monochromeIcons";
import { BackdropService } from "../../services/backdropService";
import { PlatformService } from "../../services/platformService";

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
    const presets = this.isDark ? DARK_SOLID_PRESETS : LIGHT_SOLID_PRESETS;
    const isCustom = this.currentColor && !presets.some((p) => p.hex.toLowerCase() === this.currentColor?.toLowerCase());
    const isWindows = !PlatformService.getInstance().isLinux() && !PlatformService.getInstance().isMobile();

    const swatchesHtml = presets.map((p) => {
      const isSelected = this.currentColor
        ? this.currentColor.toLowerCase() === p.hex.toLowerCase()
        : p.hex === (this.isDark ? "#0f1117" : "#f8fafc");
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
      <div class="setting-item solid-custom-palette-item">
        <div class="setting-meta">
          <span class="setting-title">Canvas Color</span>
          <span class="setting-subtext"><span class="subtext-content">Presets, system accent, or custom</span></span>
        </div>
        <div class="solid-palette-controls">
          <div class="solid-color-swatches">${swatchesHtml}</div>
          <div class="solid-color-actions">
            <button class="glass-btn solid-sys-btn" id="btn-follow-sys-color" title="Match ${isWindows ? "Windows" : "System"} accent color">
              ${isWindows ? icons.settings : icons.globe}
              <span>${isWindows ? "Windows" : "System"}</span>
            </button>
            <label class="glass-btn solid-picker-label ${isCustom ? "active" : ""}" title="Choose custom color">
              <span class="picker-swatch" style="background-color: ${this.currentColor || (this.isDark ? "#0f1117" : "#f8fafc")};"></span>
              <input type="color" id="solid-color-native-input" class="visually-hidden-color" value="${this.currentColor || (this.isDark ? "#0f1117" : "#f8fafc")}" />
            </label>
            ${this.currentColor ? `<button class="glass-btn solid-reset-btn" id="btn-reset-solid-color" title="Reset to default">${icons.close}</button>` : ""}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
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

    const followBtn = this.container.querySelector("#btn-follow-sys-color");
    followBtn?.addEventListener("click", async () => {
      const backdrop = BackdropService.getInstance();
      const accent = await backdrop.getWindowsAccentColor();
      this.currentColor = accent;
      this.onSelectColor(accent);
      this.render();
    });

    const nativeInput = this.container.querySelector("#solid-color-native-input") as HTMLInputElement | null;
    nativeInput?.addEventListener("input", () => {
      const color = nativeInput.value;
      this.currentColor = color;
      this.onSelectColor(color);
      const swatch = this.container.querySelector(".picker-swatch") as HTMLElement | null;
      if (swatch) swatch.style.backgroundColor = color;
    });

    const resetBtn = this.container.querySelector("#btn-reset-solid-color");
    resetBtn?.addEventListener("click", () => {
      this.currentColor = null;
      this.onSelectColor(null);
      this.render();
    });
  }
}
