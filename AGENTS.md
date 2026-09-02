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
7. **Version 1.0 GitHub Auto-Updater**:
   - Checks releases from `https://api.github.com/repos/Crlyzd/CleanPad/releases/latest`.
   - Differentiates Windows `x64` vs `arm64` `.exe` targets.
   - Preserves shortcuts by downloading to temporary staging, launching `--replace-old "<target>"`, exiting current process, and cleanly replacing the binary at the original path.
8. **Frosted Glass Dropdowns & Menus Standard**:
   - All dropdowns, context menus, and select popups (both the Main window top bar dropdown and the Settings font selector) must strictly use custom frosted glassmorphism components (`backdrop-filter: blur(28px)`, translucent backdrop `rgba(...)`, smooth rounded corners, and hairline borders). Native OS `<select>` elements that spawn opaque, rectangular Windows popups are strictly prohibited.

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
