# Architecture Decisions

**Derived from:** koshas-specs-v1.md

---

## ADR-001: Desktop Framework

**Decision:** Tauri 2 (macOS)
**Rationale:** Native macOS app with web-based frontend. Smaller binary than Electron. Full filesystem access via Rust backend. SQLite plugin available.
**Trade-off:** Requires Rust for backend logic. Higher complexity than pure web app.

## ADR-002: Frontend Framework

**Decision:** SvelteKit 5 with runes, TypeScript
**Rationale:** Minimal boilerplate, reactive by default, excellent Tauri webview fit. Runes provide explicit reactivity without legacy patterns.
**Trade-off:** Smaller ecosystem than React. Svelte 5 is new — some third-party libs may lag.

## ADR-003: Database Stack

**Decision:** Drizzle ORM + `@tauri-apps/plugin-sql` (SQLite)
**Rationale:** Type-safe queries without heavy ORM abstraction. SQLite is embedded, zero-setup, portable. FTS5 built in.
**Trade-off:** SQLite concurrency is limited (single-writer). Acceptable for single-user desktop app.

## ADR-004: Full-Text Search

**Decision:** SQLite FTS5 (built-in)
**Rationale:** No separate search infrastructure. BM25 ranking. Indexes item and note content in virtual tables.
**Trade-off:** Less sophisticated than Elasticsearch. Acceptable for local, single-user scale.

## ADR-005: Editor Stack

**Decision:** CodeMirror 6 (Source) + TipTap/ProseMirror (WYSIWYG) + remark/rehype (Preview)
**Rationale:** Best-of-breed. CodeMirror for editing text, TipTap for rich editing, remark/rehype for rendering. Markdown is the truth format.
**Trade-off:** Three engines to maintain. Mode switching requires serialization/deserialization.

## ADR-006: Markdown Flavor

**Decision:** GitHub Flavored Markdown (GFM) only
**Rationale:** Universal, well-specified, wide tool support. Tables, task lists, strikethrough, autolinks, fenced code blocks.
**Excluded:** KaTeX math, Mermaid diagrams, custom containers/callouts (not required in v1).

## ADR-007: Frontmatter Strategy

**Decision:** Managed — app reads, preserves, and writes YAML frontmatter
**Rationale:** Users own their files. App is a steward. Managed mode never destroys custom fields.
**Tool:** js-yaml for serialization.

## ADR-008: HTML → Markdown Conversion

**Decision:** Turndown
**Rationale:** Mature, extensible, handles complex HTML. Used for article export from web pages.

## ADR-009: Article Body Extraction

**Decision:** Mozilla Readability (`@mozilla/readability`)
**Rationale:** Industry standard. Used by Firefox Reader View. Prefers `<article>` → `<main>` → `<body>`.

## ADR-010: Import Pipeline Temp Strategy

**Decision:** Copy browser SQLite DB to temp directory before reading
**Rationale:** Browsers lock their databases. Copy-to-temp avoids lock contention.
**Constraint:** Browsers must be fully quit (Cmd+Q) before import.

## ADR-011: Deletion Model

**Decision:** Tombstone + backlink gray-out
**Rationale:** Deleted URLs and file paths are recorded in `deleted_items`. Backlinks remain visible but show as "broken link — file deleted." If a file reappears, links reactivate automatically.

## ADR-012: Reference Link Format

**Decision:** `[[wikilink]]` input → `[title](koshas://item/{uuid})` output
**Rationale:** Wikilink syntax is familiar (Obsidian, Roam). On save, converts to portable markdown links. On open, resolves both formats.

## ADR-013: Enrichment Pipeline Architecture

**Decision:** Async, non-blocking, idempotent job handlers
**Rationale:** Items are visible immediately on capture. Enrichment runs in background. Each job writes to its own fields only. Failures don't block the user or other jobs.

## ADR-014: Model Agnosticism

**Decision:** All documentation and agent instructions are model-agnostic
**Rationale:** Orchestrator and agents may run on different models (GPT, Gemini, DeepSeek, etc.). The system relies on files, conventions, and explicit instructions — not model capabilities.
