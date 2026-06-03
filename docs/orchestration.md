# Orchestration State — v1

**Purpose:** Single entry point for the Product Lead (Orchestrator) agent. Read this file first to understand project state.

---

## Current Status

- **Phase:** Development
- **Current milestone:** M1 — Data Layer + Collect Foundation
- **Current tasks:** T-001 complete. Next: T-002 (Drizzle schema + migrations)
- **Blockers:** None
- **Open issues being resolved:** Appraisal-driven fixes applied — shortcut collision, tool path, new tasks added, ADR-015, spec updates. See git log for full changelog.

## Milestone Progress

| Milestone | Status | Deliverable Count |
|---|---|---|
| **M1** — Data Layer + Collect Foundation | In progress | 16 tasks (1/16 complete) |
| **M2** — Notes Sheath | Planned | 13 tasks (stubs) |
| **M3** — Graph Sheath | Planned | 8 tasks (stubs) |
| **M4** — Polish & Release | Planned | 11 tasks (stubs) |

## Recent Updates

| Date | Update |
|---|---|
| 2026-06-03 | Applied comprehensive appraisal fixes: Cmd+Shift+F collision fixed (Focus Mode → Cmd+Shift+Return), tooling.md tauri-v2 path corrected, ADR-015 added (vector search deferred), spec updated for AI stub/deferred status, clipboard monitoring marked deferred, T-014a (Spaces UI), T-014b (Resolve Open Questions), T-044a (Preferences), T-044b (Spotlight) added, PT-002 (Elaborate Milestone Tasks) added, team.md made canonical with spec §16 referencing it, user escalation path added to operating rules. |
| 2026-06-03 | **T-001 complete.** SvelteKit 5 + Tauri 2 scaffolded. Drizzle ORM + SQLite plugin configured. Project directory structure created. TypeScript compiles (0 errors). Rust backend compiles (0 errors). |
| 2026-06-03 | Project initialized. Spec v1 finalized. Directory structure created. |

---

## Orchestrator Rules

### Agent Identifiers

When delegating tasks, use these single-word identifiers:

| Identifier | Role | When to delegate |
|---|---|---|
| `steward` | Project Steward | Repository health, conventions, audit, orientation (not a typical delegate — steward calls you, not the other way) |
| `designer` | Design Head | UI mockups, design system, user flows, accessibility review |
| `backend` | Back-End Engineer | Database, import pipeline, search indexing, AI pipeline, file sync |
| `frontend` | Interaction Engineer | Components, editor integration, graph visualization, animations, search UI |

### Operating Loop

1. **Read this file** (`orchestration.md`) — know current state, milestone, and blockers.
2. **If working a milestone**, read `milestones.md` for full scope and deliverable list.
3. **If executing a task**, read `tasks.md` for that task's details (dependencies, agent, effort, acceptance).
4. **Execute** the task directly or delegate to the appropriate agent.
5. **On task completion:**
   - Mark the task as complete in `tasks.md`.
   - Update "Current tasks" and task count in this file.
   - Add a "Recent Updates" entry.
6. **On milestone completion:**
   - Mark milestone as Done in this file.
   - Promote the next milestone to "In progress" in `milestones.md`.
   - If the spec needs updating, update `core-docs/koshas-specs-v1.md`.
7. **Repeat** from step 1.

### Doc Update Rules

| Trigger | Action |
|---|---|
| A task reveals missing spec detail | Update `core-docs/koshas-specs-v1.md` |
| A tech decision changes | Update `core-docs/architecture-decisions.md` |
| A new skill or tool is needed | Update `core-docs/tooling.md` + add files to `tools/` |
| The roadmap shifts | Update `core-docs/koshas-plan-v1.md` |
| Project state changes | Update this file (`orchestration.md`) |
| A new agent needs context | Create `docs/agents/{role}/` files |
| Milestone/task scope changes | Update `milestones.md` / `tasks.md` |

### State Management Rules

- **Canonical state lives in files**, not memory. If interrupted mid-task, the orchestrator re-reads `orchestration.md` and resumes.
- **Never delete core-docs** — only add or revise sections.
- **Never delete history** from this file — append only.
- **When in doubt, read more.** If the current state isn't sufficient, read `milestones.md` for context, then `tasks.md` for detail. Maintenance tasks (PT-*) can be found in the Maintenance Tasks section at the bottom of `tasks.md`.
- **When the Orchestrator would make a scope decision with no clear answer, flag it to the human owner rather than deciding.** Add a `[NEEDS USER INPUT]` entry in this file's Recent Updates section and describe the decision and options.

---

## Dependencies

This file references:
- `milestones.md` — milestone scope and deliverables
- `tasks.md` — granular task breakdown with agent assignments
- `core-docs/koshas-specs-v1.md` — app specification
- `core-docs/team.md` — team roles and ownership
