export interface FolderModalOptions {
  mode: "create" | "move";
  existingFolders?: string[];
  onConfirm: (folderName: string) => void;
  onCancel?: () => void;
}

export class FolderModalComponent {
  private element: HTMLElement;
  private options: FolderModalOptions;

  constructor(options: FolderModalOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "folder-modal-backdrop";
    this.render();
    document.body.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    if (this.options.mode === "create") {
      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">New Folder</h3>
          <input type="text" class="folder-modal-input" placeholder="Folder name" spellcheck="false" />
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">Cancel</button>
            <button class="folder-modal-btn btn-confirm primary">Create</button>
          </div>
        </div>
      `;
    } else {
      const folders = this.options.existingFolders || [];
      const folderItems = [
        `<div class="folder-modal-item" data-folder="All">📁 (Root / All)</div>`,
        ...folders.map((f) => `<div class="folder-modal-item" data-folder="${this.escapeHtml(f)}">📁 ${this.escapeHtml(f)}</div>`),
      ].join("");

      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">Move to Folder</h3>
          <div class="folder-modal-list">${folderItems}</div>
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">Cancel</button>
            <button class="folder-modal-btn btn-new-folder">+ New Folder</button>
          </div>
        </div>
      `;
    }
  }

  private bindEvents(): void {
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    this.element.querySelector(".btn-cancel")?.addEventListener("click", () => this.close());

    if (this.options.mode === "create") {
      const input = this.element.querySelector(".folder-modal-input") as HTMLInputElement;
      input.focus();
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
    } else {
      this.element.querySelectorAll(".folder-modal-item").forEach((item) => {
        item.addEventListener("click", () => {
          const folder = item.getAttribute("data-folder") || "";
          this.options.onConfirm(folder);
          this.close();
        });
      });

      this.element.querySelector(".btn-new-folder")?.addEventListener("click", () => {
        this.close();
        new FolderModalComponent({
          mode: "create",
          onConfirm: (newFolder) => this.options.onConfirm(newFolder),
        });
      });
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  close(): void {
    this.options.onCancel?.();
    this.element.remove();
  }
}

