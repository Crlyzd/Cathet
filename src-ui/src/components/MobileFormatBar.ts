import { icons } from "../utils/monochromeIcons";
import { formatIcons } from "../utils/contextMenuItems";
import { FormatAction } from "../utils/formatUtils";

interface FormatButtonDef {
  action?: FormatAction;
  title?: string;
  iconSvg?: string;
  isDivider?: boolean;
}

const FORMAT_BUTTONS: FormatButtonDef[] = [
  { action: "bold", title: "Bold", iconSvg: formatIcons.bold },
  { action: "italic", title: "Italic", iconSvg: formatIcons.italic },
  { action: "strike", title: "Strikethrough", iconSvg: formatIcons.strike },
  { action: "code", title: "Inline Code", iconSvg: formatIcons.code },
  { action: "highlight", title: "Highlight", iconSvg: formatIcons.highlight },
  { action: "math", title: "Inline Math", iconSvg: formatIcons.math },
  { isDivider: true },
  { action: "h1", title: "Heading 1", iconSvg: formatIcons.h1 },
  { action: "h2", title: "Heading 2", iconSvg: formatIcons.h2 },
  { action: "h3", title: "Heading 3", iconSvg: formatIcons.h3 },
  { isDivider: true },
  { action: "bullet", title: "Bullet List", iconSvg: formatIcons.bullet },
  { action: "number", title: "Numbered List", iconSvg: formatIcons.number },
  { action: "task", title: "Task List", iconSvg: formatIcons.task },
  { isDivider: true },
  { action: "quote", title: "Blockquote", iconSvg: formatIcons.quote },
  { action: "codeblock", title: "Code Block", iconSvg: formatIcons.codeblock },
  { action: "link", title: "Hyperlink", iconSvg: formatIcons.link },
  { action: "table", title: "Insert Table", iconSvg: formatIcons.table },
  { action: "rule", title: "Horizontal Rule", iconSvg: formatIcons.rule },
  { isDivider: true },
  { action: "clear", title: "Clear Formatting", iconSvg: formatIcons.clear },
];

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

