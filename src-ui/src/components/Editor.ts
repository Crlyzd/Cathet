import { parseMarkdown } from "../utils/markdown";
import { htmlToMarkdown, isHtmlFormatted, tsvToMarkdownTable } from "../utils/htmlToMarkdown";
import { isImageTooLarge, optimizePastedImage, formatFileSizeMb, isSupportedImage, isAnyImageFile, getFileExtension } from "../utils/imageOptimizer";
import { createBase64PillHtml, serializeEditorContent, renderEditorTextWithPills, attachPillClickHandler } from "../utils/base64Fold";
import { replaceBrokenImageWithFallback } from "../utils/brokenImageFallback";
import { isQuotedFilePath, unwrapQuotedPath } from "../utils/pathUtils";
import { showGlassDialog } from "./GlassDialog";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";

export class EditorComponent {
  private container: HTMLElement;
  private editorEl!: HTMLElement;
  private zoomLevel: number = 100;
  private isMarkdownPreview: boolean = false;
  private rawContent: string = "";
  private documentPath: string | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found.`);
    this.container = el;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="editor-wrapper" id="editor-wrapper">
        <div class="editor-content" id="cathet-editor" contenteditable="true" spellcheck="false"></div>
      </div>
    `;

    this.editorEl = document.getElementById("cathet-editor")!;
    this.bindEvents();
  }

  private bindEvents(): void {
    attachPillClickHandler(this.editorEl);

    // Sync raw content on input
    this.editorEl.addEventListener("input", () => {
      if (!this.isMarkdownPreview) {
        this.rawContent = serializeEditorContent(this.editorEl);
      }
    });

    // Handle paste: images, rich HTML (tables/code), and TSV
    this.editorEl.addEventListener("paste", (e: ClipboardEvent) => {
      if (this.isMarkdownPreview) return;
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

        // Reject unsupported image formats with an informative warning dialog
        if (!isSupportedImage(targetFile)) {
          const ext = getFileExtension(targetFile) || targetFile.type || "unknown";
          showGlassDialog({
            type: "warning",
            title: "Unsupported Image Format",
            message: `"${targetFile.name || "Pasted image"}" is in an unsupported format (${ext.toUpperCase()}). Supported formats: PNG, JPEG, WebP, GIF, SVG, BMP, ICO, and AVIF.`
          });
          return;
        }

        // Validate size against hard safety limit
        if (isImageTooLarge(targetFile)) {
          showGlassDialog({
            type: "warning",
            title: "Image Exceeds Limit",
            message: `Pasted image is ${formatFileSizeMb(targetFile.size)} MB. The maximum embedded size is 15 MB to keep documents fast. Please link an external file instead.`
          });
          return;
        }

        optimizePastedImage(targetFile).then((dataUrl) => {
          const pillHtml = createBase64PillHtml(dataUrl);
          const mdImgHtml = `![Pasted Image](${pillHtml})`;
          document.execCommand("insertHTML", false, mdImgHtml);
          this.rawContent = serializeEditorContent(this.editorEl);
        }).catch(console.error);
        return;
      }

      // 2. Rich HTML paste (convert tables, headings, code to Markdown)
      const html = clipboardData.getData("text/html");
      if (html && isHtmlFormatted(html)) {
        e.preventDefault();
        const md = htmlToMarkdown(html);
        if (md) {
          document.execCommand("insertText", false, md);
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
          return;
        }
      }

      // 4. Windows "Copy as path" quote unwrapping
      if (plainText && isQuotedFilePath(plainText)) {
        e.preventDefault();
        const isInsideLinkOrImg = this.isCursorInsideLinkOrImage();
        const cleanedPath = unwrapQuotedPath(plainText, isInsideLinkOrImg);
        document.execCommand("insertText", false, cleanedPath);
        return;
      }
    });

    // Ctrl + MouseWheel Zooming
    window.addEventListener("wheel", (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        this.adjustZoom(delta);
      }
    }, { passive: false });

    // Click on links in Markdown preview
    this.editorEl.addEventListener("click", (e: MouseEvent) => {
      if (this.isMarkdownPreview) {
        const target = (e.target as HTMLElement)?.closest("a");
        if (target && target.getAttribute("href")) {
          e.preventDefault();
          const href = target.getAttribute("href")!;
          if (/^(https?:\/\/|mailto:)/i.test(href)) {
            openUrl(href).catch(console.error);
          }
        }
      }
    });

    // Intercept broken or unsupported image load errors in preview (capture phase)
    this.editorEl.addEventListener("error", (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === "IMG") {
        replaceBrokenImageWithFallback(target as HTMLImageElement);
      }
    }, true);
  }

  private isCursorInsideLinkOrImage(): boolean {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return false;
    const text = sel.anchorNode.textContent || "";
    const offset = sel.anchorOffset;
    const before = text.slice(Math.max(0, offset - 15), offset);
    const after = text.slice(offset, Math.min(text.length, offset + 15));
    return (before.includes("(") && (after.includes(")") || !before.includes(")"))) ||
           (before.includes("[") && after.includes("]"));
  }

  adjustZoom(deltaPercent: number): void {
    this.zoomLevel = Math.max(50, Math.min(300, this.zoomLevel + deltaPercent));
    this.editorEl.style.fontSize = `${14 * (this.zoomLevel / 100)}px`;
  }

  setFontFamily(family: string): void { this.editorEl.style.fontFamily = family; }
  setDocumentPath(path: string | null): void { this.documentPath = path; }
  getIsMarkdownPreview(): boolean { return this.isMarkdownPreview; }

  setContent(content: string): void {
    this.rawContent = content;
    if (this.isMarkdownPreview) {
      this.editorEl.innerHTML = parseMarkdown(this.rawContent, this.documentPath);
    } else {
      this.editorEl.classList.remove("markdown-preview");
      if (this.rawContent.includes("data:image/")) {
        this.editorEl.innerHTML = renderEditorTextWithPills(this.rawContent);
      } else {
        this.editorEl.innerText = this.rawContent;
      }
    }
  }

  getText(): string {
    return this.isMarkdownPreview ? this.rawContent : serializeEditorContent(this.editorEl);
  }

  toggleMarkdownPreview(): boolean {
    if (!this.isMarkdownPreview) {
      // Switch from Edit to Markdown Preview
      this.rawContent = serializeEditorContent(this.editorEl);
      this.editorEl.innerHTML = parseMarkdown(this.rawContent, this.documentPath);
      this.editorEl.setAttribute("contenteditable", "false");
      this.editorEl.classList.add("markdown-preview");
      this.isMarkdownPreview = true;
    } else {
      // Switch from Preview to Edit: remove preview class first so white-space: pre-wrap is active
      this.editorEl.classList.remove("markdown-preview");
      this.editorEl.setAttribute("contenteditable", "true");
      this.isMarkdownPreview = false;

      if (this.rawContent.includes("data:image/")) {
        this.editorEl.innerHTML = renderEditorTextWithPills(this.rawContent);
      } else {
        this.editorEl.innerText = this.rawContent;
      }
      this.editorEl.focus();
    }
    return this.isMarkdownPreview;
  }

  toggleBold(): void { if (!this.isMarkdownPreview) document.execCommand("bold", false); }
  toggleItalic(): void { if (!this.isMarkdownPreview) document.execCommand("italic", false); }
  toggleUnderline(): void { if (!this.isMarkdownPreview) document.execCommand("underline", false); }

  selectAllClean(): void {
    const range = document.createRange();
    range.selectNodeContents(this.editorEl);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  setWordWrap(enabled: boolean): void {
    if (enabled) {
      this.editorEl.classList.remove("no-wrap");
    } else {
      this.editorEl.classList.add("no-wrap");
    }
  }

  isWordWrapEnabled(): boolean {
    return !this.editorEl.classList.contains("no-wrap");
  }

  toggleWordWrap(): boolean {
    const newState = !this.isWordWrapEnabled();
    this.setWordWrap(newState);
    return newState;
  }

  getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  }

  hasSelection(): boolean {
    return this.getSelectedText().length > 0;
  }

  undo(): void { if (!this.isMarkdownPreview) document.execCommand("undo", false); }
  redo(): void { if (!this.isMarkdownPreview) document.execCommand("redo", false); }
  cut(): void { if (!this.isMarkdownPreview) document.execCommand("cut", false); }

  copy(): void {
    const text = this.getSelectedText();
    if (text && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        document.execCommand("copy", false);
      });
    } else {
      document.execCommand("copy", false);
    }
  }

  async paste(): Promise<void> {
    if (this.isMarkdownPreview) return;
    try {
      const text = await readText();
      if (text) {
        this.editorEl.focus();
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
}
