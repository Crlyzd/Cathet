# Cathet User Guide & Documentation

Welcome to **Cathet**, a lightweight, distraction-free text & Markdown scratchpad for Windows crafted with native frosted glass (*Acrylic / Mica*).

---

## ⌨️ Keyboard Shortcuts Reference

| Command | Shortcut | Description |
| :--- | :--- | :--- |
| **Markdown Preview Toggle** | `Ctrl + M` | Instantly switch between raw editing and rendered preview |
| **Stay on Top** | `Ctrl + T` | Pin Cathet to stay visible over other windows |
| **Settings & Personalization** | `Ctrl + ,` | Open the Settings window (or click `●` top-left) |
| **New Window** | `Ctrl + N` | Open a separate Cathet window instance |
| **Open File** | `Ctrl + O` | Open an existing `.txt`, `.md`, or code file |
| **Save Document** | `Ctrl + S` | Save current file (prompts *Save As* if unsaved) |
| **Save As** | `Ctrl + Shift + S` | Save current text to a new file location |
| **Bold Text** | `Ctrl + B` | Insert bold markdown syntax or format selection |
| **Italic Text** | `Ctrl + I` | Insert italic markdown syntax or format selection |
| **Underline Text** | `Ctrl + U` | Insert underline markdown syntax or format selection |
| **Toggle Word Wrap** | `Alt + W` | Toggle long line wrapping on and off |
| **Google Search** | `Ctrl + E` | Look up currently selected text on Google |
| **Select All** | `Ctrl + A` | Select entire document content |
| **Zoom In / Out** | `Ctrl + Wheel` | Adjust document zoom level |
| **Close Window** | `Esc` | Close current Cathet window |

---

## 📝 Markdown Essentials

Press `Ctrl + M` anytime to toggle between raw markdown editing and formatted preview mode.

### 1. Headings
Use `#` to create headings from H1 down to H6:
# Heading 1
## Heading 2
### Heading 3
#### Heading 4

### 2. Task Lists & Checklists
Track todo items with interactive GitHub Flavored Markdown checkboxes:
- [x] Downloaded and launched Cathet
- [x] Learned how to toggle preview mode with `Ctrl + M`
- [ ] Star the project on GitHub
- [ ] Customize editor font and theme in Settings

### 3. Text Styling & Quotes
> *"Simplicity is prerequisite for reliability."*
> — Edsger W. Dijkstra

You can write **bold text**, *italic text*, ~~strikethrough~~, or `inline code` effortlessly.

### 4. Code Blocks
Write syntax-styled code blocks with triple backticks:

```rust
// Native Windows Acrylic & Mica Backdrops
fn main() {
    println!("Hello from Cathet!");
}
```

```typescript
export interface CathetDocument {
  title: string;
  isMarkdown: boolean;
  content: string;
}
```

---

## 📷 Images & Clipboard Superpowers

### Pasting Images Directly
- Copy any screenshot (`Win + Shift + S`) or image file from File Explorer and press `Ctrl + V`.
- **In-Memory Optimization**: Images over 500 KB are automatically downscaled and converted to WebP in memory to keep document sizes small and snappy.
- **Collapsible Base64 Pills**: In Edit mode, huge base64 strings fold into interactive frosted glass pill badges (`[ 📷 WEBP ~245 KB ▾ ]`). Click the pill to expand or collapse it!
- **Safety Cutoff**: Images over 15 MB are safely rejected with a dialog to prevent memory freezes.

### Local & Web Image Links
Cathet natively displays web, absolute, and relative image links in preview mode:
```markdown
![Web Image](https://example.com/photo.png)
![Local Relative Image](./assets/screenshot.png)
![Local Windows Path](C:/Users/Pictures/logo.png)
```

---

## 📋 Smart Clipboard & Rich Paste

- **Paste from Web Pages**: When you copy formatted articles from a web browser, Cathet automatically converts HTML headings, blockquotes, links, and lists into clean Markdown.
- **Paste Spreadsheets & Tables**: Copy cells from Microsoft Excel, Google Sheets, or TSV data and paste them into Cathet. They are automatically formatted into GFM Markdown tables!

| Feature | Notepad | Typical Editors | Cathet |
| :--- | :--- | :--- | :--- |
| **Launch Speed** | Instant | Slow (Electron) | **Instant (Native Rust)** |
| **Memory Usage** | Very Low | High (>150 MB) | **Tiny (<25 MB)** |
| **Frosted Glass** | None | Simulated | **Native Windows Acrylic** |
| **Markdown Preview**| None | Plugin Needed | **Lossless `Ctrl+M`** |
| **Portable .EXE** | Built-in | Heavy Installer | **100% Standalone** |

---

## ⚙️ Customization & System Integration

Click `Ctrl + ,` or the `●` button in the top bar to open **Settings**:

- **Dark & Light Themes**: Real-time DWM system backdrop theme synchronization.
- **Handpicked Fonts**: Switch typography on the fly (*Inter, Roboto, JetBrains Mono, Fira Code, Cascadia Code, Segoe UI, Arial*).
- **Default Application**: Make Cathet the default Windows handler for `.txt` and `.md` files with one click.
- **Automatic Self-Healing**: If you move `cathet.exe` to a new folder, it automatically repairs its Windows file associations on launch.
- **Seamless Updates**: Check for new releases and update smoothly without breaking existing taskbar or desktop shortcuts.

---

*Thank you for using Cathet! Press `Ctrl + M` to switch to raw text or edit this tutorial.*
