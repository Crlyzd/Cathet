import { icons } from "../utils/monochromeIcons";
import { FORMAT_BUTTONS } from "../utils/formatToolbarItems";
import { FormatAction } from "../utils/formatUtils";
import { FormatBarPosition } from "../services/formatBarService";
import { t } from "../services/i18nService";

const ALERT_OPTIONS: { action: FormatAction; key: string; fallback: string }[] = [
  { action: "alertNote", key: "context.alertNote", fallback: "Note" },
  { action: "alertTip", key: "context.alertTip", fallback: "Tip" },
  { action: "alertImportant", key: "context.alertImportant", fallback: "Important" },
  { action: "alertWarning", key: "context.alertWarning", fallback: "Warning" },
  { action: "alertCaution", key: "context.alertCaution", fallback: "Caution" },
];

export interface FloatingFormatBarOptions {
  onFormat: (action: FormatAction) => void;
  onClose: () => void;
}

/**
 * FloatingFormatBarComponent — Desktop frosted-glass floating Markdown toolbar.
 */
export class FloatingFormatBarComponent {
  private shellEl: HTMLElement;
  private element: HTMLElement;
  private scrollEl!: HTMLElement;
  private paneBadgeEl!: HTMLElement;
  private alertPopoverEl: HTMLElement | null = null;
  private options: FloatingFormatBarOptions;
  private position: FormatBarPosition = "bottom";
  private userVisible = false;
  private isPreviewMode = false;
  private isDualPane = false;
  private activePane: "left" | "right" = "left";

  constructor(shellEl: HTMLElement, options: FloatingFormatBarOptions) {
    this.shellEl = shellEl;
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "floating-format-bar pos-bottom";
    this.element.style.display = "none";
    this.render();
    this.shellEl.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    const itemsHtml = FORMAT_BUTTONS.map((btn) => {
      if (btn.isDivider) return `<span class="floating-format-divider"></span>`;
      return `<button class="floating-format-btn" data-action="${btn.action}" data-alert-menu="${btn.hasAlertMenu ? "1" : ""}" title="${btn.title}">${btn.iconSvg}</button>`;
    }).join("");

    this.element.innerHTML = `
      <span class="floating-format-pane-badge" id="floating-format-pane-badge" style="display: none;" title="Active Dual-Pane Target">L</span>
      <div class="floating-format-scroll" id="floating-format-scroll">${itemsHtml}</div>
      <span class="floating-format-divider"></span>
      <button class="floating-format-close" id="floating-format-close" title="${t("formatBar.close") || "Close (Ctrl+/)"}">${icons.close}</button>
    `;
    this.scrollEl = this.element.querySelector("#floating-format-scroll")!;
    this.paneBadgeEl = this.element.querySelector("#floating-format-pane-badge")!;
  }

  private bindEvents(): void {
    const keepFocus = (e: Event) => e.preventDefault();
    this.element.addEventListener("mousedown", keepFocus);
    this.element.addEventListener("pointerdown", keepFocus);

    this.element.querySelector("#floating-format-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeAlertPopover();
      this.options.onClose();
    });

    this.scrollEl.addEventListener("wheel", (e: WheelEvent) => {
      if (this.position !== "left" && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        this.scrollEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    this.element.querySelectorAll(".floating-format-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const btn = el as HTMLElement;
        if (btn.dataset.alertMenu === "1") {
          this.toggleAlertPopover(btn);
          return;
        }
        this.closeAlertPopover();
        const action = btn.dataset.action as FormatAction | undefined;
        if (action) this.options.onFormat(action);
      });
    });

    document.addEventListener("mousedown", (e) => {
      if (this.alertPopoverEl && !this.alertPopoverEl.contains(e.target as Node)) {
        this.closeAlertPopover();
      }
    });
  }

  private toggleAlertPopover(anchorBtn: HTMLElement): void {
    if (this.alertPopoverEl) {
      this.closeAlertPopover();
      return;
    }
    const pop = document.createElement("div");
    pop.className = "floating-alert-popover";
    pop.innerHTML = ALERT_OPTIONS.map(
      (opt) => `<button class="floating-alert-item" data-alert="${opt.action}">${t(opt.key) || opt.fallback}</button>`
    ).join("");
    pop.addEventListener("mousedown", (e) => e.preventDefault());
    pop.addEventListener("pointerdown", (e) => e.preventDefault());
    pop.querySelectorAll(".floating-alert-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = (item as HTMLElement).dataset.alert as FormatAction;
        this.closeAlertPopover();
        this.options.onFormat(action);
      });
    });

    this.shellEl.appendChild(pop);
    const rect = anchorBtn.getBoundingClientRect();
    const shellRect = this.shellEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();

    let left = rect.left - shellRect.left;
    let top = rect.bottom - shellRect.top + 6;
    if (this.position === "bottom") {
      top = rect.top - shellRect.top - popRect.height - 6;
    } else if (this.position === "left") {
      left = rect.right - shellRect.left + 6;
      top = Math.min(rect.top - shellRect.top, shellRect.height - popRect.height - 8);
    }
    left = Math.max(8, Math.min(left, shellRect.width - popRect.width - 8));
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.max(36, top)}px`;
    this.alertPopoverEl = pop;
  }

  private closeAlertPopover(): void {
    this.alertPopoverEl?.remove();
    this.alertPopoverEl = null;
  }

  public setVisible(visible: boolean): void {
    this.userVisible = visible;
    this.syncLayoutClasses();
  }

  public setPosition(pos: FormatBarPosition): void {
    this.position = pos;
    this.closeAlertPopover();
    this.element.classList.remove("pos-top", "pos-bottom", "pos-left");
    this.element.classList.add(`pos-${pos}`);
    this.syncLayoutClasses();
  }

  public setDualPaneState(isDualPane: boolean, activePane: "left" | "right"): void {
    this.isDualPane = isDualPane;
    this.activePane = activePane;
    this.paneBadgeEl.style.display = isDualPane ? "inline-flex" : "none";
    this.paneBadgeEl.textContent = activePane === "left" ? "L" : "R";
    this.syncLayoutClasses();
  }

  public setPreviewMode(isPreview: boolean): void {
    this.isPreviewMode = isPreview;
    if (isPreview) this.closeAlertPopover();
    this.syncLayoutClasses();
  }

  private syncLayoutClasses(): void {
    const effectivelyOpen = this.userVisible && !this.isPreviewMode;
    this.element.style.display = effectivelyOpen ? "flex" : "none";
    this.shellEl.classList.toggle("format-bar-open", effectivelyOpen);
    this.shellEl.classList.toggle("is-dual-pane", this.isDualPane);
    this.shellEl.classList.remove("format-bar-top", "format-bar-bottom", "format-bar-left");
    if (effectivelyOpen) {
      this.shellEl.classList.add(`format-bar-${this.position}`);
    }
  }
}
