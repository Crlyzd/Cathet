# Cathet — Project History & Institutional Memory

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

---

## Project Changes Log

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
- **Summary**: Resolved visual capsule misalignment by restructuring the links and coffee rows with left-aligned labels (`Project Links` and `Buy me a coffee:`) and flush right-aligned frosted glass capsules (`justify-content: space-between`). Differentiated project links with clean neutral text and coffee links with warm amber tones. Upgraded the heart sprout particle system with a vibrant 11-color palette and a wide ±85px (170px total) horizontal spread with matching colored glow auras.
- **Files Modified**:
  - `src-ui/src/utils/heartSprout.ts`: Added `HEART_PALETTE`, expanded spread radius to ±85px, randomized upward velocity, and wired dynamic particle glow colors.
  - `src-ui/src/components/settings/AboutPane.ts`: Refactored to `.about-row-aligned` containing left-aligned labels and flush right-aligned capsules (kept at 139 lines, < 250 limit).
  - `src-ui/styles/settings.css`: Added `.about-row-aligned`, `.about-row-label`, `.project-icon-wrap`, `.link-project`, and updated `@keyframes sproutFloat`.

### 2026-10-17: Sprouting Heart Cluster Burst (Random 1–3 Particles)
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
- **Summary**: Implemented Dual Pane side-by-side mode allowing users to open, edit, and navigate two documents simultaneously with proportional bidirectional scroll synchronization. Decoupled `EditorComponent` for container-scoped instantiation, implemented `SyncScrollController` with normalized ratio tracking ($0.0 \to 1.0$) and recursion guard, built draggable frosted glass `DualPaneSplitter` with `🔗` lock toggle, created per-pane headers and placeholder dropzone, and integrated `DualPaneService` with spatial drag & drop and `Ctrl+D` shortcut support. Strictly maintained anti-monolith line limit standards across all files (< 250 lines).
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
  2. Removed appended checkmark (`✓`) on the Markdown Preview toggle button while retaining active state styling.
  3. Redesigned scroll sync lock toggle with frosted glass pill badge and monochrome SVG `link`/`unlink` icons instead of emojis.
  4. Implemented offset-based scroll sync with a user-configurable "Dual Pane Snap Scroll" toggle in Settings:
     - When OFF (default): re-locking preserves current scroll positions and synchronizes proportionally with relative ratio offset ($\Delta \text{ratio}$).
     - When ON: re-locking snaps the follower pane back to a 1:1 match with the driver pane.
  5. Fixed Pane 1 preview button highlight bug on initial open when "Markdown Preview" default toggle is enabled.
  6. Resolved squished-window layout wrapping in TopBar drag area and added container queries to hide header pills on narrow widths.
- **Files Modified**:
  - `src-ui/src/utils/monochromeIcons.ts`: Added SVG `folder`, `link`, and `unlink` icons (149 lines).
  - `src-ui/src/components/dualpane/DualPaneHeader.ts`: Replaced folder emoji with monochrome SVG, removed `✓` from preview button (81 lines).
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
- **Summary**: Implemented spatially aware drag & drop overlay targeting in Dual Pane mode: tracked live cursor coordinates across DOM dragover and native OLE events, dynamically bound the frosted drop overlay to the hovered pane (`Drop in Left Pane` vs `Drop in Right Pane`), and added smooth 0.12s slide transitions between panes while leaving the non-hovered document visible. Resolved extreme window squishing (220px × 200px) by changing compact button copy from `Open...` to `Open` (eliminating `O...` ellipsis truncation), reserving a 34px protected bottom zone for the sync button, and introducing `@container (max-width: 140px)` ultra-compact sizing to keep the island card completely unclipped with full corner and dashed border integrity.
- **Files Modified**:
  - `src-ui/src/components/DropOverlay.ts`: Added `updateSpatialTarget()` and contextual pane titles (57 lines).
  - `src-ui/src/services/dragDropService.ts`: Added `onDragOver` cursor position tracking across DOM and Tauri events (67 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Added `getSplitterPosition()` accessor (224 lines).
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Updated compact button label to `Open` (47 lines).
  - `src-ui/src/main.ts`: Forwarded live drag coordinates to spatial drop overlay while preserving file length under 250 lines (249 lines).
  - `src-ui/styles/editor.css`: Added smooth positional slide transitions for `.cathet-drop-overlay` (545 lines).
  - `src-ui/styles/dualpane.css`: Added bottom sync reservation (34px) and `@container (max-width: 140px)` ultra-compact sizing (520 lines).

### 2026-10-18: Dual Pane Secondary Island Center Alignment & Button Slicing Prevention
- **Summary**: Corrected vertical and horizontal centering of the secondary document placeholder island (`.dualpane-empty-card`) when squished in Dual Pane mode. Restored symmetric vertical padding (`10px` top/bottom for <=175px, `8px` top/bottom for <=140px and <=280px height) and unconstrained `max-height: 100%` on the card without `overflow: hidden`, completely eliminating upward vertical displacement and horizontal slicing of the "Open" button. Removed WebView2 scrollbar gutter via `.dualpane-empty::-webkit-scrollbar { display: none }`, and maintained symmetric `12px–14px` horizontal padding for equal breathing room and clearance on both sides.
- **Files Modified**:
  - `src-ui/styles/dualpane.css`: Replaced asymmetric bottom padding with symmetric insets, removed scrollbar gutter, set `max-height: 100%`, and adjusted compact container queries (526 lines).

### 2026-10-18: Dual Drop Zones, Window Constraints (200x300), Secondary Island New Document, and Font Dropdown Scrolling
- **Summary**: Delivered a major usability and ergonomics update across Dual Pane mode, window resizing, and the Settings window:
  1. **Simultaneous Dual Drop Targets**: Replaced the one-sided single drop overlay with simultaneous dual-zone drop targets in Dual Pane mode (`.drop-zone-left` and `.drop-zone-right`). Both panes are clearly presented to the user during file dragging, with live cursor tracking dynamically lighting up the hovered pane with radiant accent glow (`.active-target`) while keeping the non-hovered pane visible as an idle drop target (`.idle-target`). Replaced the solid white curtain with a translucent frosted glass backdrop (`rgba(..., 0.45-0.55)` with `backdrop-filter: blur(16px)`).
  2. **Window Minimum Drag/Resize Constraints (200 × 300)**: Configured `"minWidth": 200, "minHeight": 300` in `tauri.conf.json`, guaranteeing at least 240px of vertical editor height below the topbar and headers to permanently eliminate vertical squishing or button slicing.
  3. **Secondary Island "New Document" & Card Close**: Added a primary `[ + New Document ]` (compact `[ + New ]`) action alongside `[ 📂 Open Document... ]` (compact `[ Open ]`) to allow instant side-by-side note-taking and scratchpad editing without an existing file on disk. Added a card-level frosted circular close button (`✕`) to easily dismiss Dual Mode directly from the island.
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
  1. **Removed Island ✕ Close Button**: Eliminated the circular close button from `.dualpane-empty-card` in `DualPaneEmptyDropzone.ts` and `dualpane.css`, keeping the card focused purely on document creation and file opening while relying on the secondary pane header's `✕` button for Dual Mode exit.
  2. **Enforced 350 × 350 Minimum Window Size in Dual Mode**: Implemented `set_window_min_size` in `src-tauri/src/commands/window.rs` and `src-ui/src/services/windowService.ts`. When activating Dual Mode, Cathet locks the OS-level DWM minimum window size to `350 × 350` and automatically expands the window if width or height is below 350px. When exiting Dual Mode, the window floor is cleanly restored to the single-pane minimum (`200 × 300`).
  3. **File Drop Island Transparency**: In `DropOverlay.ts`, toggled `document.body.classList.add("is-dragging")` on drag entrance and removed it on completion/cancellation. Styled `body.is-dragging .dualpane-empty` with `opacity: 0; visibility: hidden; pointer-events: none;`, completely hiding the underlying placeholder island during file dragging and eliminating ghost text collisions with the frosted drop target card.
- **Files Modified**:
  - `src-ui/src/components/dualpane/DualPaneEmptyDropzone.ts`: Removed close button and click listener (61 lines).
  - `src-ui/src/components/dualpane/DualPaneView.ts`: Removed `onClose` pass-through to dropzone (227 lines).
  - `src-tauri/src/commands/window.rs`: Added `set_window_min_size` with auto-expansion logic (128 lines).
  - `src-tauri/src/lib.rs`: Registered `set_window_min_size` in Tauri invoke handler (94 lines).
  - `src-ui/src/services/windowService.ts`: Added `setMinSize(width, height)` wrapper (124 lines).
  - `src-ui/src/main.ts`: Called `setMinSize(350, 350)` on Dual Mode enter and `(200, 300)` on exit (247 lines).
  - `src-ui/src/components/DropOverlay.ts`: Toggled `is-dragging` class on `document.body` (89 lines).
  - `src-ui/styles/dualpane.css`: Added `body.is-dragging .dualpane-empty` fade-out and removed `.dualpane-empty-close` (572 lines).







