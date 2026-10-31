import { invoke } from "@tauri-apps/api/core";

export interface NoteItem {
  id: string;
  title: string;
  folder: string;
  snippet: string;
  isPinned: boolean;
  isHidden: boolean;
  updatedAt: number;
  fileSize: number;
}

export interface NotesRegistry {
  folders: string[];
  notes: Record<string, NoteItem>;
}

export class NotesService {
  private registry: NotesRegistry = { folders: [], notes: {} };

  async fetchNotes(): Promise<NotesRegistry> {
    try {
      const reg = await invoke<NotesRegistry>("list_notes");
      this.registry = reg || { folders: [], notes: {} };
      return this.registry;
    } catch (err) {
      console.error("Failed to list notes:", err);
      return this.registry;
    }
  }

  getRegistry(): NotesRegistry {
    return this.registry;
  }

  async readNote(id: string): Promise<{ content: string; path: string } | null> {
    try {
      return await invoke<{ content: string; path: string }>("read_note", { id });
    } catch (err) {
      console.error("Failed to read note:", err);
      return null;
    }
  }

  async saveNote(id: string | null, content: string, folder?: string): Promise<NoteItem | null> {
    try {
      const rec = await invoke<NoteItem>("save_note", { id, content, folder });
      this.registry.notes[rec.id] = rec;
      return rec;
    } catch (err) {
      console.error("Failed to save note:", err);
      return null;
    }
  }

  async deleteNotes(ids: string[]): Promise<boolean> {
    try {
      await invoke("delete_notes", { ids });
      for (const id of ids) delete this.registry.notes[id];
      return true;
    } catch (err) {
      console.error("Failed to delete notes:", err);
      return false;
    }
  }

  async moveNotes(ids: string[], targetFolder: string): Promise<boolean> {
    try {
      await invoke("move_notes", { ids, targetFolder });
      await this.fetchNotes();
      return true;
    } catch (err) {
      console.error("Failed to move notes:", err);
      return false;
    }
  }

  async setPinned(ids: string[], pinned: boolean): Promise<boolean> {
    try {
      await invoke("set_note_pinned", { ids, pinned });
      for (const id of ids) {
        if (this.registry.notes[id]) this.registry.notes[id].isPinned = pinned;
      }
      return true;
    } catch (err) {
      console.error("Failed to set note pin:", err);
      return false;
    }
  }

  async setHidden(ids: string[], hidden: boolean): Promise<boolean> {
    try {
      await invoke("set_note_hidden", { ids, hidden });
      for (const id of ids) {
        if (this.registry.notes[id]) this.registry.notes[id].isHidden = hidden;
      }
      return true;
    } catch (err) {
      console.error("Failed to set note hidden:", err);
      return false;
    }
  }

  async createFolder(folderName: string): Promise<boolean> {
    try {
      await invoke("create_folder", { folderName });
      if (!this.registry.folders.includes(folderName)) {
        this.registry.folders.push(folderName);
        this.registry.folders.sort();
      }
      return true;
    } catch (err) {
      console.error("Failed to create folder:", err);
      return false;
    }
  }

  async importExternalFile(sourcePath: string, folder?: string): Promise<NoteItem | null> {
    try {
      const rec = await invoke<NoteItem>("import_external_file", { sourcePath, folder });
      this.registry.notes[rec.id] = rec;
      return rec;
    } catch (err) {
      console.error("Failed to import external file:", err);
      return null;
    }
  }

  filterNotes(query: string, activeFolder: string, showHidden = false): NoteItem[] {
    const q = query.trim().toLowerCase();
    const items = Object.values(this.registry.notes);

    return items
      .filter((note) => {
        if (!showHidden && note.isHidden) return false;
        if (showHidden && !note.isHidden) return false;
        if (activeFolder && activeFolder !== "All" && note.folder !== activeFolder) return false;
        if (!q) return true;
        return (
          note.title.toLowerCase().includes(q) ||
          note.snippet.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }
}
