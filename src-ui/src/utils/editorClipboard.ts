import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { tsvToMarkdownTable } from "./htmlToMarkdown";

export async function editorCut(editorEl: HTMLElement, selectedText: string, isPreview: boolean): Promise<void> {
  if (isPreview || !selectedText) return;
  try {
    await writeText(selectedText);
  } catch (_) {}
  editorEl.focus();
  document.execCommand("delete", false);
}

export async function editorCopy(selectedText: string): Promise<void> {
  if (!selectedText) return;
  try {
    await writeText(selectedText);
  } catch (_) {}
}

export async function editorPaste(editorEl: HTMLElement, isPreview: boolean): Promise<void> {
  if (isPreview) return;
  try {
    const text = await readText();
    if (text) {
      editorEl.focus();
      if (text.includes("\t")) {
        const tableMd = tsvToMarkdownTable(text);
        if (tableMd) {
          document.execCommand("insertText", false, tableMd);
          return;
        }
      }
      document.execCommand("insertText", false, text);
    }
  } catch (err) {
    console.error("Failed to read native clipboard:", err);
  }
}
