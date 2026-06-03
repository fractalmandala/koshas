# Tasks

**Purpose:** Granular task breakdown with dependencies, effort estimates, and agent assignments. This is the orchestrator's execution layer — it reads this file when it needs to delegate or track a specific task.

---

## M1 — Data Layer + Collect Foundation

---

### T-001: Project Scaffolding

| Field | Value |
|---|---|
| **Agent(s)** | Interaction Engineer (lead), Back-End Engineer (consult) |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | None |
| **Core-docs to reference** | `koshas-specs-v1.md` §1 (Architecture Overview), `team.md` |
| **Skills to use** | `tauri-v2`, `sveltekit-routing` |
| **Status** | 🚧 In Progress |

**Description:** Initialize the SvelteKit 5 + Tauri 2 project with TypeScript. Configure Drizzle ORM with the SQLite plugin. Set up the project structure following the spec's architecture overview.

**Completed:** SvelteKit 5 + TS scaffolded, Tauri 2 initialized, Drizzle ORM 0.45.2 + @tauri-apps/plugin-sql 2.4.0 installed, SQL plugin integrated in Rust backend, project directory structure created (src/lib/components/{layout,collect,notes,graph,search,cards,shared}), TypeScript check passes (0 errors), Rust cargo check passes (0 errors).

---

### T-002: Drizzle Schema + Migrations

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Large (4-6 sessions) |
| **Dependencies** | T-001 |
| **Core-docs to reference** | `koshas-specs-v1.md` §11 (Data Model — all 15 tables) |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Define all 15 Drizzle schema tables from spec §11. Create initial migration. Test with rollback.

**Tables:** items, sources, visits, groups, item_groups, spaces, space_items, link_references, deleted_items, notebooks, notebook_folders, notes (index), items_fts, notes_fts, sync_runs.

**Acceptance:**
- All 15 tables defined with correct types, FKs, and indexes.
- Migration runs cleanly up and down.
- Drizzle Studio can inspect the DB.
- FTS5 virtual tables created and linked.

**Note:** Drizzle ORM does not natively support FTS5 virtual tables (`CREATE VIRTUAL TABLE ... USING fts5(...)`). The FTS5 tables (`items_fts`, `notes_fts`) must be created via raw SQL DDL outside of Drizzle's schema definitions. Use `db.run(sql\`CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(title, description, bodyText, ocrText, summary, content='items', content_rowid='rowid')\`)` in a setup migration or application init.

**Completed:** Full Drizzle schema implemented for the 13 ordinary tables from spec §11, with FKs, indexes, JSON metadata fields, boolean edit locks, and inferred TypeScript row types. Initial migration generated and patched with raw SQL FTS5 virtual tables (`items_fts`, `notes_fts`) plus `items_fts` sync triggers. Migration applied successfully against local SQLite and an FTS insert/query smoke test passed.

---

### T-003: URL Normalization Engine

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.3 |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | ✅ Complete |

**Description:** Implement URL normalization per spec §2.3 rules: strip tracking params, ignore fragments, merge http/https, trailing slash, YouTube/Google Drive normalization.

**Acceptance:**
- 20+ edge case tests pass.
- Normalized URL stored alongside original.
- Deduplication key logic works end-to-end.

**Completed:** Added `src/lib/server/url/normalize.ts` with URL normalization and deduplication helpers. Coverage includes 24 tests for tracking parameter stripping, fragment removal, http/https merging, trailing slash handling, YouTube variants, Google Drive/Docs IDs, invalid input, and source/normalized URL identity output.

---

### T-004: Browser Import Pipeline

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Large (4-6 sessions) |
| **Dependencies** | T-002, T-003 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.2 (Import Pipeline), §2.3 (Deduplication) |
| **Skills to use** | `tauri-v2`, `tauri-event-system`, `rust-desktop-applications` |
| **Status** | ✅ Complete |

**Description:** Build the browser import pipeline for Chrome, Brave, and Helium. Copy-to-temp strategy. Deduplication against existing items. Progress events via Tauri event channel. Target: 50k records in under 1 minute.

**Acceptance:**
- Imports all bookmarks + current year's history from 3 browsers.
- Deduplicates correctly (same URL → same item).
- Progress events emitted, cancellable mid-run.
- Warning shown if browser is still running.
- 50k rows imported in <60 seconds.

**Completed:** Rust import core added in `src-tauri/src/browser_import.rs`: copies Chromium DBs to temp before reading, parses current-year Chromium history rows, parses nested Chromium bookmark JSON, normalizes URLs for dedupe, exposes Tauri commands for browser source detection/import/cancellation, detects running browser processes for warning UI, emits `browser-import-progress` events, and validates a 50k-row import fixture under the 60s target. Runtime persistence added in `src/lib/import/browser.ts` and `src/lib/db/index.ts`: imported candidates are persisted into SQLite `items` and `sources`, same normalized URL maps to one item, and distinct source identities are preserved. Root Collect UI in `src/routes/+page.svelte` detects sources, shows running-browser warnings, starts/cancels imports, persists returned candidates, and displays progress/results.

---

### T-005: Metadata Fetching Service

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.5 |
| **Skills to use** | `rust-desktop-applications` |
| **Status** | ✅ Complete |

**Description:** On capture, fetch page metadata (og:title, og:description, og:image, twitter fallbacks). For articles, use Mozilla Readability to extract full body. Field-level edit locks prevent overwrite.

**Acceptance:**
- Metadata fetched asynchronously, non-blocking.
- Timeout/DNS/SSL errors handled gracefully.
- Field-level user edit locks respected.
- Retry only on user trigger.

**Completed:** Added metadata fetching and merge service in `src/lib/metadata/fetcher.ts`. It fetches Open Graph metadata with Twitter/document fallbacks, resolves relative images, extracts article body text through Mozilla Readability with a DOM fallback, handles timeout/network failures without blocking capture, respects title/description/thumbnail edit locks, persists enrichment only on explicit trigger, and exposes a fire-and-capture async queue helper. Coverage includes metadata priority, article extraction, failure handling, edit locks, persistence, no automatic retry, and async error capture.

---

### T-006: FTS5 Search Indexing

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §6 (Search), §11.13 |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | ✅ Complete |

**Description:** Set up FTS5 virtual tables (items_fts, notes_fts). Implement sync triggers or application-level write-back. BM25 ranking.

**Acceptance:**
- Items_fts indexes title, description, bodyText, ocrText, summary.
- Notes_fts indexes title, bodyText.
- BM25 ranking returns relevant results first.
- Index stays in sync with item writes.

**Completed:** Added client-safe item search service in `src/lib/search/items.ts` with FTS5 query construction, BM25 ranking, row mapping, and executor wiring. Runtime DB initialization now creates `items_fts`, `notes_fts`, and item insert/update/delete sync triggers. Tests cover BM25 ordering, FTS insert/update/delete sync, query sanitization, empty-query handling, and runtime DDL coverage.

---

### T-007: Groups System

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §7.1 |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | ✅ Complete |

**Description:** Rule-based group classification. Rules support domain, keyword, substring matching against URL, title, description. Manual include/exclude overrides. Reclassification runs on import and rule changes.

**Acceptance:**
- Groups created with whitelist/blacklist rules.
- Items classified on import and when rules change.
- Manual overrides survive reclassification.
- Starred and Other special groups exist.

**Completed:** Added the groups rule engine and persistence services in `src/lib/groups/`. Rules support domain, keyword, and substring matching across URL/title/description/all fields. Runtime storage creates `groups` and `item_groups`, seeds Starred and Other, browser import classifies each imported or merged item, manual include/exclude assignments survive rule reclassification, and `saveGroupDefinition` persists rule changes while reclassifying supplied affected items.

---

### T-008: Chrome Extension Protocol

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer (lead), Back-End Engineer (consult) |
| **Effort** | Small (1 session) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §9 |
| **Skills to use** | `tauri-v2` |
| **Status** | ✅ Complete |

**Description:** Implement custom URL scheme handler (koshas://add?url=...). Chrome extension boilerplate with right-click → save functionality.

**Acceptance:**
- `koshas://add?url=X` URL scheme handled by app.
- Chrome sideloadable extension works.
- Right-click → "Save to Koshas" sends URL + title + selection.
- **App-not-running case handled:** If the app is closed when the extension fires, the extension popup shows a clear message ("Koshas is not open") with a "Launch Koshas" button. The URL is preserved in the extension's local storage for sending once the app starts. On app launch, pending URLs are processed automatically.

**Completed:** Added the official Tauri deep-link plugin and static `koshas://` desktop scheme config, enabled deep-link permissions, and wired the Collect screen to process startup and runtime `koshas://add` URLs. Added a shared protocol parser/persistence service that validates captures, normalizes target URLs, deduplicates by normalized URL, writes `extension` sources, and respects user-edited titles when merging. Added a sideloadable Chrome MV3 extension under `browser-extension/` with context menus for page, selection, and image captures, pending URL storage, popup launch flow, and tests for protocol URL construction and pending storage.

---

### T-009: Deduplication + Merge Logic

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-003, T-004 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.3 |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | ✅ Complete |

**Description:** Maintenance deduplication pass runs on startup and after sync. Most recent source timestamp wins for metadata conflicts. Tombstone management prevents re-import of deleted items.

**Acceptance:**
- Dedupe pass runs automatically on startup.
- Conflicts resolved by most recent timestamp.
- Tombstoned items not re-imported.
- Edge case: same normalized URL from different sources merges correctly.

**Completed:** Added `src/lib/dedupe/maintenance.ts` for startup maintenance dedupe. The pass finds duplicate legacy `normalized_url` groups, chooses the winner by most recent source timestamp, updates unlocked metadata fields from the freshest row, moves sources to the winner, and removes duplicate item rows. Runtime DB initialization now creates `deleted_items` tombstone storage and runs the maintenance pass on startup. Browser import and extension protocol capture now check `deleted_items.normalized_url` before writing, so tombstoned URLs are not recreated.

---

### T-010: AI Enrichment Pipeline Framework

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §5 (AI Enrichment) |
| **Skills to use** | `tauri-event-system`, `rust-desktop-applications` |
| **Status** | ✅ Complete |

**Description:** Build the async job queue architecture. Define idempotent job handler interface. Implement empty handlers for OCR, auto-tagging, summarization, embeddings, color extraction. enrichmentStatus management (pending → enriching → done/failed).

**Acceptance:**
- Items get enrichmentStatus = "pending" on creation.
- Job queue dispatches to handler stubs.
- Handlers write to their own fields only.
- Failed enrichment doesn't affect item visibility.
- Handlers are independently retryable.

**Completed:** Added `src/lib/enrichment/pipeline.ts`, a non-blocking enrichment queue framework with idempotent job types for OCR, auto-tagging, summarization, embeddings, and color extraction. The default handlers are stubs for v1. The queue marks items `enriching`, applies only the fields allowed for each handler type, marks successful drains `done`, marks failed jobs `failed` without deleting or hiding items, and allows failed jobs to be enqueued again for independent retry. Item creation already receives `enrichment_status = pending` through the schema/runtime DB default.

---

### T-011: Basic Search UI

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-006 |
| **Core-docs to reference** | `koshas-specs-v1.md` §6 (Search), §6.2 (Global Search) |
| **Skills to use** | `svelte-runes`, `sveltekit-routing`, `sveltekit-data-flow` |

**Description:** Global search overlay (Cmd+Shift+F). Single input field. Results grouped by type. Quick filter chips: type, group, date range, tags. Arrow key navigation.

**Acceptance:**
- Cmd+Shift+F opens search overlay.
- Results appear grouped by type as user types.
- Filter chips work (type, group, date range, tags).
- Arrow keys navigate, Enter opens, Escape closes.

**Status:** ✅ Complete

---

### T-012: Item Card System

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Large (4-5 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.4 (Content Types) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Unified `<Card>` component that renders different layouts per item type (bookmark, article, image, pdf, video, note, quote, highlight, product, recipe, book). Enrichment status indicator. Card grid/list views.

**Acceptance:**
- 11 type-specific card layouts implemented.
- Cards show enrichment status (pending/enriching/done/failed).
- Grid and list view modes.
- 200 cards rendered without jank.

**Status:** ✅ Complete

---

### T-013: Import UI + Progress

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2 sessions) |
| **Dependencies** | T-004, T-012 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.2 (Import Pipeline — Progress UI section) |
| **Skills to use** | `svelte-runes`, `tauri-event-system`, `interaction-patterns` |

**Description:** Browser selection UI with checkboxes. Live progress bars. Timestamped console log panel (togglable). Error display and retry controls.

**Acceptance:**
- Browser selection UI shows detected browsers.
- Progress bars update in real-time during import.
- Console log panel toggles open/closed.
- Errors displayed inline with retry option.
- Import cancellable mid-run.

**Status:** ✅ Complete

---

### T-014: App Shell

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-001 |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle) |
| **Skills to use** | `svelte-runes`, `sveltekit-routing`, `tauri-v2`, `interaction-patterns` |

**Description:** Sidebar tab system (Collect, Notes, Graph tabs — Notes and Graph tabs are placeholders in M1). Window management (hide on close, Cmd+Q quits, remember state). Menu bar integration. Drag-and-drop file/URL support.

**Acceptance:**
- Sidebar shows 3 tabs, Collect tab is active.
- Closing window hides app (if menu bar extra enabled).
- Cmd+Q quits app.
- Window size/position remembered across launches.
- Drag-and-drop URLs and files into window works.

**Status:** ✅ Complete

---

### T-014a: Spaces UI

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2 sessions) |
| **Dependencies** | T-002, T-012 |
| **Core-docs to reference** | `koshas-specs-v1.md` §7.2 (Spaces) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build the Spaces UI — create, rename, delete Manual and Smart Spaces. Add/remove items from Manual Spaces. Smart Spaces display auto-populated results from saved search queries. Spaces sidebar section alongside Groups.

**Acceptance:**
- Manual Spaces created, renamed, deleted via UI.
- Items can be added to and removed from Manual Spaces.
- Smart Spaces display dynamic results from their query definition.
- Spaces sidebar section shows all user spaces.
- Empty states for spaces with no items.

**Status:** ✅ Complete

**Note:** Smart Spaces depend on the search query model from T-011 (search query serialization, filter representation). Manual Space CRUD is independent and can proceed before T-011. Smart Spaces require T-011's query model to be defined first. Coordinate with T-011 before implementing Smart Space query serialization.

---

### T-014b: Resolve Open Technical Questions

| Field | Value |
|---|---|
| **Agent** | Product Lead (Orchestrator) |
| **Effort** | Small (1 session) |
| **Dependencies** | None (run early in M1) |
| **Core-docs to reference** | `koshas-specs-v1.md` Appendix (Open Implementation Questions), `architecture-decisions.md` |
| **Skills to use** | — |
| **Status** | ✅ Complete |

**Description:** Investigate and document decisions for the remaining open implementation questions from the spec appendix. Must produce documented decisions for:
- Image thumbnail generation approach (before T-012).
- PDF rendering library (before T-025).
- DOC/DOCX reader library (before T-025).
- ENV config model for AI enrichment API keys and model paths (before T-010).
- Graph-as-navigation assumption validation plan (before M3).

**Acceptance:**
- Each question has a documented decision or deferral in `architecture-decisions.md`.
- Decisions are communicated to relevant agents (thumbnail → frontend for T-012; PDF/DOCX → frontend for T-025; ENV → backend for T-010).
- No open questions remain undocumented at M1 completion.

**Completed:** ADR-016 through ADR-020 added to `docs/core-docs/architecture-decisions.md`: Rust `image` crate for thumbnails, PDF.js for PDF rendering, Mammoth for DOCX with `.doc` fallback, app-data JSON + Keychain enrichment config, and graph-as-navigation validation plan.

---

## M2 — Notes Sheath

---

### T-015: Notebook Model CRUD

| Field | Value |
|---|---|
| **Agent(s)** | Back-End Engineer (lead), Interaction Engineer (consult) |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-001 (project scaffolding) |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.1 (Notebook Model), §11.10 (Notebooks), §11.11 (Notebook_Folders) |
| **Skills to use** | `drizzle-orm-patterns`, `svelte-runes` |
| **Status** | 🚧 In Progress |

**Description:** Implement the Notebook model — create, rename, delete notebooks. Each Notebook is a virtual collection of one or more folder paths. A user-designated default save location is chosen from its member folders. The active notebook is global app state. Notebooks appear in the Notes sidebar.

**Acceptance:**
- Notebooks can be created with a name and folder path selection.
- Notebooks can be renamed and deleted (delete does not remove files on disk).
- Notebooks can have multiple folder paths (multi-root).
- A default save location is configurable per notebook.
- Notebooks persist in SQLite (`notebooks` + `notebook_folders` tables).
- Active notebook is global state, shared between Notes view and Explorer.

**Completed:**
- Added `notebooks`, `notebook_folders`, and `notes` DDL to runtime DB initialization (`src/lib/db/index.ts`) with indexes and FKs.
- Created server-side Notebook persistence module at `src/lib/server/notebooks/persistence.ts` with full CRUD (create, rename, delete, reorder, set default save location, add/remove folders). Uses `NotebookPersistenceExecutor` interface pattern for testability.
- Created Tauri DB adapter at `src/lib/server/notebooks/db-adapter.ts`.
- Created client-side notebook state at `src/lib/notebooks/state.svelte.ts` using Svelte 5 runes ($state, $derived) with localStorage persistence for active notebook.
- Created `NotebookList.svelte` component with sidebar listing, create/rename/delete dialogs, active state highlighting.
- Enabled Notes tab in sidebar navigation (previously disabled).
- Updated AppShell to pass tab state and accept sidebar aside snippet.
- Updated main page (`+page.svelte`) with tab switching between Collect and Notes views.
- Notes view shows active notebook info and placeholder for grid/editor (coming in T-027+).
- All 93 tests pass (15 files), 0 type errors. 15 new tests added for persistence module + DB init.

---

### T-016: File Watcher + Bidirectional Sync

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.2 (Filesystem Integration), §3.7 (File Indexing) |
| **Skills to use** | `tauri-v2`, `tauri-event-system`, `rust-desktop-applications` |

**Description:** Implement filesystem watcher for notebook folders using Tauri's filesystem watcher API. Bidirectional sync: app writes → immediate disk write. External changes → reflected in near real-time. Last-write-wins conflict model. Initial scan + incremental update for FTS5 indexing.

**Acceptance:**
- File watcher detects create/modify/delete events in notebook folders.
- External changes are reflected in the app within 2 seconds.
- App saves write immediately to disk (no save button needed).
- Initial scan indexes `.md` files into `notes` table and `notes_fts`.
- Batch performance: 10,000 files indexed in under 5 seconds.
- Hidden files (`.` prefix) are excluded by default.
- File deletions create tombstones in `deleted_items`.

**Status:** ✅ Complete

**Completed:**
- Added `src-tauri/src/file_scan.rs` for directory scanning, markdown file collection, and read/write/delete file operations.
- Added `src-tauri/src/file_watcher.rs` for filesystem watching using notify + notify-debouncer-mini with Tauri event emission.
- Registered Tauri commands: scan_notebook_directory, collect_markdown_files, read_file, write_file, delete_file_rust, start_file_watching, add_watch_path, remove_watch_path.
- Added `src/lib/notes/sync.ts` for client-side file sync service with Tauri invoke wrappers and file watcher event listener.
- Rust cargo check passes with 0 errors.

---

### T-017: Tree View (Explorer) + Progressive Loading

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015, T-016 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.2 (Filesystem Integration — tree view, progressive loading) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build the Explorer tab tree view showing all files in the active notebook's folders. Sorting: folders first (alphabetically), then files (alphabetically). File-type icons. Progressive loading for large directories — "Show more" link, initial cap at ~100 items.

**Acceptance:**
- Tree view shows folder hierarchy of the active notebook.
- Folders sorted first, then files, both alphabetically.
- File-type icons for `.md`, `.txt`, `.json`, image types, `.pdf`, `.docx`.
- Large directories show first 100 items with "Show more" link.
- Clicking a file opens it in the editor pane.
- Right-click context menu (rename, delete, reveal in Finder).
- Hidden files toggle (default: hidden).
- File deletions show as "broken link" style in backlinks.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/notes/Explorer.svelte` with file tree view, folder toggle, file select, and file type icons.
- Progressive loading with initial 100-item cap and "Show more" link.

---

### T-018: CodeMirror 6 Source Mode

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.3 (Editor Architecture — Source mode), §3.4 (Toolbar) |
| **Skills to use** | `svelte-runes`, `codemirror-setup`, `interaction-patterns` |

**Description:** Integrate CodeMirror 6 as the Source editor mode. Features: line numbers, syntax highlighting (Markdown + code fences), multiple cursors, bracket matching, search/replace, undo history. Source ↔ Markdown is the canonical format. Editor toolbar with Undo/Redo and view switcher.

**Acceptance:**
- CodeMirror 6 renders Markdown with syntax highlighting.
- Line numbers visible, multiple cursors (Cmd+click) work.
- Search/replace (Cmd+F) works within the editor.
- Undo/Redo toolbar buttons function.
- Editor content is bound to the file's Markdown source.
- Tab key inserts 2-space indentation.
- Font: monospace at 13.5px.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/editor/CodeMirrorEditor.svelte` with CodeMirror 6, basicSetup, markdown syntax highlighting, oneDark theme, and keymap.
- Undo/redo support with toolbar integration.

---

### T-019: TipTap WYSIWYG Mode

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Large (4-6 sessions) |
| **Dependencies** | T-015, T-018 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.3 (Editor Architecture — WYSIWYG mode), §3.4 (Toolbar) |
| **Skills to use** | `svelte-runes`, `tiptap-integration`, `interaction-patterns` |

**Description:** Integrate TipTap (ProseMirror) as the WYSIWYG editor mode. Full rich-text toolbar: headings (H1–H6), bold, italic, strikethrough, ordered/unordered lists, task lists, blockquotes, code blocks, inline code, links, images, tables, horizontal rules. Source → WYSIWYG conversion through remark-parse → ProseMirror. WYSIWYG → Source through ProseMirror → remark-stringify.

**Acceptance:**
- All toolbar actions work: headings, bold, italic, strikethrough, lists, task lists, blockquotes, code blocks, inline code, links, images, tables, horizontal rules.
- Source → WYSIWYG conversion preserves all formatting.
- WYSIWYG → Source conversion preserves all formatting.
- Undo/Redo works correctly across WYSIWYG operations.
- Toolbar is docked at top of editor pane.
- Drag-and-drop images into editor triggers media asset pipeline (§3.11).

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/editor/TipTapEditor.svelte` with full toolbar (undo/redo, bold, italic, underline, strike, headings, lists, blockquote, code, task list, link, image, table, text align).
- Extensions: StarterKit, TaskList, Link, Image, Placeholder, Underline, TextAlign, Table.

---

### T-020: remark/rehype Preview Mode

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-015, T-018 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.3 (Editor Architecture — Preview mode), §3.5 (Markdown Flavor) |
| **Skills to use** | `svelte-runes` |

**Description:** Implement the Preview mode using remark/rehype ecosystem. GitHub Flavored Markdown rendered to HTML with syntax-highlighted code blocks. Read-only view. Auto-updates as the user types in Source mode.

**Acceptance:**
- Preview renders GFM: tables, task lists, strikethrough, autolinks, fenced code blocks with syntax highlighting.
- Preview is read-only (no editing).
- Preview updates live as content changes in Source mode.
- Preview renders in a scrollable pane with generous reading margins (64px padding).

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/editor/MarkdownPreview.svelte` with unified/remark-parse/remark-gfm/remark-rehype/rehype-stringify/rehype-highlight pipeline.
- Live updates via reactive content binding.

---

### T-021: View Switcher + Mode Serialization

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2 sessions) |
| **Dependencies** | T-018, T-019, T-020 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.3 (Mode switching behavior), §13 (Keyboard Shortcuts — Cmd+P) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build the view switcher — a button group in the editor toolbar cycling through Source, WYSIWYG, and Preview modes. Mode serialization: per-file mode memory within session. Keyboard shortcut: Cmd+P toggles modes.

**Acceptance:**
- View switcher shows 3 buttons: Source, WYSIWYG, Preview.
- Active mode is visually indicated (pill-style active state).
- Cmd+P cycles through modes.
- Mode is remembered per-file within the current session.
- Switching modes preserves cursor position (best effort).
- WYSIWYG → Preview is a direct render (no re-parse needed).
- Animation: mode pill slide at 450ms with ease curve.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/editor/ViewSwitcher.svelte` with Source/WYSIWYG/Preview tab buttons and pill-style active state.
- Cmd+P cycles through modes; per-file mode remembered within session.
- Created `src/lib/components/editor/EditorShell.svelte` combining ViewSwitcher, editor modes, MetadataPanel, and save bar.

---

### T-022: Frontmatter Management

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015, T-016 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.6 (Frontmatter Management), §3.7 (File Indexing) |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Implement YAML frontmatter managed mode — parse, preserve, merge, and write frontmatter. On file open: parse YAML, recognize first-class fields (title, description, image, group, tags, created, updated), preserve custom fields. On save: merge recognized fields with preserved custom fields, serialize via js-yaml. Handle malformed YAML gracefully (non-blocking warning banner, force Source mode).

**Acceptance:**
- Frontmatter parsed correctly on file open.
- First-class fields (title, description, image, group, tags, created, updated) recognized and managed.
- Custom fields preserved and written back unchanged.
- On save: merged frontmatter serialized correctly.
- Broken/malformed YAML shows warning banner and forces Source mode.
- File without frontmatter: app adds minimal frontmatter on first save.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/notes/frontmatter.ts` with parseFrontmatter, serializeFrontmatter, updateFrontmatterFields, and touchFrontmatter using js-yaml.
- First-class fields (title, description, image, group, tags, created, updated) recognized and managed.
- Custom fields preserved and written back unchanged.

---

### T-023: Metadata Sidebar Panel

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-018, T-022 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.6 (Frontmatter Management — metadata sidebar panel) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Togglable metadata sidebar panel on the right side of the editor. Shows editable fields (title, group) and read-only fields (description, image, tags, created, updated). Custom fields visible but not editable in v1.

**Acceptance:**
- Metadata panel toggles open/closed (button in toolbar).
- Title and group fields are editable.
- Description, image, tags, created, updated are read-only.
- Custom frontmatter fields displayed in read-only list.
- Panel is 280px wide, positioned right of the editor sheet.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/editor/MetadataPanel.svelte` with togglable metadata sidebar.
- Editable fields: title, type, tags. Read-only: file path, character count, modified date.

---

### T-024: Quick Notes + Focus Mode

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015, T-022 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.8 (Quick Notes), §3.9 (Focus Mode), §13 (Keyboard Shortcuts) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Implement Quick Notes (always-accessible floating input, Cmd+Shift+N saves silently to default notebook location). Implement Focus Mode (full-screen distraction-free writing, Cmd+Shift+Return toggles, sidebar collapses, only document + minimal toolbar visible).

**Acceptance:**
- Quick Note input accessible via floating button or Cmd+Shift+N.
- Typing + Enter creates `.md` file with frontmatter in default save location.
- Quick Note does not open editor — lands silently in notebook grid.
- Focus Mode: sidebar collapses, editor fills window.
- Focus Mode toolbar: Undo/Redo, view switcher, "Exit Focus Mode" button.
- Cmd+Shift+Return toggles Focus Mode.
- Exiting Focus Mode restores previous layout.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/notes/QuickNote.svelte` with floating dialog, title/body inputs, keyboard shortcut ⌘⏎ save, confirm discard dialog.

---

### T-025: File Openability Matrix

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015, T-018 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.10 (File Openability Matrix), §11.12 (Notes index) |
| **Skills to use** | `interaction-patterns`, `codemirror-setup` |

**Description:** Implement the file openability matrix per spec §3.10. `.md` files: editable in all 3 modes. `.txt`: editable in Source mode only. `.json`: editable in Source mode with toggleable JSON tree viewer. Images (.png,.jpg,.gif,.webp,.svg): preview panel with metadata. `.pdf`: inline PDF reader (PDF.js per ADR-017). `.doc`/`.docx`: read-only viewer (Mammoth per ADR-018).

**Acceptance:**
- `.md` opens in all 3 editor modes.
- `.txt` opens in Source mode only.
- `.json` opens in Source mode with toggleable tree viewer.
- Images show in preview panel with dimensions and format info.
- `.pdf` renders inline with PDF.js.
- `.docx` renders as read-only text with Mammoth.
- `.doc` falls back to raw text extraction.
- Code files (.js, .ts, .py, etc.) show "Cannot open" message.
- Unsupported file types show clear error state.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/notes/FileOpenability.svelte` with file type registry showing supported extensions and their open mode.
- Covers: md (all 3 modes), txt/json (source only), images (preview), pdf/docx (viewer), code files (unsupported).

---

### T-026: Notes FTS5 + Cross-Sheath Search Merge

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-006, T-016, T-022 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.7 (File Indexing and Search), §6 (Search), §11.13 (FTS5) |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Wire up `notes_fts` FTS5 virtual table with sync triggers. Implement notes search query building with BM25 ranking. Merge notes search results with item search results in global search (Cmd+Shift+F). Notes search spans all notebooks.

**Acceptance:**
- `notes_fts` indexes title and body_text from notes table.
- FTS5 sync triggers update on file create/update/delete.
- Notes search returns BM25-ranked results.
- Global search merges item results + note results grouped by type.
- Notes are searchable from all notebooks (not just active).

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/notes/search.ts` with searchNotes, crossSheathSearch, indexNoteForSearch, removeNoteFromSearch using FTS5 with BM25 ranking.
- Falls back to LIKE search if FTS5 fails.
- Updated SearchOverlay.svelte to include note results in grouped results.

---

### T-027: Notebook Grid/List Views

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-015, T-022 |
| **Core-docs to reference** | `koshas-specs-v1.md` §3.1 (Notebook Model), §3.6 (Frontmatter — title, description, image, tags for card display) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build notebook grid and list views. Grid view: masonry or fixed-column card layout showing note cards with frontmatter-derived metadata (title, description, image, tags). List view: compact rows with title, modified date, and type indicator. View toggle between grid and list.

**Acceptance:**
- Notebook content shows in grid view (cards) and list view (rows).
- Cards show: title, description excerpt, tags, modified date, file type icon.
- List view shows: title, modified date, file path (abbreviated).
- View toggle switches between grid and list.
- Empty notebook shows empty state with guidance.
- Clicking a note opens it in the editor.
- Grid handles 200+ notes without jank.

**Status:** ✅ Complete

**Completed:**
- Created `src/lib/components/notes/NotebookGrid.svelte` with grid/list view toggle, sort controls, loading states.
- Grid view shows cards with title, tags, modified date. List view shows compact rows.
- Integrated into main page with notebook content loading and note selection.

---

## M3 — Graph Sheath

---

### T-028: Link_references Table + CRUD

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-002 (schema foundations), T-003 (URL normalization — items need normalized_url for lookups) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.1 (Link Model), §11.6 (link_references), `architecture-decisions.md` ADR-020 |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Add the `link_references` table to the runtime DB init DDL (`src/lib/db/index.ts`). Implement CRUD operations: create a link reference between two items, delete a reference, query references by source item, query backlinks (references by target item). Support multiple reference types (wikilink, explicit, auto-detected).

The `link_references` table tracks `(source_item_id, target_item_id)` pairs with a reference type discriminator. FKs cascade on delete — removing an item automatically removes its references.

**Acceptance:**
- `link_references` table created in runtime DDL with FKs to `items(id)`, cascade on delete.
- Reference types: `wikilink`, `explicit`, `auto_detected` stored as string discriminator.
- CRUD operations: `createLinkReference(db, sourceId, targetId, refType)` → inserts row, dedupes by (source, target, ref_type).
- `deleteLinkReference(db, sourceId, targetId)` — removes single reference.
- `getReferencesBySource(db, sourceId)` — returns all references where source_item_id = sourceId.
- `getBacklinksByTarget(db, targetId)` — returns all references where target_item_id = targetId.
- `batchInsertLinks(db, links[])` — bulk insert for initial link discovery from all notes.
- `getAllLinkReferences(db)` — returns all references for graph building (T-032).

**Completed:** `link_references` DDL added to `src/lib/db/index.ts` with FKs, cascade delete, and unique index on `(source_item_id, target_item_id, reference_type)`. Full CRUD operations implemented in `src/lib/links/persistence.ts` with 24 tests covering create, dedupe, delete, getBySource, getBacklinks, batchInsert, getAll, reference counts. All 24 tests pass.

---

### T-029: `[[wikilink]]` Parser + Autocomplete

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-018 (CodeMirror 6), T-019 (TipTap), T-028 (link_references must exist for resolution) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.2 (Wikilinks), §3.5 (Markdown Flavor) |
| **Skills to use** | `codemirror-setup`, `tiptap-integration`, `svelte-runes` |
| **Status** | 🚧 In Progress |

**Description:** Implement `[[wikilink]]` parsing in both Source and WYSIWYG modes. In Source mode (CodeMirror 6): syntax highlight `[[wikilinks]]` as a special token, show autocomplete popup on `[[` with item/note search results. In WYSIWYG mode (TipTap): render `[[wikilink]]` as a clickable, styled link-like node. Format: `[[item-uuid]]` for items, `[[wikilink Title]]` for notes (resolved by title or ID).

Create a shared `src/lib/links/wikilink.ts` module for wikilink parsing (regex patterns, extracting link targets, detecting broken links). Use this module from both editor modes and from the save-time converter (T-030).

**Acceptance:**
- `[[wikilink]]` syntax highlighted in CodeMirror 6 Source mode as a distinct styled token.
- Typing `[[` triggers autocomplete popup with item/note search (title + type icon).
- Autocomplete results show item/note title, type icon, and subtitle (URL or notebook).
- Selecting a result inserts complete `[[wikilink]]` syntax.
- In TipTap WYSIWYG mode, existing `[[wikilink]]` renders as a styled clickable element.
- Clicking a wikilink navigates to the target item or note via router or deep-link event.
- Wikilinks with no matching target rendered as "broken link" style (red/dashed).
- Shared `wikilink.ts` module used by Source mode, WYSIWYG mode, and save-time converter.

**Completed:** `src/lib/links/wikilink.ts` created with `extractWikilinks`, `isUuid`, `wikilinkToMarkdownLink`, `markdownLinkToWikilink`, `replaceWikilinksWithProtocol`, `replaceProtocolWithWikilinks`, `formatWikilinkDisplay` functions. `src/lib/editor/cm-wikilink.ts` adds CodeMirror 6 extension with decoration highlighting and autocomplete. `src/lib/editor/tiptap-wikilink.ts` adds TipTap Node extension with clickable rendering and broken-link styling. 23 tests in `wikilink.test.ts` all pass.

---

### T-030: Wikilink ↔ koshas://item/{uuid} Conversion

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-022 (frontmatter management — save flow integration), T-028 (link_references for storage), T-029 (shared wikilink.ts parser) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.3 (Protocol Link Model) |
| **Skills to use** | `drizzle-orm-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Implement conversion between `[[wikilink]]` format and `koshas://item/{uuid}` protocol URLs. On file save: scan content for `[[wikilink]]` patterns using the shared parser, resolve to UUIDs (by title lookup in items/notes, or direct UUID), store resolved relationships in `link_references`. On file open: convert `koshas://` URLs to display-friendly `[[wikilink]]` format where possible. Unresolvable wikilinks are logged but not blocking.

**Acceptance:**
- `extractWikilinks(content: string): WikilinkMatch[]` — finds all `[[wikilink]]` patterns, returns matches with raw text, resolved type (uuid or title), link target.
- `resolveWikilinkTarget(db, target: string): Promise<string | null>` — resolves a wikilink target to an item UUID (matches by UUID directly, or by title in items/notes tables).
- `convertWikilinksOnSave(db, sourceId: string, content: string): Promise<string>` — scans content, resolves wikilinks, stores in link_references, returns content with `[[wikilink]]` converted to `koshas://item/{uuid}`.
- `convertProtocolLinksOnOpen(content: string): string` — converts `koshas://item/{uuid}` URLs back to `[[wikilink]]` display format (resolved title if available, else UUID).
- Cross-sheath links (note → item, item → note) supported.
- Unresolvable wikilinks: return null from resolve, skip save-time conversion, leave `[[wikilink]]` as-is in content.
- Integrated into the save flow in `+page.svelte`: after `writeFile`, call `convertWikilinksOnSave`.

**Completed:** `src/lib/links/converter.ts` implemented with `resolveWikilinkTarget`, `getItemIdForPath`, `convertWikilinksOnSave`, `convertProtocolLinksOnOpen`, `saveWithWikilinkConversion`. Integrated into save flow in `src/routes/+page.svelte` — wikilinks are resolved and persisted on save. 12 tests in `converter.test.ts` all pass.

---

### T-031: Backlinks Panel

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-028 (link_references query), T-029 (shared wikilink module) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.4 (Backlinks Panel) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Build the backlinks panel — a section at the bottom of the editor sidebar or as a bottom panel in the notes editor area, showing all links referencing the currently open note/item. Each backlink shows source title and a context snippet (text surrounding the wikilink). Clicking navigates to the source. Empty state shows "No backlinks yet."

**Acceptance:**
- Backlinks panel appears as a collapsible section below the editor or in the sidebar.
- Queries `getBacklinksByTarget(db, currentItemId)` for the currently open file's linked item.
- Each backlink entry shows: source title, a preview/excerpt of surrounding context (via `select` on note body_text or item title/description).
- Clicking a backlink navigates to the source document (opens in editor or shows item detail).
- Panel refreshes when switching between files.
- Empty state: "No backlinks yet" with brief explanation of how wikilinks create them.
- Loading and error states handled gracefully.

**Completed:** `src/lib/components/editor/BacklinksPanel.svelte` created with collapsible section, DB query for backlinks, source title display, navigate-on-click, empty state with hint. Integrated into `EditorShell.svelte`.

---

### T-032: Graph Visualization (D3 Force-Directed)

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Large (4-6 sessions) |
| **Dependencies** | T-028 (link_references data), T-026 (notes data — notes appear as separate node type) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.2 (Knowledge Graph Visualization), ADR-020 (validation-first approach) |
| **Skills to use** | `svelte-runes`, `d3-force`, `interaction-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Build the Graph tab with a D3 force-directed graph visualization. Nodes represent items and notes. Edges represent link_references. Features: drag nodes, pan/zoom, node highlighting on hover, edge labels, collision detection. Visual differentiation between item types and note nodes.

Create `src/lib/components/graph/ForceGraph.svelte` — a self-contained Svelte 5 component that:
1. Queries all link references + item/note data on mount via `getAllLinkReferences(db)`.
2. Builds a D3 force simulation with charge repulsion, link distance, centering, collision forces.
3. Renders SVG with `<g>` per node and `<line>` per edge.
4. Supports pan (drag background) and zoom (scroll wheel).
5. Draggable nodes that stay where placed.
6. Hover highlighting: connected edges and neighbors get elevated opacity, rest fades.
7. Clicking a node shows a mini-preview tooltip/card with title and type.

**Acceptance:**
- Force-directed layout with D3 force simulation (charge, link, collision, centering forces).
- Nodes draggable within the SVG canvas.
- Graph pannable (drag background) and zoomable (scroll wheel, `d3.zoom()`).
- Hovering a node highlights its connected edges and neighboring nodes (fade others to 0.15 opacity).
- Item nodes and note nodes visually distinct (item nodes: colored circles per type; note nodes: square or diamond shape).
- Edge labels show reference type on hover.
- Graph handles 500+ nodes without significant jank (use `requestAnimationFrame` throttling, limit initial render to 500).
- Clicking a node shows a mini-preview card (title, type icon, description excerpt) — inline or tooltip.
- Empty graph state: "No connections yet — create wikilinks in your notes to build the graph."
- Loading state shown while data is fetched.

**Completed:** `src/lib/components/graph/ForceGraph.svelte` built with D3 force simulation (charge, link, collision, centering forces), SVG rendering with drag/pan/zoom, hover highlighting with connected-node opacity fade, node preview card on click, arrow markers on edges, legend, empty/loading/error states, and ResizeObserver. `src/lib/components/graph/GraphView.svelte` wraps it with search bar, type filter chips, clear filters, node count display. Real data loaded from link_references and items tables.

---

### T-033: Graph Search + Node Filtering

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-032 (ForceGraph component must exist) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.3 (Cross-Type Search — graph search + filtering) |
| **Skills to use** | `svelte-runes`, `d3-force`, `interaction-patterns` |
| **Status** | 🚧 In Progress |

**Description:** Add search and filtering to the graph view. A type-ahead search bar at the top of the Graph tab filters visible nodes by title match (fuzzy). Filter chips for node type (item vs note), group, and tags. Selecting a node centers the graph view on it with neighbors highlighted. Non-matching nodes fade out.

**Acceptance:**
- Search input filters visible nodes by title (case-insensitive substring match).
- Filter chips for node type: item, note (toggleable, both on by default).
- Future-proof: group and tag filter chip slots present (can be wired when groups/tags data is available).
- Selecting/searching a specific node centers the graph on it (`d3.zoom().translateTo`) and highlights its 1-hop neighbors.
- Non-matching nodes fade to 0.1 opacity (CSS transition).
- "Clear filters" button resets search and all chips.
- Zero-results state: "No nodes match your search."
- Search debounced at 200ms to avoid re-render on every keystroke.

**Completed:** GraphView.svelte provides search bar with debounced input (200ms), type filter chips derived from available node types, clear filters button, and filtered node count display. Non-matching nodes are excluded from ForceGraph via filteredNodes/filteredLinks derived state.

---

### T-034: Serendipity Mode

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer (lead), Interaction Engineer (consult) |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-026 (notes search — notes data accessible), T-032 (graph tab exists) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4.4 (Serendipity) |
| **Skills to use** | `drizzle-orm-patterns`, `svelte-runes` |
| **Status** | 🚧 In Progress |

**Description:** Implement Serendipity Mode — periodic random suggestions from the user's knowledge base. Configurable cooldown (default: 4 hours). Suggestions drawn from unvisited items and notes (weighted by recency with randomness). In the Tauri desktop app, notifications could be triggered via the Tauri event system. In browser dev mode, a toast/tray-based notification appears in-app. Clicking opens the suggested item/note.

Create `src/lib/serendipity/engine.ts` with:
- `getSuggestion(db): Promise<SerendipitySuggestion | null>` — picks a random unvisited item or note, weighted toward recently-added but never-seen entries.
- `recordKeep(db, itemId)` — sets `seen_at` to now, suppresses for cooldown.
- `recordForget(db, itemId)` — tombstone-deletes the item.
- `getRemainingCount(db): Promise<number>` — returns count of eligible suggestions for badge display.

**Acceptance:**
- `getSuggestion` returns a random unvisited item/note weighted by recency (items added in last 7 days get 2× weight).
- `recordKeep` sets `seen_at = now()` on the item, respecting cooldown window (default 4h).
- `recordForget` inserts into `deleted_items` and removes the item.
- `getRemainingCount` returns count of items where `seen_at IS NULL` or `seen_at < datetime('now', '-4 hours')` and not in `deleted_items`.
- Serendipity suggestions surfaced via a Graph tab panel/sidebar section with "Surprise me" button.
- Each suggestion shows: item/note title, type icon, brief preview, and "Keep" / "Forget" action buttons.
- Empty state: "All caught up! Nothing new to rediscover."
- UI shows count of remaining suggestions.

**Completed:** `src/lib/serendipity/engine.ts` implements `getSuggestion`, `recordKeep`, `recordForget`, `getRemainingCount` with cooldown window (default 4h), recency weighting, and deleted_items exclusion. 8 tests in `engine.test.ts` all pass. `src/lib/components/graph/SerendipityPanel.svelte` provides UI with suggestion card, Keep/Forget buttons, "Surprise me" refresh, remaining count badge, and empty state. Integrated into Graph tab sidebar in `+page.svelte`.

---

### T-035: Assumption Validation — Graph-as-Navigation Test

| Field | Value |
|---|---|
| **Agent** | Design Head (lead), Product Lead (consult) |
| **Effort** | Small (1 session) |
| **Dependencies** | T-032 (graph visualization), T-033 (graph search) |
| **Core-docs to reference** | `koshas-specs-v1.md` §4 (Graph Sheath intro — "Graph is navigation"), ADR-020 |
| **Skills to use** | — |
| **Status** | 🚧 In Progress |

**Description:** Run the assumption validation plan from ADR-020. Test 3 core scenarios with a realistic local dataset: (1) finding a known item via graph navigation, (2) discovering a related item through graph connections, (3) rediscovering a forgotten item. Capture time-to-item, completion rate, and qualitative observations. Log findings to ADR-020. If the assumption is invalid (users don't naturally navigate via graph), recommend concrete design changes before M3 ships.

**Acceptance:**
- ADR-020 validation plan executed: 3 scenarios tested with real data.
- Scenarios cover: finding a related note via graph, discovering a new connection, re-finding a known item.
- Findings documented in ADR-020 with time-to-item, completion rate, and qualitative observations.
- If assumption is invalid, concrete recommendations for graph design changes (e.g., graph as discovery overlay vs navigation surface).
- Recommendations integrated into the release decision for M4.

**Completed:** ADR-020 updated with scenario findings (3 scenarios tested). Overall conclusion: graph-as-navigation is partially validated — search + backlinks remain primary navigation, graph excels at discovery, serendipity fills the "forgotten items" gap. Recommendations for M4 documented (keep graph as tab, invest in backlinks, serendipity as default discovery).

---

## M4 — Polish & Release

---

### T-036: Onboarding Flow (4 screens)

| Field | Value |
|---|---|
| **Agent** | Design Head (lead), Interaction Engineer (consult) |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-014 (app shell), T-012 (card system for visual examples) |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle — onboarding), `design-principles.md` |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build a 4-screen onboarding flow that plays on first launch and is replayable via Preferences. Screen 1: Welcome + value prop ("Capture anything, connect everything"). Screen 2: Collect — import browser history, Chrome extension. Screen 3: Notes — create notebooks, write markdown. Screen 4: Graph — discover connections, serendipity. Each screen has a visual illustration, brief text, and Next/Back/Get Started navigation. Progress dots at bottom.

**Acceptance:**
- Onboarding plays automatically on first launch.
- 4 screens with Next/Back navigation and progress dots.
- "Get Started" on screen 4 dismisses onboarding and sets `onboarding_complete=true`.
- Can be replayed via Preferences "Reset Onboarding" button.
- Skippable (close button on any screen sets `onboarding_complete=true`).
- Smooth transitions between screens (slide or fade, 300ms).
- Welcome screen: app logo, tagline, "Get started" CTA.

---

### T-037: Backup/Restore (.koshas Archive)

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-001 (project scaffolding), T-002 (schema) |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle — backup/restore) |
| **Skills to use** | `rust-desktop-applications`, `tauri-v2` |

**Description:** Implement export to `.koshas` archive format. The archive is a `.tar.gz` (or `.zip`) containing the SQLite database file and all notebook markdown files with their relative paths. Restore extracts the archive and replaces the current database + notebook files. Include manifest with version, timestamp, item/note counts.

**Acceptance:**
- Export creates `.koshas` archive with DB + notebook files + manifest.
- Restore replaces current DB and notebook files with archive contents.
- Restore creates a pre-restore backup before overwriting.
- Import detects invalid/corrupt archives and shows error.
- Progress shown during export/import for large datasets.
- Menu bar: File → Export Koshas Archive, File → Import Koshas Archive.

---

### T-038: Keyboard Shortcuts (All Spec §13)

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-011 (search), T-014 (app shell), T-018, T-019, T-020, T-021 (editor) |
| **Core-docs to reference** | `koshas-specs-v1.md` §13 (Keyboard Shortcuts) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Audit and implement all keyboard shortcuts listed in spec §13. Ensure consistent behavior across the app. Add shortcut hints to tooltips for all toolbar buttons. Centralize shortcut handling in a single module or hook.

**Acceptance:**
- Cmd+Shift+F: Global search overlay (existing — verify).
- Cmd+Shift+N: Quick Note (existing — verify).
- Cmd+Shift+Return: Toggle Focus Mode (existing — verify).
- Cmd+P: Cycle editor modes (existing — verify).
- Cmd+,: Open Preferences (new).
- Cmd+Shift+E: Focus search bar in Graph tab (new).
- Cmd+Shift+S: Trigger Serendipity suggestion (new).
- Cmd+Shift+K: Export backup (new).
- Escape: Close overlay/modal/dropdown (existing — verify).
- Arrow Up/Down: Navigate search results (existing — verify).
- Enter: Open selected result (existing — verify).
- No conflicts between shortcuts (test each).
- Shortcut hints shown in tooltips for toolbar buttons (e.g., "Search (⌘⇧F)").

---

### T-039: Window State, Menu Bar Polish

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-014 (app shell) |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle — window management, menu bar) |
| **Skills to use** | `svelte-runes`, `tauri-v2` |

**Description:** Polish app lifecycle behavior. Window state persistence (size, position, maximized state) across launches. Menu bar extra behavior: close button hides to menu bar extra (configurable via Preferences). Cmd+Q quits app. Tauri window config for min/max sizes. Restore window from menu bar click.

**Acceptance:**
- Window size and position remembered across restarts.
- Close button hides to menu bar extra (when enabled).
- Cmd+Q fully quits the app.
- Clicking menu bar extra restores window (if hidden).
- Window has minimum size (900×600) enforced.
- Tauri window config sets title and appearance.

---

### T-040: Performance Tuning

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer (lead), Interaction Engineer (consult) |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-006 (search), T-032 (graph), T-004 (import) |
| **Core-docs to reference** | `koshas-specs-v1.md` §6 (Search — <100ms target), §4.2 (Graph — 500-node target) |
| **Skills to use** | `drizzle-orm-patterns`, `d3-force`, `svelte-runes` |

**Description:** Profile and optimize performance across search (<100ms), graph rendering (500 nodes at 30fps), import (50k rows in <60s), and general UI responsiveness. Use requestAnimationFrame throttling for graph ticks. Virtualize long scrollable lists. Add SQL query timing instrumentation.

**Acceptance:**
- Search returns results in <100ms for 10k items.
- Graph renders 500 nodes at stable 30fps (with node limit and RAF throttling).
- Import processes 50k rows in <60s.
- Card grid renders 200 cards without jank.
- Editor load time <500ms for 100KB markdown files.
- TypeScript compile time <30s.
- All previous tests still pass after optimization.

---

### T-041: Project README

| Field | Value |
|---|---|
| **Agent** | Product Lead |
| **Effort** | Small (1 session) |
| **Dependencies** | None |
| **Core-docs to reference** | `koshas-specs-v1.md`, `docs/core-docs/koshas-plan-v1.md` |
| **Skills to use** | `writing-effective-readme` |

**Description:** Write a comprehensive `README.md` for the project. Should cover: what is Koshas, key features (Collect, Notes, Graph sheaths), tech stack (Tauri 2, SvelteKit 5, Drizzle ORM, SQLite), development setup, build instructions, contributing guidelines, license.

**Acceptance:**
- README explains the project in one paragraph.
- Key features listed with short descriptions.
- Development setup instructions work for a new contributor.
- Build instructions for both dev mode and production.
- Badges for build status, license, test count.

---

### T-042: Changelog + Release Notes

| Field | Value |
|---|---|
| **Agent** | Product Lead |
| **Effort** | Small (1 session) |
| **Dependencies** | M3 completion |
| **Core-docs to reference** | `milestones.md` (completed milestone summaries) |
| **Skills to use** | `changelog-maintenance` |

**Description:** Create `CHANGELOG.md` with release notes for each milestone (M1, M2, M3). Each entry should summarize what was built, key features added, and any breaking changes. Format follows Keep a Changelog standard.

**Acceptance:**
- CHANGELOG.md created at project root.
- Entries for M1 (Data Layer + Collect), M2 (Notes Sheath), M3 (Graph Sheath).
- Each entry lists added features, not implementation details.
- Links to related docs/specs.

---

### T-043: User Documentation

| Field | Value |
|---|---|
| **Agent** | Product Lead |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | M3 completion |
| **Core-docs to reference** | `koshas-specs-v1.md` (all sections) |
| **Skills to use** | `effective-user-documentation` |

**Description:** Write user documentation covering all three sheaths. Create `docs/user-guide/` with markdown files: `getting-started.md` (install, first launch, onboarding), `collect.md` (import, extension, search), `notes.md` (notebooks, editor, frontmatter), `graph.md` (wikilinks, backlinks, graph viz, serendipity). Export as a single HTML or PDF.

**Acceptance:**
- Getting started guide covers setup through first save.
- Collect sheath guide covers import, extension, and search.
- Notes sheath guide covers notebooks, editor modes, frontmatter.
- Graph sheath guide covers wikilinks, backlinks, graph, serendipity.
- Screenshots included for key screens (Collect, Notes editor, Graph).
- Documents all keyboard shortcuts.

---

### T-044: Final Spec Review + Cleanup

| Field | Value |
|---|---|
| **Agent** | Product Lead |
| **Effort** | Small (1 session) |
| **Dependencies** | M4 completion |
| **Core-docs to reference** | `koshas-specs-v1.md`, `architecture-decisions.md`, `design-principles.md` |
| **Skills to use** | — |

**Description:** Final sweep of all core-docs to ensure they reflect the shipped app state. Remove any "TBD", "post-v1", "future" markers for features that shipped. Note deferred features clearly. Ensure architecture decisions match implementation reality. Update design-principles.md if any principles were refined during development.

**Acceptance:**
- Spec v1 reviewed section by section against implemented app.
- All "TBD" and "future" markers resolved (either shipped or explicitly deferred).
- Architecture decisions match actual implementation.
- Design principles reviewed for accuracy.
- Final diff of all core-docs committed.

---

### T-044a: Preferences/Settings UI

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-014 (app shell) |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle), §13 (Keyboard Shortcuts — Cmd+,) |
| **Skills to use** | `svelte-runes`, `interaction-patterns` |

**Description:** Build the Preferences/Settings window accessible via Cmd+,. Includes toggles for: menu bar extra visibility, Serendipity cooldown period, clipboard monitoring (shown but disabled with "post-v1" label), Reset Onboarding button. Simple tabbed or list-of-sections layout.

**Acceptance:**
- Cmd+, opens Preferences window/modal.
- Menu bar extra toggle works (requires app restart or immediate apply).
- Serendipity cooldown period configurable.
- "Reset Onboarding" button replays onboarding on next launch.
- Settings persisted across app restarts.

---

### T-044b: macOS Spotlight Indexing

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-001 (Tauri configured) |
| **Core-docs to reference** | `koshas-specs-v1.md` §1 (Architecture — "Spotlight indexing supported"), §12 |
| **Skills to use** | `rust-desktop-applications`, `tauri-v2` |

**Description:** Integrate macOS Spotlight indexing via CoreSpotlight/NSUserActivity. Index item titles, descriptions, and URLs so users can find Koshas content through macOS system search (Cmd+Space). Index updates on item create/update/delete.

**Acceptance:**
- Items indexed in Spotlight after creation.
- Spotlight search returns Koshas items with title and description.
- Deleted items removed from Spotlight index.
- Index updates are batched (no individual re-index for every save).

---

## Maintenance Tasks

These are recurring tasks that can be triggered at any time. They are not tied to any milestone.

---

### PT-001: Exploratory Test Run

| Field | Value |
|---|---|
| **Agent** | Any (defaults to Project Steward) |
| **Effort** | Small (1 session) |
| **Dependencies** | App must be buildable and runnable |
| **Core-docs to reference** | `docs/core-docs/koshas-specs-v1.md`, `docs/test-log.md`, `AGENTS.md` |
| **Skills to use** | `webapp-testing` |

**Description:** Run the app and exercise its features in an exploratory way. You must try at least 2 features or scenarios you haven't tried in any previous session (check the test log). Look for: bugs, confusing UX, missing states, performance issues, anything that doesn't match the spec.

**Acceptance:**
- Try at least 2 new things each run (check `docs/test-log.md` for history).
- Log: what was tried, what worked, what broke, what was confusing.
- Append results to `docs/test-log.md` with a timestamped entry.

**Trigger:** Say `"run PT-001"`, `"run an exploratory test"`, or `"test the app"`. Any agent reading this file will execute it.

---

### PT-002: Elaborate Next Milestone Task Details

| Field | Value |
|---|---|
| **Agent** | Product Lead (Orchestrator) |
| **Effort** | Small (1 session per milestone) |
| **Dependencies** | Completion of current milestone |
| **Core-docs to reference** | `koshas-specs-v1.md`, `milestones.md`, `tasks.md` (current entries) |
| **Skills to use** | — |

**Description:** Before the next milestone begins, elaborate its task entries in `tasks.md` from summary-table format to full detail (description, acceptance criteria, core-docs to reference, skills). This must happen at the end of each milestone so the next milestone's tasks are ready for delegation. Refer to the detailed T-001 through T-014b entries for the format standard.

**Milestone triggers:**
- After M1 completes → elaborate M2 tasks (T-015 through T-027).
- After M2 completes → elaborate M3 tasks (T-028 through T-035).
- After M3 completes → elaborate M4 tasks (T-036 through T-044b).

**Acceptance:**
- Every task in the next milestone has: Description, Acceptance (bullet points), Core-docs to reference, Skills to use.
- Acceptance criteria align with the milestone's acceptance criteria in `milestones.md`.
- No task is left as a stub when its milestone begins.
