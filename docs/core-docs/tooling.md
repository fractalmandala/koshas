# Tooling

**Purpose:** Central inventory of all skills, external tools, and assets used in Koshas development.

---

## Skills — Local Reference Files

These are project-local skill directories under `tools/`. Agents read these files for domain knowledge and implementation patterns.

| Skill | Located at | Used by | When |
|---|---|---|---|
| **drizzle-orm-patterns** | `tools/drizzle-orm-patterns/` | Back-End Engineer | Schema design, migrations, queries |
| **tauri-v2** | `tools/tauri-skills-main/tauri-v2/` | Back-End Engineer, Interaction Engineer | Project structure, IPC, capabilities, window management |
| **rust-desktop-applications** | `tools/rust-desktop-applications/` | Back-End Engineer | Rust architecture, async patterns, state management |
| **tauri-event-system** | `tools/tauri-event-system/` | Back-End Engineer, Interaction Engineer | Progress events, IPC, backend→frontend communication |
| **d3-visualization** | `tools/d3-visualization/` | Interaction Engineer | Graph visualization force-directed layout |
| **interaction-patterns** | `tools/interaction-patterns/` | Interaction Engineer | Loading states, drag-drop, toast notifications, modals |

## Skills — Built-in / Model-Provided

These are known to the model environment. No local files needed. Agents use these by task type.

| Skill | Used by | When |
|---|---|---|
| **svelte-runes** | Interaction Engineer | Writing Svelte 5 components ($state, $derived, $effect, $props) |
| **sveltekit-routing** | Interaction Engineer | Routes, layouts, page config |
| **sveltekit-data-flow** | Interaction Engineer | Data fetching, form handling |
| **sveltekit-typescript** | Interaction Engineer | Typing SvelteKit boundaries |
| **webapp-testing** | Interaction Engineer | Playwright E2E tests |
| **frontend-design** | Design Head | Generating high-fidelity UI mockups |
| **web-design-guidelines** | Design Head | UI accessibility review |
| **TRAE-code-review** | All agents | Code review |
| **changelog-maintenance** | Product Lead | Release notes |
| **writing-effective-readme** | Product Lead | Project README |
| **effective-user-documentation** | Product Lead | User-facing docs |
| **find-skills** | Product Lead | Discovering new skills as project evolves |

---

## External Tools

| Tool | Installation | Used by | For |
|---|---|---|---|
| **Tauri CLI** | `cargo install tauri-cli` | Back-End Engineer | Build, dev, and packaging |
| **Node.js + npm** | System or nvm | All agents | JS/TS dependencies, build tooling |
| **Playwright** | `npm init playwright` | Interaction Engineer | E2E tests |
| **Helium Browser** | Installed on system | Interaction Engineer | Extension testing |
| **SQLite CLI** | `brew install sqlite` | Back-End Engineer | DB inspection, debugging |

---

## Assets

| Asset | Location | Used by | For |
|---|---|---|---|
| Reference UI images | `old-docs/references/` | Design Head | Visual direction, design decisions |
| Design prototypes | `theme-templates/koshas-start.html`, `theme-templates/koshas-default-dark.html`, `theme-templates/koshas-default-light.html` | Design Head, Interaction Engineer | Visual design reference during implementation |
| Design system SASS source | `theme-templates/styling.sass` | Design Head, Interaction Engineer | Canonical design system tokens |
| Design system documentation | `docs/core-docs/DESIGN.md` | All agents | Token reference, layout, animation, components |
| Sample data | `theme-templates/data.js` | Interaction Engineer | Test data matching design for frontend development |
| App icons | (TBD — to be designed in M4) | All | App identity |

---

## How Agents Use This File

Each agent's `references.md` file (in `docs/agents/{role}/`) specifies when and why to consult `tooling.md`. The general pattern:

- Before starting a task, check `tooling.md` to see if a relevant skill exists.
- Read the local skill files in `tools/` for implementation guidance.
- For built-in skills, rely on model knowledge.
- For external tools, follow the installation instructions in this file.
