# Cathet

Cathet is a sleek, portable, ultra-lightweight text and markdown editor for Windows (x64 and ARM64) built with Rust and Tauri v2.

## Key Features

- **Persistent Frosted Glass**: Acrylic blur remains active in both foreground and background window states.
- **Document Title Bar**: Title bar strictly displays the current document file name (e.g., `Untitled`, `notes.md`).
- **Markdown Support (`Ctrl+M`)**: Seamlessly toggle between raw editable text and rendered Markdown preview.
- **Settings & Typography**: Top-bar dropdown with Theme switcher (Dark/Light) and high-legibility fonts (*Noto Sans, Roboto, Cascadia Code, Consolas, Segoe UI, Inter, JetBrains Mono, Fira Code, Arial*).
- **Auto-Updater**: Detects latest GitHub releases, lights up top-bar indicators, and performs atomic, shortcut-preserving self-replacement.
- **Micro Footprint**: Zero-bloat, size-optimized Rust compilation (`opt-level = "z"`, LTO, stripped binary).

## Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+M` | Toggle Markdown preview / Raw edit mode |
| `Ctrl+N` | Open new Cathet instance |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save current file |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+T` | Toggle Stay on Top |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Bold / Italic / Underline |
| `Ctrl+A` | Clean Select All (excluding trailing newline) |
| `Ctrl + Scroll` | Zoom text in / out |
| `Esc` | Exit application |

## Development & Build Automation

- **Live Development**:
  ```powershell
  .\build.ps1 -Live
  ```
- **Compile Size-Optimized Release (x64)**:
  ```powershell
  .\build.ps1 -BuildX64
  ```
- **Compile Size-Optimized Release (ARM64)**:
  ```powershell
  .\build.ps1 -BuildArm64
  ```
- **Compile All Release Targets**:
  ```powershell
  .\build.ps1 -All
  ```
- **SemVer Version Bumping**:
  ```powershell
  .\bump-version.ps1 -Patch   # e.g., 1.0.0 -> 1.0.1
  .\bump-version.ps1 -Minor   # e.g., 1.0.0 -> 1.1.0
  .\bump-version.ps1 1.2.0    # Explicit target version
  ```
