# Cathet — Project History & Institutional Memory

This document serves as the living project documentation and institutional memory for **Cathet**.

### Mandatory Agent Rules for `history.md`
1. **Log Every Code Change**: Every time an agent modifies, adds, or refactors code, append an entry to the [Project Changes Log](#project-changes-log) summarizing the gist of the change and affected files.
2. **Log Every Mistake / User Correction**: When an agent makes a mistake, violates an expectation, or receives negative user feedback (e.g. *"don't do this"*, *"this isn't what I expected"*), the agent MUST immediately append an entry to [Mistakes & Guardrails](#mistakes--guardrails-mistake) tagged as `[Mistake]`.
3. **Mandatory Pre-Planning Check**: Every time an agent prepares an implementation plan (under `/architect`, `/orchestrator`, or ad-hoc planning), the agent **must check this document first** to adhere to past lessons and avoid known mistakes.

---

## Mistakes & Guardrails [Mistake]

### [Mistake] 2026-11-18: Omitting Plain Human-Language "What You Can Expect" Summary in `/architect`
- **Context**: Generated `implementation_plan.md` and chat summaries in `/architect` mode using technical symbol/CSS/pixel explanations without a plain-language summary of the user-facing result.
- **User Correction**: *"urgh, make an edit to the /architect to ALWAYS wrote what I can expect if the plan is implemented, in HUMAN language"*
- **Root Cause**: `.agents/skills/architect/SKILL.md` only asked for technical sections and concise findings without requiring a dedicated user-facing, jargon-free explanation of expected behavior.
- **Guardrail**: In `/architect` mode, ALWAYS include a **"What You Can Expect"** section written in plain, everyday human language (no file paths, symbol names, CSS selectors, or pixel math) in both `implementation_plan.md` and the chat response.

### [Mistake] 2026-11-16: Secondary Windows `.ico` Resource ID `101` Overwriting `.exe` Main Icon (`index 0`)
- **Context**: Added `doc_icon.rc` with `101 ICON "icons/doc-icon.ico"` alongside `tauri_build::build()`.
- **User Correction**: Compiled `cathet-v5.5.3-x64.exe` and `cathet-v5.5.3-arm64.exe` displayed the document icon instead of Cathet's main `M` icon.
- **Root Cause**: `tauri_build` (`tauri-winres`) embeds the main app icon at Win32 `IDI_APPLICATION` (`32512`), not `1`. Windows PE `.rsrc` tables sort numeric IDs in ascending order, so `101` sorted before `32512` and became `index 0` (the `.exe`'s own icon in Explorer).
- **Guardrail**: Any secondary `.ico` embedded into `cathet.exe` via `.rc` MUST use a resource ID strictly greater than `32518` (e.g., `40001`), keeping `32512` first at `index 0`.

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

### 2026-11-20: Desktop Scroll Preview Clearance, Opaque Minimap Surface & Android Zero-Reflow Overlay Scrollbar
- **Summary**: Made `.preview-minimap` 100% opaque (`#242834`/`#181c26`/`#1e222e` dark, `#ffffff`/`#f8fafc`/`#e2e8f0` light) while preserving its smooth top/bottom `mask-image` fade and removing redundant `backdrop-filter` overhead in `src-ui/styles/previewOverlay.css`; added desktop-only (`body:not(.is-mobile)`) right-edge clearance overrides so Single Mode (`right: 20px`) and Dual Pane Mode (Right Pane `18px`, Left Pane `24px` past the `6px` splitter padding + `8px` scrollbar) never crowd or clash with scrollbars while leaving Android positioning untouched. Added a zero-reflow, 120fps GPU-composited overlay scrollbar (`src-ui/src/utils/mobileScrollIndicator.ts`, 109 lines) for Android Single Pane and Dual Pane that keeps native `::-webkit-scrollbar` permanently hidden (zero text reflow during `ContainerTransform` open/close morphs), auto-fades after 900ms of idle, suppresses during `body.is-animating-transform`, and syncs hosts alongside `syncTouchZoomHost` in `Editor.ts` (brought down to 248 lines), `DualPaneView.ts`, `main.ts`, and `src-ui/styles/mobile.css`.
- **Affected Files**: `src-ui/styles/previewOverlay.css`, `src-ui/src/utils/mobileScrollIndicator.ts (108)`, `src-ui/src/components/Editor.ts (248)`, `src-ui/src/components/dualpane/DualPaneView.ts (236)`, `src-ui/src/main.ts (710)`, `src-ui/styles/mobile.css`, `history.md`

### 2026-11-19: Add "Open in Dual Pane" Action for 2 Selected Notes on Home
- **Summary**: Added a conditional **Dual Pane** button (`#home-sel-dual-pane`) to `HomeSelectionBarComponent` (`HomeSelectionBar.ts`, 125 lines) that appears only when exactly 2 notes are selected (`setSelectionCount(count)`), using the monochrome dual-pane icon, `menu.dualPane` label, and `home.openInDualPane` tooltip across all 5 locales, with tightened `.home-sel-label` sizing (`10.5px`) in `src-ui/styles/home.css`. Added `HomeBatchActions.handleOpenDualPane()` (`HomeBatchActions.ts`, 157 lines) to resolve both selected notes in tap order (`ids[0]` -> primary/top, `ids[1]` -> secondary/bottom), exit selection mode cleanly without a competing `history.back()`, and invoke `HomeCoordinator.openDualNotes()` (`homeCoordinator.ts`, 242 lines). Extracted shared `openNoteFlow()`, `launchWithTransform()`, and `pushEditorHistory()` helpers in `HomeCoordinator` (moving `setEditorShellVisible` & `triggerEditorEnterAnimation` to `containerTransformLayers.ts`, 100 lines) to keep all Home modules strictly <= 250 lines, replace the `"selection"` history entry cleanly, launch both notes in `DualPaneView` via `onDualNotesSelectedForEditor` in `main.ts`, and preserve existing right-pane note folder metadata in `autoSaveRightPane()`.
- **Affected Files**: `src-ui/src/components/home/HomeSelectionBar.ts (125)`, `src-ui/src/components/home/HomeBatchActions.ts (157)`, `src-ui/src/components/home/HomeView.ts (249)`, `src-ui/src/services/homeCoordinator.ts (242)`, `src-ui/src/utils/containerTransformLayers.ts (100)`, `src-ui/src/main.ts (703)`, `src-ui/styles/home.css`, `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `history.md`

### 2026-11-18: Add Duplicate Note Button to Home Selection Bar
- **Summary**: Added a **Duplicate** action button (`#home-sel-duplicate`) with a matching monochrome outline SVG icon to `HomeSelectionBar.ts` (116 lines) alongside responsive 6-button flex sizing in `src-ui/styles/home.css` so all 6 actions (`Rename`, `Duplicate`, `Pin`, `Move to`, `Hide`, `Delete`) fit cleanly on narrow Android viewports. Added `duplicate_notes` in `src-tauri/src/commands/notes.rs` (245 lines) and registered it in `src-tauri/src/lib.rs` (165 lines) to clone selected note files in their current folder with collision-free `(Copy)` / `(Copy N)` naming while preserving `is_hidden` (Private Notes) state and resetting `is_pinned` (`false`). Wired `NotesService.duplicateNotes()` (`notesService.ts`, 239 lines), `HomeBatchActions.handleDuplicate()` (`HomeBatchActions.ts`, 142 lines), `HomeView.ts` (247 lines), and `common.duplicate` across all 5 locale files.
- **Affected Files**: `src-tauri/src/commands/notes.rs (245)`, `src-tauri/src/lib.rs (165)`, `src-ui/src/services/notesService.ts (239)`, `src-ui/src/components/home/HomeSelectionBar.ts (116)`, `src-ui/src/components/home/HomeBatchActions.ts (142)`, `src-ui/src/components/home/HomeView.ts (247)`, `src-ui/styles/home.css`, `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `history.md`

### 2026-11-18: Home Folder Tab Sync, Drag-to-Reorder Tabs, Monochrome Icons & Last-Folder Persistence
- **Summary**: Fixed missing Home category-tab synchronization after `Move to` / `Move to → + New Folder` (`HomeView.ts` `onRefresh(syncTabs)` calling `syncFromRegistry()` after `HomeBatchActions.handleMove()`), added custom drag-to-reorder folder tabs in wiggle Edit Mode (`TabDragReorder.ts` with `>10px` threshold matching `bindLongPress` so tap-to-rename stays intact, wired to `HomeCategoryTabs.ts` and persisted via `reorder_folders` in `note_folders.rs`), preserved custom `reg.folders` order in `list_notes` and `rename_folder` (splitting `note_folders.rs` out of `notes.rs` to stay <= 250 lines), sanitized folder names and prevented filename collisions in `move_notes`, persisted/restored the last active Home folder tab via `cathet:home_active_folder` (`NotesService.getLastActiveFolder()` / `setLastActiveFolder()`), and upgraded `FolderModal.ts` with `monochromeIcons.ts` SVG icons (`icons.grid` / `icons.folder`), `moveSubtitle`, `All (No folder)`, disabled `.is-current` rows with a `Current` badge, and `New Folder & Move` / `Create & Move` copy across all 5 locales.
- **Affected Files**: `src-tauri/src/commands/notes.rs (211)`, `src-tauri/src/commands/note_folders.rs (100)`, `src-tauri/src/commands/mod.rs (14)`, `src-tauri/src/lib.rs (164)`, `src-ui/src/services/notesService.ts (228)`, `src-ui/src/components/home/FolderModal.ts (170)`, `src-ui/src/components/home/HomeBatchActions.ts (134)`, `src-ui/src/components/home/HomeView.ts (246)`, `src-ui/src/components/home/HomeCategoryTabs.ts (235)`, `src-ui/src/components/home/TabDragReorder.ts (140)`, `src-ui/styles/home.css`, `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `history.md`

### 2026-11-18: Animate Mobile Action Dock Appearance (`MobileActionBar`)
- **Summary**: Added a GPU-composited HyperOS-style entrance animation (`@keyframes mobilePillIn` in `src-ui/styles/mobile.css`: `opacity: 0 -> 1`, `translate3d(0, 18px, 0) scale(0.76) -> translate3d(0, 0, 0) scale(1)` over `280ms cubic-bezier(0.2, 0, 0, 1)`) triggered via `.is-entering` whenever `MobileActionBarComponent.setVisible(true)` transitions the dock (including its collapsed `...` trigger pill and format pill) from hidden to visible, with `prefers-reduced-motion: reduce` support and clean timer cleanup in `destroy()`. Also completed the missing `@keyframes mobilePillIn` definition already referenced by `.mobile-search-ribbon`, and deduplicated `applyOverlayMode()` and sync-toggle handlers in `MobileActionBar.ts` (250 lines).
- **Affected Files**: `src-ui/src/components/MobileActionBar.ts (250)`, `src-ui/styles/mobile.css`, `history.md`

### 2026-11-18: Fix Android Search Bar Elevation & Edge-to-Edge Top Viewport Clipping
- **Summary**: Fixed Android Edge-to-Edge (`enableEdgeToEdge()` / `targetSdk = 36`) IME behavior where focusing `.mobile-search-field` panned `visualViewport.offsetTop` upward—pushing `#topbar-container` and the top lines of text off the top edge of the screen—while `KeyboardTracker` double-offset `--keyboard-inset` on top of the pan. Extracted `ImeInsetHelper.kt` (119 lines) and wired it into `MainActivity.onWebViewCreate()` (151 lines) to resize `webView`'s `bottomMargin` frame-by-frame with `WindowInsetsAnimationCompat.Callback` + `OnApplyWindowInsetsListener`, strip `ime()` and bottom `navigationBars()`/`tappableElement()` insets when the keyboard is open, and notify JS via `__cathet_on_ime_inset(imeDp, true)`. Updated `KeyboardTracker` (99 lines) to avoid double-offsetting when natively resized (and subtract `vv.offsetTop` in fallback mode), added `focus({ preventScroll: true })` in `MobileSearchBar.ts` (184 lines), guarded `this.isSearchMode` in `MobileActionBar.ts` (249 lines) `scheduleAutoCollapse()`/`collapse()`, and updated `body.is-mobile #app` height to `calc(100dvh - var(--keyboard-inset, 0px))` in `src-ui/styles/mobile.css`.
- **Affected Files**: `src-tauri/gen/android/app/src/main/java/com/cathet/app/ImeInsetHelper.kt (119)`, `src-tauri/gen/android/app/src/main/java/com/cathet/app/MainActivity.kt (151)`, `src-ui/src/utils/keyboardTracker.ts (99)`, `src-ui/src/components/MobileSearchBar.ts (184)`, `src-ui/src/components/MobileActionBar.ts (249)`, `src-ui/styles/mobile.css`, `history.md`

### 2026-11-18: Update Bug-Report URL & Fix Desktop Dual-Pane Search Bar Placement
- **Summary**: Replaced the "Report an Issue or Bug" URL with `https://forms.gle/zL9sPX8hokLEAm8Z9` in both Desktop (`src-ui/src/components/settings/AboutPane.ts`, `#link-bug`) and Android (`src-ui/src/components/settings/MobileAboutCard.ts`, `#btn-about-bug`). Fixed Desktop `DesktopSearchBar` vertical collisions in Dual-Pane mode by adding `#workspace-shell.is-dual-pane .desktop-search-bar` (`+ 36px` below `.dualpane-header`) and `#workspace-shell.is-dual-pane.format-bar-open.format-bar-top .desktop-search-bar` (`+ 74px` below `.floating-format-bar.pos-top`), plus narrow-window `max-width` / `min-width: 0` bounds and smooth `top` transitions in `src-ui/styles/formatbar.css` and `src-ui/styles/topbar.css`. Added `onPreviewChange` callback in `src-ui/src/components/dualpane/DualPaneView.ts` wired to `syncFormatBarState()` in `src-ui/src/main.ts` so clicking a pane header's `Preview` button keeps format bar visibility and search bar inset synchronized.
- **Affected Files**: `src-ui/src/components/settings/AboutPane.ts (153)`, `src-ui/src/components/settings/MobileAboutCard.ts (81)`, `src-ui/src/components/dualpane/DualPaneView.ts (232)`, `src-ui/src/main.ts (675)`, `src-ui/styles/formatbar.css`, `src-ui/styles/topbar.css`, `history.md`

### 2026-11-18: Require Human-Language "What You Can Expect" Section in `/architect` Skill
- **Summary**: Updated `.agents/skills/architect/SKILL.md` (Core Rules #3–#4 and `## Output Format`) so every `/architect` plan artifact (`implementation_plan.md`) and chat response always includes a **"What You Can Expect"** section written in plain, jargon-free human language describing user-visible behavior.
- **Affected Files**: `.agents/skills/architect/SKILL.md (59)`, `history.md`

### 2026-11-17: Fix Android Private Notes State Corruption & Back Navigation Trap
- **Summary**: Fixed the re-entrancy bug in `HomeViewComponent.enterPrivateNotesMode()` (`src-ui/src/components/home/HomeView.ts`) where calling `this.exitSelectionMode(false)` after setting `this.isPrivateMode = true` triggered `if (!this.isSelectionMode && this.isPrivateMode) this.exitPrivateNotesMode(false)`, resetting `isPrivateMode` back to `false`. That caused Private Notes to render public Home notes, disabled the `<` back button (`if (!this.isPrivateMode) return`), and broke Android swipe-back (`popstate` saw `isSelectionModeActive() === false`, trapping the user until a second swipe exited the app). Extracted `clearSelectionState()` and `getFilteredNotes()`, cleared `searchQuery` + `header.clearSearch()` on entering Private Notes, and kept `HomeView.ts` under 250 lines.
- **Affected Files**: `src-ui/src/components/home/HomeView.ts (248)`, `history.md`

### 2026-11-17: Animate Android Empty-Untitled-Note FAB Collapse with Rise, Expand & Swirl Embrace
- **Summary**: Fixed the empty untitled note close-to-FAB animation on Android where `#home-fab-main` (`z-index: 120`) stayed stationary and peeked out beneath the shrinking `#workspace-shell` (`z-index: 200`) before popping in at 400 ms. Extracted `createCollapseOverlayLayer()` (`CollapseVariant = "tile" | "fab"`) into `src-ui/src/utils/containerTransformLayers.ts` (75 lines) to hide the stationary target (`visibility: hidden`), mount a `z-index: 210` clone (`id` stripped, CSS transitions disabled), and animate the `"fab"` variant along a continuous 400 ms `cubic-bezier(0.2, 0, 0, 1)` rise + expand curve (`translate3d(0, 44px, 0) scale(0.55)`, `opacity: 0 → 1`) with an inner `.home-fab-icon` swirl (`rotate(-135deg) scale(0.65) → rotate(0deg) scale(1)`). Updated `src-ui/src/utils/containerTransform.ts` (224 lines) and `src-ui/src/services/homeCoordinator.ts` (245 lines) to pass `cardEl: fabEl` and `collapseVariant: "fab"`.
- **Affected Files**: `src-ui/src/utils/containerTransformLayers.ts (75)`, `src-ui/src/utils/containerTransform.ts (224)`, `src-ui/src/services/homeCoordinator.ts (245)`, `history.md`

### 2026-11-17: Fix Android Swipe-Back-to-Home Container Morph Flash & Cut
- **Summary**: Fixed the Android back-navigation glitch where `.home-view-container` (`z-index: 100`) briefly flashed over `#workspace-shell` (`z-index: auto`) with stale card order while `showAndRefresh()` awaited `list_notes` IPC before `ContainerTransform.collapse()` raised `#workspace-shell` to `z-index: 200`. Extracted synchronous `HomeViewComponent.syncFromRegistry()` and made `showAndRefresh()` synchronous in `src-ui/src/components/home/HomeView.ts`; pinned `#workspace-shell` at `z-index: 200` while visible, added `isNavigatingHome` / `activeSavePromise` / `isModified()` guards, immediate `isHomeVisible = false` on open, and off-screen `targetCard.scrollIntoView({ block: "nearest" })` in `src-ui/src/services/homeCoordinator.ts`; kept `z-index: 200` on `expand()` completion, added `fill: "forwards"` + cleanup ordering on `collapse()`, and prevented `cancelActive()` from firing superseded `onComplete` callbacks in `src-ui/src/utils/containerTransform.ts`; added `!edRight.isModified()` guard in `autoSaveRightPane()` (`src-ui/src/main.ts`) and `pointer-events: none` during `body.is-animating-transform` (`src-ui/styles/mobile.css`).
- **Affected Files**: `src-ui/src/components/home/HomeView.ts (250)`, `src-ui/src/services/homeCoordinator.ts (245)`, `src-ui/src/utils/containerTransform.ts (240)`, `src-ui/src/main.ts (674)`, `src-ui/styles/mobile.css (1184)`, `history.md`

### 2026-11-16: Animate Primary Dual-Pane Header Tab with Top Drop-Down Motion
- **Summary**: Added `.entering` and `.exiting` lifecycle class toggling to `this.leftPaneEl` and aligned fallback cleanup timers (`360ms` enter / `300ms` exit) with CSS keyframe durations in `src-ui/src/components/dualpane/DualPaneView.ts` (231 lines). Added `dualPaneEnterTop` / `dualPaneExitTop` (`translateY(-100%)` ↔ `0`, `opacity: 0` ↔ `1`) on `.dualpane-pane-left .dualpane-header` and non-fading `dualPaneHostEnter` / `dualPaneHostExit` (`translateY(-8px)` ↔ `0`) on `.dualpane-pane-left .dualpane-editor-host` (plus `prefers-reduced-motion` rules) in `src-ui/styles/dualpane.css`.
- **Affected Files**: `src-ui/src/components/dualpane/DualPaneView.ts (231)`, `src-ui/styles/dualpane.css`, `history.md`

### 2026-11-16: Fix Android Back Navigation Dismissing Active Document Instead of Settings & Modals
- **Summary**: Added a unified LIFO overlay back-stack utility (`src-ui/src/utils/backStack.ts`, `pushBackLayer`, `removeBackLayer`, `handleBackStackPopState`) synchronized with `window.history` using microtask-coalesced `history.go(-pendingPops)` and same-tick `replaceState` to eliminate async `history.back()` vs. `pushState()` race conditions. Wired `SettingsModalComponent`, `MobileMenuDrawerComponent`, `MobileActionBarComponent` (`setFormatMode`, `setSearchMode`), `ImageInsertModalComponent`, `showGlassDialog`, `FolderModalComponent`, `RenameModalComponent`, and Dual-Pane embedded note pickers (`closeDualEmbeddedPicker()` in `src-ui/src/main.ts`) onto the LIFO stack so Android Back dismisses active overlays and pickers before closing the document to Home. Updated `HomeViewComponent.isSelectionActive()` and `exitSelectionMode()` in `src-ui/src/components/home/HomeView.ts` to exit `isPrivateMode` on Android Back.
- **Affected Files**: `src-ui/src/utils/backStack.ts (75)`, `src-ui/src/components/SettingsModal.ts (198)`, `src-ui/src/components/MobileMenuDrawer.ts (236)`, `src-ui/src/components/MobileActionBar.ts (249)`, `src-ui/src/components/ImageInsertModal.ts (168)`, `src-ui/src/components/GlassDialog.ts (85)`, `src-ui/src/components/home/FolderModal.ts (147)`, `src-ui/src/components/home/RenameModal.ts (82)`, `src-ui/src/components/home/HomeView.ts (248)`, `src-ui/src/main.ts (673)`, `history.md`

### 2026-11-16: Fix Android Dual-Pane & Single-Pane Pinch-Zoom HUD Host Tracking & Sync Display
- **Summary**: Fixed Android `.touch-zoom-pill` misplacement (centering over the full screen instead of the top Dual-Pane host), loss after closing Dual Pane (`host.innerHTML = ""` wiping the orphaned pill), and missing sibling HUD feedback during synced Dual-Pane pinch gestures: added `ensurePillHost()` (`container.parentElement` resolution with `isConnected` guard), `syncTouchZoomHost()`, and a `WeakMap<EditorComponent, TouchZoomController>` registry in `src-ui/src/utils/touchZoomHandler.ts` so synced pinching triggers both panes' `showPill()` and `scheduleFade()` together; called `syncTouchZoomHost()` in `src-ui/src/components/dualpane/DualPaneView.ts` and across `popstate`, `onOpenLeft` (also restoring missing `this.editor.getWrapperEl()` re-append), `onBackLeft`, `onBackRight`, `toggleDualPane()` close paths, and `applyLoadedFile()` in `src-ui/src/main.ts`.
- **Affected Files**: `src-ui/src/utils/touchZoomHandler.ts (155)`, `src-ui/src/components/dualpane/DualPaneView.ts (228)`, `src-ui/src/main.ts (677)`, `history.md`

### 2026-11-16: Eliminate Android Settings Sheet GPU Spike (+103.6 MB) & Dual-Sheet Open Stutter
- **Summary**: Eliminated the `+103.6 MB` transient `Graphics / EGL` surge and 57 ms (99th percentile) frame stall when opening Android Settings over an active document: removed `body.is-modal-open #workspace-shell` pointer/style invalidation in `src-ui/styles/mobile.css`, `SettingsModal.ts`, and `MobileMenuDrawer.ts`; fixed `MobileMenuDrawer.hideInstant()` (and `drawer-item-settings` handler) to tear down `.mobile-drawer-sheet` in 0 ms and release its GPU surface on `hide()` / `hideInstant()` instead of animating underneath Settings; swapped the `1024×1024` `/app-icon.png` in `MobileAboutCard.ts` for the `1.5 KB` vector `app-icon.svg`; flattened `.settings-modal-sheet` during slide-up by removing blurred `box-shadow`, scoping `will-change: opacity` to `.visible`, and deferring `.mobile-settings-scroll` `overflow-y: auto` until `.visible`; and added change-guarded DOM updates in `MobileSettingsView.updateState()` plus 2-frame rAF warmup in `SettingsModal.show()`.
- **Affected Files**: `src-ui/styles/mobile.css`, `src-ui/src/components/MobileMenuDrawer.ts (231)`, `src-ui/src/components/SettingsModal.ts (194)`, `src-ui/src/components/MobileSettingsView.ts (236)`, `src-ui/src/components/settings/MobileAboutCard.ts (81)`, `history.md`

### 2026-11-16: Switch Desktop Dual-Pane Folder Icons to RemixIcon (`RiFolderLine` / `RiFolderOpenLine`)
- **Summary**: Added RemixIcon `riFolderLine` and `riFolderOpenLine` to `src-ui/src/utils/monochromeIcons.ts` (keeping `icons.folder` untouched for mobile `MobileActionBar.ts` and `MobileMenuDrawer.ts`) and updated `src-ui/src/components/dualpane/DualPaneHeader.ts` (`!isMobile()` only) to use them.
- **Affected Files**: `src-ui/src/utils/monochromeIcons.ts`, `src-ui/src/components/dualpane/DualPaneHeader.ts (104)`, `history.md`

### 2026-11-16: Animate Dual-Pane Desktop Folder Icon to Open on Hover
- **Summary**: Added `folderOpen` SVG icon to `src-ui/src/utils/monochromeIcons.ts`, rendered layered `.folder-icon-closed` / `.folder-icon-open` spans in `src-ui/src/components/dualpane/DualPaneHeader.ts` (desktop only, `!isMobile()`), and added GPU-composited hover swap transitions in `src-ui/styles/dualpane.css`.
- **Affected Files**: `src-ui/src/utils/monochromeIcons.ts`, `src-ui/src/components/dualpane/DualPaneHeader.ts (104)`, `src-ui/styles/dualpane.css`, `history.md`

### 2026-11-16: Fix Windows `.exe` Icon Resource Ordering (`40001`) & Desktop Dual-Pane Folder Icon
- **Summary**: Changed secondary document icon Win32 resource ID from `101` to `40001` in `src-tauri/build.rs` (`append_doc_icon_to_tauri_resources`), `src-tauri/doc_icon.rc`, and `src-tauri/src/commands/association.rs` (`,-40001` in `register_associations` and `self_heal_if_moved`) so `tauri_build`'s `32512` main `M` icon remains at PE `index 0` on `cathet.exe`. Updated `src-ui/src/components/dualpane/DualPaneHeader.ts` to show `icons.folder` (`Open File (Ctrl+O)`) on Windows and Linux (`!isMobile()`) while keeping `icons.grid` (`Notes Dashboard`) on Android.
- **Affected Files**: `src-tauri/build.rs (83)`, `src-tauri/doc_icon.rc`, `src-tauri/src/commands/association.rs (237)`, `src-ui/src/components/dualpane/DualPaneHeader.ts (102)`, `history.md`

### 2026-11-16: Fix Stale Post-Upgrade Update Notification & Hybrid Android Check Cadence
- **Summary**: Fixed stale update badges (`v5.5.3`) persisting after upgrading from `5.5.2` to `5.5.3` by exporting `isNewerVersion()` and `getValidCachedUpdate()` in `src-ui/src/services/updateService.ts` (193 lines) to invalidate `cathet_latest_update`, `cathet_last_update_check`, and `cathet_launch_count` whenever `info.current_version !== APP_VERSION` or `latest_version <= APP_VERSION`. Updated `HomeHeaderComponent.syncCachedUpdate()` in `src-ui/src/components/home/HomeHeader.ts` (182 lines) to use `getValidCachedUpdate()` instead of raw `localStorage` parsing. Switched `UpdateService.checkForUpdatesOccasionally()` to check on every 5th app launch with a 12-hour minimum cooldown (`43,200,000` ms) or 7-day fallback (`604,800,000` ms).
- **Affected Files**: `src-ui/src/services/updateService.ts`, `src-ui/src/components/home/HomeHeader.ts`, `history.md`

### 2026-11-16: Fix Windows `CVT1100` Duplicate `RT_ICON` Collision & Cross-Compile Guard in `build.rs`
- **Summary**: Fixed `CVTRES : fatal error CVT1100: duplicate resource. type:ICON, name:1` during Windows release linking (`x64` & `ARM64`) caused by `embed_resource` compiling `doc_icon.rc` into a separate `doc_icon.lib` whose auto-numbered `RT_ICON` IDs (`1..N`) collided with `tauri_build`'s `resource.lib`. Updated `src-tauri/build.rs` (85 lines) to gate on `CARGO_CFG_TARGET_OS == "windows"` (preventing host-cfg execution during Android cross-compilation), append `101 ICON` directly into `OUT_DIR/resource.rc`, and recompile `OUT_DIR/resource.lib` via `rc.exe` + `cvtres.exe`.
- **Affected Files**: `src-tauri/build.rs`, `history.md`

### 2026-11-16: Separate File Association Icons (Windows & Linux) & Android Warm-Start "Open With"
- **Summary**: Added dedicated notes-only file association icon (`src-tauri/icons/doc-icon.svg` and multi-size `doc-icon.ico`), embedded into Windows executables at Win32 resource ID `101` via `src-tauri/doc_icon.rc` + `embed-resource` in `src-tauri/build.rs`. Updated `src-tauri/src/commands/association.rs` to point `Cathet.Document\DefaultIcon` to `"{exe}",-101` (with `self_heal_if_moved()` auto-upgrading legacy `,0` entries) while keeping `cathet.exe` at `,0`, and extracted Linux XDG desktop + MIME icon registration (`cathet-document.svg` + `cathet.xml` for `text/markdown`, `text/x-markdown`, `text/plain` using `$XDG_DATA_HOME` with `gtk-update-icon-cache` / `gtk4-update-icon-cache` fallback) into `src-tauri/src/commands/association_linux.rs`. Added Android warm-start `onNewIntent` forwarding via `WeakReference<WebView>` -> `window.__cathet_on_new_intent()` in `MainActivity.kt`, auto-saving open notes in `src-ui/src/main.ts` before `loadInitialFile()`, and broadened `AndroidManifest.xml` `ACTION_VIEW` MIME filters with `application/json`, `application/xml`, and `application/javascript`.
- **Affected Files**: `src-tauri/icons/{doc-icon.svg,doc-icon.ico}`, `src-tauri/doc_icon.rc`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/commands/{mod.rs,association.rs (237),association_linux.rs (125)}`, `src-tauri/gen/android/app/src/main/AndroidManifest.xml`, `src-tauri/gen/android/app/src/main/java/com/cathet/app/MainActivity.kt (161)`, `src-ui/src/main.ts`, `history.md`

### 2026-11-16: Fix Update `{version}` Braces, Light-Mode Update Button Contrast & Cross-Platform Asset Matching
- **Summary**: Fixed `v{{version}}` / `Get v{{version}}` double-brace i18n typos across all 5 locale files (`en`, `id`, `jv-krama`, `jv-malang`, `jv-ngoko`) and hardened `I18nService.t()` (`\{\{?key\}?\}`) so version strings render cleanly without stray `{ }`. Fixed light-mode CSS specificity in `src-ui/styles/mobile.css` (`:not(.has-update)` on `body.is-mobile[data-theme="light"] .mobile-about-btn` and explicit light-mode `.mobile-update-btn.has-update`) so the update button renders with solid accent background and white text in light mode. Added architecture-aware GitHub release asset matching (`find_android_apk_for_arch`, `find_windows_exe_for_arch`, `find_linux_pkg_for_arch` + unit tests) in `src-tauri/src/commands/updater_target.rs`.
- **Affected Files**: `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `src-ui/src/services/i18nService.ts (105)`, `src-ui/styles/mobile.css`, `src-tauri/src/commands/updater_target.rs (250)`, `history.md`

### 2026-11-16: Fix Android Pinch-Zoom Indicator Scroll Drift & Redesign Frosted HUD
- **Summary**: Fixed `.touch-zoom-pill` scrolling upward off-screen on long documents by decoupling the touch listener (`this.wrapperEl`) from the pill mount host (`this.container`: `#editor-container` with `position: relative` in `formatbar.css`, or `.dualpane-editor-host` in Dual Pane) in `touchZoomHandler.ts` and `Editor.ts`. Redesigned `.touch-zoom-pill` in `mobile.css` as a centered `112px × 112px` (`88px × 88px` in Dual Pane) `0.2` alpha frosted-glass (`blur(8px)`) rounded-square HUD with crisp white `tabular-nums` text, subtle `text-shadow`, and GPU-composited `.is-visible` scale/opacity transition.
- **Affected Files**: `src-ui/src/utils/touchZoomHandler.ts (113)`, `src-ui/src/components/Editor.ts (249)`, `src-ui/styles/formatbar.css`, `src-ui/styles/mobile.css`, `history.md`

### 2026-11-15: Eliminate Android Settings Sheet Open Stutter & Dual-Sheet Overlap
- **Summary**: Fixed Android Settings bottom sheet frame drops and flicker by keeping `.settings-modal-sheet` / `.mobile-drawer-sheet` GPU-promoted (`will-change: transform`, `contain: layout style paint`), removing `visibility: hidden` texture eviction in `src-ui/styles/mobile.css` (replaced with `inert` + `aria-hidden` + `pointer-events: none` in `SettingsModal.ts` and `MobileMenuDrawer.ts`), tightening sheet `box-shadow` and `.mobile-theme-tile` transition, fixing `MobileMenuDrawer.hideInstant()` so the `⋯` drawer snaps away instead of animating underneath Settings, and staging `SettingsModal.show()`'s `.visible` class on `requestAnimationFrame` after `updateState()` and `blur()`.
- **Affected Files**: `src-ui/styles/mobile.css`, `src-ui/src/components/SettingsModal.ts (193)`, `src-ui/src/components/MobileMenuDrawer.ts (216)`, `history.md`

### 2026-11-15: Fix Android `check_for_updates` Panic (`rustls-platform-verifier`) & Add Timeout
- **Summary**: Downgraded `reqwest` from `0.13` to `0.12` in `src-tauri/Cargo.toml` so non-Windows/Android targets use `rustls-tls-webpki-roots` instead of `0.13`'s uninitialized `rustls-platform-verifier` (which panicked inside `tokio-rt-worker` with `Expect rustls-platform-verifier to be initialized` and left `Checking...` hung); added a 10s `.timeout()` to `reqwest::Client::builder()` in `src-tauri/src/commands/updater.rs`.
- **Affected Files**: `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/commands/updater.rs`, `history.md`

### 2026-11-15: Add Android Update Checker & Direct APK Release Launcher
- **Summary**: Enabled `check_for_updates` on Android in `src-tauri/src/commands/updater.rs` (adding `release_url` to `UpdateInfo`); added 24-hour throttled `checkForUpdatesOccasionally()` and `openAndroidUpdateUrl()` (opening the direct `.apk` `download_url` immediately) to `UpdateService`; wired `HomeHeader.ts` update pill, `MobileMenuDrawer.ts` update item, `SettingsModal.ts` + `MobileSettingsView.ts` + `MobileAboutCard.ts` update row, `home.css` / `mobile.css` styles, and all 5 locale files (`en`, `id`, `jv-krama`, `jv-malang`, `jv-ngoko`).
- **Affected Files**: `src-tauri/src/commands/updater.rs (240)`, `src-ui/src/services/updateService.ts (149)`, `src-ui/src/main.ts`, `src-ui/src/components/home/HomeHeader.ts (186)`, `src-ui/src/components/MobileMenuDrawer.ts (208)`, `src-ui/src/components/SettingsModal.ts (185)`, `src-ui/src/components/MobileSettingsView.ts (226)`, `src-ui/src/components/settings/MobileAboutCard.ts (80)`, `src-ui/src/services/mobileCoordinator.ts`, `src-ui/styles/{home.css,mobile.css}`, `src-ui/src/locales/{en,id,jv-krama,jv-malang,jv-ngoko}.json`, `history.md`

### 2026-11-15: Prefer `D:\BuildTools\Java` in `build.ps1` `Resolve-CompatibleJavaHome`
- **Summary**: Updated `Resolve-CompatibleJavaHome` in `build.ps1` to scan `D:\BuildTools\Java` before `$env:JAVA_HOME` and `C:\Program Files\*` so the shared JDK 21 on `D:` is used across builds.
- **Affected Files**: `build.ps1`, `history.md`

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

### 2026-11-16: Android Emulator Cold Boot Support in `build.ps1`
- **Summary**:
  - Extracted `Start-AndroidEmulator` helper and added `Invoke-AndroidColdBoot` in `build.ps1` to launch AVDs with `-no-snapshot-load` (stopping any currently running `emulator-*` instance first).
  - Added `-ColdBoot` CLI switch (works standalone or combined with `-AndroidDev`) and interactive menu option `[22] Cold Boot Android Emulator (-no-snapshot-load)`.
- **Affected Files**: `build.ps1`

### 2026-11-16: [Mistake] Standalone Cold Boot Option Instead of Android Live Dev (Cold Boot)
- **Context**: User asked to add the cold boot command option to `build.ps1` after troubleshooting a broken emulator Quick Boot snapshot during Android development.
- **User Correction**: *"bruh when I asked for cold boot, I was asking it for live dev, but cold boot."*
- **Root Cause**: Added `[22] Cold Boot Android Emulator` as a standalone utility that only boots the emulator and returns to the menu, rather than wiring interactive menu selection directly to `Android Live Dev (Cold Boot)`.
- **Corrective Guardrail**: When adding interactive menu variants for dev workflows in `build.ps1`, ensure the menu option invokes the full `Invoke-AndroidDev` pipeline with cold-boot enabled (`$runOpts.AndroidDev = $true; $runOpts.ColdBoot = $true`), or prompts/exposes it directly under the Android section so users don't have to run two separate steps.

### 2026-11-16: Wire Android Live Dev (Cold Boot) into `build.ps1` Menu `[10]`
- **Summary**:
  - Moved Cold Boot Live Dev directly under `[9]` as `[10] Android Live Dev (Cold Boot Emulator -no-snapshot-load)` and shifted `[11]`–`[22]` accordingly.
  - Extracted `Stop-RunningAndroidEmulators` (with `adb emu kill` + wait + `qemu-system-*` process fallback) and updated `Invoke-AndroidDev -ColdBoot` to always stop running emulators and cold-boot/target the AVD directly (ignoring attached USB phones).
- **Affected Files**: `build.ps1`

### 2026-11-17: Add Cathet Privacy Policy (`PRIVACY.md`)
- **Summary**: Added `PRIVACY.md` at the repository root covering zero telemetry, local-only file/note storage, Windows `runFullTrust` MSIX file access, Android `BiometricPrompt` isolation, GitHub Releases update checks, and Android permissions (`INTERNET`, `VIBRATE`, `FileProvider`).
- **Affected Files**: `PRIVACY.md`, `history.md`

### 2026-11-19: [Mistake] Overwrote `implementation_plan.md` Instead of Appending New Request
- **Context**: User first asked `/architect` to plan a fix for the folder-drag jump/merge glitch (`TabDragReorder.ts`), then followed up with *"also, I want full page scrolling in preview mode, and ability to add bookmarks..."* in the same conversation.
- **User Correction**: *"never EVER overwirtten fucking plan, ALWAS ADD not OVERWRITTEN, you always fucking do this bto"*
- **Root Cause**: Used `write_file` with `Overwrite: true` on `implementation_plan.md` for the second `/architect` request, wiping out the unexecuted first bug-fix plan instead of appending/merging it into the existing plan.
- **Corrective Guardrail**: When the user adds another request or `"also ..."` while an `implementation_plan.md` already exists in the conversation, NEVER overwrite/replace prior unexecuted plan items—ALWAYS read and **append/merge** the new items into the existing `implementation_plan.md` so all planned work remains intact.

### 2026-11-19: Fix Folder Drag Jump Glitch & Add Preview Fisheye Glass Scroller + Reading Bookmarks
- **Summary**:
  - **Folder Drag Reorder Fix (`TabDragReorder.ts`, 149 lines)**: Added `applyTransform()` with custom-tab boundary clamping between `All` and `+`, returned `boolean` from `swapWithNeighbor()`, and immediately re-synced `style.transform` after `insertBefore()` in the same frame so dragged folder chips never flash or jump onto `All` or `+` for a few frames.
  - **Preview Fisheye Glass Scroller (`PreviewMinimap.ts`, 160 lines; `previewOverlay.css`)**: Added a display-only (`pointer-events: none`) 1/4-height frosted-glass cylindrical fisheye page scroller with soft top/bottom edge fade and subtle drop shadow underneath, syncing at 120fps on scroll and fading out completely after `~1.8s` of inactivity.
  - **Reading Bookmarks (`bookmarkService.ts`, 92 lines; `PreviewBookmarkBar.ts`, 165 lines)**: Added persistent per-document reading bookmarks with a frosted-glass quick-jump pill (`Save` / `%`, `+`, list popover), smart heading/snippet anchor matching with arrival pulse, and curved ribbon markers on the fisheye scroller.
  - **Preview Overlay & Settings Toggles (`PreviewOverlayController.ts`, 66 lines; `Editor.ts`, 227 lines; `previewService.ts`, 52 lines)**: Wired per-pane Preview gating (single-pane and Dual-Pane) and added independent **Preview Page Scroller** and **Reading Bookmarks** toggles in Desktop & Mobile Settings (`SettingsAccordions.ts`, `SettingsPane.ts`, `SettingsTabs.ts`, `settingsMain.ts`, `MobileSettingsView.ts`, `SettingsModal.ts`, `windowSync.ts`, `src-ui/src/locales/*.json`).
- **Affected Files**: `src-ui/src/components/home/TabDragReorder.ts`, `src-ui/src/services/bookmarkService.ts`, `src-ui/src/services/previewService.ts`, `src-ui/src/components/preview/PreviewMinimap.ts`, `src-ui/src/components/preview/PreviewBookmarkBar.ts`, `src-ui/src/components/preview/PreviewOverlayController.ts`, `src-ui/src/components/Editor.ts`, `src-ui/src/utils/monochromeIcons.ts`, `src-ui/src/components/settings/{SettingsAccordions.ts,SettingsPane.ts}`, `src-ui/src/components/{SettingsTabs.ts,MobileSettingsView.ts,SettingsModal.ts}`, `src-ui/src/settingsMain.ts`, `src-ui/src/utils/windowSync.ts`, `src-ui/src/locales/*.json`, `src-ui/styles/{previewOverlay.css,dualpane.css}`, `index.html`, `history.md`

### 2026-11-19: Fix Dual-Pane Preview Overlay Reparenting & Polish Liquid-Glass Fisheye Scroller
- **Summary**:
  - **Dual-Pane Host Reparenting**: Added `attachToHost()` to `PreviewOverlayController` (`getElement()` on `PreviewMinimap` & `PreviewBookmarkBar`) and `attachOverlayHost()` on `EditorComponent`, wired into `DualPaneView` constructor (`leftHostEl`) and `destroy()` (restoring to `#editor-container`) so Primary pane's scroller & bookmark pill stay strictly inside the Primary pane.
  - **Liquid-Glass Fisheye Scroller & Placement (`previewOverlay.css`, `PreviewMinimap.ts`)**: Widened single-pane scroller to `72px` (`54px` in Dual-Pane), increased height to `clamp(120px, 32%, 185px)`, moved single-pane position upward to `top: 32%` (volume-button height), upgraded to refractive liquid-glass gradients + `blur(18px) saturate(160%)` + specular rim + soft drop shadow underneath, and added a long multi-stop gradual edge fade (`0%..44%` / `56%..100%`) with softened canvas alpha (`pow(lens, 1.25)`).
- **Affected Files**: `src-ui/src/components/preview/{PreviewMinimap.ts,PreviewBookmarkBar.ts,PreviewOverlayController.ts}`, `src-ui/src/components/Editor.ts`, `src-ui/src/components/dualpane/DualPaneView.ts`, `src-ui/styles/previewOverlay.css`, `history.md`

### 2026-11-19: Fix Dual-Pane Close Overlay Wipe, Remove Edge Stroke, & Double Scroller Width
- **Summary**:
  - **Dual-Pane Close & Picker Restore (`main.ts`)**: Called `attachOverlayHost(...)` after every `innerHTML = ""` + `appendChild(getWrapperEl())` reparenting in `toggleDualPane()`, `closeDualEmbeddedPicker()`, and `fetchAndApply()`, preventing `host.innerHTML = ""` from wiping the fisheye scroller and bookmark pill when exiting Dual-Pane.
  - **Borderless & Twice as Wide (`previewOverlay.css`)**: Removed `border` and `inset` rim strokes on `.preview-minimap` (leaving pure frosted glass + soft ambient drop shadow) and doubled width to `144px` in single-pane (`108px` in Dual-Pane).
- **Affected Files**: `src-ui/src/main.ts`, `src-ui/styles/previewOverlay.css`, `history.md`

### 2026-11-19: Taller Fisheye Scroller with Long Center-Focused Fade
- **Summary**: Increased `.preview-minimap` height to `clamp(260px, 56%, 440px)` in single-pane (`clamp(140px, 58%, 220px)` in Dual-Pane), tightened the fully opaque center band to `48%–52%` with a long 12-step gradual fade out to `0%` / `100%`, and increased `PreviewMinimap.ts` canvas fade exponent to `1.85`.
- **Affected Files**: `src-ui/styles/previewOverlay.css`, `src-ui/src/components/preview/PreviewMinimap.ts`, `history.md`

### 2026-11-19: Increase Center Opacity of Preview Fisheye Glass Scroller
- **Summary**: Raised `.preview-minimap` center glass background opacity to `0.62` (light) / `0.64` (dark) in `previewOverlay.css`, and boosted `PreviewMinimap.ts` canvas line opacities (`0.95` headings, `0.68` paragraphs, `0.45` code/media) so the center reads clearly while keeping the long top/bottom fade.
- **Affected Files**: `src-ui/styles/previewOverlay.css`, `src-ui/src/components/preview/PreviewMinimap.ts`, `history.md`
