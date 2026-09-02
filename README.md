<div align="center">

# Cathet

**A beautiful, crystal-clear frosted glass scratchpad & markdown editor for Windows.**

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D6?logo=windows&logoColor=white)](https://github.com/Crlyzd/Cathet)
[![Architecture](https://img.shields.io/badge/Arch-x64%20%7C%20ARM64-orange)](https://github.com/Crlyzd/Cathet/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/Crlyzd/Cathet?color=purple&label=Release)](https://github.com/Crlyzd/Cathet/releases/latest)

<br/>

<p align="center">
  <img src="docs/screenshot.png" alt="Cathet Application Screenshot" width="800" style="max-width: 100%; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.35);" />
</p>

*Distraction-free writing that blends gracefully into your Windows desktop.*

</div>

---

## ✨ What is Cathet?

Standard Notepad feels plain and dated, while modern writing apps are often heavy, slow to open, and take up huge amounts of computer memory.

**Cathet** is designed to be the best of both worlds:
- 🪟 **Real Frosted Glass**: Gorgeous hardware-accelerated Windows Acrylic blur while active, transitioning to an energy-saving solid appearance when unfocused.
- ⚡ **Opens Instantly**: No loading screens, no heavy background baggage. It opens in a blink and uses virtually no memory (~15 MB RAM).
- 🎒 **100% Portable**: Just a single `.exe` file. No installer, no setup wizards, and no leftover files on your computer.
- 📝 **Everyday Notes or Rich Markdown**: Use it as a clean scratchpad for quick thoughts, or press `Ctrl + M` to preview rich formatted Markdown with headings, bold text, lists, and links.

---

## 🚀 Getting Started (No Installation Needed!)

Using Cathet takes less than 10 seconds:

1. Go to the **[Latest Downloads Page](https://github.com/Crlyzd/Cathet/releases/latest)**.
2. Choose the download that matches your PC:
   - **`cathet.exe`** (or `cathet-x64.exe`): For almost all regular Windows laptops and desktop PCs (Intel or AMD).
   - **`cathet-arm64.exe`**: For modern ARM-powered Windows devices (like Microsoft Surface Pro Copilot+ or Snapdragon laptops).
3. **Double-click to run!** That's it.

> 💡 **Helpful Tip:** Right-click `cathet.exe` and select **Pin to taskbar** or **Pin to Start** so you can open your notes anytime with one click.

---

## 🌟 Everyday Features You'll Love

- 📌 **Always on Top (`Ctrl + T`)**: Keep your notes floating neatly on top of your screen while watching a video, attending a Zoom call, or browsing the web.
- 🎨 **Dark & Light Modes**: Seamlessly switch between dark glass and light glass to match your style or room lighting.
- 🔤 **Curated Fonts**: Choose from clean, easy-on-the-eyes fonts (*Inter, Cascadia Code, JetBrains Mono, Roboto, Segoe UI, and more*).
- 🖱️ **Sleek Right-Click Menu**: Modern rounded glass menu designed specifically to match Windows 11 aesthetics.
- 🔍 **Instant Web Search (`Ctrl + E`)**: Highlight any word or sentence and press `Ctrl + E` to look it up on Google immediately.
- 🔍 **Zoom In / Out (`Ctrl + Mouse Scroll`)**: Adjust text size on the fly for comfortable reading.
- 📂 **Drag & Drop**: Drag any `.txt` or `.md` file from your desktop right into the window to read or edit it.
- 🔄 **Hassle-Free Updates**: Cathet gently notifies you when a new version is released and updates with a single click—keeping your shortcut intact.

---

## ⌨️ Handy Keyboard Shortcuts

| What you want to do | Shortcut |
| :--- | :--- |
| **Switch Markdown Preview on / off** | `Ctrl + M` |
| **Pin / Unpin window to stay on top** | `Ctrl + T` |
| **Open Settings & Personalization** | `Ctrl + ,` (or click `●` dot in the top-left) |
| **Open a new window** | `Ctrl + N` |
| **Open a file** | `Ctrl + O` |
| **Save your document** | `Ctrl + S` |
| **Save as a new file** | `Ctrl + Shift + S` |
| **Bold** / *Italic* / <u>Underline</u> | `Ctrl + B` / `Ctrl + I` / `Ctrl + U` |
| **Search highlighted text on Google** | `Ctrl + E` |
| **Turn Word Wrap on / off** | `Alt + W` |
| **Zoom text in / out** | `Ctrl + Mouse Wheel` |
| **Close Cathet** | `Esc` |

---

## ⚙️ Personalizing Cathet

Click the dot (**`●`**) in the top-left corner (or press `Ctrl + ,`) to open **Settings**:
- **Appearance**: Toggle between Dark and Light mode.
- **Typography**: Select your favorite font family from the glass dropdown.
- **Window Behavior**: Turn on persistent "Always on Top" pinning.
- **Updates**: Check for new updates with a glowing status indicator.
- **About**: View version info, developer details, or support the project.

---

<details>
<summary><b>🛠️ For Developers & Builders (Compiling from Source)</b></summary>

<br/>

If you are a developer and wish to build Cathet locally from source:

### Requirements
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- [Rust](https://www.rust-lang.org/) (latest stable)
- Windows PowerShell

### Single-Script Automation (`build.ps1`)

```powershell
# 1. Clone repository & install frontend modules
git clone https://github.com/Crlyzd/Cathet.git
cd Cathet
npm install

# 2. Live development with hot-reload
.\build.ps1 -Live

# 3. Build optimized release binary
.\build.ps1 -BuildX64     # Windows x64 (~3.7 MB)
.\build.ps1 -BuildArm64   # Windows ARM64 (~3.5 MB)
.\build.ps1 -All          # Both targets
```

All release binaries are created in `release/` with zero bloat (`opt-level = "z"`, stripped symbols, native Windows Schannel TLS).

</details>

---

## ❤️ Support & Community

Cathet is free, open-source, and crafted with care.
- ⭐ If you enjoy Cathet, please consider starring the repository on GitHub!
- 🐛 Found a problem or have an idea? [Submit an issue](https://github.com/Crlyzd/Cathet/issues).
- ☕ Support the creator via [Saweria](https://saweria.co/crlyzd) or [PayPal](https://paypal.me/crlyzd).

---

## 📄 License

Cathet is open-source software licensed under the [MIT License](LICENSE).
