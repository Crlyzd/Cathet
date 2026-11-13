import { t } from "../../services/i18nService";

export interface FolderModalOptions {
  mode: "create" | "move" | "delete";
  existingFolders?: string[];
  folderName?: string;
  noteCount?: number;
  onConfirm: (result: string) => void;
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
          <h3 class="folder-modal-title">${t("home.newFolder")}</h3>
          <input type="text" class="folder-modal-input" placeholder="${t("home.folderNamePrompt")}" spellcheck="false" />
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">${t("common.cancel")}</button>
            <button class="folder-modal-btn btn-confirm primary">${t("common.ok")}</button>
          </div>
        </div>
      `;
    } else if (this.options.mode === "delete") {
      const name = this.escapeHtml(this.options.folderName || "");
      const count = this.options.noteCount ?? 0;
      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">${t("home.deleteFolderTitle", { name })}</h3>
          <p class="folder-modal-desc">${t("home.deleteFolderMsg", { count })}</p>
          <div class="folder-modal-list">
            <button class="folder-modal-btn primary folder-modal-choice" data-choice="keep">${t("home.deleteFolderKeepNotes")}</button>
            <button class="folder-modal-btn danger folder-modal-choice" data-choice="delete_all">${t("home.deleteFolderAndNotes")}</button>
          </div>
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">${t("common.cancel")}</button>
          </div>
        </div>
      `;
    } else {
      const folders = (this.options.existingFolders || []).filter(
        (f) => f && f.toLowerCase() !== "hidden" && f.toLowerCase() !== "all"
      );
      const folderItems = [
        `<div class="folder-modal-item" data-folder="All">📁 (Root / ${t("home.allNotes")})</div>`,
        ...folders.map((f) => `<div class="folder-modal-item" data-folder="${this.escapeHtml(f)}">📁 ${this.escapeHtml(f)}</div>`),
      ].join("");

      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">${t("common.move")}</h3>
          <div class="folder-modal-list">${folderItems}</div>
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">${t("common.cancel")}</button>
            <button class="folder-modal-btn btn-new-folder">+ ${t("home.newFolder")}</button>
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
        if (val && val.toLowerCase() !== "hidden" && val.toLowerCase() !== "all") {
          this.options.onConfirm(val);
          this.close();
        }
      };
      this.element.querySelector(".btn-confirm")?.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") this.close();
      });
    } else if (this.options.mode === "delete") {
      this.element.querySelectorAll(".folder-modal-choice").forEach((btn) => {
        btn.addEventListener("click", () => {
          const choice = btn.getAttribute("data-choice");
          if (choice) {
            this.options.onConfirm(choice);
            this.close();
          }
        });
      });
    } else {
      this.element.querySelectorAll(".folder-modal-item").forEach((item) => {
        item.addEventListener("click", () => {
          const folder = item.getAttribute("data-folder");
          if (folder !== null) {
            this.options.onConfirm(folder);
            this.close();
          }
        });
      });

      this.element.querySelector(".btn-new-folder")?.addEventListener("click", () => {
        this.close();
        new FolderModalComponent({
          mode: "create",
          onConfirm: this.options.onConfirm,
        });
      });
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m] || m));
  }

  private close(): void {
    this.options.onCancel?.();
    this.element.remove();
  }
}
