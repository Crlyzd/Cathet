# Cathet — Project History & Institutional Memory

This document serves as the living project documentation and institutional memory for **Cathet**.

### Mandatory Agent Rules for `history.md`
1. **Log Every Code Change**: Every time an agent modifies, adds, or refactors code, append an entry to the [Project Changes Log](#project-changes-log) summarizing the gist of the change and affected files.
2. **Log Every Mistake / User Correction**: When an agent makes a mistake, violates an expectation, or receives negative user feedback (e.g. *"don't do this"*, *"this isn't what I expected"*), the agent MUST immediately append an entry to [Mistakes & Guardrails](#mistakes--guardrails-mistake) tagged as `[Mistake]`.
3. **Mandatory Pre-Planning Check**: Every time an agent prepares an implementation plan (under `/architect`, `/orchestrator`, or ad-hoc planning), the agent **must check this document first** to adhere to past lessons and avoid known mistakes.

---

## Mistakes & Guardrails [Mistake]

### [Mistake] 2026-11-13: Missing `public/app-icon.png` Update During App Icon Refresh
- **Guardrail**: `SettingsTabs.ts`, `AboutPane.ts`, and `MobileSettingsView.ts` reference `/app-icon.png` served from `public/app-icon.png`. Whenever updating the app icon, search for `*app-icon*` and update both `src-ui/src/assets/app-icon.png` and `public/app-icon.png`.

### [Mistake] 2026-11-12: Top-Level `:root,` Selector in Shared CSS Painting Over Windows Acrylic
- **Guardrail**: Never use top-level `:root,` selectors in component/mobile stylesheets (e.g., `home.css` is statically loaded by `index.html`). Always use compound/descendant selectors (`.vault-cylinder, [data-theme="dark"] .vault-cylinder`), and keep global root styling confined to `main.css`. Never blame OS builds before bisecting `git diff`.

### [Mistake] 2026-11-12: `<input type="range">` `flex: 1` Pushing Slider Badge Off-Screen
- **Guardrail**: Never use `flex: 1` on `<input type="range">` without `min-width: 0` (Chromium enforces ~129px intrinsic min-width). Use deterministic widths: `.glass-range-slider` (`width: 85px; min-width: 0; flex: none`), `.slider-val-badge` (`width: 36px; min-width: 36px; flex: none`), `.slider-control-wrap` (`gap: 6px; width: auto; flex-shrink: 0`).

### [Mistake] 2026-11-12: Full Component Re-Render on Continuous Updates & Theme-Unscoped Solid Colors
- **Guardrail**:
  1. Never inject ambient state into `SettingsTabs.updateState(partial)` or round-trip `updateState()` back into an active dragging slider during `input`. Guard in-place DOM updates by property rather than `Object.keys(partial).length === 1`.
  2. Scope solid canvas colors per theme (`cathet_solid_color_dark` vs `cathet_solid_color_light`) so theme switching never inverts contrast.
  3. Enforce explicit solid backgrounds for `solid` mode and 50% translucent + 16px blur readability guardrails on `.settings-window` in `transparent` mode. Verify i18n keys against `src-ui/src/locales/en.json`.

### [Mistake] 2026-11-12: Checking `if (this.mobileCoord)` Instead of `isMobile()`
- **Guardrail**: `MobileCoordinator` is instantiated on all platforms. Always gate mobile-only paths with `this.mobileCoord?.isMobile()` or `PlatformService.getInstance().isMobile()` so desktop features (like `DesktopSearchBar`) are not bypassed.

### [Mistake] 2026-11-11: Premature Coding in `/architect` Mode & Assuming Scrollable Page Was Clipped
- **Guardrail**: Never modify source files while in `/architect` mode or treat conversational agreement (*"sounds good"*) as implementation approval. Always write the plan to `<appDataDir>\brain\<conversation-id>\implementation_plan.md` (`RequestFeedback: true`), state the platform breakdown (Desktop vs Android), and wait for explicit authorization. Preserve the compact `350x318` scrollable Windows Settings window dimensions.

### [Mistake] 2026-11-11: Confabulating Greek Etymology for Cathet
- **Guardrail**: **Cathet** comes from Javanese *cathet* (ꦕꦛꦼꦠ꧀, `/tʃaˈʈət/`), meaning "to note down" or "to record" (Indonesian cognate: *catat*). Never fabricate Western/Greek etymologies.

### [Mistake] 2026-11-09: Globally Expanding Settings Window to `360x470` for Linux
- **Guardrail**: Never alter Windows desktop window dimensions (`350.0 x 318.0`). Scope Linux-specific GTK sizing strictly to `#[cfg(target_os = "linux")]` or `body.is-linux`.

### [Mistake] 2026-11-09: SVG Dial Ring Phase Drift & Linux `main.css` Theme Override
- **Guardrail**:
  1. For 4-quadrant symmetric SVG dial rings, use normalized `pathLength="360"` with a 90° repeating `stroke-dasharray` + `stroke-dashoffset` so cardinal ticks align mathematically across quadrants.
  2. When one window is opaque and another is transparent on Linux, trace CSS custom property inheritance (`#app[data-theme]` overriding `body.is-linux`).

### [Mistake] 2026-11-09: WSL Linux Bundle Selecting Stale Cached Artifacts (`build.ps1`)
- **Guardrail**: Always purge `/root/.cache/cathet-target/release/bundle/<format>` before `tauri build` in WSL and select artifacts by modification time (`ls -t ... | head -n 1`), never alphabetical glob `${artifacts[0]}`.

### [Mistake] 2026-11-09: Using `window.find()` or Artificial Selection/Scroll Locks on Android
- **Guardrail**:
  1. Never use `window.find()` (it mutates window selection, dismissing Android IME and failing to scroll `.editor-wrapper`). Use `domSearch.ts` + CSS Custom Highlight API (`CSS.highlights`) and scroll `.editor-wrapper` directly with `preventDefault()` on `pointerdown`/`mousedown` for nav buttons.
  2. Never implement synthetic selection scroll guards, RAF autoscroll tickers, or caret clamping on Android; let Android WebView handle selection and scrolling natively.

### [Mistake] 2026-11-07: Staging Auto-Generated `linux-schema.json` & PowerShell/WSL Bridge Pitfalls
- **Guardrail**:
  1. Never stage auto-generated `src-tauri/gen/schemas/linux-schema.json` (ignored via `.gitignore`).
  2. In `build.ps1`: pipe `wsl.exe` output to `| Out-Host` to prevent PowerShell pipeline pollution; pass multiline bash scripts via UTF-8 Base64 (`Invoke-WslBashScript`) instead of raw `bash -lc` strings; never use `\"` inside PowerShell `"..."` strings (use single-quoted here-strings `@' ... '@` and validate with `System.Management.Automation.Language.Parser::ParseFile`); check `wsl.exe --list --quiet` rather than `Get-Command wsl`.

### [Mistake] 2026-11-04: Dynamic Context Menu Web Search Text
- **Guardrail**: Keep web search context menu action strictly static localized text (`t("context.searchWeb")`) with no query interpolation.

### [Mistake] 2026-11-01: Gradle `rustBuild*` Overwriting `RustWebView.kt`, Fake Tile Overlays & Disabling `startViewTransition`
- **Guardrail**:
  1. Attach `applyRustWebViewPatch()` to `rustBuild*.doLast` and `compile*Kotlin.doFirst` (with `mustRunAfter(rustTasks)`), never `preBuild` alone.
  2. Never build a fake ghost overlay for tile expansion/collapse (`opacity: 1` solid throughout; morph the real `#workspace-shell` via `transform` + `clip-path`).
  3. Never disable `document.startViewTransition` circular `clip-path` reveal on mobile Android.

### [Mistake] 2026-10-17 / 2026-10-29: Workflow, CSS Flex Scroll, Git Commits & Release Notes
- **Guardrail**:
  1. **CSS Scrollability**: Always set `min-height: 0` and `overflow: hidden` on intermediate flex ancestors so scrollable children preserve `scrollHeight > clientHeight`.
  2. **Background Tasks**: Run fast synchronous checks (`npx tsc --noEmit`, `cargo check`) with `WaitMsBeforeAsync` 5000–10000ms; never leave background tasks hanging in `RUNNING` state.
  3. **Grouped Commits & Release Notes**: Follow `AGENTS.md` Rules 11 & 14 (grouped `git add` + direct `git commit`; delta-only release notes in conversation artifacts with no `>`, no emojis in Detailed Changes, and no download links).

---

## Project Changes Log

### 2026-11-15: Support `D:\BuildTools\Android\.android\avd` Shared Emulator in `build.ps1`
- **Summary**: Configured `build.ps1` to default `ANDROID_USER_HOME` (`D:\BuildTools\Android\.android`) and `ANDROID_AVD_HOME` (`D:\BuildTools\Android\.android\avd`) when `D:\BuildTools\Android` is present, and updated the AVD stale `*.lock` cleanup path to resolve `$env:ANDROID_AVD_HOME` / `$env:ANDROID_USER_HOME` instead of hardcoded `%USERPROFILE%\.android\avd`.
- **Affected Files**: `build.ps1`, `history.md`

### 2026-11-15: Ignore Auto-Generated `RustWebView.kt` in `.gitignore`
- **Summary**: Added `**/gen/android/**/generated/RustWebView.kt` to `.gitignore` and untracked the Gradle-regenerated file from Git (`git rm --cached`) so `applyRustWebViewPatch()` build runs never leave noisy diffs.
- **Affected Files**: `.gitignore`, `history.md`

### 2026-11-14: Enable Side-by-Side Dual Pane on Android in Landscape
- **Summary**: Added keyboard-safe `body.is-landscape` detection (`winW > maxInnerHeight && winW >= 480`) and `cathet:orientation-change` dispatch to `KeyboardTracker`, reset inline `leftPaneEl.style.flex` on orientation change in `DualPaneView`, added `body.is-mobile.is-landscape` side-by-side Dual Pane, vertical `col-resize` splitter, and compact unclipped empty-dropzone styles in `mobile.css`, and scoped mobile bottom-slide animations to `body.is-mobile:not(.is-landscape)` in `dualpane.css`.
- **Affected Files**: `src-ui/src/utils/keyboardTracker.ts` (95 lines), `src-ui/src/components/dualpane/DualPaneView.ts` (226 lines), `src-ui/styles/mobile.css`, `src-ui/styles/dualpane.css`, `history.md`

### 2026-11-14: Fix `EditorHistory` Caret Offset Drift Across `contenteditable` `<div>`/`<br>` Lines
- **Summary**: Fixed `getCaretOffset()` in `src-ui/src/utils/editorHistory.ts` (247 lines) to walk `<div>`/`<p>`/`<br>`/`b64-pill-container` nodes instead of `Range.toString().length` (which stripped `<div>`/`<br>` newlines and caused caret restoration after Undo to jump onto earlier lines), and increased typing coalesce debounce from 350ms to 500ms.
- **Affected Files**: `src-ui/src/utils/editorHistory.ts`, `history.md`

### 2026-11-14: Fix Broken Undo/Redo with Lossless `EditorHistory` Stack & Mobile Dot Menu Actions
- **Summary**: Replaced fragile native `document.execCommand("undo" | "redo")` with a dedicated snapshot-based `EditorHistory` (`src-ui/src/utils/editorHistory.ts`, 216 lines) that survives `Ctrl+M` Markdown Preview toggles, Base64 image pastes (`insertHtmlAtCaretOrEnd`), formatting actions, and focus transfers. Updated `Editor.ts` (`canUndo`/`canRedo`), `contextMenuItems.ts` (disabled state gating), `shortcuts.ts` (`Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` with `INPUT`/`TEXTAREA` guard), and added Undo/Redo to the Android dot menu (`MobileMenuDrawer.ts`, `mobileCoordinator.ts`, `main.ts`).
- **Affected Files**: `src-ui/src/utils/editorHistory.ts`, `src-ui/src/components/Editor.ts`, `src-ui/src/utils/contextMenuItems.ts`, `src-ui/src/utils/shortcuts.ts`, `src-ui/src/components/MobileMenuDrawer.ts`, `src-ui/src/services/mobileCoordinator.ts`, `src-ui/src/main.ts`, `history.md`

### 2026-11-14: Update `AGENTS.md`, `tutorial.md`, and `README.md` with Floating Toolbar & Markdown Superpowers
- **Summary**: Updated `AGENTS.md` (Rule 5 & Rule 10) with `FloatingFormatBar.ts`, `formatBarService.ts`, and `formatToolbarItems.ts`; added `Ctrl + /` (`Format Toolbar`) to `src-ui/src/assets/tutorial.md`; added a `Markdown Superpowers (Zero-Bloat, 100% Lossless)` showcase section and `SCREENSHOT SPEC #18` (`docs/screenshots/windows-floating-toolbar-markdown.webp`) to `README.md` right after `Why Cathet?`.
- **Affected Files**: `AGENTS.md`, `src-ui/src/assets/tutorial.md`, `README.md`, `history.md`

### 2026-11-14: Add Desktop Floating Markdown Toolbar (`Ctrl+/`, Dot Menu, & Dock Position Settings)
- **Summary**: Added `FloatingFormatBarComponent` (`src-ui/src/components/FloatingFormatBar.ts`, 184 lines) and `FormatBarService` (`src-ui/src/services/formatBarService.ts`, 49 lines) sharing `FORMAT_BUTTONS` via `src-ui/src/utils/formatToolbarItems.ts` (43 lines) with `MobileFormatBar.ts`. Wired `Ctrl+/` in `shortcuts.ts` and `Format Toolbar` in `mainMenuItems.ts` (`⋯` dot menu), added `Top` / `Bottom` / `Left` dock position toggles in `SettingsAccordions.ts` / `SettingsPane.ts` / `settingsMain.ts` with `cathet:format-bar-pos-change` live sync (`windowSync.ts`), added a 5-type frosted-glass Alert popover + YAML Frontmatter button, auto-hide in Markdown Preview mode, single shared `L`/`R` active-pane routing in Dual-Pane mode, and non-occluding workspace insets (`src-ui/styles/formatbar.css`, `editor.css`, `dualpane.css`, `index.html`) across all 5 locales.
- **Affected Files**: `index.html`, `src-ui/styles/{formatbar.css,editor.css,dualpane.css}`, `src-ui/src/{main.ts,settingsMain.ts}`, `src-ui/src/components/{FloatingFormatBar.ts,MobileFormatBar.ts,SettingsTabs.ts,settings/SettingsAccordions.ts,settings/SettingsPane.ts}`, `src-ui/src/services/formatBarService.ts`, `src-ui/src/utils/{formatToolbarItems.ts,mainMenuItems.ts,shortcuts.ts,windowSync.ts}`, `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `history.md`

### 2026-11-14: Advance Caret to New Line After Pasting Image Pills
- **Summary**: Updated `insertHtmlAtCaretOrEnd()` in `src-ui/src/utils/editorPasteHandler.ts` to anchor collapsed selection inside trailing `Text` nodes (`setStart`) rather than at parent container boundaries adjacent to `contenteditable="false"` pills, and updated `processAndInsertImageFile()` to insert a trailing newline via `document.execCommand("insertText", false, "\n")` (with `insertHtmlAtCaretOrEnd` fallback) so pasted/committed images leave the caret on a new line below `![Pasted Image]([...])` on both Desktop and Android.
- **Affected Files**: `src-ui/src/utils/editorPasteHandler.ts (249)`, `history.md`

### 2026-11-14: Fix Nested Task List Indentation in `markdown-ext.css`
- **Summary**: Reset `margin-left: 0` on nested `li.task-list-item` elements inside `ul ul` / `ol ol` / `ul ol` / `ol ul` in `src-ui/styles/markdown-ext.css` so nested task checkboxes indent cleanly by 20–22px per level instead of being cancelled out by `editor.css`'s `-18px` top-level task gutter offset.
- **Affected Files**: `src-ui/styles/markdown-ext.css`, `history.md`

### 2026-11-14: Update `tutorial.md` with Full Tier 2 Markdown & v5.5.0 Feature Coverage
- **Summary**: Expanded `src-ui/src/assets/tutorial.md` to live-demonstrate YAML frontmatter pills, all 5 GitHub Alerts (`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`), indented nested & numbered task lists, nested blockquotes, reference links, autolinks, escaped table pipes, `~sub~`/`^sup^`, `[^1]` footnotes, code block Copy headers, in-document search (`Ctrl+F`/`F3`), Linux Desktop support, Android Private Vault & folder wiggle mode, the 5 active locales, and all 5 desktop backdrop modes.
- **Affected Files**: `src-ui/src/assets/tutorial.md`, `history.md`

### 2026-11-14: Tier 2 Extended Markdown & Modern GFM Upgrade
- **Summary**: Upgraded Cathet's zero-dependency Markdown pipeline cleanly without altering Base64 pills (`base64Fold.ts`), inline `<svg>` rendering, local/web image resolution, broken-image glass cards, or task-list toggling. Added GitHub Alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`), indented nested lists/task checkboxes, multi-line & nested blockquotes, fenced code language headers with one-click Copy button, `~~~` fences, display math (`$$...$$`), GFM footnotes (`[^1]`) with smooth anchor jumping, reference links (`[text][id]`), autolinks, `~sub~`/`^sup^`/`***bold-italic***`, backslash character escapes, escaped table pipe protection (`\|`), Setext headings, YAML frontmatter badge rendering + Android `notes.rs` title extraction, clipboard `sub`/`sup`/code-language paste conversion (`htmlToMarkdown.ts`), and Offline Guide showcase (`tutorial.md`).
- **Affected Files**: `src-ui/src/utils/{markdown.ts (243), markdownBlocks.ts (196), markdownInline.ts (187), markdownTable.ts (109), markdownSanitizer.ts (95), taskListHandler.ts (78), htmlToMarkdown.ts (249)}`, `src-ui/styles/markdown-ext.css (190)`, `src-ui/src/assets/tutorial.md (213)`, `src-tauri/src/commands/notes.rs (250)`, `index.html (39)`, `AGENTS.md`, `history.md`

### 2026-11-14: Convert `docs/show/` Showcase Videos to Animated WebP & Apply to `README.md`
- **Summary**: Converted 12 `.mp4` screen recordings from `docs/show/` into looping animated `.webp` assets (`15 fps`, `libwebp` `q:v 75`, max `960px` desktop / `540px` mobile width) in `docs/screenshots/` via `ffmpeg`, copied/normalized 4 static showcase images (`hero-crossplatform-showcase.jpg`, `android-home-dashboard.jpg`, `linux-kde-translucent-blur.png`, `windows-context-menu-glass.png`), removed the 14 superseded `.png` placeholders, and updated all `<img>` tags, spec comments, and inventory table entries in `README.md`.
- **Affected Files**: `README.md`, `docs/screenshots/*` (16 updated assets), `history.md`

### 2026-11-14: Tier 2 Markdown Context Menu, `Ctrl+Alt` Shortcuts & Mobile Format Bar
- **Summary**: Added Tier 2 Extended Markdown formatting actions (`subscript`, `superscript`, `displayMath`, `footnote` with auto-numbering `[^N]` + `\n\n[^N]: ` bottom append, `details`, `frontmatter`, and 5 `alert*` callouts) via table-driven `BLOCK_SNIPPETS` and `insertAutoFootnote` in `formatUtils.ts`; wired `Ctrl+Alt+S/P/M/A/F/D/Y` in `shortcuts.ts`; added nested **Alert / Callout** submenu and Tier 2 entries to Desktop Right-Click `Format` menu (`contextMenuItems.ts`) and Android `Aa` ribbon (`MobileFormatBar.ts`); documented shortcuts in `tutorial.md` and localized 12 new `context.*` keys across all 5 locales.
- **Affected Files**: `src-ui/src/utils/formatUtils.ts` (~239 lines), `src-ui/src/utils/shortcuts.ts` (~121 lines), `src-ui/src/utils/contextMenuItems.ts` (~166 lines), `src-ui/src/components/MobileFormatBar.ts` (~106 lines), `src-ui/src/assets/tutorial.md` (~181 lines), `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`

### 2026-11-13: Upgrade README Screenshot Placeholders with Visual Blueprint Cards
- **Summary**: Upgraded all 17 blank black screenshot placeholders (`docs/screenshots/*.png`) into high-contrast, informative visual blueprint cards. Each card clearly displays its Spec Number (`📸 SCREENSHOT SPEC #01` to `#17`), target asset filename in bold monospace, platform badge (Windows 11, Linux Desktop, or Android Mobile), view description subtitle, and exact aspect ratio dimensions (960×540 for 16:9 landscape, 540×1170 for 9:19.5 portrait).
- **Affected Files**: `docs/screenshots/*` (17 files), `history.md`

### 2026-11-13: Sync `AGENTS.md` and `.agents/skills/` to Cathet v5.5.0
- **Summary**: Updated `AGENTS.md` (intro, `build.ps1` Linux packaging, Rule 10 module inventory, relative skill links) and `.agents/skills/{architect,orchestrator,coding-specialist,code-reviewer}/SKILL.md` from v5.1.0 to v5.5.0 to reflect Linux Desktop support, Private Vault/Biometrics (`biometric.rs`, `VaultLockHud.ts`), 5-locale i18n (`locales/*.json`, `i18nService.ts`), `CSS.highlights` search (`domSearch.ts`), and `isMobile()` gating.
- **Affected Files**: `AGENTS.md`, `.agents/skills/architect/SKILL.md`, `.agents/skills/orchestrator/SKILL.md`, `.agents/skills/coding-specialist/SKILL.md`, `.agents/skills/code-reviewer/SKILL.md`

### 2026-11-13: Bump Version to 5.5.0
- **Summary**: Bumped Cathet version from `5.4.1` to `5.5.0` via `.\build.ps1 -TargetVersion 5.5.0 -NoPause` and synchronized `Cargo.lock`.
- **Affected Files**: `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`

### 2026-11-13: Android About Author Row + Spammable Heart & Folder Rename Modal Backdrop Fix
- **Summary**: Added `Made with ♥ by Kaleksanan Bagus` author row with `attachHeartSprout` to Android Settings (`MobileSettingsView.ts`, `mobile.css`); fixed `RenameModal.ts` and `FolderModal.ts` immediately dismissing on synthesized `click` after long-press via `backdropPointerDown` guard.
- **Affected Files**: `src-ui/src/components/MobileSettingsView.ts`, `src-ui/styles/mobile.css`, `src-ui/src/components/home/RenameModal.ts`, `src-ui/src/components/home/FolderModal.ts`

### 2026-11-13: Prevent "Hidden" Public Folder Creation & Add iOS-Style Folder Wiggle Delete + Rename Mode
- **Summary**: Updated `save_note`/`list_notes` in `notes.rs` so private mode uses `is_hidden = true` at root (auto-migrating legacy `notes/Hidden`); added `delete_folder` and `rename_folder` commands (`notes.rs`, `notesService.ts`); added long-press wiggle edit mode with delete badge and `RenameModalComponent` (`HomeCategoryTabs.ts`, `home.css`).
- **Affected Files**: `src-tauri/src/commands/notes.rs`, `src-tauri/src/lib.rs`, `src-ui/src/services/notesService.ts`, `src-ui/src/components/home/HomeCategoryTabs.ts`, `src-ui/src/components/home/RenameModal.ts`, `src-ui/src/components/home/HomeView.ts`, `src-ui/styles/home.css`

### 2026-11-13: App Icon Refresh (Concept 3 — Dual-Pane Markdown)
- **Summary**: Replaced app icons across Windows (`.ico`), Android (`mipmap-*`), Linux PNGs, `src-ui/src/assets/app-icon.png`, and `public/app-icon.png` with Concept 3 Dual-Pane Markdown icon.
- **Affected Files**: `src-tauri/icons/*`, `src-tauri/gen/android/app/src/main/res/mipmap-*`, `src-ui/src/assets/app-icon.png`, `public/app-icon.png`

### 2026-11-12: Windows Acrylic Fix, Maximized Dual-Pane Guard, Cyber Iris Vault HUD & Settings Polish
- **Summary**:
  - Removed accidental `:root,` selector in `home.css` that occluded Windows DWM Acrylic on `index.html`.
  - Added deferred `target_min_size` / `was_maximized` tracking (`state.rs`, `window.rs`, `lib.rs`) so toggling Dual Pane preserves maximized/fullscreen desktop windows.
  - Redesigned `VaultLockHud.ts` with a 4-blade Cyber Iris Aperture (`viewBox="0 0 100 100"`) and theme-calibrated styling (`home.css`).
  - Trapped `Escape` in `DesktopSearchBar.ts` and `MobileSearchBar.ts` so dismissing search never triggers `onQuit()` (`main.ts`, `MobileActionBar.ts`, `mobileCoordinator.ts`).
  - Polished desktop Settings (`SettingsPane.ts`, `SettingsAccordions.ts`, `SettingsTabs.ts`, `settingsMain.ts`, `backdropService.ts`, `GlassColorPicker.ts`, `SolidColorPicker.ts`, `BackdropSelect.ts`, `FontSelect.ts`, `LanguageSelect.ts`, `sliderWheel.ts`, `vibrancy.rs`, `settings.css`, `dualpane.css`): smooth slider drag without re-renders, mouse-wheel hover support, 50% opacity default, deterministic 127px slider assembly, directional dropup auto-flip, theme-scoped solid colors (`Match Windows/System Color`), at-least-2-open accordion rule, and dual-pane splitter/scrollbar clearance.
- **Affected Files**: `src-tauri/src/{state.rs,lib.rs,commands/window.rs,commands/vibrancy.rs}`, `src-ui/src/{main.ts,settingsMain.ts}`, `src-ui/src/components/*`, `src-ui/src/services/{backdropService.ts,mobileCoordinator.ts}`, `src-ui/src/utils/sliderWheel.ts`, `src-ui/styles/{home.css,settings.css,dualpane.css,main.css,linux.css}`

### 2026-11-11: Android System Text Selection Actions & Clean Extension-Free Save Filenames
- **Summary**: Removed `user-select` / selection blockers on Android so native OS actions (Translate, Ask Gemini, Web Search) work; stripped extensions when pre-loading filenames in native Save dialogs while keeping extension-free titles in UI headers.
- **Affected Files**: `src-ui/styles/mobile.css`, `src-ui/src/services/fileService.ts`, `src-ui/src/utils/pathUtils.ts`

### 2026-10-17 – 2026-11-09: Historical Milestones (v5.0.0 – v5.4.0)
- **v5.0.0 (2026-10-17 – 2026-10-18)**: Dual-Pane Mode (`Ctrl+D`) with 3-state proportional/snap/paused bidirectional scroll sync, empty dropzones, and Windows 200x300 / 350x350 layout constraints.
- **v5.1.0 – v5.2.0 (2026-10-29 – 2026-11-04)**: Android port (SAF file access, Gboard `CommitContent` image paste via Gradle `rustBuild*` `RustWebView.kt` patch, `120Hz+` display unlock, Notes Homepage with folders/multi-select, `#workspace-shell` 380ms HyperOS container morph, mobile bottom dock & settings sheet, universal markdown formatting submenus, native SVG text rendering, and `build.ps1` Android automation).
- **v5.3.0 – v5.4.0 (2026-11-07 – 2026-11-09)**: Linux Desktop support (Fedora `.rpm`, `.deb`, Universal AppImage via WSL Base64 bridge in `build.ps1`), `domSearch.ts` CSS Custom Highlight API search, 2D pull-down-and-turn-right Private Vault access, removal of artificial Android selection/scroll locks, and repository license alignment to GNU GPLv3. (See `git log` for granular commit details.)
- **Build Pipeline Fix (2026-11-13)**: Configured default fallback `SCCACHE_SERVER_PORT = "35422"` in `build.ps1` and `.cargo/config.toml` to prevent Windows socket access permission failures (`os error 10013`) caused by Hyper-V / WSL dynamic port exclusions blocking default port 4226.
- **Linux App Icon Resolution Prioritization (2026-11-13)**: Reordered `bundle.icon` in `src-tauri/tauri.conf.json` so `icons/icon.png` (512×512) and high-DPI assets appear ahead of `32x32.png`. In Tauri v2, `find_icon` on Linux grabs the first `.png` in `bundle.icon` for `default_window_icon`. Recompiled and signed `release/cathet-v5.5.0-x86_64.AppImage`.
