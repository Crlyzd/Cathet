export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  iconSvg?: string;
  isDivider?: boolean;
  disabled?: boolean;
  action?: () => void;
  submenu?: ContextMenuItem[];
}

const SUBMENU_CHEVRON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

export class ContextMenuComponent {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private openMenus: HTMLElement[] = [];
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

    const overlay = document.createElement("div");
    overlay.className = "context-menu-overlay";
    this.container.appendChild(overlay);
    this.isVisible = true;

    const rootMenu = this.mountMenuLevel(items, 0, overlay);
    const rect = rootMenu.getBoundingClientRect();
    const menuW = rect.width || 220;
    const menuH = rect.height || items.length * 32 + 12;

    const clampedX = Math.max(6, Math.min(x, window.innerWidth - menuW - 6));
    const clampedY = Math.max(6, Math.min(y, window.innerHeight - menuH - 6));
    rootMenu.style.left = `${clampedX}px`;
    rootMenu.style.top = `${clampedY}px`;

    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.hide();
      }
    };
    window.addEventListener("keydown", this.escHandler, true);
  }

  private mountMenuLevel(items: ContextMenuItem[], depth: number, overlay: HTMLElement): HTMLElement {
    this.closeMenusFrom(depth);

    const menuEl = document.createElement("div");
    menuEl.className = depth === 0 ? "context-menu" : "context-menu context-submenu";

    menuEl.innerHTML = items
      .map((item) => {
        if (item.isDivider) {
          return '<div class="context-divider"></div>';
        }
        const disabledClass = item.disabled ? " disabled" : "";
        const hasSub = !!(item.submenu && item.submenu.length > 0);
        const subClass = hasSub ? " has-submenu" : "";
        const iconHtml = item.iconSvg
          ? `<span class="context-menu-icon">${item.iconSvg}</span>`
          : `<span class="context-menu-icon"></span>`;
        const rightHtml = hasSub
          ? `<span class="context-menu-arrow">${SUBMENU_CHEVRON}</span>`
          : item.shortcut
            ? `<span class="context-menu-shortcut">${item.shortcut}</span>`
            : "";

        return `
          <div class="context-menu-item${disabledClass}${subClass}" data-id="${item.id}">
            ${iconHtml}
            <span class="context-menu-label">${item.label}</span>
            ${rightHtml}
          </div>
        `;
      })
      .join("");

    overlay.appendChild(menuEl);
    this.openMenus[depth] = menuEl;

    // Prevent context menu from stealing focus and collapsing editor selection
    menuEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    const itemEls = menuEl.querySelectorAll(".context-menu-item");
    itemEls.forEach((el) => {
      const itemEl = el as HTMLElement;
      const id = itemEl.dataset.id;
      const matched = items.find((i) => i.id === id);

      itemEl.addEventListener("mouseenter", () => {
        this.closeMenusFrom(depth + 1);
        menuEl.querySelectorAll(".context-menu-item.active-submenu").forEach((a) => {
          a.classList.remove("active-submenu");
        });

        if (matched && !matched.disabled && matched.submenu && matched.submenu.length > 0) {
          itemEl.classList.add("active-submenu");
          const subEl = this.mountMenuLevel(matched.submenu, depth + 1, overlay);
          this.positionSubmenu(itemEl, subEl);
        }
      });

      if (matched && !matched.disabled) {
        itemEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (matched.submenu && matched.submenu.length > 0) return;
          this.hide();
          matched.action?.();
        });
      }
    });

    return menuEl;
  }

  private positionSubmenu(parentItemEl: HTMLElement, subEl: HTMLElement): void {
    const parentRect = parentItemEl.getBoundingClientRect();
    const subRect = subEl.getBoundingClientRect();
    const subW = subRect.width || 215;
    const subH = subRect.height || 180;

    let left = parentRect.right + 4;
    if (left + subW > window.innerWidth - 6) {
      left = Math.max(6, parentRect.left - subW - 4);
    }
    let top = parentRect.top - 5;
    if (top + subH > window.innerHeight - 6) {
      top = Math.max(6, window.innerHeight - subH - 6);
    }

    subEl.style.left = `${left}px`;
    subEl.style.top = `${top}px`;
  }

  private closeMenusFrom(startDepth: number): void {
    while (this.openMenus.length > startDepth) {
      const menu = this.openMenus.pop();
      menu?.remove();
    }
  }

  hide(): void {
    if (!this.isVisible) return;
    this.openMenus = [];
    this.container.innerHTML = "";
    this.isVisible = false;
    if (this.escHandler) {
      window.removeEventListener("keydown", this.escHandler, true);
      this.escHandler = null;
    }
  }

  getIsOpen(): boolean {
    return this.isVisible;
  }
}
