export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const b = Math.round(f(1) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return { h: 210, s: 0.6, v: 0.2 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(h), s, v: max };
}

export class GlassColorPickerComponent {
  private container: HTMLElement;
  private h = 210;
  private s = 0.6;
  private v = 0.2;
  private onColorChange: (hex: string) => void;
  private isDraggingSV = false;

  constructor(container: HTMLElement, initialHex: string, onColorChange: (hex: string) => void) {
    this.container = container;
    const hsv = hexToHsv(initialHex);
    this.h = hsv.h;
    this.s = hsv.s;
    this.v = hsv.v;
    this.onColorChange = onColorChange;
    this.render();
  }

  public render(): void {
    const hex = hsvToHex(this.h, this.s, this.v);
    this.container.innerHTML = `
      <div class="glass-inwindow-picker">
        <div class="glass-sv-box" id="glass-sv-area" style="background-color: hsl(${this.h}, 100%, 50%);">
          <div class="glass-sv-white"></div>
          <div class="glass-sv-black"></div>
          <div class="glass-sv-handle" id="glass-sv-handle" style="left: ${this.s * 100}%; top: ${(1 - this.v) * 100}%;"></div>
        </div>
        <div class="glass-picker-controls">
          <input type="range" class="glass-hue-slider" id="glass-hue-slider" min="0" max="360" value="${this.h}" />
          <div class="glass-picker-footer">
            <span class="glass-picker-swatch" id="glass-picker-preview" style="background-color: ${hex};"></span>
            <input type="text" class="glass-picker-hex-input" id="glass-picker-hex" value="${hex}" maxlength="7" spellcheck="false" />
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const svArea = this.container.querySelector("#glass-sv-area") as HTMLElement | null;
    const handle = this.container.querySelector("#glass-sv-handle") as HTMLElement | null;
    const hueSlider = this.container.querySelector("#glass-hue-slider") as HTMLInputElement | null;
    const hexInput = this.container.querySelector("#glass-picker-hex") as HTMLInputElement | null;
    const preview = this.container.querySelector("#glass-picker-preview") as HTMLElement | null;

    if (!svArea || !handle || !hueSlider || !hexInput || !preview) return;

    const updateFromSV = (e: PointerEvent) => {
      const rect = svArea.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      this.s = x / rect.width;
      this.v = 1 - y / rect.height;
      handle.style.left = `${this.s * 100}%`;
      handle.style.top = `${(1 - this.v) * 100}%`;
      const hex = hsvToHex(this.h, this.s, this.v);
      preview.style.backgroundColor = hex;
      hexInput.value = hex;
      this.onColorChange(hex);
    };

    svArea.addEventListener("pointerdown", (e) => {
      this.isDraggingSV = true;
      svArea.setPointerCapture(e.pointerId);
      updateFromSV(e);
    });
    svArea.addEventListener("pointermove", (e) => {
      if (this.isDraggingSV) updateFromSV(e);
    });
    svArea.addEventListener("pointerup", (e) => {
      if (this.isDraggingSV) {
        this.isDraggingSV = false;
        try { svArea.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    });

    hueSlider.addEventListener("input", () => {
      this.h = parseInt(hueSlider.value, 10);
      svArea.style.backgroundColor = `hsl(${this.h}, 100%, 50%)`;
      const hex = hsvToHex(this.h, this.s, this.v);
      preview.style.backgroundColor = hex;
      hexInput.value = hex;
      this.onColorChange(hex);
    });

    hexInput.addEventListener("change", () => {
      let val = hexInput.value.trim();
      if (!val.startsWith("#")) val = `#${val}`;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const hsv = hexToHsv(val);
        this.h = hsv.h;
        this.s = hsv.s;
        this.v = hsv.v;
        svArea.style.backgroundColor = `hsl(${this.h}, 100%, 50%)`;
        handle.style.left = `${this.s * 100}%`;
        handle.style.top = `${(1 - this.v) * 100}%`;
        hueSlider.value = String(this.h);
        preview.style.backgroundColor = val;
        this.onColorChange(val);
      } else {
        hexInput.value = hsvToHex(this.h, this.s, this.v);
      }
    });
  }

  public updateColor(hex: string): void {
    const hsv = hexToHsv(hex);
    this.h = hsv.h;
    this.s = hsv.s;
    this.v = hsv.v;
    const svArea = this.container.querySelector("#glass-sv-area") as HTMLElement | null;
    const handle = this.container.querySelector("#glass-sv-handle") as HTMLElement | null;
    const hueSlider = this.container.querySelector("#glass-hue-slider") as HTMLInputElement | null;
    const hexInput = this.container.querySelector("#glass-picker-hex") as HTMLInputElement | null;
    const preview = this.container.querySelector("#glass-picker-preview") as HTMLElement | null;

    if (svArea) svArea.style.backgroundColor = `hsl(${this.h}, 100%, 50%)`;
    if (handle) {
      handle.style.left = `${this.s * 100}%`;
      handle.style.top = `${(1 - this.v) * 100}%`;
    }
    if (hueSlider) hueSlider.value = String(this.h);
    if (hexInput) hexInput.value = hex;
    if (preview) preview.style.backgroundColor = hex;
  }
}
