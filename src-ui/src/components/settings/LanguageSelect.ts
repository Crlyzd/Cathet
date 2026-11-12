import { icons } from "../../utils/monochromeIcons";
import { LocaleMeta } from "../../locales";

export class LanguageSelectComponent {
  private container: HTMLElement;
  private locales: LocaleMeta[];
  private currentLocale: string;
  private onSelect: (localeCode: string) => void;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;
  private scrollCloseHandler: ((e: Event) => void) | null = null;

  constructor(
    container: HTMLElement,
    locales: LocaleMeta[],
    currentLocale: string,
    onSelect: (localeCode: string) => void
  ) {
    this.container = container;
    this.locales = locales;
    this.currentLocale = currentLocale;
    this.onSelect = onSelect;
    this.render();
    this.bindEvents();
  }

  public renderHtml(): string {
    const current =
      this.locales.find((l) => l.code === this.currentLocale) ||
      this.locales[0];
    const currentLabel = `${current.nativeName}`;

    const optionsHtml = this.locales
      .map(
        (l) => `
        <div class="glass-select-option ${l.code === this.currentLocale ? "selected" : ""}" data-locale-code="${l.code}">
          <span class="option-name" style="white-space: nowrap;">${l.nativeName}</span>
          ${l.code === this.currentLocale ? `<span class="option-check">${icons.check}</span>` : ""}
        </div>
      `
      )
      .join("");

    return `
      <div class="glass-select-container" id="language-select-container">
        <button class="glass-select-trigger" id="language-select-trigger" type="button" style="white-space: nowrap;">
          <span class="glass-select-label" id="language-select-label">${currentLabel}</span>
          <span class="glass-select-arrow">${icons.chevronDown}</span>
        </button>
        <div class="glass-select-menu" id="language-select-menu" style="min-width: 165px; max-height: 185px;">
          ${optionsHtml}
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = this.renderHtml();
  }

  public bindEvents(): void {
    const trigger = this.container.querySelector("#language-select-trigger") as HTMLButtonElement | null;
    const menu = this.container.querySelector("#language-select-menu") as HTMLElement | null;

    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("open");
      if (isOpen) {
        this.closeMenu(menu, trigger);
      } else {
        this.openMenu(menu, trigger);
      }
    });

    // Isolate mouse wheel events so scrolling the dropdown stays smooth and doesn't propagate
    menu.addEventListener("wheel", (e) => {
      e.stopPropagation();
    });

    const options = this.container.querySelectorAll(".glass-select-option");
    options.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = opt.getAttribute("data-locale-code");
        if (code && code !== this.currentLocale) {
          this.currentLocale = code;
          this.onSelect(code);
          this.updateUI(code);
        }
        this.closeMenu(menu, trigger);
      });
    });

    this.outsideClickHandler = (e: MouseEvent) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeMenu(menu, trigger);
      }
    };
    document.addEventListener("click", this.outsideClickHandler);

    this.scrollCloseHandler = (e: Event) => {
      // Ignore scroll events originating from inside the dropdown menu itself
      if (menu && (e.target === menu || menu.contains(e.target as Node))) {
        return;
      }
      if (menu.classList.contains("open")) {
        this.closeMenu(menu, trigger);
      }
    };
    window.addEventListener("scroll", this.scrollCloseHandler, true);
  }

  private openMenu(menu: HTMLElement, trigger: HTMLElement): void {
    document.querySelectorAll(".glass-select-menu.open").forEach((m) => {
      if (m !== menu) {
        m.classList.remove("open", "drop-up");
        m.parentElement?.querySelector(".glass-select-trigger")?.classList.remove("active");
      }
    });

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isDropUp = spaceBelow < 160;

    menu.classList.toggle("drop-up", isDropUp);
    const available = isDropUp ? rect.top - 12 : spaceBelow - 12;
    menu.style.maxHeight = `${Math.max(80, Math.min(170, available))}px`;

    menu.classList.add("open");
    trigger.classList.add("active");

    const selected = menu.querySelector(".glass-select-option.selected") as HTMLElement | null;
    if (selected) {
      menu.scrollTop = selected.offsetTop - menu.clientHeight / 2 + selected.clientHeight / 2;
    }
  }

  private closeMenu(menu: HTMLElement, trigger: HTMLElement): void {
    menu.classList.remove("open", "drop-up");
    trigger.classList.remove("active");
  }

  public updateUI(localeCode: string): void {
    this.currentLocale = localeCode;
    const current =
      this.locales.find((l) => l.code === localeCode) || this.locales[0];
    const label = this.container.querySelector("#language-select-label");
    if (label) label.textContent = current.nativeName;

    this.container.querySelectorAll(".glass-select-option").forEach((opt) => {
      const code = opt.getAttribute("data-locale-code");
      const isSelected = code === localeCode;
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
    if (this.scrollCloseHandler) {
      window.removeEventListener("scroll", this.scrollCloseHandler, true);
      this.scrollCloseHandler = null;
    }
    this.container.innerHTML = "";
  }
}
