export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  badge?: string;
  isGlowing?: boolean;
  isDivider?: boolean;
  action?: () => void;
}

export class PopupMenuComponent {
  private container: HTMLElement;
  private isVisible: boolean = false;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found.`);
    this.container = el;
  }

  show(x: number, y: number, items: MenuItem[]): void {
    const EQUAL_GAP = 10;
    const gapX = EQUAL_GAP;
    const gapY = y + EQUAL_GAP;

    this.container.innerHTML = `
      <div class="popup-menu-overlay" id="popup-overlay">
        <div class="popup-menu" style="top: ${gapY}px; left: ${gapX}px;">
          ${items
            .map((item) => {
              if (item.isDivider) {
                return '<div class="popup-divider"></div>';
              }
              const glowClass = item.isGlowing ? " glow-update" : "";
              return `
                <div class="popup-menu-item${glowClass}" data-id="${item.id}">
                  <span class="item-label">${item.label}</span>
                  ${item.badge ? `<span class="badge-tag">${item.badge}</span>` : ""}
                  ${item.shortcut ? `<span class="shortcut-hint">${item.shortcut}</span>` : ""}
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;

    this.isVisible = true;

    const overlay = document.getElementById("popup-overlay")!;
    overlay.addEventListener("click", () => this.hide());

    const itemEls = this.container.querySelectorAll(".popup-menu-item");
    itemEls.forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.id;
        const matched = items.find((i) => i.id === id);
        if (matched?.action) {
          matched.action();
        }
        this.hide();
      });
    });
  }

  hide(): void {
    if (!this.isVisible) return;
    this.container.innerHTML = "";
    this.isVisible = false;
  }

  toggle(x: number, y: number, items: MenuItem[]): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(x, y, items);
    }
  }

  getIsOpen(): boolean {
    return this.isVisible;
  }
}
