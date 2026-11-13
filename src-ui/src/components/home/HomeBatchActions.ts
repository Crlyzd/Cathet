import { NotesService } from "../../services/notesService";
import { FolderModalComponent } from "./FolderModal";
import { RenameModalComponent } from "./RenameModal";

export interface HomeBatchActionsOptions {
  notesService: NotesService;
  getSelectedIds: () => string[];
  isPrivateMode: () => boolean;
  onRefresh: () => void | Promise<void>;
  onExitSelection: () => void;
  onFolderCreated?: (folderName: string) => void;
}

export class HomeBatchActions {
  private opts: HomeBatchActionsOptions;

  constructor(opts: HomeBatchActionsOptions) {
    this.opts = opts;
  }

  async handleRename(): Promise<void> {
    const ids = this.opts.getSelectedIds();
    if (ids.length !== 1) return;
    const noteId = ids[0];
    const currentNote = this.opts.notesService.getRegistry().notes[noteId];
    if (!currentNote) return;

    new RenameModalComponent({
      currentTitle: currentNote.title,
      onConfirm: async (newTitle) => {
        if (await this.opts.notesService.renameNote(noteId, newTitle)) {
          this.opts.onExitSelection();
          await this.opts.onRefresh();
        }
      },
    });
  }

  async handleHide(): Promise<void> {
    const ids = this.opts.getSelectedIds();
    await this.opts.notesService.setHidden(ids, !this.opts.isPrivateMode());
    this.opts.onExitSelection();
    this.opts.onRefresh();
  }

  async handlePin(): Promise<void> {
    const ids = this.opts.getSelectedIds();
    const reg = this.opts.notesService.getRegistry();
    const allPinned = ids.every((id) => reg.notes[id]?.isPinned);
    await this.opts.notesService.setPinned(ids, !allPinned);
    this.opts.onExitSelection();
    this.opts.onRefresh();
  }

  handleMove(): void {
    const ids = this.opts.getSelectedIds();
    new FolderModalComponent({
      mode: "move",
      existingFolders: this.opts.notesService.getRegistry().folders,
      onConfirm: async (dest) => {
        await this.opts.notesService.moveNotes(ids, dest);
        this.opts.onExitSelection();
        this.opts.onRefresh();
      },
    });
  }

  async handleDelete(): Promise<void> {
    const ids = this.opts.getSelectedIds();
    if (confirm(`Delete ${ids.length} selected note(s)?`)) {
      await this.opts.notesService.deleteNotes(ids);
      this.opts.onExitSelection();
      this.opts.onRefresh();
    }
  }

  promptNewFolder(): void {
    new FolderModalComponent({
      mode: "create",
      onConfirm: async (name) => {
        if (await this.opts.notesService.createFolder(name)) {
          this.opts.onFolderCreated?.(name);
          await this.opts.onRefresh();
        }
      },
    });
  }

  async handleDeleteFolder(folderName: string, onDeleted: (name: string) => void): Promise<void> {
    const count = this.opts.notesService.getFolderNoteCount(folderName);
    if (count === 0) {
      if (await this.opts.notesService.deleteFolder(folderName, false)) {
        onDeleted(folderName);
      }
      return;
    }

    new FolderModalComponent({
      mode: "delete",
      folderName,
      noteCount: count,
      onConfirm: async (choice) => {
        const deleteNotes = choice === "delete_all";
        if (await this.opts.notesService.deleteFolder(folderName, deleteNotes)) {
          onDeleted(folderName);
        }
      },
    });
  }

  handleRenameFolder(folderName: string, onRenamed: (oldName: string, newName: string) => void): void {
    new RenameModalComponent({
      currentTitle: folderName,
      onConfirm: async (newName) => {
        const updated = await this.opts.notesService.renameFolder(folderName, newName);
        if (updated) {
          onRenamed(folderName, updated);
        }
      },
    });
  }
}

