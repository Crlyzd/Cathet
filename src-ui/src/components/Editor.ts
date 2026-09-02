import { parseMarkdown } from "../utils/markdown";
import { htmlToMarkdown, isHtmlFormatted, tsvToMarkdownTable } from "../utils/htmlToMarkdown";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";

export class EditorComponent {
  private container: HTMLElement;
  private editorEl!: HTMLElement;
  private zoomLevel: number = 100;
  private isMarkdownPreview: boolean = false;
  private rawContent: string = "";

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
    // Sync raw content on input
    this.editorEl.addEventListener("input", () => {
      if (!this.isMarkdownPreview) {
        this.rawContent = this.editorEl.innerText;
      }
    });

    // Handle paste: images, rich HTML (tables/code), and TSV
    this.editorEl.addEventListener("paste", (e: ClipboardEvent) => {
      if (this.isMarkdownPreview) return;
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 1. Image paste
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const imgHtml = `<img src="${event.target?.result}" alt="Pasted Image" />`;
              document.execCommand("insertHTML", false, imgHtml);
            };
            reader.readAsDataURL(file);
            return;
          }
        }
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
  }

  adjustZoom(deltaPercent: number): void {
    this.zoomLevel = Math.max(50, Math.min(300, this.zoomLevel + deltaPercent));
    this.editorEl.style.fontSize = `${14 * (this.zoomLevel / 100)}px`;
  }

  setFontFamily(family: string): void {
    this.editorEl.style.fontFamily = family;
  }

  setContent(content: string): void {
    this.rawContent = content;
    if (this.isMarkdownPreview) {
      this.editorEl.innerHTML = parseMarkdown(this.rawContent);
    } else {
      if (content.includes("<") && content.includes(">")) {
        this.editorEl.innerHTML = content;
      } else {
        this.editorEl.innerText = content;
      }
    }
  }

  getText(): string {
    return this.isMarkdownPreview ? this.rawContent : this.editorEl.innerText;
  }

  toggleMarkdownPreview(): boolean {
    if (!this.isMarkdownPreview) {
      // Switch from Edit to Markdown Preview
      if (isHtmlFormatted(this.editorEl.innerHTML)) {
        this.rawContent = htmlToMarkdown(this.editorEl.innerHTML);
      } else {
        this.rawContent = this.editorEl.innerText;
      }
      this.editorEl.innerHTML = parseMarkdown(this.rawContent);
      this.editorEl.setAttribute("contenteditable", "false");
      this.editorEl.classList.add("markdown-preview");
      this.isMarkdownPreview = true;
    } else {
      // Switch from Preview to Edit
      this.editorEl.innerText = this.rawContent;
      this.editorEl.setAttribute("contenteditable", "true");
      this.editorEl.classList.remove("markdown-preview");
      this.isMarkdownPreview = false;
      this.editorEl.focus();
    }
    return this.isMarkdownPreview;
  }

  getIsMarkdownPreview(): boolean {
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

  undo(): void {
    if (!this.isMarkdownPreview) document.execCommand("undo", false);
  }

  redo(): void {
    if (!this.isMarkdownPreview) document.execCommand("redo", false);
  }

  cut(): void {
    if (!this.isMarkdownPreview) document.execCommand("cut", false);
  }

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
