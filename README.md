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

Cathet uses a single unified automation pipeline via `build.ps1`. All compiled release executables are cleanly placed into the dedicated **`release/`** directory in the project root.

- **Live Development** (default with hot-reloading):
  ```powershell
  .\build.ps1
  # or: .\build.ps1 -Live
  ```
- **Verification Check** (TypeScript & Cargo):
  ```powershell
  .\build.ps1 -Check
  ```
- **Compile Production Release (Native Host)**:
  ```powershell
  .\build.ps1 -Build          # Outputs to release/cathet.exe
  .\build.ps1 -Build -Run     # Build and immediately launch executable
  ```
- **Compile Windows x64 Release**:
  ```powershell
  .\build.ps1 -BuildX64       # Outputs release/cathet-x64.exe and release/cathet.exe
  ```
- **Compile Windows ARM64 Release**:
  ```powershell
  .\build.ps1 -BuildArm64     # Outputs to release/cathet-arm64.exe
  ```
- **Compile All Release Targets**:
  ```powershell
  .\build.ps1 -All            # Outputs both x64 and ARM64 release binaries
  ```
- **SemVer Version Bumping**:
  ```powershell
  .\build.ps1 -Patch          # e.g., 1.0.0 -> 1.0.1
  .\build.ps1 -Minor          # e.g., 1.0.0 -> 1.1.0
  .\build.ps1 -Major          # e.g., 1.0.0 -> 2.0.0
  .\build.ps1 -TargetVersion 1.2.0
  ```
