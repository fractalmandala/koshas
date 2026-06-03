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
| **Status** | ✅ Complete |

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

**Description:** Define all 15 Drizzle schema tables from spec §11. Create initial migration. Test with rollback.

**Tables:** items, sources, visits, groups, item_groups, spaces, space_items, link_references, deleted_items, notebooks, notebook_folders, notes (index), items_fts, notes_fts, sync_runs.

**Acceptance:**
- All 15 tables defined with correct types, FKs, and indexes.
- Migration runs cleanly up and down.
- Drizzle Studio can inspect the DB.
- FTS5 virtual tables created and linked.

---

### T-003: URL Normalization Engine

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.3 |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Implement URL normalization per spec §2.3 rules: strip tracking params, ignore fragments, merge http/https, trailing slash, YouTube/Google Drive normalization.

**Acceptance:**
- 20+ edge case tests pass.
- Normalized URL stored alongside original.
- Deduplication key logic works end-to-end.

---

### T-004: Browser Import Pipeline

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Large (4-6 sessions) |
| **Dependencies** | T-002, T-003 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.2 (Import Pipeline), §2.3 (Deduplication) |
| **Skills to use** | `tauri-v2`, `tauri-event-system`, `rust-desktop-applications` |

**Description:** Build the browser import pipeline for Chrome, Brave, and Helium. Copy-to-temp strategy. Deduplication against existing items. Progress events via Tauri event channel. Target: 50k records in under 1 minute.

**Acceptance:**
- Imports all bookmarks + current year's history from 3 browsers.
- Deduplicates correctly (same URL → same item).
- Progress events emitted, cancellable mid-run.
- Warning shown if browser is still running.
- 50k rows imported in <60 seconds.

---

### T-005: Metadata Fetching Service

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.5 |
| **Skills to use** | `rust-desktop-applications` |

**Description:** On capture, fetch page metadata (og:title, og:description, og:image, twitter fallbacks). For articles, use Mozilla Readability to extract full body. Field-level edit locks prevent overwrite.

**Acceptance:**
- Metadata fetched asynchronously, non-blocking.
- Timeout/DNS/SSL errors handled gracefully.
- Field-level user edit locks respected.
- Retry only on user trigger.

---

### T-006: FTS5 Search Indexing

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §6 (Search), §11.13 |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Set up FTS5 virtual tables (items_fts, notes_fts). Implement sync triggers or application-level write-back. BM25 ranking.

**Acceptance:**
- Items_fts indexes title, description, bodyText, ocrText, summary.
- Notes_fts indexes title, bodyText.
- BM25 ranking returns relevant results first.
- Index stays in sync with item writes.

---

### T-007: Groups System

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §7.1 |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Rule-based group classification. Rules support domain, keyword, substring matching against URL, title, description. Manual include/exclude overrides. Reclassification runs on import and rule changes.

**Acceptance:**
- Groups created with whitelist/blacklist rules.
- Items classified on import and when rules change.
- Manual overrides survive reclassification.
- Starred and Other special groups exist.

---

### T-008: Chrome Extension Protocol

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer (lead), Back-End Engineer (consult) |
| **Effort** | Small (1 session) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §9 |
| **Skills to use** | `tauri-v2` |

**Description:** Implement custom URL scheme handler (koshas://add?url=...). Chrome extension boilerplate with right-click → save functionality.

**Acceptance:**
- `koshas://add?url=X` URL scheme handled by app.
- Chrome sideloadable extension works.
- Right-click → "Save to Koshas" sends URL + title + selection.

---

### T-009: Deduplication + Merge Logic

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Small (1 session) |
| **Dependencies** | T-003, T-004 |
| **Core-docs to reference** | `koshas-specs-v1.md` §2.3 |
| **Skills to use** | `drizzle-orm-patterns` |

**Description:** Maintenance deduplication pass runs on startup and after sync. Most recent source timestamp wins for metadata conflicts. Tombstone management prevents re-import of deleted items.

**Acceptance:**
- Dedupe pass runs automatically on startup.
- Conflicts resolved by most recent timestamp.
- Tombstoned items not re-imported.
- Edge case: same normalized URL from different sources merges correctly.

---

### T-010: AI Enrichment Pipeline Framework

| Field | Value |
|---|---|
| **Agent** | Back-End Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-002 |
| **Core-docs to reference** | `koshas-specs-v1.md` §5 (AI Enrichment) |
| **Skills to use** | `tauri-event-system`, `rust-desktop-applications` |

**Description:** Build the async job queue architecture. Define idempotent job handler interface. Implement empty handlers for OCR, auto-tagging, summarization, embeddings, color extraction. enrichmentStatus management (pending → enriching → done/failed).

**Acceptance:**
- Items get enrichmentStatus = "pending" on creation.
- Job queue dispatches to handler stubs.
- Handlers write to their own fields only.
- Failed enrichment doesn't affect item visibility.
- Handlers are independently retryable.

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

---

### T-014: App Shell

| Field | Value |
|---|---|
| **Agent** | Interaction Engineer |
| **Effort** | Medium (2-3 sessions) |
| **Dependencies** | T-001 |
| **Core-docs to reference** | `koshas-specs-v1.md` §12 (App Lifecycle) |
| **Skills to use** | `svelte-runes`, `sveltekit-routing`, `tauri-v2` |

**Description:** Sidebar tab system (Collect, Notes, Graph tabs — Notes and Graph tabs are placeholders in M1). Window management (hide on close, Cmd+Q quits, remember state). Menu bar integration. Drag-and-drop file/URL support.

**Acceptance:**
- Sidebar shows 3 tabs, Collect tab is active.
- Closing window hides app (if menu bar extra enabled).
- Cmd+Q quits app.
- Window size/position remembered across launches.
- Drag-and-drop URLs and files into window works.

---

## M2 — Notes Sheath

*Task details (T-015 through T-027) will be elaborated when M2 begins. For now:*

| Ref | Summary | Agent | Effort (est.) |
|---|---|---|---|
| T-015 | Notebook model CRUD, multi-root, default save location | Back-End + Interaction | Medium |
| T-016 | File watcher + bidirectional sync | Back-End Engineer | Medium |
| T-017 | Tree view (Explorer) + progressive loading | Interaction Engineer | Medium |
| T-018 | CodeMirror 6 Source mode | Interaction Engineer | Medium |
| T-019 | TipTap WYSIWYG mode | Interaction Engineer | Large |
| T-020 | remark/rehype Preview mode | Interaction Engineer | Small |
| T-021 | View switcher + mode serialization | Interaction Engineer | Medium |
| T-022 | Frontmatter management (parse, merge, write) | Back-End Engineer | Medium |
| T-023 | Metadata sidebar panel | Interaction Engineer | Small |
| T-024 | Quick notes + Focus mode | Interaction Engineer | Medium |
| T-025 | File openability matrix | Interaction Engineer | Medium |
| T-026 | Notes FTS5 + cross-sheath search merge | Back-End Engineer | Small |
| T-027 | Notebook grid/list views | Interaction Engineer | Medium |

---

## M3 — Graph Sheath

*Task details (T-028 through T-035) will be elaborated when M3 begins. For now:*

| Ref | Summary | Agent | Effort (est.) |
|---|---|---|---|
| T-028 | Link_references table + CRUD | Back-End Engineer | Small |
| T-029 | `[[wikilink]]` parser + autocomplete | Interaction Engineer | Medium |
| T-030 | Wikilink ↔ koshas://item/{uuid} conversion | Back-End Engineer | Medium |
| T-031 | Backlinks panel | Interaction Engineer | Small |
| T-032 | Graph visualization (D3 force-directed) | Interaction Engineer | Large |
| T-033 | Graph search + node filtering | Interaction Engineer | Medium |
| T-034 | Serendipity mode | Back-End + Interaction | Medium |
| T-035 | Assumption validation — graph-as-navigation test | Design Head + Product Lead | Small |

---

## M4 — Polish & Release

*Task details (T-036 through T-044) will be elaborated when M4 begins. For now:*

| Ref | Summary | Agent | Effort (est.) |
|---|---|---|---|
| T-036 | Onboarding flow (4 screens) | Design Head + Interaction | Medium |
| T-037 | Backup/restore (.koshas archive) | Back-End Engineer | Medium |
| T-038 | Keyboard shortcuts (all spec §13) | Interaction Engineer | Small |
| T-039 | Window state, menu bar polish | Interaction Engineer | Small |
| T-040 | Performance tuning | Back-End + Interaction | Medium |
| T-041 | Project README | Product Lead | Small |
| T-042 | Changelog + release notes | Product Lead | Small |
| T-043 | User documentation | Product Lead | Medium |
| T-044 | Final spec review + cleanup | Product Lead | Small |

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
