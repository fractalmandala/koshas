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

## M2 — Notes Sheath

**Dependencies:** M1
**Acceptance criteria:**
- User can create/manage notebooks from local folders.
- Markdown files open in 3-mode editor (Source, WYSIWYG, Preview).
- Frontmatter is managed — app reads, preserves, writes.
- Filesystem bidirectional sync with file watcher.
- Quick notes and focus mode work.
- File openability matrix implemented (.md, .txt, .json, images, PDF, docx).
- Cross-sheath search includes notes results.

| Ref | Task | Agent | Effort |
|---|---|---|---|
| T-015 | Notebook model (CRUD, multi-root, default save location) | Back-End + Interaction | Medium |
| T-016 | File watcher + bidirectional sync | Back-End Engineer | Medium |
| T-017 | Tree view (Explorer tab) + progressive loading | Interaction Engineer | Medium |
| T-018 | Editor: CodeMirror 6 (Source mode) | Interaction Engineer | Medium |
| T-019 | Editor: TipTap (WYSIWYG mode) | Interaction Engineer | Large |
| T-020 | Editor: remark/rehype (Preview mode) | Interaction Engineer | Small |
| T-021 | View switcher + mode serialization | Interaction Engineer | Medium |
| T-022 | Frontmatter management (parse, merge, write) | Back-End Engineer | Medium |
| T-023 | Metadata sidebar panel | Interaction Engineer | Small |
| T-024 | Quick notes + Focus mode | Interaction Engineer | Medium |
| T-025 | File openability matrix (.txt, .json, images, PDF, docx) | Interaction Engineer | Medium |
| T-026 | Notes FTS5 indexing + cross-sheath search merge | Back-End Engineer | Small |
| T-027 | Notebook grid/list views (frontmatter-aware cards) | Interaction Engineer | Medium |

---

## M3 — Graph Sheath

**Dependencies:** M1, M2
**Acceptance criteria:**
- Bidirectional references work between any items.
- `[[wikilink]]` syntax resolves in the editor.
- Backlinks panel shows references from any item.
- Interactive graph visualization with force-directed layout.
- Serendipity mode surfaces forgotten items.
- Cross-sheath search includes graph results.

| Ref | Task | Agent | Effort |
|---|---|---|---|
| T-028 | Link_references table + CRUD | Back-End Engineer | Small |
| T-029 | `[[wikilink]]` parser + autocomplete | Interaction Engineer | Medium |
| T-030 | Wikilink ↔ koshas://item/{uuid} conversion on save/open | Back-End Engineer | Medium |
| T-031 | Backlinks panel | Interaction Engineer | Small |
| T-032 | Graph visualization (force-directed, D3) | Interaction Engineer | Large |
| T-033 | Graph search + node filtering | Interaction Engineer | Medium |
| T-034 | Serendipity mode (keep/forget, cycle, cooldown) | Back-End + Interaction | Medium |
| T-035 | Assumption validation — graph-as-navigation test | Design Head + Product Lead | Small |

---

## M4 — Polish & Release

**Dependencies:** M1, M2, M3 (can run partially in parallel with M2/M3 — writing tasks T-041, T-042, T-043 are unblocked at M2; T-044a and T-044b are unblocked at M1; T-036 is blocked until M2 provides the shell polish)
**Acceptance criteria:**
- Onboarding flow is complete and replayable.
- Backup/restore works end-to-end.
- All keyboard shortcuts from spec §13 implemented.
- App lifecycle (menu bar, hide, quit, window state) polished.
- Performance targets met.
- README, changelog, and user documentation written.
- Preferences/Settings UI available (Cmd+,).
- macOS Spotlight indexing integrated.

| Ref | Task | Agent | Effort |
|---|---|---|---|
| T-036 | Onboarding flow (4 screens) | Design Head + Interaction | Medium |
| T-037 | Backup/restore (.koshas archive) | Back-End Engineer | Medium |
| T-038 | Keyboard shortcuts (all spec §13) | Interaction Engineer | Small |
| T-039 | Window state persistence, menu bar, Cmd+Q | Interaction Engineer | Small |
| T-040 | Performance tuning (search <100ms, 500-node graph) | Back-End + Interaction | Medium |
| T-041 | Project README | Product Lead | Small |
| T-042 | Changelog + release notes | Product Lead | Small |
| T-043 | User documentation | Product Lead | Medium |
| T-044 | Final spec review + cleanup | Product Lead | Small |
| T-044a | Preferences/Settings UI (Cmd+,) | Interaction Engineer | Small |
| T-044b | macOS Spotlight indexing integration | Back-End Engineer | Small |
