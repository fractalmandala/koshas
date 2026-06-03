# Test Log

**Purpose:** Record of all exploratory test runs (PT-001). Used by agents to avoid repeating the same tests.

---

## How to Use

Each entry is appended as a new section. Include:
- **Date/time of run**
- **Agent/model** that performed the test
- **Features tested** — at least 2 that are new (check previous entries)
- **What worked**
- **What broke or was confusing**
- **Any observations or ideas**

---

## Entries

---

### Run 1 — 2026-06-03

**Agent:** Project Steward (Claude)
**Trigger:** "run PT-001"

**Features tested (2 new):**
1. **Build pipeline** — Full production build (`pnpm build`). Tests SASS preprocessing, Vite bundling, SSR + client output.
2. **Test suite** — All unit tests (`pnpm test`). 14 test files, 78 tests across URL normalization, groups, import pipeline, deduplication, search, enrichment, deep-link protocol, and metadata fetching.

**What worked:**
- `pnpm build` — Succeeded after adding `vitePreprocess()` to `svelte.config.js` (SASS was installed but preprocessor was not configured). SSR and client bundles produced cleanly. Total build time: ~1.2s.
- `pnpm check` — 0 errors, 1 a11y warning (non-interactive `<div>` with `onclick` on the search bar).
- `pnpm test` — 14/14 test files passed, 78/78 tests passed. All pipeline, group logic, normalization, search, and protocol tests green.
- `pnpm dev` — Dev server starts on port 5189, returns HTTP 200 on `/`.
- TypeScript compilation: 0 errors.

**What was confusing:**
- SASS preprocessing was not configured despite `sass` being in `package.json`. The `svelte.config.js` was missing `preprocess: vitePreprocess()`. This will block any agent trying to run the app for the first time. Fixed during this test.
- The adapter-auto warning ("Could not detect a supported production environment") is expected for local builds but might confuse a new agent.

**Observations:**
- 12 test files is a solid foundation — the URL normalization tests (20+ edge cases) and group rule tests are particularly thorough.
- Svelte 5 with `$state`, `$derived`, `$effect` runes is used throughout — no legacy patterns detected.
- The app shell imports many components that reference Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-deep-link`). These will only work at runtime inside the Tauri webview. The SvelteKit dev server is sufficient for UI development but IPC calls will fail outside the desktop shell.
