export interface HomeFabCallbacks {
  onNewNote: () => void;
  onOpenFile: () => void;
}

export class HomeFabComponent {
  private element: HTMLElement;
  private scrim: HTMLElement;
  private callbacks: HomeFabCallbacks;
  private isExpanded = false;

  constructor(container: HTMLElement, callbacks: HomeFabCallbacks) {
    this.callbacks = callbacks;

    this.scrim = document.createElement("div");
    this.scrim.className = "home-fab-scrim";
    this.scrim.style.display = "none";
    container.appendChild(this.scrim);

    this.element = document.createElement("div");
    this.element.className = "home-fab-container";
    this.render();
    container.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="home-fab-options" style="display: none;">
        <button class="home-fab-opt-pill" id="home-fab-open-file">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Open file</span>
        </button>
        <button class="home-fab-opt-pill" id="home-fab-new-note">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span>New note</span>
        </button>
      </div>
      <button class="home-fab-btn" id="home-fab-main" title="Create / Open">
        <span class="home-fab-icon">+</span>
      </button>
    `;
  }

  private bindEvents(): void {
    const mainBtn = this.element.querySelector("#home-fab-main")!;
    mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.scrim.addEventListener("click", () => {
      this.collapse();
    });

    this.element.querySelector("#home-fab-new-note")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collapse();
      this.callbacks.onNewNote();
    });

    this.element.querySelector("#home-fab-open-file")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collapse();
      this.callbacks.onOpenFile();
    });
  }

  toggle(): void {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand(): void {
    this.isExpanded = true;
    this.scrim.style.display = "block";
    const options = this.element.querySelector(".home-fab-options") as HTMLElement;
    options.style.display = "flex";
    this.element.classList.add("expanded");
  }

  collapse(): void {
    if (!this.isExpanded) return;
    this.isExpanded = false;
    this.scrim.style.display = "none";
    const options = this.element.querySelector(".home-fab-options") as HTMLElement;
    options.style.display = "none";
    this.element.classList.remove("expanded");
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? "flex" : "none";
    if (!visible) this.collapse();
  }

  destroy(): void {
    this.scrim.remove();
    this.element.remove();
  }
}

