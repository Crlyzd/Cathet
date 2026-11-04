# Cathet User Guide & Interactive Tutorial

Welcome to **Cathet**, a high-performance, distraction-free text & Markdown editor crafted with native frosted glass (*Windows Acrylic / Mica*) and a responsive dual-platform design for **Windows** and **Android**.

> **Lossless Instant Toggle (`Ctrl + M`)**: Cathet switches instantly between raw editing and rendered preview without reformatting or losing plain-text fidelity. Press `Ctrl + M` at any time to edit this tutorial directly!

---

## ⌨️ Complete Keyboard Shortcuts

### Window & Document Controls
| Action | Windows Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Preview** | `Ctrl + M` | Instantly switch between raw Markdown editing and formatted preview |
| **Dual-Pane Mode** | `Ctrl + D` | Split view horizontally (Desktop) or vertically (Mobile) |
| **Save Document** | `Ctrl + S` | Save active document (prompts *Save As* if untitled) |
| **Save As** | `Ctrl + Shift + S` | Save current text to a new file location |
| **Open File** | `Ctrl + O` | Open any text, markdown, or code document (`.txt`, `.md`, `.svg`) |
| **New Window** | `Ctrl + N` | Open a separate, independent Cathet window instance |
| **Stay on Top** | `Ctrl + T` | Pin Cathet above all other windows |
| **Settings** | `Ctrl + ,` | Open Settings & Personalization (or click `●` in the top bar) |
| **Toggle Word Wrap** | `Alt + W` / `Ctrl + Shift + W` | Enable or disable horizontal line wrapping |
| **Search Selection** | `Ctrl + E` | Look up highlighted text on Google |
| **Select All** | `Ctrl + A` | Select entire document content cleanly |
| **Zoom In / Out** | `Ctrl + Wheel` | Dynamically scale document text zoom |
| **Close Window** | `Esc` | Safely close the current window |

### Markdown Formatting Engine
| Formatting Action | Shortcut | Markdown Syntax |
| :--- | :--- | :--- |
| **Bold** | `Ctrl + B` | `**Bold text**` |
| **Italic** | `Ctrl + I` | `*Italic text*` |
| **Underline** | `Ctrl + U` | `<u>Underlined text</u>` |
| **Strikethrough** | `Ctrl + Shift + X` | `~~Strikethrough text~~` |
| **Highlight** | `Ctrl + Shift + H` | `==Highlighted text==` |
| **Inline Code** | ``Ctrl + ` `` | `` `code token` `` |
| **Math Formula** | `Ctrl + Shift + M` | `$E = mc^2$` |
| **Code Block** | `Ctrl + Shift + C` | Triple backticks ` ``` ` |
| **Blockquote** | `Ctrl + Shift + Q` | `> Quote citation` |
| **Insert Link** | `Ctrl + K` | `[Link text](https://url)` |
| **Insert Image** | `Ctrl + Shift + I` | `![Alt](url)` or file picker modal |
| **Insert Table** | `Ctrl + Shift + B` | `| Column 1 | Column 2 |` |
| **Bullet List** | `Ctrl + Shift + U` | `- List item` |
| **Numbered List** | `Ctrl + Shift + O` | `1. Ordered item` |
| **Task / Checklist** | `Ctrl + Shift + T` | `- [ ] Pending task item` |
| **Headings 1 / 2 / 3** | `Ctrl + Alt + 1` / `2` / `3` | `# H1`, `## H2`, `### H3` |
| **Horizontal Divider** | `Ctrl + Alt + R` | `---` |
| **Clear Formatting** | `Ctrl + \` | Strips all Markdown syntax from selection |

---

## 📝 Markdown Essentials & Typography

Cathet renders clean, GitHub Flavored Markdown (GFM) with rich inline typography:

### 1. Headings
Use `#` symbols to create structured document outlines:
# Heading 1 — Document Title
## Heading 2 — Major Section
### Heading 3 — Subsection
#### Heading 4 — Topic Detail

### 2. Interactive Task Lists
Keep track of actionable items directly in preview mode:
- [x] Downloaded and launched Cathet
- [x] Tested preview mode with `Ctrl + M`
- [ ] Tried dual-pane split view with `Ctrl + D`
- [ ] Inserted a screenshot or custom image
- [ ] Personalized font and theme in Settings

### 3. Rich Text Styling & Blockquotes
Cathet supports diverse inline typographic expressions:
- **Bold emphasis** with `**bold**`
- *Italic styling* with `*italic*`
- <u>Underline formatting</u> with `<u>underline</u>`
- ~~Strikethrough text~~ with `~~strike~~`
- ==Highlighted key phrases== with `==highlight==`
- Inline technical variables like `document.title` and math formulas like `$f(x) = \sigma(W \cdot x + b)$`

> *"Simplicity is prerequisite for reliability."*
> — Edsger W. Dijkstra

### 4. Collapsible Accordions & Details
Use native HTML `<details>` and `<summary>` tags to collapse lengthy reference notes or spoilers:

<details>
<summary>💡 Pro-Tip: Lossless Editing Guarantee (Click to Expand)</summary>

When you switch between Edit and Preview modes, Cathet never mutates or re-serializes your underlying plain text. Every space, indentation level, and custom HTML attribute remains 100% intact.
</details>

### 5. Multi-Language Code Blocks
Wrap source code in triple backticks for clean, monospaced readability:

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

## 📊 Tables & Smart Data Paste

### GitHub Flavored Markdown Tables
Construct aligned data matrices with standard pipe syntax:

| Component | Platform | Memory Footprint | Startup Speed |
| :--- | :--- | :--- | :--- |
| **Cathet Desktop** | Windows (x64 / ARM64) | **< 25 MB** | **Instant (Native Rust)** |
| **Cathet Mobile** | Android (Universal APK) | **< 40 MB** | **120fps HyperOS Smooth** |
| Typical Electron App | Multiplatform | > 180 MB | 2–5 Seconds |
| Standard Notepad | Windows | Low | Basic (No Markdown) |

### Automatic Spreadsheet Conversion
Copy rows and columns from **Microsoft Excel**, **Google Sheets**, or any TSV table, then paste directly (`Ctrl + V`) into Cathet. The editor automatically parses tabular clipboard data into fully formatted Markdown tables.

---

## 🎨 Vector Graphics & Native SVG Rendering

Cathet natively renders raw SVG vector graphics directly in Markdown preview. Vector shapes automatically inherit the active color palette via `currentColor` for seamless dark and light theme adaptation:

<svg width="340" height="52" viewBox="0 0 340 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="336" height="48" rx="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5" />
  <circle cx="28" cy="26" r="12" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="2" />
  <path d="M23 26L26.5 29.5L33.5 22.5" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <text x="52" y="31" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="600">Native Vector SVG Engine Active</text>
</svg>

---

## 📷 Images & Clipboard Superpowers

### Direct Screenshot Pasting
- Press `Win + Shift + S` to capture any region on Windows (or copy any image file in File Explorer) and hit `Ctrl + V`.
- **In-Memory Optimization**: Images over 500 KB are automatically downscaled (1920px max) and converted to WebP in memory to keep your notes compact and fast.
- **1:1 Pixel Fidelity**: Small clips (≤ 500 KB) and animated GIFs (`image/gif`) bypass recompression to preserve pin-sharp details and animation frames.
- **Collapsible Base64 Pills**: In Edit mode, huge Base64 strings fold into interactive `[ 📷 WEBP ~245 KB ▾ ]` frosted glass pill badges. Click to expand or collapse them!
- **Safety Cutoff**: Images larger than 15 MB trigger a warning dialog rather than freezing memory.

### Image Insertion Modal (`Ctrl + Shift + I`)
Press `Ctrl + Shift + I` or click **Insert Image** in the context menu to summon the frosted glass dialog:
- Paste any web address (`https://...`)
- Browse for local desktop images (`.png`, `.jpg`, `.webp`, `.svg`, `.gif`)
- On Android, open the native system photo gallery with one tap.

### Flexible Image Path Resolution
Cathet seamlessly displays web images, relative local paths, and absolute system paths in Preview mode:
```markdown
![Web Image](https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800)
![Local Relative Image](./assets/screenshot.png)
![Local Absolute Path](C:/Users/Pictures/diagram.png)
```

---

## 🪟 Dual-Pane Mode & Proportional Scroll Sync (`Ctrl + D`)

Press `Ctrl + D` (or tap the Dual-Pane button in the mobile dock) to enter side-by-side editing:
- **Responsive Layout**: Horizontal split on Desktop, vertical stacked split (`43%` top / `57%` bottom) on Android.
- **Independent Preview**: Edit raw markdown on the left while observing live rendered output on the right, or inspect two completely different documents simultaneously.
- **3-State Scroll Synchronization**: Click the badge on the center splitter bar (or the mobile sync button) to cycle between:
  1. **Locked Standard**: Proportional bidirectional scroll locking across both panes.
  2. **Snap Scroll Locked**: 1:1 pixel-exact offset alignment.
  3. **Paused**: Freely scroll each pane independently.

---

## 📱 Android & Mobile Experience

Cathet delivers a desktop-grade experience optimized for touch devices:
- **Notes Dashboard**: Dedicated mobile homepage with folder categorization, instant note search, batch multi-select, and pin/hide/delete controls.
- **120fps HyperOS Container Morph**: Tapping any note tile morphs the card into the full editor with fluid Xiaomi HyperOS motion and zero opacity fades.
- **Mobile Format Ribbon**: Tap `Aa` on the bottom dock to access a horizontally scrollable formatting bar that floats comfortably above your soft keyboard.
- **Gboard Direct Image Insertion**: Commit stickers, emojis, and copied photos directly from your favorite mobile keyboard via Android's Commit Content API.
- **Regional Dialect Localization**: Available in English, Indonesian, and regional Javanese dialects (Ngoko, Krama, Mataraman, Surabaya, Banyumasan).

---

## ⚙️ Settings, Customization & Privacy

Press `Ctrl + ,` or click the `●` button in the top bar to open **Settings**:
- **Hardware-Accelerated Frosted Glass**: Windows Acrylic & Mica backdrops automatically adjust opacity when the window gains or loses focus.
- **Curated Typography**: Select from high-legibility system and coding fonts (*Inter, Roboto, JetBrains Mono, Fira Code, Cascadia Code, Segoe UI, Arial*).
- **Smooth Circular Theme Reveal**: Switch between Dark and Light modes with a hardware-accelerated circular mask animation.
- **Self-Healing File Associations**: Register Cathet as your default Windows `.txt`, `.md`, and `.svg` editor with one click; moving `cathet.exe` automatically heals its path references.
- **100% Offline & Private**: Zero telemetry, zero external network requests, and zero tracking. Your notes stay entirely on your device.

---

*Thank you for using Cathet! Press `Ctrl + M` to toggle back to Edit mode and start writing.*
