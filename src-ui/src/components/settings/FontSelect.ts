import { icons } from "../../utils/monochromeIcons";

export interface FontOption {
  id: string;
  name: string;
}

export class FontSelectComponent {
  private container: HTMLElement;
  private fonts: FontOption[];
  private currentFontId: string;
  private onSelect: (fontId: string) => void;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    fonts: FontOption[],
    currentFontId: string,
    onSelect: (fontId: string) => void
  ) {
    this.container = container;
    this.fonts = fonts;
    this.currentFontId = currentFontId;
    this.onSelect = onSelect;
    this.render();
    this.bindEvents();
  }

  public renderHtml(): string {
    const currentName = this.fonts.find((f) => f.id === this.currentFontId)?.name || "Segoe UI";
    const optionsHtml = this.fonts
      .map(
        (f) => `
        <div class="glass-select-option ${f.id === this.currentFontId ? "selected" : ""}" data-font-id="${f.id}">
          <span class="option-name">${f.name}</span>
          ${f.id === this.currentFontId ? `<span class="option-check">${icons.check}</span>` : ""}
        </div>
      `
      )
      .join("");

    return `
      <div class="glass-select-container" id="font-select-container">
        <button class="glass-select-trigger" id="font-select-trigger" type="button">
          <span class="glass-select-label" id="font-select-label">${currentName}</span>
          <span class="glass-select-arrow">${icons.chevronDown}</span>
        </button>
        <div class="glass-select-menu" id="font-select-menu">
          ${optionsHtml}
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = this.renderHtml();
  }

  public bindEvents(): void {
    const trigger = this.container.querySelector("#font-select-trigger") as HTMLButtonElement | null;
    const menu = this.container.querySelector("#font-select-menu") as HTMLElement | null;
    const selectContainer = this.container.querySelector("#font-select-container") as HTMLElement | null;

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu?.classList.contains("open");
      menu?.classList.toggle("open", !isOpen);
      trigger.classList.toggle("open", !isOpen);
    });

    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
    }
    this.outsideClickHandler = (e: MouseEvent) => {
      if (!selectContainer?.contains(e.target as Node)) {
        menu?.classList.remove("open");
        trigger?.classList.remove("open");
      }
    };
    document.addEventListener("click", this.outsideClickHandler);

    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const fontId = opt.getAttribute("data-font-id");
        if (fontId) {
          menu?.classList.remove("open");
          trigger?.classList.remove("open");
          this.currentFontId = fontId;
          this.updateUI(fontId);
          this.onSelect(fontId);
        }
      });
    });
  }

  public updateUI(fontId: string): void {
    this.currentFontId = fontId;
    const font = this.fonts.find((f) => f.id === fontId);
    const label = this.container.querySelector("#font-select-label");
    if (label && font) label.textContent = font.name;

    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      const isSelected = opt.getAttribute("data-font-id") === fontId;
      opt.classList.toggle("selected", isSelected);
      const existingCheck = opt.querySelector(".option-check");
      if (isSelected && !existingCheck) {
        const check = document.createElement("span");
        check.className = "option-check";
        check.innerHTML = icons.check;
        opt.appendChild(check);
      } else if (!isSelected && existingCheck) {
        existingCheck.remove();
      }
    });
  }

  public destroy(): void {
    if (this.outsideClickHandler) {
      document.removeEventListener("click", this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
  }
}
