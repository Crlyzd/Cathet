import { NoteItem } from "../../services/notesService";
import { bindLongPress } from "../../utils/touchGesture";
import { icons } from "../../utils/monochromeIcons";

export interface HomeNoteGridCallbacks {
  onOpenNote: (note: NoteItem, originRect?: DOMRect) => void;
  onSelectNote: (noteId: string, selected: boolean) => void;
  onEnterSelectionMode: (initialNoteId: string) => void;
}

export class HomeNoteGridComponent {
  private element: HTMLElement;
  private callbacks: HomeNoteGridCallbacks;
  private disableSelection: boolean;
  private notes: NoteItem[] = [];
  private selectedIds: Set<string> = new Set();
  private isSelectionMode = false;
  private lastLongPressTime = 0;
  private unbindCleanups: (() => void)[] = [];

  constructor(container: HTMLElement, callbacks: HomeNoteGridCallbacks, disableSelection = false) {
    this.callbacks = callbacks;
    this.disableSelection = disableSelection;
    this.element = document.createElement("div");
    this.element.className = "home-note-grid";
    container.appendChild(this.element);
  }

  setNotes(notes: NoteItem[], isSelectionMode = false, selectedIds = new Set<string>()): void {
    this.notes = notes;
    this.isSelectionMode = isSelectionMode;
    this.selectedIds = selectedIds;
    this.render();
  }

  updateSelectionState(isSelectionMode: boolean, selectedIds: Set<string>): void {
    this.isSelectionMode = isSelectionMode;
    this.selectedIds = selectedIds;
    const cards = this.element.querySelectorAll<HTMLElement>(".home-note-card");
    cards.forEach((card) => {
      const id = card.getAttribute("data-id") || "";
      const isSelected = this.selectedIds.has(id);
      card.classList.toggle("selected", isSelected);
      card.classList.remove("touch-pressed");
      const checkEl = card.querySelector<HTMLElement>(".home-card-check");
      if (checkEl) {
        checkEl.style.display = this.isSelectionMode ? "flex" : "none";
        checkEl.classList.toggle("checked", isSelected);
      }
    });
  }

  private formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  private render(): void {
    this.unbindCleanups.forEach((cleanup) => cleanup());
    this.unbindCleanups = [];
    this.element.innerHTML = "";

    if (this.notes.length === 0) {
      this.element.innerHTML = `
        <div class="home-grid-empty">
          <svg class="home-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
          </svg>
          <span class="home-empty-text">No notes here yet</span>
        </div>
      `;
      return;
    }

    for (const note of this.notes) {
      const isSelected = this.selectedIds.has(note.id);
      const card = document.createElement("div");
      card.className = `home-note-card${isSelected ? " selected" : ""}${note.isPinned ? " pinned" : ""}`;
      card.setAttribute("data-id", note.id);

      card.innerHTML = `
        <div class="home-card-header">
          <span class="home-card-title">${this.escapeHtml(note.title)}</span>
          ${note.isPinned ? `<span class="home-card-pin" title="Pinned">${icons.pin}</span>` : ""}
        </div>
        <div class="home-card-body">${this.escapeHtml(note.snippet || " ")}</div>
        <div class="home-card-footer">
          <span class="home-card-date">${this.formatDate(note.updatedAt)}</span>
          <div class="home-card-check${isSelected ? " checked" : ""}" style="display: ${this.isSelectionMode ? "flex" : "none"}">
            <svg class="home-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      `;

      const unbind = bindLongPress(card, {
        thresholdMs: 450,
        moveTolerancePx: 12,
        onLongPress: () => {
          if (!this.disableSelection && !this.isSelectionMode) {
            this.lastLongPressTime = Date.now();
            this.callbacks.onEnterSelectionMode(note.id);
          }
        },
        onClick: () => {
          if (Date.now() - this.lastLongPressTime < 450) return;
          if (!this.disableSelection && this.isSelectionMode) {
            const next = !this.selectedIds.has(note.id);
            this.callbacks.onSelectNote(note.id, next);
          } else {
            const rect = card.getBoundingClientRect();
            this.callbacks.onOpenNote(note, rect);
          }
        },
      });

      const onDown = () => card.classList.add("touch-pressed");
      const onUp = () => card.classList.remove("touch-pressed");
      card.addEventListener("pointerdown", onDown, { passive: true });
      card.addEventListener("pointerup", onUp, { passive: true });
      card.addEventListener("pointercancel", onUp, { passive: true });
      card.addEventListener("pointerleave", onUp, { passive: true });

      this.unbindCleanups.push(unbind, () => {
        card.removeEventListener("pointerdown", onDown);
        card.removeEventListener("pointerup", onUp);
        card.removeEventListener("pointercancel", onUp);
        card.removeEventListener("pointerleave", onUp);
      });
      this.element.appendChild(card);
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  destroy(): void {
    this.unbindCleanups.forEach((c) => c());
    this.unbindCleanups = [];
    this.element.remove();
  }
}
