export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  iconSvg?: string;
  isDivider?: boolean;
  disabled?: boolean;
  action?: () => void;
}

export class ContextMenuComponent {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private escHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(containerId: string) {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement("div");
      el.id = containerId;
      document.body.appendChild(el);
    }
    this.container = el;
  }

  show(x: number, y: number, items: ContextMenuItem[]): void {
    this.hide();

    const menuEl = document.createElement("div");
    menuEl.className = "context-menu";

    menuEl.innerHTML = items
      .map((item) => {
        if (item.isDivider) {
          return '<div class="context-divider"></div>';
        }
        const disabledClass = item.disabled ? " disabled" : "";
        const iconHtml = item.iconSvg
          ? `<span class="context-menu-icon">${item.iconSvg}</span>`
          : `<span class="context-menu-icon"></span>`;
        const shortcutHtml = item.shortcut
          ? `<span class="context-menu-shortcut">${item.shortcut}</span>`
          : "";

        return `
          <div class="context-menu-item${disabledClass}" data-id="${item.id}">
            ${iconHtml}
            <span class="context-menu-label">${item.label}</span>
            ${shortcutHtml}
          </div>
        `;
      })
      .join("");

    const overlay = document.createElement("div");
    overlay.className = "context-menu-overlay";
    overlay.appendChild(menuEl);
    this.container.appendChild(overlay);
    this.isVisible = true;

    // Viewport bounding clamping
    const menuWidth = 220;
    const estimatedHeight = items.length * 34 + 16;
    const clampedX = Math.max(6, Math.min(x, window.innerWidth - menuWidth - 6));
    const clampedY = Math.max(6, Math.min(y, window.innerHeight - estimatedHeight - 6));

    menuEl.style.left = `${clampedX}px`;
    menuEl.style.top = `${clampedY}px`;

    // Click outside handler
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // Item click handler
    const itemEls = menuEl.querySelectorAll(".context-menu-item:not(.disabled)");
    itemEls.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.id;
        const matched = items.find((i) => i.id === id);
        this.hide();
        if (matched?.action) {
          matched.action();
        }
      });
    });

    // Escape key handler
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.hide();
      }
    };
    window.addEventListener("keydown", this.escHandler, { once: true });
  }

  hide(): void {
    if (!this.isVisible) return;
    this.container.innerHTML = "";
    this.isVisible = false;
    if (this.escHandler) {
      window.removeEventListener("keydown", this.escHandler);
      this.escHandler = null;
    }
  }

  getIsOpen(): boolean {
    return this.isVisible;
  }
}
