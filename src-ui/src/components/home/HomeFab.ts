export interface HomeFabCallbacks {
  onNewNote: (originRect?: DOMRect) => void;
  onOpenFile: (originRect?: DOMRect) => void;
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Open file</span>
        </button>
        <button class="home-fab-opt-pill" id="home-fab-new-note">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          <span>New note</span>
        </button>
      </div>
      <button class="home-fab-btn" id="home-fab-main" title="Create / Open">
        <svg class="home-fab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
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
      const rect = (this.element.querySelector("#home-fab-new-note") as HTMLElement)?.getBoundingClientRect();
      this.collapse();
      this.callbacks.onNewNote(rect);
    });

    this.element.querySelector("#home-fab-open-file")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = (this.element.querySelector("#home-fab-open-file") as HTMLElement)?.getBoundingClientRect();
      this.collapse();
      this.callbacks.onOpenFile(rect);
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

    const pills = this.element.querySelectorAll<HTMLElement>(".home-fab-opt-pill");
    pills.forEach((p) => {
      p.classList.remove("anim-pill-enter");
      void p.offsetWidth;
      p.classList.add("anim-pill-enter");
    });
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
