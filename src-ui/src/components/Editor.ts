export class EditorComponent {
  private container: HTMLElement;
  private editorEl!: HTMLElement;
  private zoomLevel: number = 100;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found.`);
    this.container = el;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="editor-wrapper">
        <div class="editor-content" id="cleanpad-editor" contenteditable="true" spellcheck="false"></div>
      </div>
    `;

    this.editorEl = document.getElementById("cleanpad-editor")!;
    this.bindEvents();
  }

  private bindEvents(): void {
    // Handle paste for image items (pasting images into cleanpad)
    this.editorEl.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

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
          }
        }
      }
    });

    // Handle Ctrl + MouseWheel Zooming matching C++ WM_MOUSEWHEEL
    window.addEventListener("wheel", (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        this.adjustZoom(delta);
      }
    }, { passive: false });
  }

  /**
   * Adjusts text zoom percentage.
   */
  adjustZoom(deltaPercent: number): void {
    this.zoomLevel = Math.max(50, Math.min(300, this.zoomLevel + deltaPercent));
    this.editorEl.style.fontSize = `${14 * (this.zoomLevel / 100)}px`;
  }

  /**
   * Sets editor raw text or HTML content.
   */
  setContent(content: string): void {
    // Escape HTML tags for raw text or load formatted HTML
    if (content.includes("<") && content.includes(">")) {
      this.editorEl.innerHTML = content;
    } else {
      this.editorEl.innerText = content;
    }
  }

  /**
   * Gets editor text content.
   */
  getText(): string {
    return this.editorEl.innerText;
  }

  /**
   * Gets editor HTML content.
   */
  getHtml(): string {
    return this.editorEl.innerHTML;
  }

  /**
   * Toggle rich text formatting (Bold, Italic, Underline).
   */
  toggleBold(): void {
    document.execCommand("bold", false);
  }

  toggleItalic(): void {
    document.execCommand("italic", false);
  }

  toggleUnderline(): void {
    document.execCommand("underline", false);
  }

  /**
   * Clean Select All excluding trailing newline matching C++ Shortcuts::Process 'A'
   */
  selectAllClean(): void {
    const range = document.createRange();
    range.selectNodeContents(this.editorEl);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Sets word wrap state (off if file > 3MB).
   */
  setWordWrap(enabled: boolean): void {
    if (enabled) {
      this.editorEl.classList.remove("no-wrap");
    } else {
      this.editorEl.classList.add("no-wrap");
    }
  }
}
