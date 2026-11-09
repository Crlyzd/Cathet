<div align="center">

# Cathet

**A sleek, ultra-lightweight, cross-platform frosted-glass text & markdown editor for Windows, Linux, and Android that just gets out of your way.**

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Linux-0078D6?logo=linux&logoColor=white)](https://github.com/Crlyzd/Cathet)
[![Architecture](https://img.shields.io/badge/Arch-x64%20%7C%20ARM64%20%7C%20APK%20%7C%20AppImage%20%7C%20RPM%20%7C%20DEB-orange)](https://github.com/Crlyzd/Cathet/releases)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/Crlyzd/Cathet?color=purple&label=Release)](https://github.com/Crlyzd/Cathet/releases/latest)

<br/>

<p align="center">
  <img src="https://github.com/user-attachments/assets/4ca0cdb3-a83f-4275-b637-b18981adaf45" alt="Cathet Application Screenshot" width="800" style="max-width: 100%; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.35);" />
</p>

*Clean, distraction-free writing that looks right at home on your desktop and phone.*

</div>

---

## ✨ Why Cathet?

Standard Notepad feels plain and dated, while modern writing apps can feel heavy, slow to launch, and hog your device's memory.

**Cathet** gives you the best of all worlds:

- 🪟 **Real Frosted Glass (Windows)**: Uses genuine Windows Acrylic and Mica system backdrops with hardware acceleration to blend smoothly with your desktop wallpaper.
- 🐧 **Native Linux Desktop (Debian, Red Hat & AppImage)**: First-class GTK 3 & WebKitGTK 4.1 desktop runtime with solid slate canvas or KWin translucent glass, desktop environment auto-detection (GNOME, KDE Plasma, XFCE), and tiny native `.deb` (3.3 MB) and `.rpm` (3.3 MB) packages.
- 📱 **Notes Dashboard & 120fps HyperOS Motion (Android)**: Full-featured mobile homepage with folder categorization, search, batch multi-select, and Xiaomi HyperOS-inspired container morph transitions with zero opacity fade.
- 🔐 **Android Private Notes & Rotary Tumbler Safe Dial**: Secure private notes access via a 2D pull-down and turn-right gesture with an authentic mechanical rotary tumbler HUD and native clock-tick haptics.
- 🔍 **Focus-Preserving In-Document Search**: High-performance text search powered by the CSS Custom Highlight API and DOM TreeWalker, keeping virtual keyboards (Gboard) open without dismissing focus.
- ⚡ **120Hz+ Display Refresh Rate Unlock**: Automatically unlocks high refresh rates (120Hz/144Hz/165Hz) on Android for buttery-smooth scrolling and interactions.
- 🍃 **Featherweight Multi-Architecture Footprint**: Standalone Windows executables (~3.6–3.9 MB) & Store bundle (~3.7 MB), Linux `.deb` (~3.3 MB) & `.rpm` (~3.3 MB), Android phone APK (~7.2 MB) & Universal APK (~20.9 MB).
- 🎒 **100% Portable on Desktop**: Just a single `.exe` file on Windows or standalone `.AppImage` on Linux! No installer required, no registry clutter. Run it from your desktop or a USB drive.
- 📝 **Everyday Scratchpad or Formatted Markdown**: Edit plain text with zero lag, or toggle formatted Markdown preview with headers, checklists, tables, links, and images.
- 👥 **Dual-Pane Mode**: Horizontal side-by-side split on desktop (`Ctrl + D`) and responsive vertical stacked split on Android with 3-state bidirectional scroll synchronization.
- 📷 **Smart In-Memory Images & Gboard Commit**: Automatically compresses large clips (>500 KB) to WebP while keeping small clips and GIFs 1:1 crisp. Massive Base64 strings collapse into tidy badges, and Android keyboard stickers/GIFs paste directly into notes.
- 🛡️ **Verified Cryptographic Releases**: Digitally signed Red Hat packages, detached OpenPGP signatures, and signed `SHA256SUMS` manifests.
- 📶 **Works 100% Offline & Private**: Zero cloud telemetry, no account creation, and no proprietary lock-in. Your notes and files stay strictly on your device.

---

## 🚀 How to Get It

No complicated installation required! You can be up and running in under 10 seconds:

### Windows (Desktop & Laptop)
1. Head over to the **[Latest Downloads](https://github.com/Crlyzd/Cathet/releases/latest)** page.
2. Pick the download for your device architecture:
   - **`cathet-v...-x64.exe`** (~3.9 MB): For standard Windows PCs and laptops (Intel or AMD).
   - **`cathet-v...-arm64.exe`** (~3.6 MB): For modern ARM devices (such as Microsoft Surface Pro Copilot+ or Snapdragon laptops).
   - **`cathet-v....msixbundle`** (~3.7 MB): Microsoft Store multi-architecture bundle combining x64 and ARM64 packages.
3. **Double-click to open and start typing!**

> 💡 **Quick Tip:** Right-click the `.exe` and pick **Pin to taskbar** or **Pin to Start** so your glass scratchpad is always just one click away.

### Linux (Desktop & Laptop)
1. Download your preferred package format from the **[Latest Downloads](https://github.com/Crlyzd/Cathet/releases/latest)** page:
   - **Debian / Ubuntu / Linux Mint / Pop!_OS** (`cathet-v...-amd64.deb` ~3.3 MB):
     ```bash
     sudo apt install ./cathet-v...-amd64.deb
     ```
   - **Fedora / RHEL / openSUSE** (`cathet-v...-x86_64.rpm` ~3.3 MB):
     ```bash
     sudo dnf install ./cathet-v...-x86_64.rpm
     ```
   - **Universal Standalone AppImage** (`cathet-v...-x86_64.AppImage` ~78 MB):
     ```bash
     chmod +x cathet-v...-x86_64.AppImage
     ./cathet-v...-x86_64.AppImage
     ```
2. **Cryptographic Verification**: You can verify release authenticity with our public signing key (`cathet-release-key.asc`) and signed checksum manifest (`SHA256SUMS` / `SHA256SUMS.asc`):
   ```bash
   gpg --import cathet-release-key.asc
   gpg --verify SHA256SUMS.asc SHA256SUMS
   sha256sum --check SHA256SUMS
   ```

### Android (Phone & Tablet)
1. Download the package for your device from the **[Latest Downloads](https://github.com/Crlyzd/Cathet/releases/latest)** page:
   - **`cathet-v...-android-arm64.apk`** (~7.2 MB): Tailored for modern 64-bit ARM phones and tablets.
   - **`cathet-v...-android.apk`** (~20.9 MB): Universal APK containing all ABIs (`arm64-v8a`, `armeabi-v7a`, `x86_64`).
2. Tap the APK to install on any device running Android 7.0+ (API 24 through 36).
3. Open Cathet to enjoy high-refresh-rate note taking with folder organization and instant keyboard image support.

---

## 🌟 Fun Features You'll Actually Use

### Desktop Highlights
- 🪟 **Modern DWM Backdrops (Windows)**: Authentic hardware-accelerated Acrylic and Mica frosted glass with intelligent focus-state transitions.
- 👥 **Side-by-Side Dual Pane (`Ctrl + D`)**: Split your window into two panes to compare notes, write drafts, or reference files simultaneously. Includes a draggable frosted glass splitter and independent preview toggles.
- 📌 **Always on Top (`Ctrl + T`)**: Pin Cathet to float on top while watching videos, attending meetings, or browsing.
- 🪟 **Frameless Controls**: Sleek built-in Minimize, Maximize, and Close buttons right in the header matching Windows 11.
- 📂 **Multi-Target Drag & Drop**: Drag `.txt`, `.md`, or code files straight into the window. In Dual Pane mode, dual drop targets light up beneath your cursor to choose the receiving pane.
- 🖱️ **Custom Frosted Menus**: Custom glass dropdowns and right-click context menus with quick shortcuts for Cut, Copy, Paste, and Word Wrap.
- 🛡️ **Read-Only Protection**: Warns you if you attempt to save changes to a read-only file, safely guiding you to "Save As...".
- 🔄 **One-Click Auto-Updater**: Checks for updates from GitHub releases and updates cleanly in-place (`--replace-old`). When running as a Microsoft Store package, updater controls gracefully yield to the Store's native update engine with a verified status badge.

### Linux Desktop Highlights
- 🐧 **WebKitGTK 4.1 & GTK 3 Runtime**: Lightweight native Linux execution without Chromium overhead.
- 🖥️ **Desktop Environment Auto-Detection**: Dynamically recognizes KDE Plasma, GNOME, XFCE, Cinnamon, MATE, and other desktop environments.
- 🎨 **Solid Slate Canvas by Default**: Default solid background (`#12141c` dark / `#f8fafc` light) prevents unblurred see-through bleed across Wayland and software-rasterized setups, with an optional Translucent Glass toggle for KWin Force-Blur environments.
- 📁 **XDG MIME File Associations**: Seamless desktop registration via standard `.desktop` entries and `xdg-mime`.
- 📦 **System Package Updater Handover**: In-app updater downloads updates and invokes your system's graphical package manager (`xdg-open` into Ubuntu Software, Discover, or DNF) with proper authorization.

### Android Mobile Highlights
- 📱 **Notes Dashboard**: Home view with instant note creation, search filtering, and custom folder categorization.
- 🔐 **Rotary Safe Combination Dial HUD**: Pull down on Home notes and drag right to rotate the authentic mechanical safe tumbler dial 90° with native clock-tick haptics (`CLOCK_TICK`) to unlock Private Notes.
- 🔍 **DOM-Safe In-Document Search**: High-speed search powered by the CSS Custom Highlight API (`::highlight(cathet-search-match)`), jumping smoothly to matched text while preserving continuous keyboard focus.
- 🗂️ **Multi-Select Batch Management**: Long-press cards to batch pin, hide, move between folders, or delete notes.
- 🌊 **Fluid Container Morph Transitions**: Tapping a note card triggers a Xiaomi HyperOS-inspired 380ms scale and clip-path morph into the full editor with zero opacity fade. Back navigation collapses smoothly back into the origin slot.
- ⚡ **120Hz+ Display Unlock**: Hardware-level refresh rate unlock for 120Hz/144Hz/165Hz displays on startup.
- ⌨️ **Gboard Commit Content API**: Paste images, stickers, and GIFs directly from Gboard or system clipboard into your notes.
- 📱 **Vertical Dual-Pane Split**: Stacked split view tailored for mobile screens with touch-friendly dock controls and frozen scroll viewports during text selection.
- 🎨 **Circular Theme Reveal**: Native `document.startViewTransition` circular clip-path mask animation when toggling light/dark themes.
- 📋 **Slide-Up Mobile Settings**: 120fps bottom sheet with GPU-composited backdrop scrim for quick personalization.
- 📏 **Zero-Footprint Scrollbars**: Eliminates layout reflow and text flashing when opening notes.

### Markdown & Image Engine
- 📝 **Lossless Instant Toggle (`Ctrl + M`)**: Switch seamlessly between raw text editing and rendered preview without DOM scraping or data loss.
- 📷 **In-Memory Image Optimization**: Pasted clipboard images exceeding 500 KB are automatically downscaled (1920px max) and converted to WebP in memory. Small clips and animated GIFs bypass recompression to preserve 1:1 pixel sharpness.
- 💊 **Collapsible Base64 Pills**: In Edit mode, massive Base64 image strings fold into compact, clickable frosted glass pill badges (`[ 📷 WEBP ~245 KB ▾ ]`).
- 🖼️ **Local & Remote Image Streaming**: Preview relative (`./assets/...`), absolute (`C:/...`), and web (`https://...`) images with automatic broken-image fallbacks.
- 📋 **Smart Clipboard Pasting**: Paste formatted HTML from browsers directly as clean Markdown, or paste spreadsheet cells from Excel/Google Sheets as Markdown tables.

---

## ⌨️ Desktop Shortcuts

| What you want to do | Press |
| :--- | :--- |
| **Toggle Markdown Preview** | `Ctrl + M` |
| **Toggle Dual Pane (side-by-side) mode** | `Ctrl + D` |
| **Find in Document** | `Ctrl + F` |
| **Pin / Unpin window to stay on top** | `Ctrl + T` |
| **Open Settings & Personalization** | `Ctrl + ,` *(or click the `●` dot in the top-left)* |
| **New document / window** | `Ctrl + N` |
| **Open a file** | `Ctrl + O` |
| **Save your document** | `Ctrl + S` |
| **Save as a new file** | `Ctrl + Shift + S` |
| **Paste text, tables, or auto-optimized images** | `Ctrl + V` |
| **Bold** / *Italic* / <u>Underline</u> | `Ctrl + B` / `Ctrl + I` / `Ctrl + U` |
| **Quick Google search on selected text** | `Ctrl + E` |
| **Toggle Word Wrap on / off** | `Alt + W` |
| **Zoom text in / out** | `Ctrl + Mouse Wheel` |
| **Close window** | `Esc` |

---

## 👆 Mobile Touch Gestures & Navigation

| What you want to do | Action |
| :--- | :--- |
| **Open note from Home** | Tap any note card (smooth 120fps container morph into editor) |
| **Return to Home / Close note** | Tap the `<` back arrow in the top bar (dual-layer collapse) |
| **Unlock Private Notes** | Pull down on notes list and drag right (rotary safe combination dial with ratchet haptics) |
| **Find in note** | Tap search icon in mobile ribbon (non-mutating highlight with keyboard focus) |
| **Create new note** | Tap the floating `+` action button |
| **Enter multi-select mode** | Long press any note card |
| **Batch manage notes** | Select cards in multi-select mode to Pin, Hide, Move, or Delete |
| **Toggle Mobile Dual-Pane** | Tap the Dual-Pane icon in the mobile action bar |
| **Switch Scroll Sync Mode** | Tap or long-press the scroll sync badge on the splitter (Standard, Snap 1:1, Paused) |
| **Open Mobile Settings** | Tap the settings gear in the mobile drawer |
| **Switch Light / Dark Theme** | Tap theme button (circular clip-path reveal) |

---

## ⚙️ Customizing to Your Liking

Access **Settings** on Desktop via `Ctrl + ,` (or the top-left `●` dot), or on Android via the mobile menu drawer:

- **Appearance**: Switch between sleek Dark glass and bright Light glass.
- **Window Backdrop (Linux)**: Select between Solid Slate (default) and Translucent Glass for KWin blur compositors.
- **High Refresh Rate**: Toggle hardware display refresh rate unlock (120Hz/144Hz/165Hz+) or 60Hz battery saver mode.
- **Typography**: Choose your favorite font family (*Inter, Roboto, Cascadia Code, JetBrains Mono, Fira Code, Consolas, Segoe UI, Noto Sans, Arial*).
- **Window Controls (Desktop)**: Toggle persistent "Always on Top" pinning.
- **Markdown Preview Default**: Choose whether documents open directly in formatted preview while keeping blank scratchpads in edit mode.
- **Dual Pane Scroll Sync**: Toggle between proportional scroll synchronization and exact 1:1 snap scroll.
- **Offline Tutorial**: Click **"Open Tutorial"** to explore markdown formatting and interactive examples directly in the editor.
- **Default Application (Windows & Linux)**: Register Cathet as your default text app with one click.
- **Auto-Updater**: Check for new releases with one click or monitor Microsoft Store package status.
- **About**: View version information, meet the creator, or send feedback.

---

## ❓ Frequently Asked Questions

<details>
<summary><b>What operating systems does Cathet support?</b></summary>
<br/>
Cathet is cross-platform across three major ecosystems:
- <b>Windows</b>: Windows 10 and Windows 11 (native x64 and ARM64 executables, plus Microsoft Store MSIX bundles).
- <b>Linux</b>: Modern Linux distributions including Debian, Ubuntu, Fedora, openSUSE, and Arch via native <code>.deb</code>, <code>.rpm</code>, and standalone <code>.AppImage</code> packages.
- <b>Android</b>: Android 7.0 through Android 15+ (API levels 24 to 36) supporting Phone ARM64 and Universal APK packages.
</details>

<details>
<summary><b>How do I verify the authenticity of Cathet release downloads?</b></summary>
<br/>
All Cathet releases are cryptographically signed. You can import our public OpenPGP key (<code>release/cathet-release-key.asc</code>) and verify the signed checksum manifest:
<pre><code>gpg --import cathet-release-key.asc
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum --check SHA256SUMS</code></pre>
Red Hat (<code>.rpm</code>) packages also include direct embedded GPG header signatures verifiable via <code>rpm -K</code>.
</details>

<details>
<summary><b>Does Cathet need an internet connection to work?</b></summary>
<br/>
No! Cathet is 100% self-contained. All styles, fonts, and the interactive tutorial guide are built directly into the app. It works completely offline and never transmits telemetry or tracks your notes.
</details>

<details>
<summary><b>How does Cathet handle images and screenshots?</b></summary>
<br/>
Cathet features a built-in in-memory image engine. When you paste an image (<code>Ctrl + V</code> on desktop or via keyboard/clipboard on Android), clips larger than 500 KB are automatically downscaled and converted to WebP in memory to keep file sizes lightweight. In Edit mode, massive Base64 strings collapse into tidy, clickable frosted glass pills (<code>[ 📷 WEBP ~245 KB ▾ ]</code>). In Preview mode (<code>Ctrl + M</code>), Cathet seamlessly renders local relative (<code>./img.png</code>), absolute (<code>C:/...</code>), and web images.
</details>

<details>
<summary><b>Where are my files and notes saved?</b></summary>
<br/>
On desktop (Windows and Linux), Cathet saves standard text and Markdown files (<code>.txt</code>, <code>.md</code>, etc.) directly wherever you choose. On Android, notes are saved locally with instant folder categorization and can also be exported or opened from external files.
</details>

<details>
<summary><b>Can I take Cathet with me on a flash drive?</b></summary>
<br/>
Yes! On Windows, Cathet is packaged as a single portable executable under 4 MB. On Linux, it is available as a standalone AppImage. You can copy either to a USB thumb drive and run it immediately without installation.
</details>

<details>
<summary><b>How do I uninstall or remove Cathet?</b></summary>
<br/>
On Windows, open Settings, click "Unregister Default App" (if enabled), and delete the <code>.exe</code> file. On Linux, uninstall via <code>sudo apt remove cathet</code> or <code>sudo dnf remove Cathet</code>. On Android, uninstall Cathet like any standard app from your device settings.
</details>

---

<details>
<summary><b>🛠️ For Developers & Builders (Compiling from Source)</b></summary>

<br/>

If you would like to build Cathet locally from source:

### Requirements
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- [Rust](https://www.rust-lang.org/) (latest stable)
- **Windows Builds**: Windows PowerShell and Visual Studio C++ Build Tools
- **Android Builds**: Android Studio / SDK (API 24–36), Android NDK (r25+), JDK 17, and Rust Android targets (`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`)
- **Linux Builds**: WSL2 or native Linux with GTK 3, WebKitGTK 4.1 (`libwebkit2gtk-4.1-dev`), and packaging utilities (`rpm`, `rpmsign`)

### Single-Script Automation (`build.ps1`)

The repository root includes `build.ps1`, the single authoritative automation pipeline:

```powershell
# 1. Clone repository & install frontend modules
git clone https://github.com/Crlyzd/Cathet.git
cd Cathet
npm install

# 2. Desktop Live Development (hot-reload)
.\build.ps1 -Live

# 3. Android Live Development (hot-reload with ADB reverse port forwarding)
.\build.ps1 -AndroidDev

# 4. Windows Desktop Release Builds (placed in release/)
.\build.ps1 -BuildX64     # Windows x64 (~3.9 MB -> release/cathet-v<version>-x64.exe)
.\build.ps1 -BuildArm64   # Windows ARM64 (~3.6 MB -> release/cathet-v<version>-arm64.exe)
.\build.ps1 -BuildMsix    # Microsoft Store package -> release/cathet-v<version>.msixbundle
.\build.ps1 -AllWindows   # Build all three Windows release targets

# 5. Linux Release Builds (Debian, Red Hat, AppImage & Signing)
.\build.ps1 -BuildDeb     # Debian / Ubuntu package (~3.3 MB -> release/cathet-v<version>-amd64.deb)
.\build.ps1 -BuildRpm     # Fedora / Red Hat package (~3.3 MB -> release/cathet-v<version>-x86_64.rpm)
.\build.ps1 -BuildAppImage # Standalone AppImage (~78 MB -> release/cathet-v<version>-x86_64.AppImage)
.\build.ps1 -AllLinux     # Build & digitally sign all Linux packages via GPG

# 6. Android Release Builds (Phone ARM64 & Universal APKs)
.\build.ps1 -AndroidArm64 # Phone ARM64 APK (~7.2 MB -> release/cathet-v<version>-android-arm64.apk)
.\build.ps1 -AndroidBuild # Universal APK (~20.9 MB -> release/cathet-v<version>-android.apk)
.\build.ps1 -AndroidAll   # Build both ARM64 and Universal APKs

# 7. Quality Assurance & Housekeeping
.\build.ps1 -Check        # Synchronous verification: runs npx tsc --noEmit and cargo check
.\build.ps1 -Clean        # Purge local and WSL build caches (~9.6 GB reclaimed)
```

All compiled binaries are placed into `release/` with optimized footprint (`opt-level = "z"`, stripped symbols, native Windows Schannel TLS on Windows and Rustls on Android/Linux).

</details>

---

## ❤️ Support & Feedback

Cathet is free, open-source, and made with love.
- ⭐ If you like Cathet, please give the repo a star on GitHub!
- 🐛 Found a bug or have an idea? [Open an issue](https://github.com/Crlyzd/Cathet/issues).
- ☕ Support the creator via [Saweria](https://saweria.co/crlyzd) or [PayPal](https://paypal.me/crlyzd).

---

## 📄 License

Cathet is open-source software licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0-or-later).
Copyright © 2026 Crlyzd.
