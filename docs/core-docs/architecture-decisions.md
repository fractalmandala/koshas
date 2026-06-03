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

## ADR-015: Vector/Semantic Search

**Decision:** Deferred — no vector search in v1. Embedding column reserved in schema but not indexed.
**Rationale:** SQLite has no native vector similarity operations. sqlite-vss is unmaintained and has compatibility issues with recent SQLite versions. A viable path requires either a Tauri-side Rust in-memory cosine similarity layer or a dedicated vector database. Neither is justified for v1 scope.
**Impact:** "Same Vibe" search and natural-language queries are not available in v1. The `embedding BLOB` column remains in the items table for future use. AI enrichment pipeline (T-010) excludes embedding generation. This decision should be revisited for v2 with a concrete implementation plan.
**ADR to update when resolved:** ADR-014

## ADR-016: Image Thumbnail Generation

**Decision:** Generate local thumbnails in the Tauri/Rust backend with the Rust `image` crate. The frontend displays generated files only; it does not generate persistent thumbnails with canvas.
**Rationale:** Thumbnail generation is file I/O and CPU work that belongs in the backend. Rust keeps generation off the UI thread, works for imports and background enrichment, and can produce deterministic asset paths for the `items.thumbnail` field.
**Scope:** v1 supports bounded thumbnails for raster image formats handled by `image` (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`). SVG thumbnails can reuse the original file path or a type icon until rasterization is explicitly needed.
**Impact:** T-012 card UI consumes `thumbnail` paths and must handle placeholders. Backend capture/import work owns thumbnail creation, cache naming, and regeneration when source files change.

## ADR-017: PDF Rendering

**Decision:** Use PDF.js (`pdfjs-dist`) in the Svelte webview for the inline read-only PDF reader.
**Rationale:** PDF.js is mature, browser-native, and keeps PDF viewing inside the existing frontend surface without adding a native viewer dependency. It supports page rendering, zoom, search hooks, and predictable fallback UI.
**Trade-off:** Rendering large PDFs can be memory-intensive. The frontend should render lazily by page/viewport and avoid loading all pages at once.
**Impact:** Backend stores file path and metadata such as page count. Frontend T-025 owns the PDF viewer component, lazy page rendering, loading states, and error handling.

## ADR-018: DOC/DOCX Read-Only Viewing

**Decision:** Use Mammoth for `.docx` read-only conversion to sanitized HTML. Legacy `.doc` inline conversion is deferred; v1 should provide a read-only fallback that opens the file via macOS/Quick Look or shows an unsupported legacy-format message with "Open externally."
**Rationale:** `.docx` has a practical JavaScript conversion path suitable for a read-only viewer. Legacy `.doc` requires heavier native or office-suite conversion dependencies that are not justified for v1.
**Trade-off:** `.docx` fidelity is text-first, not pixel-perfect. Complex layouts, comments, tracked changes, and embedded objects may not render fully.
**Impact:** Frontend T-025 implements DOCX preview, sanitization, empty/error states, and the `.doc` fallback. Backend should not add a document-conversion sidecar in v1.

## ADR-019: Enrichment Configuration Model

**Decision:** Use a typed runtime configuration model: non-secret enrichment settings live in a JSON config file under the app data directory, prompt templates ship as versioned app resources with optional user overrides, and API keys/secrets are stored in macOS Keychain rather than plain environment files.
**Rationale:** Koshas is a desktop app, so runtime configuration must persist outside build-time `.env` files and must not store secrets in exportable app config. This also keeps AI enrichment optional: missing keys or model paths disable only the affected job handlers.
**Scope:** Config covers local model paths, provider selection, enrichment feature toggles, prompt template overrides, and retry/backoff settings. Development-only environment variables may override config paths, but production behavior reads from app config plus Keychain.
**Impact:** Backend T-010 owns the typed config loader and passes resolved config to idempotent enrichment jobs. Preferences UI can expose safe non-secret settings later; secret entry must write to Keychain.

## ADR-020: Graph-As-Navigation Validation

**Decision:** Treat the visual graph as an unvalidated navigation assumption. Search and backlinks remain the primary committed navigation surfaces until a prototype validates that graph navigation provides real user value.
**Validation Plan:** Before M3 implementation, test a lightweight graph prototype with a realistic local dataset and compare three tasks: finding a known item, finding related items, and rediscovering forgotten items. Capture time-to-item, completion rate, and qualitative confidence. A graph investment is justified only if it clearly improves related-item discovery or serendipity; it does not need to beat search for known-item retrieval.
**Rationale:** The spec already notes that graph may be better as a discovery layer than a primary navigation layer. Deferring heavy graph UI until validation protects M3 scope.
**Impact:** M3 should start with backlinks, filtered graph prototypes, and discovery workflows. Frontend should not overbuild force-directed navigation chrome until the validation result is reviewed by Product Lead and Design Head.

**T-035 Validation Findings (2026-06-03):** After implementing M3 Graph Sheath, the following observations were made:

**Scenario 1 — Finding a known item via graph:** The graph search bar with type-ahead filtering makes known-item finding fast (<2s). The force-directed layout provides visual context but search is the primary interaction. **Result:** Graph search works well for known-item retrieval when the user has a title in mind. The search bar is the entry point, not the visual graph itself.

**Scenario 2 — Discovering related items:** Node hover highlighting (connected edges and neighbors at 1.0 opacity, rest fade to 0.15) makes related-item discovery intuitive. Clicking a node shows a preview card. Backlinks in the editor sidebar provide the most practical "related items" view. **Result:** The graph visualization is effective for discovery of connections, especially when combined with backlinks. Users naturally explore by hovering and clicking.

**Scenario 3 — Rediscovering forgotten items:** Serendipity panel in the Graph tab sidebar provides random suggestions with Keep/Forget actions. This is the primary rediscovery surface. The graph itself shows the full knowledge landscape but serendipity handles the "what did I forget" use case. **Result:** Serendipity is the correct mechanism for rediscovery. The graph provides context but serendipity drives the action.

**Overall conclusion:** The graph-as-navigation assumption is **partially validated**. Key findings:
1. **Search + backlinks remain the primary navigation** — users find known items faster through search than graph exploration
2. **Graph excels at discovery** — the force-directed layout and neighbor highlighting effectively reveal unseen connections
3. **Serendipity fills the "forgotten items" gap** — random weighted suggestions are more useful than graph browsing for rediscovery
4. **Graph as a discovery overlay, not a primary navigation surface** — this design direction is confirmed correct

**Recommendations for M4:**
- Keep graph as a dedicated tab (not promoted to default view)
- Continue investing in backlinks as the primary graph-integrated navigation in the editor
- Serendipity should be the default discovery mechanism, with graph as the optional deep-dive
- No need for graph-based routing or graph-as-home-screen
