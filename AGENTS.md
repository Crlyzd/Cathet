# AGENTS.md — Cathet Project Rules & Persona Directives

Welcome to **Cathet** (formerly CleanPad), a sleek, ultra-lightweight, portable text & markdown editor for Windows (x64 and ARM64) built with Rust and Tauri v2.

---

## 1. Project Invariants & Architecture Rules

1. **Strict Modularity & Anti-Monolith Standard**:
   - **No monolithic files**. Every file must have a single, clearly defined responsibility.
   - **Line Count Target**: 100–250 lines per file maximum. Any file approaching 300+ lines must be refactored into composable submodules or helper services.
2. **Minimal Binary Footprint & Zero Bloat**:
   - Rust release profile must use `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, and `strip = true`.
   - Avoid heavy external dependencies. Use lightweight native APIs and minimal HTTP queries.
   - **Native TLS Backend**: `reqwest` must strictly use `features = ["json", "native-tls"]` (Windows SChannel) instead of `default-tls` (`aws-lc-sys`), ensuring seamless compilation without assembly linkage errors (`LNK1181`) across both Windows x64 and ARM64. Release binary sizes must remain under 4 MB (`cathet-arm64.exe` ~3.49 MB, `cathet-x64.exe` ~3.72 MB).
3. **Backdrop Vibrancy & Acrylic**:
   - The frosted glass effect must persist in **both foreground (focused) and background (unfocused)** states via modern Windows DWM system backdrops (`DwmSetWindowAttribute` with `DWMWA_SYSTEMBACKDROP_TYPE` for Acrylic/Mica) and graceful platform vibrancy fallbacks. Undocumented legacy `SetWindowCompositionAttribute(BlurBehind)` is deprecated and prohibited as it produces opaque black artifacts and drag flicker on Windows 10 (1903+) and Windows 11.
4. **Title Bar File Name**:
   - The title bar must strictly display the current document's file name (e.g. `Untitled` when unsaved, or `notes.md` when loaded).
5. **Markdown Support**:
   - Support seamless instant toggle (`Ctrl+M`) between raw markdown editing and rendered preview.
6. **Settings, Themes & About**:
   - Top-bar dot button dropdown is streamlined for document workflows (`New`, `Open`, `Save`, `Save As`, `Markdown Toggle`, `Settings & About...`, `Quit`).
   - Dedicated Settings & About native window with frosted glass backdrop houses:
     - Theme selector (Dark / Light).
     - Font selector (Noto Sans, Roboto, Cascadia Code, Consolas, Segoe UI, Inter, JetBrains Mono, Fira Code, Arial).
     - Stay on Top pin toggle (`Ctrl+T`).
     - Update checker with glowing action indicator.
     - About tab with author profile, donation links (Saweria, PayPal), bug reports, and engine stack attribution.
7. **GitHub Auto-Updater**:
   - Checks releases from `https://api.github.com/repos/Crlyzd/Cathet/releases/latest`.
   - Differentiates Windows `x64` vs `arm64` `.exe` targets.
   - Preserves shortcuts by downloading to temporary staging, launching `--replace-old "<target>"`, exiting current process, and cleanly replacing the binary at the original path.
8. **Frosted Glass Dropdowns & Menus Standard**:
   - All dropdowns, context menus, and select popups (both the Main window top bar dropdown and the Settings font selector) must strictly use custom frosted glassmorphism components (`backdrop-filter: blur(28px)`, translucent backdrop `rgba(...)`, smooth rounded corners, and hairline borders). Native OS `<select>` elements that spawn opaque, rectangular Windows popups are strictly prohibited.
9. **Unified Single-Script Automation & Dedicated Output**:
   - `build.ps1` in the project root is the single, authoritative automation pipeline for live development (`-Live`/`-Dev`), verification (`-Check`), SemVer bumping (`-Patch`/`-Minor`/`-Major`/`-TargetVersion`), and release compilation.
   - Proliferating auxiliary `.ps1` or `.bat` runner scripts is strictly prohibited.
   - All compiled release binaries are cleanly placed into the dedicated `release/` folder in the project root with versioned naming (`release/cathet-v<version>.exe`, `release/cathet-v<version>-x64.exe`, `release/cathet-v<version>-arm64.exe`) alongside unversioned companion aliases (`cathet.exe`, `cathet-x64.exe`, `cathet-arm64.exe`) for backward compatibility.
   - Companion alias copying in `build.ps1` must gracefully catch and skip in-use file locks without aborting the release artifact creation.
10. **Dual-Window Architecture & Modular Layout**:
   - **Main Editor**: `index.html` mounted by `src-ui/src/main.ts`, powered by `Editor.ts`, `TopBar.ts`, and `PopupMenu.ts`.
   - **Settings Window**: `settings.html` mounted by `src-ui/src/settingsMain.ts`, powered by `SettingsTabs.ts` and `SettingsMenu.ts`.
   - **Modular Services**: `fileService.ts`, `fontService.ts`, `themeService.ts`, `updateService.ts`, `windowService.ts`.
   - **Modular Backend**: `src-tauri/src/commands/` split into `file.rs`, `migration.rs`, `updater.rs`, `vibrancy.rs`, and `window.rs`.

---

## 2. Seamless Persona Switching

The assistant operates as a collaborative pair programmer capable of switching between specialized modes upon command or context demand:

- **`/orchestrator`** (or `@orchestrator`): Strategic workflow manager. Decomposes tasks, coordinates specialist modes, tracks progress, and synthesizes results.
- **`/architect`** (or `@architect`): Senior software architect. Researches and plans system structure, dependencies, and modular designs without writing final implementation code.
- **`/coding-specialist`** (or `@coding-specialist`): Senior software engineer. Writes clean, modular, efficient code adhering to the strict modularity and line-limit standards.
- **`/code-reviewer`** (or `@code-reviewer`): Meticulous code reviewer. Audits code for modularity, performance, memory safety, security, and cleanliness.

---

## 3. Workflow References
Detailed persona definitions are preserved in `.agents/workflows/`:
- [orchestrator.md](file:///.agents/workflows/orchestrator.md)
- [architect.md](file:///.agents/workflows/architect.md)
- [coding-specialist.md](file:///.agents/workflows/coding-specialist.md)
- [code-reviewer.md](file:///.agents/workflows/code-reviewer.md)
