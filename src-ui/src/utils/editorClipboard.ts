import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { invoke } from "@tauri-apps/api/core";
import { tsvToMarkdownTable } from "./htmlToMarkdown";
import { processAndInsertImageFile } from "./editorPasteHandler";
import { serializeEditorContent } from "./base64Fold";

interface ClipboardImagePayload {
  mimeType: string;
  bytes: number[];
}

export async function editorCut(
  editorEl: HTMLElement,
  selectedText: string,
  isPreview: boolean,
  onContentUpdated?: (newContent: string) => void
): Promise<void> {
  if (isPreview || !selectedText) return;
  try {
    await writeText(selectedText);
  } catch (_) {}
  editorEl.focus();
  document.execCommand("delete", false);
  onContentUpdated?.(serializeEditorContent(editorEl));
}

export async function editorCopy(selectedText: string): Promise<void> {
  if (!selectedText) return;
  try {
    await writeText(selectedText);
  } catch (_) {}
}

export async function editorPaste(
  editorEl: HTMLElement,
  isPreview: boolean,
  onContentUpdated?: (newContent: string) => void
): Promise<void> {
  if (isPreview) return;

  // 1. Check for native clipboard image (Android SAF & JNI bridge)
  try {
    const clipImage = await invoke<ClipboardImagePayload | null>("read_clipboard_image");
    if (clipImage && clipImage.bytes && clipImage.bytes.length > 0) {
      const uint8 = new Uint8Array(clipImage.bytes);
      const mime = clipImage.mimeType || "image/png";
      const ext = mime.split("/").pop() || "png";
      const file = new File([uint8], `clipboard_image.${ext}`, { type: mime });
      editorEl.focus();
      const handled = await processAndInsertImageFile(file, editorEl, (newContent) => {
        onContentUpdated?.(newContent);
      });
      if (handled) return;
    }
  } catch (err) {
    console.warn("Failed checking clipboard image:", err);
  }

  // 2. Fall back to plain text / table paste
  try {
    const text = await readText();
    if (text) {
      editorEl.focus();
      if (text.includes("\t")) {
        const tableMd = tsvToMarkdownTable(text);
        if (tableMd) {
          document.execCommand("insertText", false, tableMd);
          onContentUpdated?.(serializeEditorContent(editorEl));
          return;
        }
      }
      document.execCommand("insertText", false, text);
      onContentUpdated?.(serializeEditorContent(editorEl));
    }
  } catch (err) {
    console.error("Failed to read native clipboard:", err);
  }
}
