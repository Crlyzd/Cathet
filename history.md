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
