---
title: Cathet User Guide
version: v5.5.0
platforms: Windows, Linux, Android
---

# Cathet User Guide & Interactive Tutorial

Welcome to **Cathet**, a high-performance, distraction-free text & Markdown editor crafted with native frosted glass (*Windows Acrylic / Mica / KDE Blur*) for **Windows**, **Linux**, and **Android**.

> [!NOTE]
> **Lossless Instant Toggle (`Ctrl + M`)**: Cathet switches between raw editing and rendered preview without reformatting or mutating your plain text. Press `Ctrl + M` at any time to inspect or edit this guide, or `Ctrl + /` on Desktop to summon the floating formatting toolbar!

---

## ⌨️ Complete Keyboard Shortcuts

### Window & Document Controls
| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Toggle Preview** | `Ctrl + M` | Switch between raw Markdown editing and rendered preview |
| **Format Toolbar** | `Ctrl + /` | Toggle the floating Markdown toolbar (dock **Top / Bottom / Left** in Settings, or via `⋯` menu) |
| **Dual-Pane Mode** | `Ctrl + D` | Split view horizontally (Desktop) or vertically (Mobile) |
| **Find in Document** | `Ctrl + F` | Open non-destructive highlight search (`F3` / `Shift + F3` to cycle) |
| **Save / Save As** | `Ctrl + S` / `Ctrl + Shift + S` | Save active document or choose a new file location |
| **Open / New Window** | `Ctrl + O` / `Ctrl + N` | Open a file (`.txt`, `.md`, `.svg`) or launch a new window |
| **Stay on Top** | `Ctrl + T` | Pin Cathet above all other desktop windows |
| **Settings** | `Ctrl + ,` | Open Settings & Personalization (or click `●` in the top bar) |
| **Toggle Word Wrap** | `Alt + W` / `Ctrl + Shift + W` | Enable or disable horizontal line wrapping |
| **Search Selection** | `Ctrl + E` | Look up highlighted text on the web |
| **Select All / Zoom** | `Ctrl + A` / `Ctrl + Wheel` | Select all text cleanly or dynamically zoom font size |
| **Close / Dismiss** | `Esc` | Dismiss search bar or close the current window |

### Markdown Formatting & Extended Syntax
| Formatting Action | Shortcut | Markdown Syntax |
| :--- | :--- | :--- |
| **Bold / Italic / Both** | `Ctrl + B` / `Ctrl + I` | `**bold**`, `*italic*`, `***bold italic***` |
| **Underline / Strike** | `Ctrl + U` / `Ctrl + Shift + X` | `<u>underline</u>`, `~~strikethrough~~` |
| **Highlight / Sub & Sup** | `Ctrl + Shift + H` | `==highlight==`, `~subscript~`, `^superscript^` |
| **Inline Code / Math** | ``Ctrl + ` `` / `Ctrl + Shift + M` | `` `code` ``, `$E = mc^2$`, `$$block math$$` |
| **Code Block** | `Ctrl + Shift + C` | Triple backticks ```` ```lang ```` or `~~~lang` |
| **Quote & Alerts** | `Ctrl + Shift + Q` | `> Quote`, `>> Nested`, `> [!NOTE]` / `[!TIP]` / `[!WARNING]` |
| **Links & Footnotes** | `Ctrl + K` | `[text](url)`, `[text][ref]`, `<https://...>`, `[^1]` |
| **Insert Image / Table** | `Ctrl + Shift + I` / `Ctrl + Shift + B` | `![Alt](url)`, `\| Cell \|` (supports `\|` escaped pipes) |
| **Lists & Checklists** | `Ctrl + Shift + U` / `O` / `T` | `- Bullet`, `1. Numbered`, `- [ ] Task` (supports nesting) |
| **Headings & Divider** | `Ctrl + Alt + 1..3` / `R` | `# H1`..`###### H6`, Setext `===`/`---`, `---` rule |
| **Clear / Escape** | `Ctrl + \` | Strip Markdown formatting or escape tokens with `\*` |

---

## 📝 Markdown Essentials & Extended GFM

### 1. Headings
Use `#` symbols (ATX) or `===` / `---` underlines (Setext) to structure outlines:
# Heading 1 — Document Title
## Heading 2 — Major Section
### Heading 3 — Subsection
#### Heading 4 — Topic Detail

### 2. Interactive Nested Task Lists
Toggle both top-level and indented sub-tasks directly in preview mode:
- [x] Downloaded and launched Cathet
- [x] Tested preview mode with `Ctrl + M`
- [ ] Tried dual-pane split view with `Ctrl + D`
  - [ ] Tested 3-state proportional and snap scroll sync
  - [ ] Inserted a screenshot or custom image
1. [x] Numbered task items also sync back to raw Markdown

### 3. Rich Text, Alerts, Math & Footnotes
Cathet supports rich inline typography, reference links ([Cathet Repository][cathet-repo]), autolinks (<https://github.com/Crlyzd/Cathet>), and clickable footnotes[^1]:
- **Bold** (`**bold**`), *Italic* (`*italic*`), ***Bold Italic*** (`***both***`), <u>Underline</u> (`<u>`), ~~Strike~~ (`~~`), ==Highlight== (`==`)
- Subscript & Superscript: H~2~O (`~2~`) and x^2^ (`^2^`) with backslash escapes like \*literal\*
- Inline math ($E = mc^2$) and display math blocks:

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

> [!TIP]
> All 5 GitHub Alerts render natively: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and `[!CAUTION]`.

> [!IMPORTANT]
> Top-of-file `---` YAML frontmatter renders as metadata pills at the top of the document.

> [!WARNING]
> Escaped pipes (`\|`) inside table cells stay literal instead of splitting columns.

> [!CAUTION]
> Images over 15 MB trigger a safety warning dialog before insertion.

> *"Simplicity is prerequisite for reliability."*
>> — Nested quote attribution (Edsger W. Dijkstra)

### 4. Collapsible Accordions & Details
<details>
<summary>💡 Pro-Tip: Lossless Editing Guarantee (Click to Expand)</summary>

Switching between Edit and Preview never mutates or re-serializes your underlying plain text. Every space, indentation level, and custom HTML attribute remains 100% intact.
</details>

### 5. Multi-Language Code Blocks (with One-Click Copy)
Wrap code in ```` ```lang ```` or `~~~lang` fences to display a language header and a one-click **Copy** button:

```rust
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

| Component | Platform | Memory Footprint | Startup Speed |
| :--- | :--- | :--- | :--- |
| **Cathet Desktop** | Windows (x64 / ARM64) | **< 25 MB** | **Instant (Native Rust)** |
| **Cathet Linux** | `.rpm`, `.deb`, AppImage | **< 35 MB** | **Instant (Native GTK)** |
| **Cathet Mobile** | Android (Universal APK) | **< 40 MB** | **120fps HyperOS Smooth** |
| Typical Electron App | Multiplatform | > 180 MB | 2–5 Seconds |

Copy rows from **Microsoft Excel**, **Google Sheets**, or TSV tables and paste (`Ctrl + V`) to auto-convert into GFM tables. Rich HTML (`<sub>`, `<sup>`, `<pre><code class="language-*">`) also converts cleanly on paste.

---

## 🎨 Vector Graphics & Native SVG Rendering

Cathet natively renders single-line and multi-line `<svg>` vector graphics using `currentColor` for seamless dark and light theme adaptation:

<svg width="340" height="52" viewBox="0 0 340 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="336" height="48" rx="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5" />
  <circle cx="28" cy="26" r="12" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="2" />
  <path d="M23 26L26.5 29.5L33.5 22.5" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  <text x="52" y="31" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="600">Native Vector SVG Engine Active</text>
</svg>

---

## 📷 Images & Clipboard Superpowers

- **Direct Screenshot Paste (`Ctrl + V`)**: Images > 500 KB are auto-downscaled (1920px max) and WebP-compressed in memory; clips ≤ 500 KB and animated GIFs stay 1:1.
- **Collapsible Base64 Pills**: In Edit mode, Base64 data URIs fold into interactive `[ 📷 WEBP ~245 KB ▾ ]` pills.
- **Image Insertion Modal (`Ctrl + Shift + I`)**: Insert web URLs, local desktop paths (`./assets/img.png`, `C:/...`), or Android gallery photos.

---

## 🪟 Dual-Pane Mode & Proportional Scroll Sync (`Ctrl + D`)

- **Responsive Split**: Side-by-side on Desktop; vertical stacked split (`43%` / `57%`) on Android.
- **3-State Scroll Sync**: Click the splitter badge (or mobile sync button) to cycle **Locked Standard**, **Snap Scroll Locked**, and **Paused**.

---

## 📱 Android & Mobile Experience

- **Notes Dashboard & Folder Wiggle Mode**: Categorize notes in folders, search, batch pin/hide/move/delete, or long-press folder tabs to rename/delete.
- **Private Vault**: Pull down and turn right on the Notes Home grid to unlock hidden notes with device biometrics.
- **120fps HyperOS Motion & Gboard Images**: Zero-fade container morph transitions, floating `Aa` format ribbon, and Gboard Commit Content image/sticker paste.
- **5 Built-In Locales**: English, Indonesian, Javanese (*Ngoko*, *Krama*, and *Malangan*).

---

## ⚙️ Settings, Customization & Privacy

- **5 Desktop Backdrops**: Choose *Acrylic*, *Mica*, *Mica Alt*, *Pure Transparent*, or *Solid Opaque* with custom tint/solid color pickers and opacity/blur sliders.
- **Typography & Circular Theme Reveal**: Curated offline fonts and 420ms circular `startViewTransition` dark/light reveal.
- **Extended Markdown Shortcuts (`Ctrl + Alt`)**: `S` Subscript, `P` Superscript, `A` Alert Note, `M` Display Math, `F` Auto-Footnote, `D` Details, `Y` YAML Frontmatter (also in Right-Click **Format** & Android `Aa` bar).
- **100% Offline & Private**: Zero telemetry, self-healing Windows file associations, and GitHub auto-updates.

---

*Thank you for using Cathet! Press `Ctrl + M` to toggle back to Edit mode and start writing.*

[cathet-repo]: https://github.com/Crlyzd/Cathet "Cathet on GitHub"
[^1]: Footnotes automatically link back to their inline citation and scroll smoothly in Preview mode.
