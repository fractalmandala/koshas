# Orchestration State — v1

**Purpose:** Single entry point for the Product Lead (Orchestrator) agent. Read this file first to understand project state.

---

## Current Status

- **Phase:** Planning
- **Current milestone:** M1 — Data Layer + Collect Foundation
- **Current tasks:** None assigned (planning phase)
- **Blockers:** None

## Milestone Progress

| Milestone | Status | Deliverable Count |
|---|---|---|
| **M1** — Data Layer + Collect Foundation | Planned | 14 tasks |
| **M2** — Notes Sheath | Planned | TBD |
| **M3** — Graph Sheath | Planned | TBD |
| **M4** — Polish & Release | Planned | TBD |

## Recent Updates

| Date | Update |
|---|---|
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

---

## Dependencies

This file references:
- `milestones.md` — milestone scope and deliverables
- `tasks.md` — granular task breakdown with agent assignments
- `core-docs/koshas-specs-v1.md` — app specification
- `core-docs/team.md` — team roles and ownership
