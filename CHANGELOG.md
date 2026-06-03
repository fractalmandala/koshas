# Changelog

All notable changes to Koshas will be documented in this file.

## [v1.0.0] - 2026-06-04

### Added
- **Collect Sheath**: Browser import (Chrome/Brave/Helium history + bookmarks), URL normalization/deduplication, metadata fetching (OG/Twitter/Readability), FTS5 search, groups system, AI enrichment pipeline (stub handlers), Spaces (manual + smart), Chrome extension protocol (`koshas://` deep links).
- **Notes Sheath**: Notebook CRUD (multi-root, default save location), 3-mode editor (CodeMirror 6 Source, TipTap WYSIWYG, remark/rehype Preview), frontmatter management, bidirectional filesystem sync + watcher, Explorer tree view, Quick Notes + Focus Mode, cross-sheath search.
- **Graph Sheath**: `link_references` table + CRUD, [[wikilink]] parser/autocomplete/conversion, Backlinks panel, D3 force-directed graph visualization, Serendipity mode (keep/forget/cycle), graph-aware search.
- **Core**: SvelteKit 5 (runes) + Tauri 2 scaffold, Drizzle ORM + SQLite/FTS5 schema/migrations, browser demo mode with `seed.ts` + mocked DB/filesystem (WASM-free), SASS design system, card system (11 types), global search (Cmd+Shift+F), command palette foundation, onboarding placeholders.
- **Demo/Validation**: Auto-seeding on first load, functional browser preview of all sheaths, 154 tests passing, typecheck clean, Rust checks pass.

### Changed
- Updated README with quick-start for browser demo and native build.
- Milestones M1-M3 marked complete; state files (`orchestration.md`, `tasks.md`, `milestones.md`) reflect full v1 core.
- Browser demo prioritizes immediate interactivity over native Tauri APIs (per project_memory constraints).

### Fixed
- "Dead" UI in browser demo (WASM/SQLite issues resolved via MockSqlDatabase + seed).
- Integration between sheaths (wikilinks ↔ graph, notes FTS, cross-search).

See `docs/milestones.md` for detailed acceptance criteria and `docs/core-docs/koshas-specs-v1.md` for full spec.

## Unreleased
- M4 Polish: Onboarding, backup/restore, full keyboard shortcuts, preferences UI, Spotlight, performance tuning, final docs.