export interface RenameModalOptions {
  currentTitle: string;
  onConfirm: (newTitle: string) => void;
  onCancel?: () => void;
}

export class RenameModalComponent {
  private element: HTMLElement;
  private options: RenameModalOptions;

  constructor(options: RenameModalOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "folder-modal-backdrop";
    this.render();
    document.body.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="folder-modal-card">
        <h3 class="folder-modal-title">Rename Note</h3>
        <input type="text" class="folder-modal-input" placeholder="Note title" spellcheck="false" />
        <div class="folder-modal-actions">
          <button class="folder-modal-btn btn-cancel">Cancel</button>
          <button class="folder-modal-btn btn-confirm primary">Save</button>
        </div>
      </div>
    `;
    const input = this.element.querySelector(".folder-modal-input") as HTMLInputElement | null;
    if (input) {
      input.value = this.options.currentTitle;
    }
  }

  private bindEvents(): void {
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    this.element.querySelector(".btn-cancel")?.addEventListener("click", () => this.close());

    const input = this.element.querySelector(".folder-modal-input") as HTMLInputElement;
    setTimeout(() => {
      input.focus();
      input.select();
    }, 20);

    const submit = () => {
      const val = input.value.trim();
      if (val) {
        this.options.onConfirm(val);
        this.close();
      }
    };

    this.element.querySelector(".btn-confirm")?.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") this.close();
    });
  }

  close(): void {
    this.options.onCancel?.();
    this.element.remove();
  }
}

