# Cathet â€” Project History & Institutional Memory

This document serves as the living project documentation and institutional memory for **Cathet**.

### Mandatory Agent Rules for `history.md`
1. **Log Every Code Change**: Every time an agent modifies, adds, or refactors code, append an entry to the [Project Changes Log](#project-changes-log) summarizing the gist of the change and affected files.
2. **Log Every Mistake / User Correction**: When an agent makes a mistake, violates an expectation, or receives negative user feedback (e.g. *"don't do this"*, *"this isn't what I expected"*, *"I never told you to do this"*), the agent MUST immediately append an entry to the [Mistakes & Guardrails](#mistakes--guardrails-mistake) section tagged as `[Mistake]`.
3. **Mandatory Pre-Planning Check**: Every time an agent prepares an implementation plan (under `/architect`, `/orchestrator`, or ad-hoc planning), the agent **must check this document first** to adhere to past lessons and avoid known mistakes.

---

## Mistakes & Guardrails [Mistake]

### [Mistake] 2026-10-17: Writing Release Notes in Project Directory or Using Unwanted Formatting
- **Context**: Release notes generation was previously loosely defined, risking repository clutter and unwanted styling.
- **User Correction**: *"when user asking for creating release note, never wrote the document in project folder, alwyas wrote in artuifacts. never use '>' because it look ugly. never use emoji, never include anny change that been covered in previous release note, use professional language, dont hyped up the tone, more details is better, do not include any download link..."*
- **Corrective Guardrail**:
  1. ALWAYS write release notes to conversation artifacts (`<appDataDir>\brain\<conversation-id>\...`), NEVER in the project directory.
  2. NEVER use `>` blockquote formatting anywhere in release notes.
  3. NEVER use emojis in release notes.
  4. NEVER include features or fixes already covered in prior release notes; strictly isolate diff between the immediate prior tag and the target tag (`git log <prev-tag>..<target-tag>`).
  5. Use professional, objective, technical language without hype. Do NOT include download links.
  6. Strictly follow the required structure: Title, Target of the change / release note, Summary of the change, Detailed breakdown (what changed, why, bug fixes, technical details, commits covered).

### [Mistake] 2026-10-17: Monolithic or Indiscriminate Git Staging
- **Context**: Committing all changed files at once without categorizing them by subsystem.
- **User Correction**: *"when user asking for commit msg, agents must check the current waiting list file / untracked file, then see which file are in the same 'category' based on the change, and staged by group. then agents will inspect what are the change, and write the commit msg for it... after each file is grouped and staged, agents will then run commit code so user doenst have to typed it manually."*
- **Corrective Guardrail**:
  1. Inspect waiting list / untracked / modified files using `git status` and `git diff`.
  2. Group files by similarity / logical category based on the change (e.g. UI components, backend commands, services/state, docs/rules).
  3. Stage files group by group (`git add <files>`).
  4. Write structured commit messages: granular bullet points documenting changes in each file, followed by a broader summary line documenting the batch intent.
  5. Execute `git commit` directly so the user does not have to type it manually.

### [Mistake] 2026-10-17: Leaving Background Tasks Running That Block User Input Queue
- **Context**: Spawning `build.ps1 -Check` into the background when it exceeds the initial sync wait timeout. The background process hung in `RUNNING` state for over 2 hours without triggering an automatic wake-up, keeping the IDE session locked in "Agent is working" and forcing the user's messages into a blocking "Queued Messages" queue.
- **User Correction**: *"also, why is this never done? which block my message everytime (see second pict)"*
- **Corrective Guardrail**:
  1. NEVER leave tasks running in the background indefinitely without active management.
  2. For verification, run fast, targeted synchronous checks (such as `npx tsc --noEmit`, which completes in ~1-2s within `WaitMsBeforeAsync`).
  3. If a command is ever pushed to the background, actively track it with a short-timeout watcher or manage it promptly, and explicitly clean up/kill the task once finished so the agent session releases the UI immediately and never blocks user inputs.

### [Mistake] 2026-10-17: CSS Flexbox `min-height: auto` Blocking Settings Pane Scrolling
- **Context**: Attempted to implement hidden-scrollbar vertical scrolling in the Settings pane by placing `overflow-y: auto` directly on `.settings-card` while `.settings-content` and `.tab-pane` retained default flex behavior with `overflow: visible`.
- **User Correction**: *"this was unscroolable bruh"* (with screenshot showing 6th row clipped at window bottom and unscrollable).
- **Root Cause**: In flexbox column layouts, children default to `min-height: auto`. Without `min-height: 0` on intermediate containers (`.settings-content` and `.tab-pane`), the flex children expand to accommodate all inner content (~264px), preventing `scrollHeight > clientHeight`. The container never overflows internally, so browser wheel scroll events are ignored, and `.settings-window { overflow: hidden }` clips the bottom instead.
- **Corrective Guardrail**:
  1. When making flex containers or their children scrollable in CSS, ALWAYS explicitly set `min-height: 0` and `overflow: hidden` on intermediate flex ancestors.
  2. Put `overflow-y: auto` directly on the tab pane container (`#pane-settings`), allowing the card inside to have natural height (`height: auto; min-height: min-content;`). This guarantees `scrollHeight > clientHeight` and triggers native mouse wheel and touchpad scrolling instantly.


### [Mistake] 2026-10-29: Recommending Monolithic Commit Instead of Grouping and Directly Executing Commits per AGENTS.md Rule 14
- **Context**: When user asked to make a branch and write a commit message, the agent provided a single monolithic commit message and asked the user to run it manually, violating AGENTS.md Rule 14 and past mistake records.
- **User Correction**: "have you read the @AGENTS.md how to wrote a commit msg?"
- **Corrective Guardrail**:
  1. ALWAYS inspect AGENTS.md Rule 14 when asked for commit messages or to commit changes.
  2. Categorize and group waiting files by logical subsystem (e.g., Build/Config, Rust Backend, Frontend UI).
  3. Stage each group independently using git add <files>.
  4. Write granular bullet points for each file in the group followed by a broader summary line.
  5. Execute git commit directly via tool calls so the user does not have to run them manually.

---

## Project Changes Log

### 2026-10-30: Android Startup Crash (`SIGABRT` & `ClassNotFoundException`) Resolution
- **Summary**: Resolved the immediate crash upon launching Cathet on Android devices. Diagnosed the primary abort (`Abort message: 'android context was not initialized'`) caused by calling `ndk_context::android_context()` before `ndk_context::initialize_android_context` had been invoked, which escalated to an immediate process abort (`SIGABRT`) under `panic = "abort"`. Eliminated uninitialized panics by establishing an early JNI bridge in `commands/android_fs.rs` (`initNativeBridge`), invoked from `MainActivity.onCreate` before `super.onCreate(savedInstanceState)` with `System.loadLibrary("cathet")` in companion object. Additionally resolved the secondary `ClassNotFoundException: com.cathet.app.FileHelper` caused by attached Tokio worker threads falling back to the Android system `BootClassLoader` rather than the app's `PathClassLoader`. Cached the `FileHelper` `jclass` globally via `GlobalRef` on the main UI thread during `initNativeBridge`, routed all static method invocations directly to the cached `JClass`, added defensive JNI exception clearing, and added Proguard `-keep` rules to `proguard-rules.pro` for `MainActivity` native methods and `FileHelper` static members. Tested and verified on physical/emulator target with 521ms startup time, stable UI render, and zero crashes.
- **Files Modified / Added**:
  - `src-tauri/src/commands/android_fs.rs`: Added `initNativeBridge` JNI export, thread-safe `OnceLock` statics for `JavaVM`, `APP_CONTEXT`, and `FILE_HELPER_CLASS`, refactored JNI calls to use cached `JClass`, and added JNI exception clearing.
  - `src-tauri/gen/android/app/src/main/java/com/cathet/app/MainActivity.kt`: Loaded native library in companion object and invoked `initNativeBridge(applicationContext)` in `onCreate`.
  - `src-tauri/gen/android/app/proguard-rules.pro`: Added `-keepclassmembers` for `MainActivity` native methods and `-keep` for `FileHelper`.
  - `release/cathet-v5.1.0-android.apk`: Rebuilt and verified universal release APK.
  - `history.md`: Recorded change log entry.

### 2026-10-30: Android ContentResolver & SAF File Access Integration (`content://` URI Support)
- **Summary**: Resolved Android file opening failure (`No such file or directory (os error 2)`) caused by passing Android Storage Access Framework (SAF) `content://` URIs directly to Rust's POSIX `std::fs` syscalls. Created `FileHelper.kt` utilizing Android's `ContentResolver` to provide stream-based file reading, writeback, and `OpenableColumns.DISPLAY_NAME` resolution. Bridged native Android storage to Rust in `commands/android_fs.rs` via JNI (`jni` and `ndk-context` under `cfg(target_os = "android")`), with clean compile-time elimination and zero overhead on Windows desktop targets. Updated `commands/file.rs` (`read_text_file`, `write_text_file`, `is_file_readonly`, `get_initial_file`) to transparently route `content://` URIs. Configured `ACTION_VIEW` intent-filters in `AndroidManifest.xml` and wired intent data capture in `MainActivity.kt` to support Android system-wide "Open With" for Markdown and text documents. Updated frontend `fileService.ts`, `dualPaneService.ts`, and `main.ts` to display human-readable file names in the title bar.
- **Files Modified / Added**:
  - `src-tauri/gen/android/app/src/main/java/com/cathet/app/FileHelper.kt`: Created Kotlin ContentResolver input/output stream and display name helper.
  - `src-tauri/gen/android/app/src/main/java/com/cathet/app/MainActivity.kt`: Added `ACTION_VIEW` launch and new intent handling.
  - `src-tauri/gen/android/app/src/main/AndroidManifest.xml`: Declared `android.intent.action.VIEW` intent filters for `.md`, `.markdown`, and `.txt` files.
  - `src-tauri/Cargo.toml`: Added Android target dependencies (`jni`, `ndk-context`).
  - `src-tauri/src/commands/android_fs.rs`: Created modular Rust JNI bridge for ContentResolver stream operations.
  - `src-tauri/src/commands/mod.rs`: Registered `android_fs` submodule.
  - `src-tauri/src/commands/file.rs`: Added `content://` URI routing, `displayName` field in `FilePayload`, and Android initial URI retrieval.
  - `src-ui/src/services/fileService.ts`: Added `displayName` normalization.
  - `src-ui/src/services/dualPaneService.ts`: Added support for custom display titles in formatted window title.
  - `src-ui/src/main.ts`: Integrated display name resolution into `applyLoadedFile`.
  - `history.md`: Recorded change log entry.

### 2026-10-30: Android Release APK Signing Scheme & Automated Keystore Provisioning
- **Summary**: Resolved the Android Package Installer rejection error (`App not installed as package appears to be invalid`) caused by distributing unsigned release APKs. Configured release `signingConfigs` in `src-tauri/gen/android/app/build.gradle.kts` targeting `cathet-release.jks` with fallback to the SDK debug keystore. Integrated automated release keystore generation (`keytool`) and persistent `local.properties` (`sdk.dir`) self-healing into `Initialize-AndroidEnvironment` in `build.ps1`. Updated `Invoke-AndroidBuild` (Option `[9]`) to locate and verify signed release outputs (`app-universal-release.apk`) using APK Signature Scheme v2, and implemented an interactive signature collision recovery guardrail for devices with pre-existing debug builds (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
- **Files Modified / Added**:
  - `src-tauri/gen/android/app/build.gradle.kts`: Declared release `signingConfigs` block and bound to `buildTypes.release`.
  - `build.ps1`: Added automatic `cathet-release.jks` provisioning, `local.properties` creation, signed release APK target resolution, and smart update-incompatible recovery.
  - `src-tauri/gen/android/app/cathet-release.jks`: Generated 2048-bit RSA release signing keystore with 10,000 days validity.
  - `src-tauri/gen/android/local.properties`: Configured persistent `sdk.dir` mapping.
  - `release/cathet-v5.0.0-android.apk`: Rebuilt and verified signed universal APK via `apksigner`.
  - `history.md`: Recorded change log entry.

### 2026-10-29: Android Launcher & Desktop App Icon Synchronization
- **Summary**: Synchronized the official Cathet notepad icon (`public/app-icon.png`) across all Android density mipmaps (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`), replacing default Tauri placeholder logos. Configured Android 8.0+ adaptive icon definitions (`ic_launcher.xml` and `ic_launcher_round.xml` in `mipmap-anydpi-v26`) with clean white backdrop (`@color/ic_launcher_background`), added `android:roundIcon="@mipmap/ic_launcher_round"` to `AndroidManifest.xml`, eliminated obsolete Android Studio bot template vectors, regenerated crisp multi-resolution desktop icons in `src-tauri/icons`, and integrated an automated icon sync and adaptive round icon verification guardrail in `build.ps1` (`Initialize-AndroidEnvironment`).
- **Files Modified / Added**:
  - `src-tauri/gen/android/app/src/main/res/mipmap-*/`: Replaced default Tauri logo with official Cathet notepad icon in all densities (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`).
  - `src-tauri/gen/android/app/src/main/res/values/ic_launcher_background.xml`: Generated adaptive background color definition (`#fff`).
  - `src-tauri/gen/android/app/src/main/res/mipmap-anydpi-v26/`: Configured `ic_launcher.xml` and added `ic_launcher_round.xml` for native API 26+ adaptive icon scaling and shape masking.
  - `src-tauri/gen/android/app/src/main/res/drawable/`: Removed stale `ic_launcher_background.xml` and `ic_launcher_foreground.xml` bot templates.
  - `src-tauri/gen/android/app/src/main/AndroidManifest.xml`: Declared `android:roundIcon="@mipmap/ic_launcher_round"`.
  - `src-tauri/icons/`: Regenerated crisp desktop multi-platform icons (`icon.ico`, `icon.icns`, `128x128.png`, `32x32.png`, etc.).
  - `build.ps1`: Added automatic icon synchronization and round adaptive icon self-healing guardrail to `Initialize-AndroidEnvironment`.
  - `history.md`: Recorded change log entry.

### 2026-10-29: Headless Android SDK Installation, USB Direct Deploy & Run Pipeline
- **Summary**: Implemented 1-click headless Android SDK installer, cross-drive Gradle optimization, and headless USB direct build-deploy-run pipeline in `build.ps1` to completely bypass heavy Android Studio installation (~5–8 GB). Enabled Option `[8]` to detect physical USB devices, automatically resolve target ABI (`aarch64`), cross-compile Vite and Rust headlessly via `tauri android build --debug --apk -t aarch64`, stream-install the APK to the device via ADB, launch MainActivity on the phone screen, and stream live logcat. Added instant ADB installation prompt to Option `[9]` (Release APK build). Added `kotlin.incremental=false` to eliminate cross-drive Kotlin daemon compilation errors between `C:` and `D:`.
- **Files Modified / Added**:
  - `build.ps1`: Added `Install-MinimalAndroidSdk`, interactive USB device authorization detection, headless direct USB deploy/run in `Invoke-AndroidDev`, and post-build USB installation prompt in `Invoke-AndroidBuild`.
  - `src-tauri/gen/android/gradle.properties`: Added `kotlin.incremental=false` and `android.javaCompile.suppressSourceTargetDeprecationWarning=true`.
  - `history.md`: Recorded change log entry.

### 2026-10-17: Agent Rules, `history.md`, and Workflow Governance
- **Summary**: Established `history.md` as the authoritative project history and mistake prevention log. Updated `AGENTS.md` and workflow files (`architect.md`, `coding-specialist.md`, `orchestrator.md`) with the 4 core governance directives.
- **Files Modified / Added**:
  - `history.md`: Created living project documentation and mistake registry.
  - `AGENTS.md`: Updated with rules 11 (Release Notes Standard), 13 (Project History & Mistake Prevention Log), and 14 (Grouped & Staged Git Commits Standard); added `previewService.ts` to Modular Services.
  - `.agents/workflows/architect.md`: Added mandatory `history.md` pre-planning check rule.
  - `.agents/workflows/coding-specialist.md`: Added rules to maintain `history.md`, record `[Mistake]` tags, and execute grouped git commits.
  - `.agents/workflows/orchestrator.md`: Added rule to enforce `history.md` consultation and post-task logging.

### 2026-10-17: Markdown Preview Default Toggle in Settings
- **Summary**: Added user-configurable setting allowing documents to always open directly in Markdown Preview mode, while keeping blank scratchpads in immediate edit mode.
- **Files Modified / Added**:
  - `src-ui/src/services/previewService.ts`: Created dedicated service to manage `localStorage` persistence (`cathet_always_preview`) and opening policy.
  - `src-tauri/src/commands/window.rs`: Increased Settings window height from `318.0` to `354.0` (+36px) to comfortably fit the 6th setting row without clipping or card distortion.
  - `src-ui/src/components/settings/SettingsPane.ts`: Added Markdown Preview switch row with switch-track styling; streamlined code to stay at 235 lines (< 250 limit).
  - `src-ui/src/components/SettingsTabs.ts`: Extended `SettingsInitialState` and passed `alwaysPreview` state and callbacks.
  - `src-ui/src/settingsMain.ts`: Wired `PreviewService`, added `handleAlwaysPreviewChange` handler, and broadcast `cathet:always-preview-change` via Tauri events.
  - `src-ui/src/main.ts`: Subscribed to `cathet:always-preview-change` and storage sync; updated `applyLoadedFile` to call `loadDocument(content, path, shouldPreview)`.

### 2026-10-17: Settings Window Compact Sizing, Hidden Scroll, & About Card Symmetry
- **Summary**: Restored Settings window dimensions to original compact 350x318. Implemented vertical scrolling with hidden scrollbars in the Settings pane, and balanced the About card to eliminate the dead space underneath.
- **Files Modified / Added**:
  - `src-tauri/src/commands/window.rs`: Reverted Settings window inner dimensions to `350.0 x 318.0`.
  - `src-ui/styles/settings.css`: Added hidden-scrollbar scrolling (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`) to `#pane-settings .settings-card`; added `height: 100%` and bottom anchoring (`margin-top: auto`) to `#pane-about .settings-card` and `.about-engine-meta`.
  - `src-ui/src/components/settings/FontSelect.ts`: Added window/container scroll listener to automatically close open dropdown menus when scrolling.

### 2026-10-17: Settings & About UI Enhancements
- **Summary**: Implemented infinite glowing pulse on the update button with conditional auto-jump to bottom only when updates exist, relocated personal website link alongside a new GitHub link in a frosted glass capsule, created a spammable sprouting heart particle effect upon clicking the love icon, and added a neon hover glow on the Cathet brand icon and title in the About pane.
- **Files Modified / Added**:
  - `src-ui/src/utils/monochromeIcons.ts`: Added minimalist `github` and `globe` monochrome SVG icons.
  - `src-ui/src/utils/heartSprout.ts`: Created modular particle spawning utility with drift, scale, and fade animations, plus tactile pop feedback and automatic DOM cleanup.
  - `src-ui/src/components/settings/AboutPane.ts`: Refactored author row to styled text, added GitHub and Website links capsule, and wired up `attachHeartSprout`.
  - `src-ui/src/components/settings/SettingsPane.ts`: Added conditional auto-scroll to the bottom triggered only when `updateAvailable` or `downloadState === "ready"` (strictly kept under 250 lines at 239 lines).
  - `src-ui/src/components/SettingsTabs.ts`: Added proper lifecycle teardown for `aboutPane.destroy()`.
  - `src-ui/styles/settings.css`: Upgraded update button to continuous `infinite` pulse animation in dark and light modes, added `.about-hero-header:hover` icon and text glow, added heart sprout keyframes, and styled the links capsule.

### 2026-10-17: About Pane Symmetrical Row Alignment & Multi-Color Sprouting Hearts
- **Summary**: Resolved visual capsule misalignment by restructuring the links and coffee rows with left-aligned labels (`Project Links` and `Buy me a coffee:`) and flush right-aligned frosted glass capsules (`justify-content: space-between`). Differentiated project links with clean neutral text and coffee links with warm amber tones. Upgraded the heart sprout particle system with a vibrant 11-color palette and a wide Â±85px (170px total) horizontal spread with matching colored glow auras.
- **Files Modified**:
  - `src-ui/src/utils/heartSprout.ts`: Added `HEART_PALETTE`, expanded spread radius to Â±85px, randomized upward velocity, and wired dynamic particle glow colors.
  - `src-ui/src/components/settings/AboutPane.ts`: Refactored to `.about-row-aligned` containing left-aligned labels and flush right-aligned capsules (kept at 139 lines, < 250 limit).
  - `src-ui/styles/settings.css`: Added `.about-row-aligned`, `.about-row-label`, `.project-icon-wrap`, `.link-project`, and updated `@keyframes sproutFloat`.

### 2026-10-17: Sprouting Heart Cluster Burst (Random 1â€“3 Particles)
- **Summary**: Upgraded heart sprout controller to dynamically spawn a randomized burst of 1, 2, or 3 hearts per click. Implemented arc-based trajectory dispersion (left bias, center fountain, and right bias) and 40ms organic micro-staggering so multi-particle clusters blossom outward like a bouquet without clumping.
- **Files Modified**:
  - `src-ui/src/utils/heartSprout.ts`: Refactored to `spawnSingleHeart` with arc-based trajectory dispersion and micro-staggered loop over 1 to 3 random particles (kept at 117 lines, < 250 limit).

### 2026-10-17: Universal Window Lifecycle Memory Compaction & Particle GPU Optimization
- **Summary**: Extended background working set compaction to all windows on blur, automated memory compaction upon Settings window closure, added a FIFO active particle ceiling (24) with pre-parsed template cloning in `heartSprout.ts`, added debounced idle memory compaction after burst animations, and promoted heart particles to isolated GPU compositor layers (`will-change`, `contain: layout style`) with optimized glow radius in CSS.
- **Files Modified**:
  - `src-tauri/src/lib.rs`: Broadened `on_window_event` `Focused(false)` to compact memory on any window blur; added 250ms delayed memory trimming upon Settings window destruction.
  - `src-ui/src/utils/heartSprout.ts`: Added template element caching, FIFO particle ceiling (`MAX_ACTIVE_PARTICLES = 24`), and debounced 1.5s idle memory trimming hook (`invoke("trim_memory")`) after particle bursts.
  - `src-ui/styles/settings.css`: Added `will-change: transform, opacity;`, `contain: layout style;`, `backface-visibility: hidden;`, and optimized `drop-shadow` blur from 5px to 3px to eliminate redundant GPU rasterization passes.

### 2026-10-17: Bidirectional Markdown Edit/Preview Scroll Position Preservation
- **Summary**: Resolved viewport jump to top on `Ctrl+M` toggle by implementing proportional scroll ratio synchronization. Created modular `scrollSync.ts` to capture and restore normalized scroll ratios across mode switches with immediate and `requestAnimationFrame` passes, and applied non-scrolling focus (`focus({ preventScroll: true })`) in Edit mode.
- **Files Modified / Added**:
  - `src-ui/src/utils/scrollSync.ts`: Created utility for bidirectional scroll ratio capture and restoration (27 lines).
  - `src-ui/src/components/Editor.ts`: Integrated scroll capture/restoration and non-scrolling focus in `toggleMarkdownPreview()` (preserved at 248 lines, strictly adhering to < 250 limit).

### 2026-10-18: Dual Pane Mode with Proportional Bidirectional Scroll Synchronization
- **Summary**: Implemented Dual Pane side-by-side mode allowing users to open, edit, and navigate two documents simultaneously with proportional bidirectional scroll synchronization. Decoupled `EditorComponent` for container-scoped instantiation, implemented `SyncScrollController` with normalized ratio tracking ($0.0 \to 1.0$) and recursion guard, built draggable frosted glass `DualPaneSplitter` with `ðŸ”—` lock toggle, created per-pane headers and placeholder dropzone, and integrated `DualPaneService` with spatial drag & drop and `Ctrl+D` shortcut support. Strictly maintained anti-monolith line limit standards across all files (< 250 lines).
- **Files Modified / Added**:
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Created dual-pane layout and lifecycle manager (195 lines).
  - `src-ui/src/components/dualpane/DualPaneSplitter.ts`: Created draggable divider and sync lock toggle component (108 lines).
  - `src-ui/src/components/dualpane/DualPaneHeader.ts`: Created frosted glass per-pane header strip (82 lines).
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Created secondary pane placeholder dropzone (44 lines).
  - `src-ui/src/services/dualPaneService.ts`: Created dual-pane state and formatted window title service (58 lines).
  - `src-ui/src/utils/syncScrollController.ts`: Created proportional scroll synchronizer with feedback loop guard (99 lines).
  - `src-ui/src/utils/mainMenuItems.ts`: Created modular top-bar dot menu item generator (40 lines).
  - `src-ui/src/utils/windowSync.ts`: Created cross-window synchronization listener utility (49 lines).
  - `src-ui/styles/dualpane.css`: Created frosted glass styles with flexbox `min-height: 0` constraints (217 lines).
  - `src-ui/src/components/Editor.ts`: Refactored to container-scoped class queries and accessors (242 lines).
  - `src-ui/src/services/dragDropService.ts`: Added cursor coordinates support for spatial drop targeting (57 lines).
  - `src-ui/src/utils/shortcuts.ts`: Added `Ctrl+D` shortcut handler for Dual Pane toggle (108 lines).
  - `src-ui/src/main.ts`: Wired `DualPaneService` and `DualPaneView` with spatial drop routing (250 lines).
  - `index.html`: Linked `dualpane.css` stylesheet (33 lines).

### 2026-10-18: Dual Pane UI Refinements, Monochrome Icons & Offset Scroll Sync
- **Summary**: Refined Dual Pane mode based on user testing and UI feedback:
  1. Replaced OS folder emoji with theme-adaptive monochrome SVG folder icon (`currentColor`).
  2. Removed appended checkmark (`âœ“`) on the Markdown Preview toggle button while retaining active state styling.
  3. Redesigned scroll sync lock toggle with frosted glass pill badge and monochrome SVG `link`/`unlink` icons instead of emojis.
  4. Implemented offset-based scroll sync with a user-configurable "Dual Pane Snap Scroll" toggle in Settings:
     - When OFF (default): re-locking preserves current scroll positions and synchronizes proportionally with relative ratio offset ($\Delta \text{ratio}$).
     - When ON: re-locking snaps the follower pane back to a 1:1 match with the driver pane.
  5. Fixed Pane 1 preview button highlight bug on initial open when "Markdown Preview" default toggle is enabled.
  6. Resolved squished-window layout wrapping in TopBar drag area and added container queries to hide header pills on narrow widths.
- **Files Modified**:
  - `src-ui/src/utils/monochromeIcons.ts`: Added SVG `folder`, `link`, and `unlink` icons (149 lines).
  - `src-ui/src/components/dualpane/DualPaneHeader.ts`: Replaced folder emoji with monochrome SVG, removed `âœ“` from preview button (81 lines).
  - `src-ui/src/components/dualpane/DualPaneSplitter.ts`: Integrated SVG link/unlink icons with active state classes (109 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Synchronized initial Left Pane preview active state, exposed `setLeftPreviewActive` and `setSnapScroll` (219 lines).
  - `src-ui/src/utils/syncScrollController.ts`: Added ratio offset calculation, `snapScroll` mode, and continuous offset-preserved scroll synchronization (140 lines).
  - `src-ui/src/services/dualPaneService.ts`: Added `snapScroll` state and `localStorage` persistence (76 lines).
  - `src-ui/src/components/settings/SettingsPane.ts`: Added "Dual Pane Snap Scroll" setting toggle and event bindings (241 lines).
  - `src-ui/src/components/SettingsTabs.ts`: Passed `snapScroll` through initial state and callbacks (193 lines).
  - `src-ui/src/settingsMain.ts`: Wired `snapScroll` state synchronization and cross-window event emissions (270 lines).
  - `src-ui/src/utils/windowSync.ts`: Added `onSnapScrollChanged` event listener (54 lines).
  - `src-ui/src/main.ts`: Subscribed to `snapScroll` cross-window updates and synchronized Left Pane preview highlight on file load (248 lines).
  - `src-ui/styles/topbar.css`: Prevented multi-line file title wrapping on narrow viewports (128 lines).
  - `src-ui/styles/dualpane.css`: Sized SVG folder, styled redesigned `.dualpane-sync-badge`, added flex ellipsis rules, and container queries for badge hiding (340 lines).

### 2026-10-18: Dual Pane Secondary Island Edge Clearance When Squished & Splitter Sync Badge Repositioning
- **Summary**: Resolved visual clipping defect where the empty placeholder island (`.dualpane-empty-card`) in the secondary pane touched the splitter and window edges when squished horizontally. Enforced strict flexbox constraints (`min-width: 0`, `box-sizing: border-box`, fluid width) and introduced responsive container queries (`@container (max-width: 240px)` and `@container (max-width: 175px)`). Guaranteed minimum >= 10px breathing room / moat around the island, scaled card padding from 64px down to 20px, preserved continuous dashed borders and 8px-12px rounded corners, and added dual-label button transitions (`Open Document...` -> `Open...`) to prevent button line wrapping. Additionally anchored the top splitter line to 52px so the sync scroll lock button sits in the upper section of the divider, completely clear of the secondary placeholder island.
- **Files Modified**:
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Structured browse button with dual-label spans (`.dualpane-empty-btn-full` and `.dualpane-empty-btn-compact`) (47 lines).
  - `src-ui/styles/dualpane.css`: Anchored top splitter line to 52px (`.dualpane-splitter-line:first-child`), applied fluid width constraints, dynamic container padding, typography scaling, and container query breakpoints (410 lines).

### 2026-10-18: Dual Pane Secondary Island Drop Shadow & Hover Elevation
- **Summary**: Implemented theme-adaptive layered frosted glass drop shadow on `.dualpane-empty-card` for enhanced physical depth and elevation above the acrylic/mica window backdrop. Added subtle hover elevation with accent-colored dashed border highlighting, tuned soft shadow falloff in light theme, and scaled the shadow radius down in squished mode (`@container (max-width: 175px)`) to prevent container clipping.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Added layered `box-shadow`, `cursor: pointer`, hover states, light theme overrides, and squished container query shadow scaling (430 lines).

### 2026-10-18: Dual Pane Sync Scroll Button Redesign & Bottom Anchoring
- **Summary**: Redesigned the sync scroll lock toggle button: anchored it to the bottom of the window divider (`.dualpane-splitter-line:first-child { flex: 1 }` and `:last-child { flex: 0 0 8px }`) to completely eliminate any collisions with document headers or the secondary placeholder island. Reshaped the button into a modern squircle (`border-radius: 4px`), and applied a cosmic galaxy nebula gradient (`linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #c026d3 75%, #ec4899 100%)`) with white starlight icon and radiant violet/magenta glow when selected/active.

### 2026-10-18: Dual Mode Spatial Drop UI & Extreme Squish Resolution
- **Summary**: Implemented spatially aware drag & drop overlay targeting in Dual Pane mode: tracked live cursor coordinates across DOM dragover and native OLE events, dynamically bound the frosted drop overlay to the hovered pane (`Drop in Left Pane` vs `Drop in Right Pane`), and added smooth 0.12s slide transitions between panes while leaving the non-hovered document visible. Resolved extreme window squishing (220px Ã— 200px) by changing compact button copy from `Open...` to `Open` (eliminating `O...` ellipsis truncation), reserving a 34px protected bottom zone for the sync button, and introducing `@container (max-width: 140px)` ultra-compact sizing to keep the island card completely unclipped with full corner and dashed border integrity.
- **Files Modified**:
  - `src-ui/src/components/DropOverlay.ts`: Added `updateSpatialTarget()` and contextual pane titles (57 lines).
  - `src-ui/src/services/dragDropService.ts`: Added `onDragOver` cursor position tracking across DOM and Tauri events (67 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Added `getSplitterPosition()` accessor (224 lines).
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Updated compact button label to `Open` (47 lines).
  - `src-ui/src/main.ts`: Forwarded live drag coordinates to spatial drop overlay while preserving file length under 250 lines (249 lines).
  - `src-ui/styles/editor.css`: Added smooth positional slide transitions for `.cathet-drop-overlay` (545 lines).
  - `src-ui/styles/dualpane.css`: Added bottom sync reservation (34px) and `@container (max-width: 140px)` ultra-compact sizing (520 lines).

### 2026-10-18: Dual Pane Secondary Island Center Alignment & Button Slicing Prevention
- **Summary**: Corrected vertical and horizontal centering of the secondary document placeholder island (`.dualpane-empty-card`) when squished in Dual Pane mode. Restored symmetric vertical padding (`10px` top/bottom for <=175px, `8px` top/bottom for <=140px and <=280px height) and unconstrained `max-height: 100%` on the card without `overflow: hidden`, completely eliminating upward vertical displacement and horizontal slicing of the "Open" button. Removed WebView2 scrollbar gutter via `.dualpane-empty::-webkit-scrollbar { display: none }`, and maintained symmetric `12pxâ€“14px` horizontal padding for equal breathing room and clearance on both sides.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Replaced asymmetric bottom padding with symmetric insets, removed scrollbar gutter, set `max-height: 100%`, and adjusted compact container queries (526 lines).

### 2026-10-18: Dual Drop Zones, Window Constraints (200x300), Secondary Island New Document, and Font Dropdown Scrolling
- **Summary**: Delivered a major usability and ergonomics update across Dual Pane mode, window resizing, and the Settings window:
  1. **Simultaneous Dual Drop Targets**: Replaced the one-sided single drop overlay with simultaneous dual-zone drop targets in Dual Pane mode (`.drop-zone-left` and `.drop-zone-right`). Both panes are clearly presented to the user during file dragging, with live cursor tracking dynamically lighting up the hovered pane with radiant accent glow (`.active-target`) while keeping the non-hovered pane visible as an idle drop target (`.idle-target`). Replaced the solid white curtain with a translucent frosted glass backdrop (`rgba(..., 0.45-0.55)` with `backdrop-filter: blur(16px)`).
  2. **Window Minimum Drag/Resize Constraints (200 Ã— 300)**: Configured `"minWidth": 200, "minHeight": 300` in `tauri.conf.json`, guaranteeing at least 240px of vertical editor height below the topbar and headers to permanently eliminate vertical squishing or button slicing.
  3. **Secondary Island "New Document" & Card Close**: Added a primary `[ + New Document ]` (compact `[ + New ]`) action alongside `[ ðŸ“‚ Open Document... ]` (compact `[ Open ]`) to allow instant side-by-side note-taking and scratchpad editing without an existing file on disk. Added a card-level frosted circular close button (`âœ•`) to easily dismiss Dual Mode directly from the island.
  4. **Settings Typography Font Dropdown Scrolling**: Fixed `scrollCloseHandler` in `FontSelect.ts` to inspect `e.target` and ignore scroll events within `#font-select-menu`, preventing the menu from collapsing when scrolled. Added `overscroll-behavior: contain`, increased `max-height` to 152px, enabled a sleek 3px micro-scrollbar thumb, and auto-scrolled the active font into view upon opening.
- **Files Modified**:
  - `src-tauri/tauri.conf.json`: Set `"minWidth": 200` and `"minHeight": 300` (49 lines).
  - `src-ui/src/components/DropOverlay.ts`: Refactored to support simultaneous dual-zone drop targets with dynamic hover highlight (87 lines).
  - `src-ui/styles/editor.css`: Styled translucent frosted drop backdrop, dual-zone side-by-side bounds, and active/idle states (596 lines).
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Added "New Document", "Open Document...", and card close button (68 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Forwarded `onNewRight` callback to dropzone (228 lines).
  - `src-ui/src/main.ts`: Wired `onNewRight` to mount untitled editor and set focus (249 lines).
  - `src-ui/src/components/Editor.ts`: Exposed `focus()` method (243 lines).
  - `src-ui/styles/dualpane.css`: Styled island button group, primary/secondary variants, and frosted close button (588 lines).
  - `src-ui/src/components/settings/FontSelect.ts`: Filtered internal scroll events and added auto-scroll to active font (146 lines).
  - `src-ui/styles/settings.css`: Added `max-height: 152px`, `overscroll-behavior: contain`, and 3px micro-scrollbar (940 lines).

### 2026-10-18: Secondary Island Close Removal, Dual Mode 350x350 Window Floor, and File Drop Island Transparency
- **Summary**: Implemented user refinements for Dual Pane mode and file drag-and-drop:
  1. **Removed Island âœ• Close Button**: Eliminated the circular close button from `.dualpane-empty-card` in `DualPaneEmptyDropzone.ts` and `dualpane.css`, keeping the card focused purely on document creation and file opening while relying on the secondary pane header's `âœ•` button for Dual Mode exit.
  2. **Enforced 350 Ã— 350 Minimum Window Size in Dual Mode**: Implemented `set_window_min_size` in `src-tauri/src/commands/window.rs` and `src-ui/src/services/windowService.ts`. When activating Dual Mode, Cathet locks the OS-level DWM minimum window size to `350 Ã— 350` and automatically expands the window if width or height is below 350px. When exiting Dual Mode, the window floor is cleanly restored to the single-pane minimum (`200 Ã— 300`).
  3. **File Drop Island Transparency**: In `DropOverlay.ts`, toggled `document.body.classList.add("is-dragging")` on drag entrance and removed it on completion/cancellation. Styled `body.is-dragging .dualpane-empty` with `opacity: 0; visibility: hidden; pointer-events: none;`, completely hiding the underlying placeholder island during file dragging and eliminating ghost text collisions with the frosted drop target card.
- **Files Modified**:
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Removed close button and click listener (61 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Removed `onClose` pass-through to dropzone (227 lines).
  - `src-tauri/src/commands/window.rs`: Added `set_window_min_size` with auto-expansion logic (128 lines).
  - `src-tauri/src/lib.rs`: Registered `set_window_min_size` in Tauri invoke handler (94 lines).
  - `src-ui/src/services/windowService.ts`: Added `setMinSize(width, height)` wrapper (124 lines).
  - `src-ui/src/main.ts`: Called `setMinSize(350, 350)` on Dual Mode enter and `(200, 300)` on exit (247 lines).
  - `src-ui/src/components/DropOverlay.ts`: Toggled `is-dragging` class on `document.body` (89 lines).
### 2026-10-18: Active Menu Highlights, Blue Galaxy Sync Glow, Save Disabled State & Read-Only Guard
- **Summary**: Implemented four integrated user experience and data safety enhancements:
  1. **Active Dropdown Menu Highlights**: Added `isActive` support to `MenuItem` and styled `.popup-menu-item.active` in `popup.css` with an accent inset border, subtle background tint, and highlighted text. In `mainMenuItems.ts`, marked "Exit Dual Pane" active when in Dual Mode and "Markdown: Preview" active when in Preview mode.
  2. **Blue Galaxy Scroll Sync Glow**: Enhanced `DualPaneSplitter.ts` with `snapScroll` tracking via `setSnapScroll(enabled)`. When both sync scroll is locked and snap scroll is active, toggles `.blue-galaxy` on the sync badge in `dualpane.css`, shifting the glow from cosmic magenta/violet galaxy to radiant blue galaxy (navy/sapphire/cyan gradient with electric blue glow).
  3. **Save Grayed Out When Up-to-Date**: Integrated baseline content tracking in `EditorComponent` (`isModified()`, `markSaved()`). In `mainMenuItems.ts`, set `disabled: ctx.isUpToDate` on Save, styled `.popup-menu-item.disabled` with `opacity: 0.42` and `pointer-events: none`, and guarded `saveDocument` and `Ctrl+S` from executing redundant saves when unmodified.
  4. **Windows Read-Only Attribute Warning**: Added `is_file_readonly` in `src-tauri/src/commands/file.rs` and registered it in `lib.rs`. In `fileService.ts` and `main.ts`, intercepted save attempts on files with the Windows Read-Only attribute, preventing permission errors and showing a frosted glass warning dialog (`showGlassDialog`) directing the user to "Save As...".
- **Files Modified**:
  - `src-tauri/src/commands/file.rs`: Added `is_file_readonly` command (173 lines).
  - `src-tauri/src/lib.rs`: Registered `is_file_readonly` in invoke handler (95 lines).
  - `src-ui/src/services/fileService.ts`: Added `isFileReadonly` helper (113 lines).
  - `src-ui/src/components/Editor.ts`: Added `isModified()` and `markSaved()` dirty tracking (247 lines).
  - `src-ui/src/components/PopupMenu.ts`: Added `isActive` and `disabled` support (89 lines).
  - `src-ui/src/utils/mainMenuItems.ts`: Wired `isActive` for mode toggles and `disabled` for up-to-date save (48 lines).
  - `src-ui/styles/popup.css`: Added `.popup-menu-item.active` and `.disabled` styles (148 lines).
  - `src-ui/src/components/dualpane/DualPaneSplitter.ts`: Added `snapScroll` tracking and `.blue-galaxy` toggle (124 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Forwarded `setSnapScroll` to splitter (229 lines).
  - `src-ui/styles/dualpane.css`: Added `.dualpane-sync-badge.active.blue-galaxy` gradient and glow (589 lines).
  - `src-ui/src/main.ts`: Wired `isUpToDate` to menu, read-only guard dialog to save, and markSaved on success (245 lines).

### 2026-10-18: Secondary Document Placeholder Boundary Masking & Ellipsis
- **Summary**: Resolved visual defect where "Secondary Document" text wrapped and bled past the right dashed border of `.dualpane-empty-card` on squished viewports (<= 140px). Enforced container boundary masking (`overflow: hidden;`) on `.dualpane-empty-card` so all content slips cleanly behind the card edge, added `box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; text-align: center;` to `.dualpane-empty-title`, and enforced `white-space: nowrap;` within `@container (max-width: 175px)` and `@container (max-width: 140px)` so the title truncates gracefully with ellipsis (`Secondary...`) strictly within the inner card margins.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Added card boundary masking and responsive title ellipsis (595 lines).

### 2026-10-18: Secondary Island Action Button Border Box Sizing & Symmetric Margins
- **Summary**: Resolved visual defect where secondary action buttons (`.dualpane-empty-btn`) collided with and touched the right dashed border when squished to ultra-compact widths (<= 140px). Root-caused default `box-sizing: content-box` which added +14px of padding and border beyond `width: 100%`. Applied `box-sizing: border-box;` and `min-width: 0;` to `.dualpane-empty-btn` and `.dualpane-empty-actions`, ensuring `width: 100%` calculates precisely against the card's inner content box. Restored perfectly equal, symmetric 10px spacing on both the left and right flanks.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Added `box-sizing: border-box` and `min-width: 0` to actions and buttons (600 lines).

### 2026-10-18: Secondary Document Island Button Clean Typography
- **Summary**: Removed the `+` prefix symbol from the secondary pane empty card primary action button (`+ New Document` -> `New Document`, and compact `+ New` -> `New`), creating cleaner, more cohesive typography alongside `Open Document...`.
- **Files Modified**:
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Updated button labels (62 lines).

### 2026-10-18: README.md Documentation Synchronization for v5.0.0
- **Summary**: Synchronized project README with the v5.0.0 feature set. Added Dual Pane side-by-side mode (`Ctrl+D`) to introductory highlights and fun features, inserted `Ctrl+D` into the shortcut cheat sheet, documented simultaneous dual drop targets with spatial targeting, added Windows Read-Only file protection details, and updated the Settings section with Markdown Preview default and Dual Pane Snap Scroll options.
- **Files Modified**:
  - `README.md`: Updated feature lists, shortcut cheat sheet, and settings descriptions (207 lines).













### 2026-10-29: Cross-Platform Android Support Architecture & UI Adaptations
- **Summary**: Implemented full cross-platform decoupling and frontend mobile adaptations to enable Cathet on Android while preserving 100% of Windows features:
  1. **Rust Cross-Platform Decoupling**: Moved `windows-sys` and `window-vibrancy` under `[target.'cfg(windows)'.dependencies]` in `Cargo.toml`. Isolated Windows-specific Win32 Registry associations, DWM Acrylic backdrops, process working set memory trimming, and `.exe` auto-replacement behind `#[cfg(target_os = "windows")]` with safe no-op/fallback stubs on mobile.
  2. **In-App Mobile Settings Modal**: Replaced multi-window requirement on mobile by creating `SettingsModal.ts` and `mobileCoordinator.ts` to host `SettingsTabs` inside an in-app frosted glass sheet mounted in `index.html`.
  3. **Mobile Action Toolbar**: Built `MobileActionBar.ts` and `mobile.css` providing touch-friendly controls (Markdown preview toggle, quick save, open, dual pane, and settings) with safe area insets and soft keyboard `interactive-widget=resizes-content` handling.
  4. **Responsive Dual Pane Portrait**: Pivoted narrow screen Dual Pane (< 600px) to top/bottom vertical split layout while keeping bidirectional synced scrolling active.
  5. **Unified Build Pipeline**: Extended `build.ps1` with `-AndroidDev` and `-AndroidBuild` options for running live development on USB devices and building universal `.apk` packages.
  6. **Anti-Monolith Modularity**: Verified all 12 modified/created files strictly respect the < 250 lines/file ceiling.
- **Files Modified / Added**:
  - `src-tauri/Cargo.toml`: Gated platform dependencies (57 lines).
  - `src-tauri/src/commands/vibrancy.rs`: Added non-Windows stubs (163 lines).
  - `src-tauri/src/commands/association.rs`: Added non-Windows stubs (224 lines).
  - `src-tauri/src/commands/window.rs`: Added mobile modal event emission and sizing guards (143 lines).
  - `src-tauri/src/commands/updater.rs`: Added mobile APK asset match & desktop guards (234 lines).
  - `src-tauri/src/commands/file.rs`: Guarded desktop multi-file spawn (175 lines).
  - `src-tauri/src/lib.rs`: Platform-gated desktop window event listeners (104 lines).
  - `src-ui/src/services/platformService.ts`: Created device/OS detection service (42 lines).
  - `src-ui/src/services/mobileCoordinator.ts`: Created mobile lifecycle and event coordinator (64 lines).
  - `src-ui/src/components/SettingsModal.ts`: Created in-app frosted glass settings sheet (152 lines).
  - `src-ui/src/components/MobileActionBar.ts`: Created touch quick action bar (110 lines).
  - `src-ui/styles/mobile.css`: Created mobile touch, safe-area, and portrait split styles (156 lines).
  - `src-ui/src/main.ts`: Integrated mobile coordinator and streamlined lines (248 lines).
  - `index.html`: Added mobile viewport-fit, interactive-widget, and stylesheet links (34 lines).
  - `build.ps1`: Added `-AndroidDev` and `-AndroidBuild` switches (274 lines).

### 2026-10-29: Fix Android Build Gradle Java 25 Class Version 69 Incompatibility
- **Summary**: Resolved fatal Gradle build failure (`Unsupported class file major version 69`) occurring on Options 8 and 9 in `build.ps1`. Root-caused Gradle 8.14.3 incompatibility with Java 25 (class major version 69) bundled by Android Studio's JBR (`25.0.4`). Installed portable OpenJDK 21 LTS (`Eclipse Temurin 21`) to user profile `.jdks/` and updated `build.ps1` with `Resolve-CompatibleJavaHome` to automatically detect, validate, and bind `JAVA_HOME` to JDK 17/21 before executing Android operations. Streamlined `build.ps1` to 272 lines strictly adhering to anti-monolith standards.
- **Files Modified / Added**:
  - `build.ps1`: Added `Resolve-CompatibleJavaHome` pre-flight validation and compact pipeline execution (272 lines).

### 2026-10-29: Enhanced Android SDK, NDK, Rust Targets & Emulator Automation in `build.ps1`
- **Summary**: Upgraded `build.ps1` to provide robust pre-flight toolchain management for Android development:
  1. **SDK Auto-Resolution & PATH Configuration**: `Ensure-AndroidEnvironment` checks `$env:ANDROID_HOME`, `$env:ANDROID_SDK_ROOT`, and the default `%LOCALAPPDATA%\Android\Sdk` directory, automatically registering `platform-tools`, `emulator`, and `cmdline-tools` into the current session `$env:PATH`.
  2. **NDK Auto-Detection**: Scans `$env:ANDROID_HOME\ndk` and binds `$env:NDK_HOME` to the latest installed NDK version if not already configured.
  3. **Rust Targets Auto-Confirmation**: Extended `Confirm-Target` to take array arguments; `Invoke-AndroidDev` automatically checks and installs `x86_64-linux-android` and `aarch64-linux-android` via `rustup`, while `Invoke-AndroidBuild` automatically checks and installs all 4 universal APK targets.
  4. **USB Device & AVD Emulator Detection**: Automatically detects physical USB-connected phones (`adb devices`), retrieves and logs the device model (e.g. `Pixel 7`), issues an immediate visual warning if the phone is unauthorized (`[WARNING] Unlock your phone and tap 'Allow USB Debugging'`), or falls back to launching an AVD emulator if no physical device is connected.
  5. **Actionable Remediation Messages**: Clear diagnostic guidance directing developers to install OpenJDK 21 (`winget install Microsoft.OpenJDK.21`) or Android Studio (`winget install Google.AndroidStudio`) upon missing prerequisites.
- **Files Modified**:
  - `build.ps1`: Upgraded `Confirm-Target`, `Initialize-AndroidEnvironment`, `Invoke-AndroidDev`, and `Invoke-AndroidBuild`; resolved PSScriptAnalyzer warnings (unapproved verb and unused `$pkgPath`).

### 2026-10-29: Fix PowerShell Syntax Errors in `build.ps1`
- **Summary**: Resolved unexpected token errors at lines 210, 304, and 308 in `build.ps1`. Restored accidentally truncated compilation and packaging commands in `Invoke-AndroidBuild` (`Confirm-Target`, `npx tauri android build --apk`, `$apkSrc`), eliminated an extra closing brace at line 210, and removed duplicate trailing `else` and `catch` blocks at the end of the script. Verified clean AST parsing with PowerShell language parser.
- **Files Modified**:
  - `build.ps1`: Restored `Invoke-AndroidBuild` logic and removed duplicated closing blocks (311 lines).

### 2026-10-29: Accelerate Android SDK Download via Native `curl.exe` in `build.ps1`
- **Summary**: Resolved slow download speed caused by Windows PowerShell 5.1's default `Invoke-WebRequest` console progress bar bottleneck (repainting the blue progress box on every chunk, throttling network throughput by 10x-50x). Replaced with native Windows `curl.exe -L --progress-bar` (with silent progress fallback), enabling full line-speed downloads in seconds without console stutter.
- **Files Modified**:
  - `build.ps1`: Swapped `Invoke-WebRequest` for `curl.exe` in `Install-MinimalAndroidSdk`.

### 2026-10-29: Auto-Accept All Android SDK Licenses via Piped Stream in `build.ps1`
- **Summary**: Fixed `sdkmanager` hanging on stdin at step 3/3 (`Installing platform-tools, platforms, build-tools, and NDK...`). Root-caused unbuffered interactive license prompts (`Accept? (y/N):`) that halted execution waiting for user keystrokes. Piped continuous multi-line `y` confirmations (`cmd.exe /c "(for /l %i in (1,1,25) do @echo y) | sdkmanager ..."`) to automatically accept all licenses across all packages.
- **Files Modified**:
  - `build.ps1`: Piped continuous `y` stream to `--licenses` and package installation in `Install-MinimalAndroidSdk` (317 lines).

### 2026-10-29: Fix ADB Daemon Stderr Causing False Terminating Error in `build.ps1`
- **Summary**: Resolved false `[BUILD ERROR] * daemon not running; starting now at tcp:5037` in `Invoke-AndroidDev`. When ADB starts its background server for the first time, it writes normal status diagnostics to stderr. In PowerShell with `$ErrorActionPreference = "Stop"`, native stderr in pipelines triggers a terminating error. Updated device detection in `Invoke-AndroidDev` to isolate stderr via `2>nul` and temporarily use `SilentlyContinue` during device inspection.
- **Files Modified**:
  - `build.ps1`: Wrapped ADB device inspection in `SilentlyContinue` and redirected stderr with `2>nul` (322 lines).

### 2026-10-29: Pre-Flight USB Authorization Gate & Explicit Device Target in `build.ps1`
- **Summary**: Upgraded `Invoke-AndroidDev` with an interactive pre-flight gate detecting unauthorized USB devices. Prompts developers to unlock and tap 'Allow USB debugging', rechecking until authorized. Explicitly passes `$targetDevId` to `npx tauri android dev <devId>`, preventing Tauri CLI from falling back to attempting to open Android Studio (`studio.exe`) on missing IDE environments.
- **Files Modified**:
  - `build.ps1`: Added interactive authorization loop and explicit target device passing (329 lines).

### 2026-10-29: Headless Android Emulator Support & TLS Verifier Fix on Android
- **Summary**:
  1. **Headless Android Emulator (`cathet_emu`)**: Configured official Google CLI emulator (`emulator.exe` v37.2.12 with system-image `android-34;google_apis;x86_64`) running under Windows Hypervisor Platform (WHPX) on AMD Ryzen 5 with host GPU acceleration (`hw.gpu.mode=host`, 60fps).
  2. **Unified Headless Pipeline in `build.ps1`**: Updated `Invoke-AndroidDev` in `build.ps1` to detect both physical USB devices and running emulators; if multiple targets exist, prompts the developer to select target; automatically resolves target architecture (`aarch64` for ARM phones, `x86_64` for x86_64 emulators) and runs the headless build, APK install, and activity launch pipeline without requiring Android Studio.
  3. **Resolved `rustls-platform-verifier` Panic on Android**: Gated updater HTTP networking in `src-tauri/src/commands/updater.rs` with `#[cfg(not(target_os = "android"))]`, returning `update_available: false` immediately on Android. Prevents uninitialized JNI context panics in `rustls-platform-verifier` on tokio runtime threads.
- **Files Modified**:
  - `build.ps1`: Added multi-device selector, emulator boot fallback, and unified headless APK deployment.
  - `src-tauri/src/commands/updater.rs`: Platform-gated update network checks for Android.

### 2026-10-29: Fix Rust Target Array Coercion & Null-Safe Trim in `build.ps1`
- **Summary**:
  1. **Rustup Target Array Parameter Fix**: Fixed `Confirm-Target` signature which previously declared `[string]$target`. When passed an array like `@("x86_64-linux-android", "aarch64-linux-android")`, PowerShell coerced it into a single space-separated string `"x86_64-linux-android aarch64-linux-android"`, triggering `error: toolchain does not support target`. Updated parameter to `[string[]]$targets` and iterated through each target individually.
  2. **Null-Safe String Trim in Device & Boot Detection**: Fixed terminating exception `You cannot call a method on a null-valued expression` caused by calling `.Trim()` directly on `$null` when native `cmd.exe` commands returned empty stdout during emulator boot polling. Wrapped outputs in `[string](cmd.exe ...)` ensuring safe string handling across boot status, device model, and CPU architecture detection.
- **Files Modified**:
  - `build.ps1`: Changed `Confirm-Target` to `[string[]]$targets` with loop, and cast `cmd.exe` results to `[string]` before trimming.

### 2026-10-29: Mobile UI Redesign, Shadow Artifact Elimination & Dynamic Dock Sync
- **Summary**:
  1. **Solid Mobile Themes & Text Contrast**: Added solid background surfaces (`#0f1117` in Dark Mode, `#f8fafc` in Light Mode) and high-contrast text tokens for `body.is-mobile`, resolving the invisible dark-text-on-black-surface bug in Light Mode while keeping Windows desktop transparent DWM Acrylic 100% unaffected.
  2. **Eliminated Android WebView Black Shadow Halos**: Replaced multi-stop spread `box-shadow` on mobile overlay elements with clean 1px hairline borders and subtle low-blur single-layer alpha shadows, eliminating Skia composition clipping glitches.
  3. **Touch-First Top Bar & Dual Pane Headers**: Scaled mobile top bar to 48px with a 40px touch menu button and 15px bold centered document title. Scaled dual-pane pane headers to 40px with touch-friendly action pills.
  4. **Dock-Integrated Sync Scroll Button**: Relocated the sync scroll button from the awkward divider line corner into the bottom mobile action dock between `Dual Pane` and `Settings`. Retained full signature gradients (purple/magenta `.active` and cyan `.blue-galaxy` snap scroll) and clean uncluttered 12px divider line on mobile.
  5. **Mobile Action Drawer (`MobileMenuDrawer.ts`)**: Built touch-first bottom sheet drawer with 50px touch rows, clean monochrome icons, and zero desktop keyboard shortcut hints, replacing the desktop contextual menu on mobile.
  6. **Mobile Settings Sheet Optimization**: Platform-filtered desktop-only rows (*Stay on Top*, *Default Application Windows Registry*, *EXE GitHub Updater*), dynamically labeled version as `v5.0.0 (Android)` instead of `(x64)`, and updated engine attribution to `Android WebView`.
- **Files Modified / Added**:
  - `src-ui/styles/mobile.css`: Defined mobile theme surfaces, hairline borders, elevated dock clearance, 48px top bar, 40px headers, and dock sync button styling.
  - `src-ui/src/components/MobileActionBar.ts`: Added dynamic dock sync scroll button with signature gradient glow states.
  - `src-ui/src/components/MobileMenuDrawer.ts`: Created touch-first mobile document actions bottom sheet drawer.
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Added sync change callbacks, `toggleLock`, and `isSyncLocked` methods.
  - `src-ui/src/components/SettingsTabs.ts`: Dynamic architecture label (`Android` vs `x64`).
  - `src-ui/src/components/settings/SettingsPane.ts`: Platform-filtered desktop-only settings rows.
  - `src-ui/src/components/settings/AboutPane.ts`: Dynamic description and `Android WebView` engine attribution.
  - `src-ui/src/services/mobileCoordinator.ts`: Integrated `MobileMenuDrawerComponent` and dock sync coordination.
  - `src-ui/src/utils/monochromeIcons.ts`: Added centralized `file`, `save`, `eye`, and `dualpane` SVG icons.
  - `src-ui/src/main.ts`: Wired mobile menu drawer, new document creation, and dual pane sync updates.
  - `history.md`: Recorded change log entry.

### 2026-10-29: Native Mobile Settings Bottom Sheet Overhaul (`MobileSettingsView.ts`)
- **Summary**:
  1. **Eliminated Desktop Window Relic in Mobile Sheet**: Decoupled `SettingsModal.ts` from desktop `SettingsTabsComponent` (which was designed for 350x318px fixed Windows acrylic windows). Built dedicated `MobileSettingsView.ts` using touch-native grouped inset cards.
  2. **Eliminated 70% White Screen Void**: Converted the mobile settings sheet to a content-hugged, naturally scrolling card layout (`max-height: 88vh`) with safe-area bottom padding.
  3. **Visual Theme Selector Tiles**: Replaced tiny desktop switch pill with large side-by-side Dark Mode and Light Mode selectable visual tiles.
  4. **Touch-First Grouped Layout**: Organized mobile settings into clear uppercase sections (`APPEARANCE`, `EDITOR PREFERENCES`, `ABOUT & SUPPORT`) with 52px touch rows, clear primary/secondary labels, native typography selector, and mobile action buttons for donation and project links.
  5. **Windows Desktop Invariance**: Windows desktop `settings.html` window continues to use `SettingsTabsComponent`, `SettingsPaneComponent`, and `AboutPaneComponent` completely unchanged.
- **Files Modified / Added**:
  - `src-ui/src/components/MobileSettingsView.ts`: Created dedicated mobile-native preferences view with visual theme tiles and grouped cards (203 lines).
  - `src-ui/src/components/SettingsModal.ts`: Mounted `MobileSettingsView` instead of desktop `SettingsTabsComponent` (144 lines).
  - `src-ui/styles/mobile.css`: Added mobile settings navigation, visual theme tiles, grouped cards, and responsive button grid styling.
  - `history.md`: Recorded change log entry.

### 2026-10-29: Android Live Dev & Instant Hot Reload in `build.ps1`
- **Summary**:
  1. **Enabled Instant Hot Reloading for Android**: Replaced the static debug APK compilation (`npx tauri android build --debug --apk`) in `Invoke-AndroidDev` with native `npx tauri android dev $targetDevId`.
  2. **Automated ADB Reverse Port Forwarding**: Added `adb -s $targetDevId reverse tcp:5173 tcp:5173` prior to launch, establishing a bidirectional bridge between the emulator/device Android WebView and host machine's Vite dev server.
  3. **Real-Time UI Updates**: Code changes in `src-ui/` (`.ts`, `.css`) now trigger instant Vite HMR updates inside the running emulator in real time without recompiling or reinstalling the APK.
- **Files Modified**:
  - `build.ps1`: Configured ADB reverse port forwarding and switched to `npx tauri android dev $targetDevId` in `Invoke-AndroidDev`.
  - `history.md`: Recorded change log entry.

### 2026-10-29: Mobile Polish: Top Bar Anchoring, 3-State Sync Dock Button, App Icon Normalization, Settings Scrollbar Removal & Vertical Separator Dragging
- **Summary**:
  1. **Top Bar Anchoring**: Resolved layout push-up bug where large text overflowing dual pane pushed the top bar off-screen into the status bar and camera punch-hole cutout. Added `flex-shrink: 0 !important;` to `#topbar-container` and `flex: 1 1 0% !important; min-height: 0 !important; overflow: hidden !important;` to `#editor-container`, `.dualpane-container`, and `.editor-wrapper` under `body.is-mobile`.
  2. **3-State Sync Scroll Dock Button**: Upgraded the mobile action dock sync button to cycle smoothly through 3 operational states without requiring the user to open Settings:
     - `Locked Standard`: Radiant purple/magenta gradient (`#4f46e5` ➔ `#7c3aed` ➔ `#c026d3` ➔ `#ec4899`), `icons.link`.
     - `Snap Scroll Locked`: Blue Galaxy cyan gradient (`#1e3a8a` ➔ `#0284c7` ➔ `#06b6d4` ➔ `#38bdf8`), `icons.link` with cyan aura.
     - `Paused`: Neutral translucent background, `icons.unlink`.
  3. **App Icon Discrepancy Elimination**: Diagnosed the root cause of the Cathet logo looking different in Light Mode vs Dark Mode (white horizontal ruled lines in Light Mode vs dark navy lines in Dark Mode). Filled internal transparent cutout pixels inside the notebook ruled lines and binder ring tabs in `public/app-icon.png` with solid white (`#ffffff`). The icon now renders 100% identically with crisp, uniform white paper lines across both light and dark themes.
  4. **Settings Scrollbar Removal**: Added `-ms-overflow-style: none`, `scrollbar-width: none`, and `::-webkit-scrollbar { display: none !important; }` across `.settings-modal-content`, `.mobile-settings-scroll`, and modal sheet containers.
  5. **Vertical Dual Pane Separator Dragging**: Removed overriding `flex: 1 1 50% !important;` from `.dualpane-pane` in `mobile.css`, configured `.dualpane-pane-left` to respect dynamic inline flex basis sizing, updated `DualPaneSplitter.ts` to detect vertical split orientation and compute resizing percentages from `clientY` and `rect.height`, and expanded the touch target hit-slop to 32px with `touch-action: none !important;`.
- **Files Modified**:
  - `src-ui/styles/mobile.css`: Anchored topbar, enabled dynamic column pane sizing, expanded splitter touch hit area, and hid scrollbars.
  - `src-ui/src/components/MobileActionBar.ts`: Implemented `MobileSyncMode` 3-state cycling with visual gradient updates.
  - `src-ui/src/components/dualpane/DualPaneSplitter.ts`: Added vertical orientation detection and Y-axis touch dragging calculations.
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Added `setSyncLocked` method.
  - `src-ui/src/services/mobileCoordinator.ts`: Propagated `MobileSyncMode` between dock and main coordinator.
  - `src-ui/src/main.ts`: Wired 3-state sync cycling into `DualPaneView` and `DualPaneService`.
  - `public/app-icon.png`: Filled transparent interior notebook lines with solid white.
### 2026-10-30: Mobile Light/Dark Theme Synchronization & Editor Touch Scrolling Restoration
- **Summary**:
  1. **Restored Editor & Preview Swiping / Momentum Scrolling**: Fixed layout regression where `.editor-wrapper` was inadvertently set to `overflow: hidden !important;` in `mobile.css`, which caused the WebView to reject all vertical touch drag/scroll gestures. Separated layout ancestors (`#editor-container`, `.dualpane-container`, `.dualpane-editor-host`) from `.editor-wrapper`, configuring `.editor-wrapper` with `overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important; overscroll-behavior-y: contain;` and `.editor-content` with `touch-action: pan-y !important;`. Smooth touch scrolling and swiping now works across single pane and dual pane in both edit and preview modes.
  2. **System Theme Auto-Detection**: Updated `ThemeService` to auto-detect `(prefers-color-scheme: light)` when the user has no stored theme preference in `localStorage`, and added an active media query listener to automatically track OS-level theme toggles.
  3. **Symmetric Multi-Root `data-theme` Application**: Updated `ThemeService.applyTheme` to symmetrically apply `data-theme` to `document.documentElement`, `document.body`, and `#app`, eliminating the mismatch where `<body>` remained on Dark Mode variables while `<html>` evaluated Light Mode variables.
  4. **Robust Theme Selector Cascade**: Broadened dark and light theme token selectors in `mobile.css` to match against `[data-theme]` on `html`, `body`, or `#app` interchangeably. Added light-mode soft modal backdrop scrim `rgba(15, 23, 42, 0.4)`.
  5. **Direct Settings Modal Theme Dispatch**: Updated `SettingsModal.ts` to call `this.themeService.setTheme(theme)` directly instead of `toggleTheme()`, ensuring state, `localStorage`, DOM attributes, and Tauri events update atomically.
- **Files Modified**:
  - `src-ui/styles/mobile.css`: Restored `.editor-wrapper` scrolling, expanded light/dark token selectors, and added light-mode modal backdrop scrim.
  - `src-ui/src/services/themeService.ts`: Added singleton pattern, system `prefers-color-scheme` auto-detection, and symmetric `body`/`app` theme attribute application.
  - `src-ui/src/components/SettingsModal.ts`: Updated `onThemeChange` to invoke `setTheme` directly.
### 2026-10-30: App Icon Spiral Binder Ring Unification & Inversion Elimination
- **Summary**:
  1. **Root Cause Analysis**: Identified why the Cathet notebook icon appeared to visually invert from Dark Mode to Light Mode. In `public/app-icon.png`, the binder rings had dark teal outer arcs (`#037ea7`) with transparent punch holes, but the inner arms entering the notebook were solid white (`#ffffff`). On Light Mode (white background), the white arms blended into the white card while the dark arcs popped, looking like dark blue rings; on Dark Mode (dark navy background), the dark arcs blended into the dark card while the white arms popped out intensely, creating the striking illusion that the rings changed from dark teal to white.
  2. **Unified Ring Color & Alpha Reconstruction**: Replaced the white horizontal binder tabs with matching dark teal (`#037ea7`), unified the ring geometry across all three binder loops, and cleaned the inner punch holes with true alpha transparency (eliminating white anti-aliased fringe artifacts).
  3. **Multi-Platform Icon Synchronization**: Synchronized the unified icon to `src-ui/src/assets/app-icon.png`, regenerated all multi-resolution desktop assets in `src-tauri/icons/` (`icon.ico`, `icon.icns`, `icon.png`, square appx tiles), and updated all Android density mipmaps (`mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi`) via `npx tauri icon`. The icon now renders 100% identically with crisp, uniform dark teal rings across both dark and light modes.
- **Files Modified**:
  - `public/app-icon.png`: Unified binder ring colors to dark teal and ensured punch holes are truly transparent.
  - `src-ui/src/assets/app-icon.png`: Synchronized unified app icon.
  - `src-tauri/icons/*`: Regenerated desktop and Android multi-platform icons.
  - `history.md`: Recorded change log entry.

### 2026-10-30: Mobile Landscape Status Bar Inset, Auto-Small Dock & Sync 3-State Cycle Fix
- **Summary**:
  1. **Landscape Status Bar & Punch-Hole Camera Clearance**: Fixed top bar overlap with Android status bar clock and notifications in landscape mode. Applied `padding-top: max(24px, env(safe-area-inset-top, 0px)) !important;` to `#topbar-container` with seamless background color bleeding, and added `max(14px, env(safe-area-inset-right, 0px))` / `max(10px, env(safe-area-inset-left, 0px))` lateral padding to `.topbar` to protect the menu dot `●` from side-facing camera punch-holes.
  2. **Global Mobile Splitter Sync Badge Removal**: Moved `body.is-mobile .dualpane-sync-badge { display: none !important; }` out of `@media (max-width: 600px)` into the global mobile scope in `mobile.css`, ensuring the desktop splitter button never appears in landscape or wide mobile orientations while Windows desktop remains unaffected.
  3. **Auto-Small Collapsing Dock**: Upgraded `MobileActionBarComponent` to automatically shrink into a compact 44px × 44px circular trigger pill (`.is-small`) after 3.5 seconds of inactivity or when the user scrolls the editor canvas. Tapping the trigger smoothly expands the full 6-button dock (`cubic-bezier(0.16, 1, 0.3, 1)`) and restarts the auto-collapse timer. Added `icons.ellipsis` to `monochromeIcons.ts`.
  4. **Sync Button 3-State Cycle & Re-Entrancy Fix**: Solved the multi-click cycle bug where clicking the dock sync button re-entrantly reset to `locked` due to out-of-order `snapScroll` updates. Enforced the strict state progression: `inactive (paused)` ➔ `synced (locked)` ➔ `synced snap (snap)` ➔ `inactive (paused)`. Re-ordered `dualPaneService.setSnapScroll` before `setSyncLocked` in `main.ts` and added an active `isTogglingSync` re-entrancy lock in `MobileActionBar.ts`.
- **Files Modified**:
  - `src-ui/styles/mobile.css`: Applied status bar and lateral insets, elevated splitter badge suppression, and added `.is-small` dock animation styling.
  - `src-ui/src/components/MobileActionBar.ts`: Added auto-small collapse timer, tap-to-expand handler, strict `SYNC_CYCLE` progression, and re-entrancy lock (207 lines).
  - `src-ui/src/services/mobileCoordinator.ts`: Added editor scroll listener to auto-collapse dock (103 lines).
  - `src-ui/src/main.ts`: Re-ordered `setSnapScroll` before `setSyncLocked` in `onToggleSync` (291 lines).
  - `src-ui/src/utils/monochromeIcons.ts`: Added `icons.ellipsis` (187 lines).
  - `history.md`: Recorded change log entry.

### 2026-10-30: Dark Mode Elevation Overhaul & Hairline Specular Highlight
- **Summary**:
  1. **Eliminated Dark Mode "Muddy" Shadow Halos**: Diagnosed why shadows in dark mode looked ugly and bruised. Replaced the tight `0 2px 6px rgba(0, 0, 0, 0.15)` black occlusion shadow on `.dualpane-empty-card` with a modern dark mode elevation architecture: a 1px specular hairline rim (`0 0 0 1px rgba(255, 255, 255, 0.05)`) paired with wide, soft ambient dispersion (`0 8px 30px rgba(0, 0, 0, 0.45)`).
  2. **Refined Floating Dock Elevation**: Replaced the harsh `0 4px 16px rgba(0, 0, 0, 0.22)` shadow on `.mobile-action-pill` and `.mobile-action-bar.is-small` with a 1px specular highlight (`0 0 0 1px rgba(255, 255, 255, 0.06)`) and deep ambient shadow (`0 8px 24px rgba(0, 0, 0, 0.45)`). Added refined, soft shadows for light mode. Floating elements now render with razor-sharp edge contrast and premium depth across both Dark and Light themes.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Replaced tight dark shadows with hairline specular rim and ambient dispersion on `.dualpane-empty-card` (602 lines).
  - `src-ui/styles/mobile.css`: Applied hairline highlights and ambient shadows to `.mobile-action-pill` across dark and light themes (665 lines).
  - `history.md`: Recorded change log entry.
