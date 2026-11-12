import { icons } from "../../utils/monochromeIcons";
import { WindowsBackdropType } from "../../services/backdropService";

export interface BackdropOption {
  id: WindowsBackdropType;
  name: string;
}

export const WINDOWS_BACKDROP_OPTIONS: BackdropOption[] = [
  { id: "acrylic", name: "Acrylic (Frosted Glass)" },
  { id: "mica", name: "Mica" },
  { id: "mica_alt", name: "Mica Alt (Tabbed)" },
  { id: "transparent", name: "Pure Transparent" },
  { id: "solid", name: "Solid Opaque" },
];

export class BackdropSelectComponent {
  private container: HTMLElement;
  private currentMode: WindowsBackdropType;
  private onSelect: (mode: WindowsBackdropType) => void;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;
  private scrollCloseHandler: ((e: Event) => void) | null = null;

  constructor(
    container: HTMLElement,
    currentMode: WindowsBackdropType,
    onSelect: (mode: WindowsBackdropType) => void
  ) {
    this.container = container;
    this.currentMode = currentMode;
    this.onSelect = onSelect;
    this.render();
    this.bindEvents();
  }

  public renderHtml(): string {
    const current =
      WINDOWS_BACKDROP_OPTIONS.find((b) => b.id === this.currentMode) ||
      WINDOWS_BACKDROP_OPTIONS[0];

    const optionsHtml = WINDOWS_BACKDROP_OPTIONS.map(
      (b) => `
      <div class="glass-select-option ${b.id === this.currentMode ? "selected" : ""}" data-backdrop-id="${b.id}">
        <span class="option-name" style="white-space: nowrap;">${b.name}</span>
        ${b.id === this.currentMode ? `<span class="option-check">${icons.check}</span>` : ""}
      </div>
    `
    ).join("");

    return `
      <div class="glass-select-container" id="backdrop-select-container">
        <button class="glass-select-trigger" id="backdrop-select-trigger" type="button" style="white-space: nowrap;">
          <span class="glass-select-label" id="backdrop-select-label">${current.name}</span>
          <span class="glass-select-arrow">${icons.chevronDown}</span>
        </button>
        <div class="glass-select-menu" id="backdrop-select-menu" style="min-width: 175px; max-height: 185px;">
          ${optionsHtml}
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = this.renderHtml();
  }

  public bindEvents(): void {
    const trigger = this.container.querySelector("#backdrop-select-trigger");
    const menu = this.container.querySelector("#backdrop-select-menu") as HTMLElement | null;

    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("open");
      document.querySelectorAll(".glass-select-menu.open").forEach((m) => {
        if (m !== menu) m.classList.remove("open");
      });
      menu.classList.toggle("open", !isOpen);
    });

    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const mode = opt.getAttribute("data-backdrop-id") as WindowsBackdropType;
        if (mode && mode !== this.currentMode) {
          this.currentMode = mode;
          this.updateUI(mode);
          this.onSelect(mode);
        }
        menu.classList.remove("open");
      });
    });

    this.outsideClickHandler = (e: MouseEvent) => {
      if (!this.container.contains(e.target as Node)) {
        menu.classList.remove("open");
      }
    };
    window.addEventListener("click", this.outsideClickHandler);

    this.scrollCloseHandler = () => {
      if (menu.classList.contains("open")) {
        menu.classList.remove("open");
      }
    };
    const scrollParent = document.getElementById("pane-settings");
    if (scrollParent) {
      scrollParent.addEventListener("scroll", this.scrollCloseHandler, { passive: true });
    }
  }

  public updateUI(mode: WindowsBackdropType): void {
    this.currentMode = mode;
    const current =
      WINDOWS_BACKDROP_OPTIONS.find((b) => b.id === mode) ||
      WINDOWS_BACKDROP_OPTIONS[0];

    const label = this.container.querySelector("#backdrop-select-label");
    if (label) label.textContent = current.name;

    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      const optId = opt.getAttribute("data-backdrop-id");
      const isSelected = optId === mode;
      opt.classList.toggle("selected", isSelected);
      const existingCheck = opt.querySelector(".option-check");
      if (isSelected && !existingCheck) {
        opt.insertAdjacentHTML("beforeend", `<span class="option-check">${icons.check}</span>`);
      } else if (!isSelected && existingCheck) {
        existingCheck.remove();
      }
    });
  }

  public destroy(): void {
    if (this.outsideClickHandler) {
      window.removeEventListener("click", this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    const scrollParent = document.getElementById("pane-settings");
    if (scrollParent && this.scrollCloseHandler) {
      scrollParent.removeEventListener("scroll", this.scrollCloseHandler);
      this.scrollCloseHandler = null;
    }
  }
}
