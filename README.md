# Koshas

A personal knowledge companion for macOS — capture from anywhere, write Markdown notes, and discover connections across your knowledge.

Koshas is structured around three **sheaths** (layers):

- **Collect** — Capture bookmarks, articles, code snippets, images, files, and more from any source. Full-text search, groups, and tag-free organization.
- **Notes** — Write and edit Markdown notes with a dual-mode editor (WYSIWYG + Source). Notebooks aggregate folders, bidirectional `[[wikilink]]` references connect notes to collected items.
- **Graph** — Explore connections between your knowledge visually. See what links to what, discover serendipitous relationships.

Built with **Tauri 2** + **SvelteKit 5** (runes) + **TypeScript**, backed by SQLite (Drizzle ORM, FTS5).

---

## Status

**Pre-development.** Documentation, specifications, and planning are complete. Implementation has not yet begun.

| Artifact | Description |
|---|---|
| [Specification](docs/core-docs/koshas-specs-v1.md) | Complete app specification across all three sheaths |
| [Roadmap](docs/core-docs/koshas-plan-v1.md) | Milestone plan with release criteria |
| [Architecture Decisions](docs/core-docs/architecture-decisions.md) | 14 ADRs covering tech stack, data model, sync, and more |
| [Design Principles](docs/core-docs/design-principles.md) | 7 core principles driving product decisions |
| [Design System](docs/core-docs/DESIGN.md) | Color tokens, typography, layout, animation specs |
| [Milestones](docs/milestones.md) | 4 milestones, 44 tasks |
| [Agent Setup](AGENTS.md) | For AI agents working on this project |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | SvelteKit 5 (runes) + TypeScript |
| Editor | CodeMirror 6 (Source) + TipTap (WYSIWYG) + remark/rehype (Preview) |
| Database | SQLite via `@tauri-apps/plugin-sql`, Drizzle ORM, FTS5 |
| Styling | SASS |

---

## Development

Prerequisites:

- Node.js >= 18
- Rust >= 1.77.2
- pnpm (recommended) or npm

```bash
# Clone
git clone https://github.com/<your-username>/koshas.git
cd koshas

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

---

## License

Private — All rights reserved.
