import { htmlToMarkdown, isHtmlFormatted, tsvToMarkdownTable } from "./htmlToMarkdown";
import {
  isImageTooLarge,
  optimizePastedImage,
  formatFileSizeMb,
  isSupportedImage,
  isAnyImageFile,
  getFileExtension,
} from "./imageOptimizer";
import { createBase64PillHtml, serializeEditorContent } from "./base64Fold";
import { isQuotedFilePath, unwrapQuotedPath } from "./pathUtils";
import { showGlassDialog } from "../components/GlassDialog";
import { invoke } from "@tauri-apps/api/core";

export function isCursorInsideLinkOrImage(): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return false;
  const text = sel.anchorNode.textContent || "";
  const offset = sel.anchorOffset;
  const before = text.slice(Math.max(0, offset - 15), offset);
  const after = text.slice(offset, Math.min(text.length, offset + 15));
  return (
    (before.includes("(") && (after.includes(")") || !before.includes(")"))) ||
    (before.includes("[") && after.includes("]"))
  );
}

/**
 * Inserts HTML into editorEl at caret, or appends to end if caret was lost during IME focus handover.
 */
export function insertHtmlAtCaretOrEnd(editorEl: HTMLElement, html: string): void {
  editorEl.focus();
  const sel = window.getSelection();
  let range: Range | null = null;
  if (sel && sel.rangeCount > 0) {
    const candidate = sel.getRangeAt(0);
    if (editorEl.contains(candidate.commonAncestorContainer)) {
      range = candidate;
    }
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editorEl);
    range.collapse(false);
  }
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastChild = fragment.lastChild;
  range.insertNode(fragment);
  if (lastChild && sel) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastChild);
    nextRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nextRange);
  }
}

/**
 * Validates, compresses, and inserts an image file as a collapsible Base64 pill badge.
 */
export async function processAndInsertImageFile(
  targetFile: File,
  editorEl: HTMLElement,
  onContentUpdated: (newContent: string) => void
): Promise<boolean> {
  if (!isSupportedImage(targetFile)) {
    const ext = getFileExtension(targetFile) || targetFile.type || "unknown";
    await showGlassDialog({
      type: "warning",
      title: "Unsupported Image Format",
      message: `"${targetFile.name || "Pasted image"}" is in an unsupported format (${ext.toUpperCase()}). Supported formats: PNG, JPEG, WebP, GIF, SVG, BMP, ICO, and AVIF.`,
    });
    return false;
  }

  if (isImageTooLarge(targetFile)) {
    await showGlassDialog({
      type: "warning",
      title: "Image Exceeds Limit",
      message: `Pasted image is ${formatFileSizeMb(targetFile.size)} MB. The maximum embedded size is 15 MB to keep documents fast. Please link an external file instead.`,
    });
    return false;
  }

  try {
    const dataUrl = await optimizePastedImage(targetFile);
    const pillHtml = createBase64PillHtml(dataUrl);
    const mdImgHtml = `![Pasted Image](${pillHtml})`;
    insertHtmlAtCaretOrEnd(editorEl, mdImgHtml);
    onContentUpdated(serializeEditorContent(editorEl));
    return true;
  } catch (err) {
    console.error("Failed to optimize and insert image:", err);
    return false;
  }
}

export function handleEditorPaste(
  e: ClipboardEvent,
  editorEl: HTMLElement,
  onContentUpdated: (newContent: string) => void
): void {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  // 1. Image paste (screenshots or image files from Explorer / clipboard)
  const items = Array.from(clipboardData.items || []);
  const files = Array.from(clipboardData.files || []);

  let targetFile: File | null = null;
  for (const item of items) {
    if (item.kind === "file" || (item.type && item.type.startsWith("image/"))) {
      const f = item.getAsFile();
      if (f && isAnyImageFile(f)) {
        targetFile = f;
        break;
      }
    }
  }
  if (!targetFile && files.length > 0) {
    for (const f of files) {
      if (isAnyImageFile(f)) {
        targetFile = f;
        break;
      }
    }
  }

  if (targetFile) {
    e.preventDefault();
    processAndInsertImageFile(targetFile, editorEl, onContentUpdated).catch(console.error);
    return;
  }

  // 1b. Android Gboard content:// image paste fallback
  const html = clipboardData.getData("text/html");
  if (html && html.includes("content://")) {
    const match = html.match(/<img[^>]+src=["'](content:\/\/[^"']+)["']/i);
    if (match && match[1]) {
      e.preventDefault();
      invoke<{ mimeType: string; bytes: number[] } | null>("read_clipboard_image")
        .then(async (clipImage) => {
          if (clipImage && clipImage.bytes && clipImage.bytes.length > 0) {
            const uint8 = new Uint8Array(clipImage.bytes);
            const mime = clipImage.mimeType || "image/png";
            const ext = mime.split("/").pop() || "png";
            const file = new File([uint8], `gboard_image.${ext}`, { type: mime });
            await processAndInsertImageFile(file, editorEl, onContentUpdated);
          }
        })
        .catch(console.error);
      return;
    }
  }

  // 2. Rich HTML paste (convert tables, headings, code to Markdown)
  if (html && isHtmlFormatted(html)) {
    e.preventDefault();
    const md = htmlToMarkdown(html);
    if (md) {
      document.execCommand("insertText", false, md);
      onContentUpdated(serializeEditorContent(editorEl));
      return;
    }
  }

  // 3. Tab-separated Table paste (e.g. from Excel or TSV files)
  const plainText = clipboardData.getData("text/plain");
  if (plainText && plainText.includes("\t")) {
    const tableMd = tsvToMarkdownTable(plainText);
    if (tableMd) {
      e.preventDefault();
      document.execCommand("insertText", false, tableMd);
      onContentUpdated(serializeEditorContent(editorEl));
      return;
    }
  }

  // 4. Windows "Copy as path" quote unwrapping
  if (plainText && isQuotedFilePath(plainText)) {
    e.preventDefault();
    const isInsideLink = isCursorInsideLinkOrImage();
    const cleanedPath = unwrapQuotedPath(plainText, isInsideLink);
    document.execCommand("insertText", false, cleanedPath);
    onContentUpdated(serializeEditorContent(editorEl));
    return;
  }
}

function base64ToFile(base64: string, mime: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ext = mime.split("/").pop() || "png";
  return new File([bytes], `keyboard_commit.${ext}`, { type: mime });
}

/**
 * Sets up global Commit Content API listener for Android soft keyboards (Gboard/IME).
 */
export function setupKeyboardCommitListener(
  getActiveEditorEl: () => HTMLElement | null,
  isMarkdownPreview: () => boolean,
  onContentUpdated: (newContent: string) => void
): () => void {
  const insertFile = async (file: File) => {
    if (isMarkdownPreview()) return;
    const editorEl = getActiveEditorEl();
    if (!editorEl) return;
    await processAndInsertImageFile(file, editorEl, onContentUpdated);
  };

  const directHandler = (mime: string, base64: string) => {
    try {
      insertFile(base64ToFile(base64, mime)).catch(console.error);
    } catch (err) {
      console.error("Direct commit base64 error:", err);
    }
  };

  const ipcHandler = async () => {
    try {
      const payload = await invoke<{ mimeType: string; bytes: number[] } | null>(
        "get_pending_commit_image"
      );
      if (!payload?.bytes?.length) return;
      const file = new File([new Uint8Array(payload.bytes)], "commit_img", {
        type: payload.mimeType || "image/png",
      });
      await insertFile(file);
    } catch (err) {
      console.error("IPC commit image error:", err);
    }
  };

  (window as any).__cathet_insert_committed_base64 = directHandler;
  (window as any).__cathet_on_commit_image_ready = ipcHandler;

  return () => {
    delete (window as any).__cathet_insert_committed_base64;
    delete (window as any).__cathet_on_commit_image_ready;
  };
}
