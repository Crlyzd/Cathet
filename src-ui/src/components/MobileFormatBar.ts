import { icons } from "../utils/monochromeIcons";
import { FORMAT_BUTTONS } from "../utils/formatToolbarItems";
import { FormatAction } from "../utils/formatUtils";

export class MobileFormatBarComponent {
  private element: HTMLElement;
  private onFormat: (action: FormatAction) => void;
  private onClose: () => void;

  constructor(parentEl: HTMLElement, onFormat: (action: FormatAction) => void, onClose: () => void) {
    this.onFormat = onFormat;
    this.onClose = onClose;
    this.element = document.createElement("div");
    this.element.className = "mobile-format-pill";
    this.render();
    parentEl.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    const itemsHtml = FORMAT_BUTTONS.map((btn) => {
      if (btn.isDivider) {
        return `<span class="mobile-format-divider"></span>`;
      }
      return `
        <button class="mobile-format-btn" data-action="${btn.action}" title="${btn.title}">
          ${btn.iconSvg}
        </button>
      `;
    }).join("");

    this.element.innerHTML = `
      <button class="mobile-format-close" id="mobile-format-close" title="Back to Dock">
        ${icons.close}
      </button>
      <div class="mobile-format-scroll">
        ${itemsHtml}
      </div>
    `;
  }

  private bindEvents(): void {
    // Prevent mousedown focus transfer so editor selection and Android IME remain active
    this.element.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    this.element.querySelector("#mobile-format-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onClose();
    });

    this.element.querySelectorAll(".mobile-format-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = (el as HTMLElement).dataset.action as FormatAction | undefined;
        if (action) {
          this.onFormat(action);
        }
      });
    });
  }

  destroy(): void {
    this.element.remove();
  }
}
