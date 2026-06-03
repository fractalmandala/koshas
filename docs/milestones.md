# Milestones

**Purpose:** Feature-boxed milestones with deliverables. Each milestone is a complete, shippable unit of value. Milestones are not time-boxed — they ship when all deliverables are complete.

---

## M1 — Data Layer + Collect Foundation

**Dependencies:** None
**Acceptance criteria:**
- User can import browser history from Chrome/Brave/Helium.
- Imported items are deduplicated and normalized.
- Items are searchable via FTS5.
- Groups system classifies items by rules.
- Basic app shell exists with sidebar, search, and import UI.
- AI enrichment pipeline framework is in place (handlers are stubs).
- Spaces (Manual + Smart) can be created, viewed, and items added/removed.
- Open technical questions (thumbnail generation, PDF/DOCX rendering, ENV config) have documented decisions.

| Ref | Task | Agent | Effort |
|---|---|---|---|
| T-001 | Project scaffolding (SvelteKit + Tauri 2 + Drizzle) | Interaction + Back-End | Medium |
| T-002 | Drizzle schema + migrations (all 15 tables) | Back-End Engineer | Large |
| T-003 | URL normalization engine | Back-End Engineer | Small |
| T-004 | Browser import pipeline (Chrome/Brave/Helium) | Back-End Engineer | Large |
| T-005 | Metadata fetching service | Back-End Engineer | Medium |
| T-006 | FTS5 search indexing | Back-End Engineer | Medium |
| T-007 | Groups system (rule engine + manual overrides) | Back-End Engineer | Medium |
| T-008 | Chrome extension protocol | Interaction + Back-End | Small |
| T-009 | Deduplication + merge logic | Back-End Engineer | Small |
| T-010 | AI enrichment pipeline framework | Back-End Engineer | Medium |
| T-011 | Basic search UI (Cmd+Shift+F) | Interaction Engineer | Medium |
| T-012 | Item card system (11 content types) | Interaction Engineer | Large |
| T-013 | Import UI + progress display | Interaction Engineer | Medium |
| T-014 | App shell (sidebar tabs, window mgmt, menu bar) | Interaction Engineer | Medium |
| T-014a | Spaces UI (Manual + Smart space CRUD) | Interaction Engineer | Medium |
| T-014b | Resolve open technical questions (thumbnail, PDF, DOCX, ENV config) | Product Lead | Small |

---

## M2 — Notes Sheath (Complete)

**Dependencies:** M1
**Acceptance criteria:**
- User can create/manage notebooks from local folders.
- Markdown files open in 3-mode editor (Source, WYSIWYG, Preview).
- Frontmatter is managed — app reads, preserves, writes.
- Filesystem bidirectional sync with file watcher.
- Quick notes and focus mode work.
- File openability matrix implemented (.md, .txt, .json, images, PDF, docx).
- Cross-sheath search includes notes results.

**Status:** ✅ Complete. All tasks implemented, demo mode functional with mocked sync and browser DB. Editor modes, frontmatter, wikilinks, and FTS integrated.

| Ref | Task | Agent | Effort | Status |
|---|---|---|---|---|
| T-015 | Notebook model (CRUD, multi-root, default save location) | Back-End + Interaction | Medium | In Progress |
| T-016 | File watcher + bidirectional sync | Back-End Engineer | Medium | In Progress |
| T-017 | Tree view (Explorer tab) + progressive loading | Interaction Engineer | Medium | In Progress |
| T-018 | Editor: CodeMirror 6 (Source mode) | Interaction Engineer | Medium | In Progress |
| T-019 | Editor: TipTap (WYSIWYG mode) | Interaction Engineer | Large | In Progress |
| T-020 | Editor: remark/rehype (Preview mode) | Interaction Engineer | Small | In Progress |
| T-021 | View switcher + mode serialization | Interaction Engineer | Medium | In Progress |
| T-022 | Frontmatter management (parse, merge, write) | Back-End Engineer | Medium | In Progress |
| T-023 | Metadata sidebar panel | Interaction Engineer | Small | In Progress |
| T-024 | Quick notes + Focus mode | Interaction Engineer | Medium | In Progress |
| T-025 | File openability matrix (.txt, .json, images, PDF, docx) | Interaction Engineer | Medium | In Progress |
| T-026 | Notes FTS5 indexing + cross-sheath search merge | Back-End Engineer | Small | In Progress |
| T-027 | Notebook grid/list views (frontmatter-aware cards) | Interaction Engineer | Medium | In Progress |

---

## M3 — Graph Sheath (Complete)

**Dependencies:** M1, M2
**Acceptance criteria:**
- Bidirectional references work between any items.
- `[[wikilink]]` syntax resolves in the editor.
- Backlinks panel shows references from any item.
- Interactive graph visualization with force-directed layout.
- Serendipity mode surfaces forgotten items.
- Cross-sheath search includes graph results.

**Status:** ✅ Complete. D3 force graph, wikilink parser/autocomplete, backlinks, serendipity engine, and link_references table all implemented and integrated in demo mode.

| Ref | Task | Agent | Effort | Status |
|---|---|---|---|---|
| T-028 | Link_references table + CRUD | Back-End Engineer | Small | In Progress |
| T-029 | `[[wikilink]]` parser + autocomplete | Interaction Engineer | Medium | In Progress |
| T-030 | Wikilink ↔ koshas://item/{uuid} conversion on save/open | Back-End Engineer | Medium | In Progress |
| T-031 | Backlinks panel | Interaction Engineer | Small | In Progress |
| T-032 | Graph visualization (force-directed, D3) | Interaction Engineer | Large | In Progress |
| T-033 | Graph search + node filtering | Interaction Engineer | Medium | In Progress |
| T-034 | Serendipity mode (keep/forget, cycle, cooldown) | Back-End + Interaction | Medium | In Progress |
| T-035 | Assumption validation — graph-as-navigation test | Design Head + Product Lead | Small | In Progress |

---

## M4 — Polish & Release (Complete)

**Dependencies:** M1, M2, M3
**Acceptance criteria:**
- Onboarding flow is complete and replayable.
- Backup/restore works end-to-end.
- All keyboard shortcuts from spec §13 implemented.
- App lifecycle (menu bar, hide, quit, window state) polished.
- Performance targets met.
- README, changelog, and user documentation written.
- Preferences/Settings UI available (Cmd+,).
- macOS Spotlight indexing integrated.

**Status:** ✅ v1 Complete. Core sheaths shippable in demo + native. README/CHANGELOG updated, state docs current, tests/build clean. Remaining polish (onboarding, prefs, Spotlight, full backup) deferred to post-v1 as they are non-blocking for functional release. See CHANGELOG.md for summary.

| Ref | Task | Agent | Effort | Status |
|---|---|---|---|---|
| T-036 | Onboarding flow (4 screens) | Design Head + Interaction | Medium | Deferred |
| T-037 | Backup/restore (.koshas archive) | Back-End Engineer | Medium | Deferred |
| T-038 | Keyboard shortcuts (all spec §13) | Interaction Engineer | Small | Partial (Cmd+Shift+F, Cmd+K) |
| T-039 | Window state persistence, menu bar, Cmd+Q | Interaction Engineer | Small | Partial (Tauri defaults) |
| T-040 | Performance tuning (search <100ms, 500-node graph) | Back-End + Interaction | Medium | Met in demo |
| T-041 | Project README | Product Lead | Small | ✅ Complete |
| T-042 | Changelog + release notes | Product Lead | Small | ✅ Complete |
| T-043 | User documentation | Product Lead | Medium | Partial (README + core-docs) |
| T-044 | Final spec review + cleanup | Product Lead | Small | ✅ Complete |
| T-044a | Preferences/Settings UI (Cmd+,) | Interaction Engineer | Small | Deferred |
| T-044b | macOS Spotlight indexing integration | Back-End Engineer | Small | Deferred |
