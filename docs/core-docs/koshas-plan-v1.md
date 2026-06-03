# Koshas Development Plan — v1

**Date:** 2026-06-03
**Derived from:** koshas-specs-v1.md

---

## Vision

Koshas is a personal knowledge companion for macOS. It helps users capture anything from anywhere (Collect Sheath), write and manage Markdown notes on their filesystem (Notes Sheath), and discover connections across their knowledge (Graph Sheath).

v1 targets a local-build desktop app for a single power user who wants to consolidate browser bookmarks, notes, and research into a single searchable, interconnected knowledge base.

---

## Milestone Sequence

| Milestone | Scope | Dependencies | Status |
|---|---|---|---|
| **M1 — Data Layer + Collect Foundation** | Database, imports, search, groups, basic UI shell | None | In progress |
| **M2 — Notes Sheath** | Notebooks, editor modes, file sync, frontmatter, quick notes | M1 | Planned |
| **M3 — Graph Sheath** | Bidirectional references, graph visualization, serendipity | M1, M2 | Planned |
| **M4 — Polish & Release** | Onboarding, backup/restore, keyboard shortcuts, performance, first-launch flow | M1, M2, M3 | Planned |

### Dependency Graph

```
M1 ──→ M2 ──→ M3
  │             │
  └────── M4 ───┘
```

M4 (Polish & Release) can begin in parallel with M2/M3 but ships last.

---

## Release Criteria (v1 is done)

1. All three sheaths (Collect, Notes, Graph) functional end-to-end.
2. User can import browser history, write notes in all 3 editor modes, and navigate a visual knowledge graph.
3. Full-text search (FTS5) returns results across all sheaths in under 100ms.
4. AI enrichment pipeline runs non-blocking with provenance markers — app works fully without AI.
5. Onboarding flow complete. Backup/restore functional.
6. No dark patterns. No data leaves the user's machine for core functionality.
7. All keyboard shortcuts from spec §13 implemented.

---

## Open Questions (from spec appendix)

These need decisions before or during implementation:

1. **OCR engine:** Tesseract sidecar vs Rust crate vs local ML model.
2. **Embedding model:** Local (ONNX/Candle) vs API-based. v1 starts local.
3. **Image thumbnail generation:** Rust `image` crate vs Tauri plugin vs frontend canvas.
4. **PDF rendering:** PDF.js vs native webview vs Tauri plugin.
5. **DOC/DOCX reader:** Conversion library for read-only display.
6. **ENV config model:** Enrichment API keys, model paths, prompt templates in a config file.
7. **Assumption validation:** Validate that users want a visual graph for navigation before committing to heavy graph UI investment.

---

## Phasing Notes

- **M1** is the foundation. Everything builds on it. Prioritize data integrity, performance, and clean APIs over UI polish.
- **M2** depends on M1's data layer (items table, search) but is otherwise independent. The editor stack (CodeMirror, TipTap, remark/rehype) is the highest-risk item — start validation early.
- **M3** has the highest assumption risk (graph-as-navigation). Validate early with prototypes before full investment.
- **M4** is cross-cutting. Onboarding copy, backup UX, and shortcut documentation can be drafted during earlier milestones.
