import { icons } from "../../utils/monochromeIcons";

export interface HomeHeaderCallbacks {
  onSearch: (query: string) => void;
  onCancelSelection: () => void;
  onToggleSelectAll: () => void;
  onToggleTheme: (origin: { x: number; y: number }) => void;
}

export class HomeHeaderComponent {
  private element: HTMLElement;
  private callbacks: HomeHeaderCallbacks;
  private isSelectionMode = false;
  private selectedCount = 0;
  private currentTheme: "dark" | "light" = "dark";

  private searchInput!: HTMLInputElement;
  private selectionHeaderEl!: HTMLElement;
  private countLabelEl!: HTMLElement;
  private btnSelectAll!: HTMLButtonElement;
  private btnThemeToggle!: HTMLButtonElement;

  constructor(container: HTMLElement, callbacks: HomeHeaderCallbacks, initialTheme: "dark" | "light" = "dark") {
    this.callbacks = callbacks;
    this.currentTheme = initialTheme;
    this.element = document.createElement("div");
    this.element.className = "home-header";
    this.render();
    container.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="home-header-normal">
        <div class="home-header-top-row">
          <h1 class="home-header-title">Cathet</h1>
          <button class="home-header-btn btn-theme-toggle" id="home-theme-toggle" title="Toggle Theme">
            ${this.currentTheme === "dark" ? icons.sun : icons.moon}
          </button>
        </div>
        <div class="home-search-bar">
          <svg class="home-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="home-search-input" placeholder="Search Cathet" spellcheck="false" />
        </div>
      </div>
      <div class="home-header-selection" style="display: none;">
        <button class="home-header-btn btn-cancel-selection" title="Cancel selection">
          ${icons.close}
        </button>
        <span class="home-selection-count">0 items selected</span>
        <button class="home-header-btn btn-select-all" title="Select all / None">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </button>
      </div>
    `;

    this.searchInput = this.element.querySelector(".home-search-input")!;
    this.btnThemeToggle = this.element.querySelector("#home-theme-toggle")!;
    this.selectionHeaderEl = this.element.querySelector(".home-header-selection")!;
    this.countLabelEl = this.element.querySelector(".home-selection-count")!;
    this.btnSelectAll = this.element.querySelector(".btn-select-all")!;
  }

  private bindEvents(): void {
    this.searchInput.addEventListener("input", () => {
      this.callbacks.onSearch(this.searchInput.value);
    });

    this.btnThemeToggle.addEventListener("click", (e) => {
      const rect = this.btnThemeToggle.getBoundingClientRect();
      const x = e.clientX || rect.left + rect.width / 2;
      const y = e.clientY || rect.top + rect.height / 2;
      this.callbacks.onToggleTheme({ x, y });
    });

    this.element.querySelector(".btn-cancel-selection")?.addEventListener("click", () => {
      this.callbacks.onCancelSelection();
    });

    this.btnSelectAll.addEventListener("click", () => {
      this.callbacks.onToggleSelectAll();
    });
  }

  setTheme(theme: "dark" | "light"): void {
    this.currentTheme = theme;
    if (this.btnThemeToggle) {
      this.btnThemeToggle.innerHTML = theme === "dark" ? icons.sun : icons.moon;
    }
  }

  setSelectionMode(active: boolean, count = 0, total = 0): void {
    this.isSelectionMode = active;
    this.selectedCount = count;

    const normal = this.element.querySelector(".home-header-normal") as HTMLElement;
    if (active) {
      normal.style.display = "none";
      this.selectionHeaderEl.style.display = "flex";
      this.countLabelEl.textContent = `${count} item${count === 1 ? "" : "s"} selected`;
    } else {
      normal.style.display = "flex";
      this.selectionHeaderEl.style.display = "none";
    }
  }

  clearSearch(): void {
    this.searchInput.value = "";
  }

  destroy(): void {
    this.element.remove();
  }
}
