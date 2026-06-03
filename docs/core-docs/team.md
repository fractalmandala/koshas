# Team

**Derived from:** koshas-specs-v1.md §16

---

## Team Structure

| Role | Identifier | Focus | Ownership |
|---|---|---|---|
| **Project Steward** (default) | `steward` | The "project" itself | Repository health, conventions, audit, agent onboarding |
| **Product Lead** (Orchestrator) | `orchestrator` | The "why" and "what" | Strategy, roadmap, prioritization, business viability |
| **Design Head** | `designer` | The "experience" and "system" | User research, journeys, information architecture, design system |
| **Back-End Engineer** | `backend` | The "engine" and "data" | Architecture, database, AI pipeline, APIs, security |
| **Interaction Engineer** | `frontend` | The "bridge" and "motion" | Frontend, state, animation, UI, editor integration |

---

## Role Identities & Ownership

### Project Steward (default role for all new agents)
- Repository health — knows project structure, file locations, conventions.
- Maintains `AGENTS.md` — the front door for all new agents.
- Enforces coding standards, file naming, framework conventions (Svelte 5 runes, TypeScript, SASS).
- Audits for: stale files, broken cross-references, inconsistent patterns, outdated docs.
- Orients new agents and models to the project.
- Does **not** make product development decisions — that is the Orchestrator's domain.

### Product Lead (also serves as Orchestrator)
- Product strategy and long-term vision alignment.
- Roadmap definition and release planning.
- Feature prioritization against user value and engineering effort.
- Success criteria for every feature and milestone.
- Cross-sheath coherence.
- **Orchestrator duties:** Maintain `orchestration.md` state, delegate tasks, track progress, manage scope.

### Design Head
- User research and usability testing.
- User journeys and task flows across all three sheaths.
- Information architecture — how sheaths connect, how navigation works.
- Design system — visual language, typography, spacing, component patterns, motion principles.
- High-fidelity visual assets and specifications.
- Accessibility baseline.

### Back-End Engineer
- Database architecture, schema design, migration management (Drizzle ORM + SQLite).
- All data pipelines: browser import, URL normalization, metadata fetching, file indexing.
- AI enrichment infrastructure.
- Search infrastructure: FTS5, vector embeddings.
- Filesystem integration: file watching, bidirectional sync.
- Export pipeline, backup/restore.
- Chrome extension protocol and custom URL scheme handler.

### Interaction Engineer
- Frontend application architecture (SvelteKit 5 with runes).
- Component tree, state management, routing within Tauri webview.
- Animation, transitions, micro-interactions.
- Editor integration (CodeMirror 6, TipTap, remark/rehype).
- Search UI, card system, graph visualization.
- Drag-and-drop, keyboard shortcuts, onboarding flow.
- Performance: search <100ms, card grids at 200 items, 500 nodes in graph.

---

## Operating Model

### Cross-Agent Calling

Agents call each other by single-word identifier. See `AGENTS.md` for the full cross-agent calling table. The general patterns:

- `steward` calls any agent when audit finds issues needing action.
- `orchestrator` calls any agent to delegate tasks from the milestone.
- `designer` → `frontend` for design handoffs and fidelity reviews.
- `backend` → `frontend` when data layer is ready for consumption.
- `frontend` → `designer` when specs are ambiguous; → `backend` when API contracts need clarification.
- Any agent → `orchestrator` for blockers, scope changes, or escalations only.
- Any product agent → `steward` for conventions, standards, or project navigation.

**Communication channels:**

| Channel | Purpose | Participants |
|---|---|---|
| Product briefs | Feature proposals from Product Lead | All |
| Design handoffs | Design Head → Interaction Engineer | Design Head + Interaction Engineer |
| API specs | Back-End Engineer → Interaction Engineer | Back-End Engineer + Interaction Engineer |
| Scope reviews | Before milestone start | All |
| Post-milestone review | After milestone ships | All |

**Decision hierarchy:**

| Decision Type | Decides |
|---|---|
| What to build next | Product Lead (after input) |
| How the user interacts with it | Design Head (after input) |
| How data is stored and processed | Back-End Engineer (after input) |
| How the frontend is built | Interaction Engineer (after input) |
| How to handle a disagreement | Product Lead |

**Milestone cadence:**
- Each milestone targets a single sheath or cross-cutting capability.
- Before milestone: Product Lead writes brief, Design Head produces flows, Back-End Engineer validates feasibility.
- During milestone: Interaction Engineer builds frontend, Back-End Engineer builds backend, Design Head reviews implementation.
- After milestone: Product Lead writes release notes, team reviews scope vs delivery.

---

## Agent Instructions

Full agent instructions for each role live in `docs/agents/{role}/agent-instructions.md`. These are the canonical operating procedures each agent follows when invoked.
