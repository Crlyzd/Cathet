import { icons } from "../../utils/monochromeIcons";

export interface HomeSelectionBarCallbacks {
  onHide: () => void;
  onPin: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export class HomeSelectionBarComponent {
  private element: HTMLElement;
  private callbacks: HomeSelectionBarCallbacks;

  constructor(container: HTMLElement, callbacks: HomeSelectionBarCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "home-selection-bar";
    this.element.style.display = "none";
    this.render();
    container.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="home-selection-pill">
        <button class="home-sel-btn" id="home-sel-hide" title="Hide/Archive">
          ${icons.lock}
          <span class="home-sel-label">Hide</span>
        </button>
        <button class="home-sel-btn" id="home-sel-pin" title="Pin note">
          ${icons.pin}
          <span class="home-sel-label">Pin</span>
        </button>
        <button class="home-sel-btn" id="home-sel-move" title="Move to folder">
          ${icons.move}
          <span class="home-sel-label">Move to</span>
        </button>
        <button class="home-sel-btn" id="home-sel-delete" title="Delete note">
          ${icons.trash}
          <span class="home-sel-label">Delete</span>
        </button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.element.querySelector("#home-sel-hide")?.addEventListener("click", () => this.callbacks.onHide());
    this.element.querySelector("#home-sel-pin")?.addEventListener("click", () => this.callbacks.onPin());
    this.element.querySelector("#home-sel-move")?.addEventListener("click", () => this.callbacks.onMove());
    this.element.querySelector("#home-sel-delete")?.addEventListener("click", () => this.callbacks.onDelete());
  }

  setVisible(visible: boolean): void {
    this.element.style.display = visible ? "flex" : "none";
  }

  destroy(): void {
    this.element.remove();
  }
}

