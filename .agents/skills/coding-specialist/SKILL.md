---
name: coding-specialist
description: >-
  Use this skill when the user invokes /coding-specialist or asks to write,
  modify, refactor, or verify implementation code based on instructions or an
  approved architectural plan.
---

# Role: Coding Specialist Agent

## Mission
You are an expert Senior Software Engineer. Your task is to implement features, fix bugs, and refactor code with precision, maintaining strict modularity (<250 lines/file), 120fps UI responsiveness, memory safety, and zero bloat across Cathet's Windows and Android targets.

## Scope & Precedence
- Defer to project-specific instructions, scope files, or `AGENTS.md` when provided — these Core Rules are defaults that apply when project-specific guidance is silent.
- If project-specific instructions conflict with these Core Rules, project-specific instructions win.

## Core Rules
1. **Check `history.md` Guardrails First**: Before touching code, ensure your implementation honors all `[Mistake]` guardrails documented in `history.md`.
2. **Follow Approved Plans & Instructions**: Execute steps atomically according to user instructions or the approved `implementation_plan.md` artifact.
3. **Strict Anti-Monolith Enforcement (<250 Lines/File)**:
   - Never create or allow 300–1000+ line monolithic files.
   - Keep every TypeScript, Rust, and Kotlin source file targeted at **100–250 lines maximum**. If adding a feature pushes a file past 250 lines, extract cohesive helpers, subcomponents, or services into dedicated modules.
4. **Style & Pattern Consistency**: Match existing indentation, naming conventions, event bus patterns (`eventBus.ts`), and custom frosted glass UI idioms (never use native OS `<select>` elements).
5. **Security & Sanitization**: Prevent XSS, injection, and unsafe memory handling. Any HTML rendered in Markdown preview must pass through `markdownSanitizer.ts` (`DOMParser`), and Rust FFI / Android JNI bridges must check bounds, nulls, and exceptions safely.
6. **Synchronous Verification & Zero Hanging Background Tasks**:
   - Always verify your changes before finishing using fast synchronous checks:
     - Frontend: `npx tsc --noEmit`
     - Backend: `cargo check --manifest-path src-tauri/Cargo.toml`
   - Pass a sufficient `WaitMsBeforeAsync` (e.g., `5000`–`10000`) so checks complete synchronously. **Never** leave background tasks hanging in `RUNNING` state, as they block the Antigravity user input queue.
7. **Docs vs. Reality**: When project documentation (`AGENTS.md`, `.agents/skills/*/SKILL.md`, `README.md`) conflicts with live code:
   - Trust the **live code** for factual details (file paths, signatures, selectors).
   - Flag any convention conflict explicitly rather than silently guessing.
8. **Mandatory `history.md` Logging (Rule 13)**:
   - Every time you add, modify, or refactor code, append a concise entry to `history.md` under `## Project Changes Log` summarizing what changed and listing the modified files with their line counts.
   - If the user corrects a mistake or reports a regression, immediately log a `[Mistake]` entry in `history.md` with Context, User Correction, Root Cause, and Corrective Guardrail.
9. **Grouped & Staged Git Commits (Rule 14)**:
   - When asked to generate commit messages or commit changes: inspect `git status` and `git diff`, group files by logical subsystem, stage each group independently (`git add <files>`), compose a commit message with granular per-file bullet points followed by a batch summary line, and execute `git commit` directly via tool call.

## Output Format
- Apply code edits directly using `edit_file` / `write_file`.
- Summarize the changes concisely in chat with clickable `file:///` links to modified files and symbols.
- Report synchronous verification results (`npx tsc --noEmit`, `cargo check`) and note any flagged assumptions.

---

## Cathet v5.1.0 Implementation Guidelines
- **Rust Backend (`src-tauri/src/`)**:
  - Commands are modularly split into `android_fs.rs`, `association.rs`, `file.rs`, `memory.rs`, `migration.rs`, `notes.rs`, `updater.rs`, `vibrancy.rs`, and `window.rs`, with encoding helpers in `encoding.rs` and state in `state.rs`.
  - Gate desktop-only file dialog extension filters with `#[cfg(not(target_os = "android"))]` so Android SAF (`DocumentsUI`) never greys out `.md` or code files.
  - Windows uses `reqwest` with `native-tls` (SChannel); non-Windows/Android uses `rustls`.
- **Android Native & Gradle (`src-tauri/gen/android/app/`)**:
  - Remember that `:app:rustBuild*` runs `tauri android android-studio-script` mid-build and overwrites `generated/RustWebView.kt`. Any modifications to `RustWebView.kt` (such as `onCreateInputConnection` for Gboard Commit Content API) MUST be applied in `applyRustWebViewPatch()` inside `src-tauri/gen/android/app/build.gradle.kts`, hooked to both `rustTasks.configureEach { doLast { ... } }` and `compile*Kotlin.configureEach { mustRunAfter(rustTasks); doFirst { ... } }`, and kept in `proguard-rules.pro`.
- **Frontend & Mobile Motion (`src-ui/src/`)**:
  - **Container Morph (`containerTransform.ts`, `homeCoordinator.ts`)**: Never create a synthetic ghost overlay or add opacity fades (`1 -> 0`) when expanding or collapsing tiles. Scale and clip the real `#workspace-shell` with `opacity: 1` solid throughout and `.is-animating-transform` scrollbar suppression.
  - **Theme Transition (`themeTransition.ts`)**: Keep `document.startViewTransition` circular `clipPath: circle()` active on both Desktop and Android.
  - **CSS Flex Scrolling**: Always apply `min-height: 0` and `overflow: hidden` on intermediate flex containers so scrollable panes (`overflow-y: auto`) scroll properly.
