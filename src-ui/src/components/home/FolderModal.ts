import { t } from "../../services/i18nService";
import { pushBackLayer, removeBackLayer } from "../../utils/backStack";
import { icons } from "../../utils/monochromeIcons";

export interface FolderModalOptions {
  mode: "create" | "move" | "delete";
  existingFolders?: string[];
  folderName?: string;
  noteCount?: number;
  currentFolder?: string;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  onConfirm: (result: string) => void;
  onCancel?: () => void;
}

export class FolderModalComponent {
  private element: HTMLElement;
  private options: FolderModalOptions;
  private isClosed = false;

  constructor(options: FolderModalOptions) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "folder-modal-backdrop";
    this.render();
    document.body.appendChild(this.element);
    this.bindEvents();
    pushBackLayer("folder-modal", () => this.close());
  }

  private render(): void {
    if (this.options.mode === "create") {
      const title = this.escapeHtml(this.options.title || t("home.newFolder"));
      const sub = this.options.subtitle ? `<p class="folder-modal-subtitle">${this.escapeHtml(this.options.subtitle)}</p>` : "";
      const confirmText = this.escapeHtml(this.options.confirmLabel || t("common.ok"));
      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">${title}</h3>
          ${sub}
          <input type="text" class="folder-modal-input" placeholder="${t("home.folderNamePrompt")}" spellcheck="false" />
          <div class="folder-modal-actions">
            <button class="folder-modal-btn btn-cancel">${t("common.cancel")}</button>
            <button class="folder-modal-btn btn-confirm primary">${confirmText}</button>
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
      const cur = this.options.currentFolder;
      const count = this.options.noteCount ?? 1;
      const buildRow = (id: string, label: string, icon: string) => {
        const isCurrent = cur === id;
        const badge = isCurrent ? `<span class="folder-modal-current-badge">${t("home.currentBadge")}</span>` : "";
        return `<button type="button" class="folder-modal-item${isCurrent ? " is-current" : ""}" data-folder="${this.escapeHtml(id)}"${isCurrent ? " disabled" : ""}>
          <span class="folder-modal-item-left"><span class="folder-modal-item-icon">${icon}</span><span class="folder-modal-item-label">${this.escapeHtml(label)}</span></span>${badge}
        </button>`;
      };
      const folderItems = [
        buildRow("All", t("home.noFolderRoot"), icons.grid),
        ...folders.map((f) => buildRow(f, f, icons.folder)),
      ].join("");

      this.element.innerHTML = `
        <div class="folder-modal-card">
          <h3 class="folder-modal-title">${t("common.move")}</h3>
          <p class="folder-modal-subtitle">${t("home.moveSubtitle", { count })}</p>
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
    let backdropPointerDown = false;
    this.element.addEventListener("pointerdown", (e) => {
      backdropPointerDown = e.target === this.element;
    });
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element && backdropPointerDown) this.close();
      backdropPointerDown = false;
    });

    this.element.querySelector(".btn-cancel")?.addEventListener("click", () => this.close());

    if (this.options.mode === "create") {
      const input = this.element.querySelector(".folder-modal-input") as HTMLInputElement;
      input.focus();
      const submit = () => {
        const val = input.value.trim();
        if (val && val.toLowerCase() !== "hidden" && val.toLowerCase() !== "all") {
          this.options.onConfirm(val);
          this.close(false);
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
            this.close(false);
          }
        });
      });
    } else {
      this.element.querySelectorAll(".folder-modal-item:not(.is-current)").forEach((item) => {
        item.addEventListener("click", () => {
          const folder = item.getAttribute("data-folder");
          if (folder !== null) {
            this.options.onConfirm(folder);
            this.close(false);
          }
        });
      });

      this.element.querySelector(".btn-new-folder")?.addEventListener("click", () => {
        const count = this.options.noteCount ?? 1;
        this.close(false);
        new FolderModalComponent({
          mode: "create",
          title: t("home.newFolderAndMove"),
          subtitle: t("home.newFolderMoveHint", { count }),
          confirmLabel: t("home.createAndMove"),
          onConfirm: this.options.onConfirm,
        });
      });
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m] || m));
  }

  private close(notifyCancel = true): void {
    if (this.isClosed) return;
    this.isClosed = true;
    removeBackLayer("folder-modal");
    if (notifyCancel) this.options.onCancel?.();
    this.element.remove();
  }
}
