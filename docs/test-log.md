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

---

### Run 2 — 2026-06-03

**Agent:** Project Steward (Claude)
**Trigger:** "run PT-001" (properly following tasks.md procedure)

**Features tested (2 new):**
1. **Live app UI exploration** — Playwright-driven navigation of the running SvelteKit dev server. Tested all visible UI components: sidebar navigation (sheath tabs), search input, collect view, spaces section, browser import panel. Screenshots captured at each interaction.
2. **Offline/fallback states** — App behavior when Tauri backend is not available (dev server context). Verified the app shows graceful error messages ("Desktop backend offline") instead of crashing.

**What worked:**
- **App renders fully** in the browser (1280x800 viewport). The UI shows: Koshas branding, 3-sheath navigation (Collect/Notes/Graph), search bar, content area, and side panels.
- **12 buttons** detected, all visible and correctly labelled: Collect, Notes, Graph as sidebar nodes, All/Collect/Notes as filter tabs, Refresh/Cancel/Show log for import, ⊞ and ≡ for view mode, + New Space for Spaces.
- **Search input** present with placeholder "Search…" and aria-label "Search items".
- **Sheath navigation tabs** (Collect/Notes/Graph) render as expected — Collect active, Notes and Graph disabled (graceful pre-M2 state).
- **Empty states** all show meaningful messages: "Your knowledge garden — 0 items", "No items yet", "No spaces yet".
- **Graceful Tauri-offline handling:** "Desktop backend offline" banner shown with guidance message. "Cannot read properties of undefined (reading 'invoke')" error is caught and rendered as user-facing text rather than a crash.
- **Browser import panel** renders with Refresh/Cancel/Show log controls despite backend being unavailable.

**What was confusing:**
- Notes and Graph sheath buttons are **disabled** (pre-M2 state). This makes sense architecturally but there's no tooltip explaining why — just an unclickable button. A tooltip like "Coming in a future update" would help.
- The a11y warning persists: non-interactive `<div>` with `onclick` handler at `src/routes/+page.svelte:240`. Should be a `<button>` or have `role="button"`.
- The Spaces "No spaces yet" section appears in the left sidebar but the "+ New Space" button appears to trigger a Tauri IPC call that silently fails in dev mode. Should degrade to a no-op or show a "works in desktop app only" message.

**Observations:**
- The app is significantly more built out than expected — full component hierarchy, routing, state management, and empty states are all in place. This looks like M2-level code, not M1 scaffold.
- The `@tauri-apps/plugin-deep-link` import suggests the koshas:// protocol handler is already being integrated.
- The browser import panel (Refresh/Cancel/Show log) is fully wired UI — the import pipeline backend (T-003 through T-006) and test coverage exist but the Tauri IPC bridge isn't available in dev mode to exercise them.
- A11y: 1 warning (non-interactive div). Should be fixed before M4 polish.
- Screenshots saved to `/tmp/koshas-*.png` (5 captures: initial, after each button click, final state).
