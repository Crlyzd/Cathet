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

export function handleEditorPaste(
  e: ClipboardEvent,
  editorEl: HTMLElement,
  onContentUpdated: (newContent: string) => void
): void {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  // 1. Image paste (screenshots or image files from Explorer)
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

    if (!isSupportedImage(targetFile)) {
      const ext = getFileExtension(targetFile) || targetFile.type || "unknown";
      showGlassDialog({
        type: "warning",
        title: "Unsupported Image Format",
        message: `"${targetFile.name || "Pasted image"}" is in an unsupported format (${ext.toUpperCase()}). Supported formats: PNG, JPEG, WebP, GIF, SVG, BMP, ICO, and AVIF.`,
      });
      return;
    }

    if (isImageTooLarge(targetFile)) {
      showGlassDialog({
        type: "warning",
        title: "Image Exceeds Limit",
        message: `Pasted image is ${formatFileSizeMb(targetFile.size)} MB. The maximum embedded size is 15 MB to keep documents fast. Please link an external file instead.`,
      });
      return;
    }

    optimizePastedImage(targetFile)
      .then((dataUrl) => {
        const pillHtml = createBase64PillHtml(dataUrl);
        const mdImgHtml = `![Pasted Image](${pillHtml})`;
        document.execCommand("insertHTML", false, mdImgHtml);
        onContentUpdated(serializeEditorContent(editorEl));
      })
      .catch(console.error);
    return;
  }

  // 2. Rich HTML paste (convert tables, headings, code to Markdown)
  const html = clipboardData.getData("text/html");
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
