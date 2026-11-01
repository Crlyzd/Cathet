# AGENTS.md — Cathet Project Rules & Persona Directives

Welcome to **Cathet** (formerly CleanPad), a sleek, ultra-lightweight, cross-platform text & markdown editor for **Windows (x64 and ARM64)** and **Android (Universal APK)** built with Rust and Tauri v2.

---

## 1. Project Invariants & Architecture Rules

1. **Strict Modularity & Anti-Monolith Standard**:
   - **No monolithic files**. Every source file must have a single, clearly defined responsibility.
   - **Line Count Target**: 100–250 lines per file maximum across TypeScript, Rust, and Kotlin modules. Any file approaching 300+ lines must be refactored into composable submodules or helper services.
2. **Minimal Binary Footprint & TLS Backend**:
   - Production distribution release profile (`profile.release`) must use `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, and `strip = true` for smallest possible binary size under 4 MB on Windows (`cathet-v<ver>-arm64.exe` ~3.49 MB, `cathet-v<ver>-x64.exe` ~3.72 MB).
   - Local rapid iteration profile (`profile.fast-release`) with `opt-level = 1`, `lto = "off"`, `codegen-units = 256`, and `incremental = true` is used for `build.ps1` native options `[3]` and `[4]` (`cathet-v<ver>-<arch>-fast.exe`) to maximize compilation speed.
   - Avoid heavy external dependencies. Use lightweight native APIs and minimal HTTP queries.
   - **Platform TLS Backends**: On Windows (`cfg(windows)`), `reqwest` strictly uses `features = ["json", "native-tls"]` (Windows SChannel) instead of `default-tls` (`aws-lc-sys`) to prevent assembly linkage errors (`LNK1181`) across x64 and ARM64. On non-Windows / Android (`cfg(not(windows))`), `reqwest` uses `features = ["json", "rustls"]` alongside `jni = "0.21"` and `ndk-context = "0.1"`.
3. **Backdrop Vibrancy & Acrylic (Windows Desktop)**:
   - The frosted glass effect on Windows is implemented via modern DWM system backdrops (`DwmSetWindowAttribute` with `DWMWA_SYSTEMBACKDROP_TYPE` for Acrylic/Mica) and graceful platform vibrancy fallbacks (`vibrancy.rs`). While active (focused), native hardware-accelerated Acrylic renders translucent frosted glass; when inactive (unfocused), Windows DWM automatically transitions to an energy-saving solid dark/light backdrop. Undocumented legacy `SetWindowCompositionAttribute(BlurBehind)` is prohibited.
4. **Title Bar & Extension-Free Display Names**:
   - The title bar and dual-pane headers display clean, extension-free document titles via `formatDisplayTitle()` and `stripFileExtension()` in `pathUtils.ts` (e.g. `Untitled` when unsaved, or `notes` when `notes.md` is loaded), while preserving raw extensions for `previewService.shouldOpenInPreview()`.
5. **Markdown, Image & Clipboard Subsystem**:
   - **Lossless Instant Toggle (`Ctrl+M`)**: Seamless toggle between raw markdown editing and rendered preview. Edit mode is strictly plain text (`editorEl.innerText`). Switching between Edit and Preview is 100% lossless and idempotent (never scrape or mutate DOM).
   - **In-Memory Image Optimization**: Pasted clipboard images (>500 KB) are automatically downscaled (1920px max) and compressed to WebP (0.82 quality) in memory via `imageOptimizer.ts`. Small clips (<=500 KB) and animated GIFs (`image/gif`) bypass recompression to preserve 1:1 pixel sharpness and animation frames.
   - **Safety Cutoff**: Images exceeding 15 MB trigger a frosted glass warning dialog (`GlassDialog.ts`) rather than crashing or freezing the WebView.
   - **Collapsible Base64 Pills**: In Edit mode, long Base64 data URIs are folded into interactive `[ 📷 WEBP ~245 KB ▾ ]` frosted glass pill badges (`base64Fold.ts`). Clicking toggles between compact badge and expanded view; `serializeEditorContent` ensures full fidelity on Save and Preview.
   - **Android Clipboard & Gboard Commit Content API**:
     - `RustWebView.kt` is patched automatically during Gradle builds via `applyRustWebViewPatch()` in `src-tauri/gen/android/app/build.gradle.kts` (wired to `rustBuild*.doLast` and `compile*Kotlin.doFirst`) to override `onCreateInputConnection` with `EditorInfoCompat.setContentMimeTypes` (`image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`, `image/*`) and `InputConnectionCompat.createWrapper`.
     - Committed keyboard images/stickers/GIFs are Base64-encoded and injected via `window.__cathet_insert_committed_base64` (with `FileHelper.setPendingCommitImage` + `get_pending_commit_image` IPC fallback) into `setupKeyboardCommitListener` and `insertHtmlAtCaretOrEnd` (`editorPasteHandler.ts`).
     - System clipboard images on Android are read via `read_clipboard_image` (`android_fs.rs` -> `FileHelper.kt` -> `editorClipboard.ts`).
   - **Local Asset Streaming & Safe HTML Sanitization**: Support web (`https://`), absolute (`C:/...`), and relative (`./...`) image links in Preview mode using `imagePathResolver.ts` and Tauri v2's `convertFileSrc`. Permitted GFM HTML blocks (`<div>`, `<p>`, `<img>`, `<details>`, `<summary>`) are sanitized via native `DOMParser` (`markdownSanitizer.ts`) to prevent XSS.
6. **Dual-Pane Mode (`Ctrl+D`) & Scroll Synchronization**:
   - **Responsive Split Layout**: Horizontal side-by-side split on Desktop and vertical stacked split (`43%` top / `57%` bottom initial ratio with dock clearance) on Android (`DualPaneView.ts`, `DualPaneHeader.ts`, `DualPaneSplitter.ts`, `DualPaneEmptyDropzone.ts`, `dualpane.css`).
   - **3-State Scroll Sync**: Proportional bidirectional scroll synchronization (`scrollSync.ts`, `syncScrollController.ts`) cycling through 3 states on mobile dock / desktop splitter badge: `Locked Standard` (proportional offset lock), `Snap Scroll Locked` (1:1 alignment), and `Paused` (independent scrolling).
   - **Android Dual-Pane Persistence**: Opening external files or creating new documents in either pane automatically saves and links them to local Home notes (`notes/<id>`), with `autoSaveRightPane()` persisting right-pane edits on close, back navigation, document switch, or app blur.
7. **Android Notes Homepage, High Refresh Rate & 120fps HyperOS Motion**:
   - **Notes Dashboard**: Dedicated Android homepage (`commands/notes.rs`, `notesService.ts`, `homeCoordinator.ts`, `HomeView.ts`, `HomeHeader.ts`, `HomeCategoryTabs.ts`, `HomeNoteGrid.ts`, `HomeSelectionBar.ts`, `HomeFab.ts`, `FolderModal.ts`, `RenameModal.ts`) supporting instant CRUD, folder categorization, search filtering, multi-select pin/hide/move/delete, and single-item rename.
   - **120Hz+ Display Unlock**: `MainActivity.kt` unlocks the maximum supported hardware display refresh rate (120Hz/144Hz/165Hz) on startup.
   - **True `#workspace-shell` Container Morph**: Tapping a note tile immediately adopts the editor/preview background color (`#0f1117` dark / `#f8fafc` light) and scales/clips `#workspace-shell` (`#topbar-container` + `#editor-container`) over 380ms (`cubic-bezier(0.2, 0, 0, 1)`) with zero opacity fade (`opacity: 1` solid throughout) and `.is-animating-transform` scrollbar suppression (`containerTransform.ts`). Navigating back executes a 380ms Xiaomi HyperOS dual-layer collapse into the target card slot (or circular `#home-fab-main` `+` button for new/external notes).
   - **Hardware Circular Theme Reveal**: Theme switching (`themeTransition.ts`) uses `document.startViewTransition` with `clipPath: circle(...)` (420ms) across both Desktop and Android. Never bypass or disable `startViewTransition` on mobile.
8. **Settings, Themes, Frosted Glass Menus & Auto-Updater**:
   - **Desktop Settings Window & Mobile Settings Sheet**: Desktop opens a dedicated native frosted glass `settings.html` window (`SettingsTabs.ts`, `SettingsPane.ts`, `AboutPane.ts`, `FontSelect.ts`); Android pre-mounts a 120fps slide-up bottom sheet (`SettingsModal.ts`, `MobileSettingsView.ts`) with solid opaque surface and GPU-composited backdrop scrim.
   - **Frosted Glass Dropdowns Standard**: All dropdowns, context menus, and select popups (`PopupMenu.ts`, `ContextMenu.ts`, `FontSelect.ts`, `MobileMenuDrawer.ts`) must use custom glassmorphism components. Native OS `<select>` elements are strictly prohibited.
   - **CSS Scrollability Guardrail**: Whenever making flex containers or child panes scrollable in CSS, always set `min-height: 0` and `overflow: hidden` on intermediate flex ancestors so `scrollHeight > clientHeight` is preserved.
   - **GitHub Auto-Updater**: Checks `https://api.github.com/repos/Crlyzd/Cathet/releases/latest`, differentiates `x64` vs `arm64`, downloads to temporary staging, and invokes `--replace-old "<target>"` (`updater.rs`).
9. **Unified Single-Script Automation (`build.ps1`) & Non-Blocking Verification**:
   - `build.ps1` in the project root is the single, authoritative automation pipeline for Desktop Live Dev (`-Live`/`-Dev`), Verification (`-Check`), SemVer bumping (`-Patch`/`-Minor`/`-Major`/`-TargetVersion`), Windows releases (`-Build`, `-BuildX64`, `-BuildArm64`, `-All`), Android Live Dev (`-AndroidDev` with ADB reverse port forwarding and debug/release signature checks), and Android APK release builds (`-AndroidBuild`).
   - Proliferating auxiliary `.ps1` or `.bat` runner scripts is strictly prohibited.
   - All compiled release binaries are placed into `release/`: `release/cathet-v<version>-x64.exe`, `release/cathet-v<version>-arm64.exe`, `release/cathet-v<version>-<arch>-fast.exe`, and `release/cathet-v<version>-android.apk`.
   - **Agent Verification Guardrail**: When verifying code changes during agent turns, run fast synchronous checks (`npx tsc --noEmit` and `cargo check --manifest-path src-tauri/Cargo.toml`) with sufficient `WaitMsBeforeAsync` (5000–10000ms). Never leave background tasks hanging in `RUNNING` state, as they block the Antigravity user input queue.
10. **Modular Project Layout Inventory**:
    - **Main Window (`index.html`)**: Mounted by `src-ui/src/main.ts` inside `#workspace-shell` (`#topbar-container` + `#editor-container`).
    - **Desktop Settings Window (`settings.html`)**: Mounted by `src-ui/src/settingsMain.ts`.
    - **UI Components (`src-ui/src/components/`)**:
      - Core & Mobile: `ContextMenu.ts`, `DropOverlay.ts`, `Editor.ts`, `GlassDialog.ts`, `MobileActionBar.ts`, `MobileMenuDrawer.ts`, `MobileSettingsView.ts`, `PopupMenu.ts`, `SettingsMenu.ts`, `SettingsModal.ts`, `SettingsTabs.ts`, `TopBar.ts`.
      - Dual-Pane (`components/dualpane/`): `DualPaneEmptyDropzone.ts`, `DualPaneHeader.ts`, `DualPaneSplitter.ts`, `DualPaneView.ts`.
      - Android Home (`components/home/`): `FolderModal.ts`, `HomeCategoryTabs.ts`, `HomeFab.ts`, `HomeHeader.ts`, `HomeNoteGrid.ts`, `HomeSelectionBar.ts`, `HomeView.ts`, `RenameModal.ts`.
      - Settings Subpanes (`components/settings/`): `AboutPane.ts`, `FontSelect.ts`, `SettingsPane.ts`.
    - **Modular Services (`src-ui/src/services/`)**: `associationService.ts`, `dragDropService.ts`, `dualPaneService.ts`, `fileService.ts`, `fontService.ts`, `homeCoordinator.ts`, `mobileCoordinator.ts`, `notesService.ts`, `platformService.ts`, `previewService.ts`, `themeService.ts`, `updateService.ts`, `windowService.ts`.
    - **Modular Utilities (`src-ui/src/utils/`)**: `base64Fold.ts`, `brokenImageFallback.ts`, `containerTransform.ts`, `contextMenuItems.ts`, `editorClipboard.ts`, `editorPasteHandler.ts`, `eventBus.ts`, `heartSprout.ts`, `htmlToMarkdown.ts`, `imageOptimizer.ts`, `imagePathResolver.ts`, `mainMenuItems.ts`, `markdown.ts`, `markdownSanitizer.ts`, `monochromeIcons.ts`, `pathUtils.ts`, `scrollSync.ts`, `shortcuts.ts`, `syncScrollController.ts`, `themeTransition.ts`, `touchGesture.ts`, `touchZoomHandler.ts`, `windowSync.ts`.
    - **Modular Backend (`src-tauri/src/`)**: `lib.rs`, `main.rs`, `state.rs`, `encoding.rs`, and `commands/` (`android_fs.rs`, `association.rs`, `file.rs`, `memory.rs`, `migration.rs`, `notes.rs`, `updater.rs`, `vibrancy.rs`, `window.rs`), plus Android Kotlin sources in `src-tauri/gen/android/app/src/main/java/com/cathet/app/` (`MainActivity.kt`, `FileHelper.kt`, `generated/RustWebView.kt`).
11. **Release Notes Standard**:
    - **Storage Location**: NEVER write release notes inside the project repository folder. ALWAYS write them to a dedicated markdown artifact in the conversation artifacts directory (`<appDataDir>\brain\<conversation-id>\...`).
    - **Styling Restrictions**: NEVER use `>` blockquote formatting and NEVER use emojis anywhere in release notes.
    - **Scope Isolation**: Strictly isolate changes to the exact git diff between the immediate prior release tag and the target tag (`git log <prev-tag>..<target-tag>`). Never include changes covered in previous release notes.
    - **Tone & Format**: Use objective, professional technical language without hype or download links. Mandatory sections: Title, Target of the change / release note, Summary of the change, Detailed breakdown (what changed, why, bug fixes, technical details, and git commits covered).
12. **Architect Plan Artifact Standard**:
    - When operating as `/architect` (or generating architectural plans and change strategies), full detailed step-by-step plans must ALWAYS be written to a dedicated artifact file in `<appDataDir>\brain\<conversation-id>\implementation_plan.md` using `write_file` with `ArtifactMetadata` (`RequestFeedback: true`, `UserFacing: true`, `Summary`) rather than dumped into the chat window. Chat responses must remain concise, summarizing core findings and linking directly to the artifact.
13. **Project History & Mistake Prevention Log (`history.md`)**:
    - `history.md` in the project root is the authoritative project changelog and institutional memory.
    - **Code Change Logging**: Every time agents modify code, agents MUST append an entry to `history.md` summarizing the gist of what changed and the affected files.
    - **Mistake Logging**: Whenever an agent makes a mistake or receives user corrective feedback (e.g., *"don't do this"*, *"this isn't what I expected"*, *"it still doesn't work"*), the agent MUST immediately log it in `history.md` tagged as `[Mistake]` with Context, User Correction, Root Cause, and Corrective Guardrail.
    - **Mandatory Pre-Planning Check**: Every time agents formulate an implementation plan (`/architect`, `/orchestrator`, or ad-hoc planning), agents MUST read `history.md` first to avoid repeating past pitfalls.
14. **Grouped & Staged Git Commits Standard**:
    - When the user asks for commit messages or to commit changes:
      1. Inspect modified and untracked files using `git status` and `git diff`.
      2. Categorize and group files by logical subsystem (e.g., UI components, backend commands, Android native/build, services/utils, docs/rules).
      3. Stage each group independently using `git add <files>`.
      4. Compose a structured commit message for each group with granular bullet points per file (`- adjust UI ...`) followed by a broader summary line describing the batch intent.
      5. Execute `git commit` directly via tool call so the user does not have to run it manually.

---

## 2. Seamless Persona Switching & Antigravity 2.0 Skills

The assistant operates as a collaborative pair programmer supporting both slash-command invocation (`/architect`, `/orchestrator`, `/coding-specialist`, `/code-reviewer`) and automatic semantic skill activation:

- **[orchestrator](file:///d:/Cathet/.agents/skills/orchestrator/SKILL.md)** (`/orchestrator`): Strategic workflow manager. Decomposes complex tasks, coordinates specialist skills or Antigravity 2.0 subagents (`invoke_subagent`), tracks progress, and synthesizes results.
- **[architect](file:///d:/Cathet/.agents/skills/architect/SKILL.md)** (`/architect`): Senior software architect. Audits `history.md` and live code, designs modular (<250 lines/file) solutions, and publishes interactive plans to conversation artifacts.
- **[coding-specialist](file:///d:/Cathet/.agents/skills/coding-specialist/SKILL.md)** (`/coding-specialist`): Senior software engineer. Implements clean, modular TypeScript, Rust, CSS, and Kotlin code, verifies with fast synchronous checks, updates `history.md`, and executes grouped git commits.
- **[code-reviewer](file:///d:/Cathet/.agents/skills/code-reviewer/SKILL.md)** (`/code-reviewer`): Meticulous code auditor. Reviews line counts (<250 lines), Rust FFI / Windows DWM / Android JNI safety, Gradle `rustBuild*` hook persistence, 120fps WebView motion invariants, and XSS sanitization.
