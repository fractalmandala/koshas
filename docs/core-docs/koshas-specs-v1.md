# Koshas v1 — App Specification

**Date:** 2026-06-03
**Platform:** macOS (Tauri 2 + SvelteKit 5 with runes, TypeScript)
**Distribution:** Local build (v1)
**Tagline:** A knowledge companion that grows with you — capture anything, connect everything.

---

## Preface

Koshas is a personal knowledge companion for macOS. It helps you capture anything from anywhere, write and manage Markdown notes on your filesystem, and discover connections across your knowledge.

The specification that follows defines the complete feature set, architecture, data model, and team structure for v1.

---

## 1. Architecture Overview

Koshas is a personal knowledge companion structured as **sheaths** — layered functional modules within a single desktop app. Each sheath is a distinct user-facing domain. Cross-cutting capabilities (AI enrichment, search, organization) are shared infrastructure, not sheaths.

### Sheaths

| Sheath | Purpose | Status |
|---|---|---|
| **Collect Sheath** | Universal capture — import, save, and ingest anything from anywhere | v1 |
| **Notes Sheath** | Write, edit, and manage markdown files | v1 |
| **Graph Sheath** | Connect everything — bidirectional links, knowledge graph, serendipity | v1 |
| **Agentic Sheath** | LLM chat and AI interaction layer | Deferred |

### Core Principle: Capture First, Organize Later

Saving anything must be nearly frictionless. Organization emerges from AI enrichment, saved searches, tags, and connections — not from manual folder structures at capture time.

### Platform Decisions

| Concern | Decision |
|---|---|
| Frontend | SvelteKit 5 with runes, TypeScript |
| Desktop | Tauri 2 (macOS) |
| Local database | Drizzle ORM + `@tauri-apps/plugin-sql` (SQLite) |
| Full-text search | SQLite FTS5 (built into the database) |
| File watching | Tauri filesystem watcher API |
| Editor (Source) | CodeMirror 6 |
| Editor (WYSIWYG) | TipTap (`svelte-tiptap` or `@tiptap/svelte`) |
| Editor (Preview) | remark/rehype ecosystem |
| Markdown flavor | GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks) |
| HTML→Markdown export | Turndown |
| Article body extraction | Mozilla Readability (via `@mozilla/readability`) |
| YAML frontmatter | js-yaml (managed — app reads and writes frontmatter) |
| External network | Metadata fetch, markdown export, OCR/AI (if using remote APIs) |
| Command palette | Cmd+K (VS Code-style, searchable action list) |
| Release target | Local build |

### App Identity

- Menu bar extra / status item supported. Closing the main window hides it (if menu bar extra enabled).
- Cmd+Q quits the app.
- Window size/position and last selected view remembered.
- Drag-and-drop URLs and files into the window supported.
- Spotlight indexing supported.

---

## 2. Collect Sheath

The Collect Sheath is the universal ingestion layer. It handles every way content enters Koshas and normalizes everything into a unified item model.

### 2.1 Capture Methods

| Method | Details |
|---|---|
| **Browser extension** | Send page URL, title, selected text, or image from Chrome/Brave/Helium (and optionally Safari, Edge). Custom URL scheme (`koshas://add?url=...`). Right-click → "Save to Koshas". |
| **Browser import** | Import bookmarks and history from Chromium browsers (Chrome, Brave, Helium). Copy-to-temp, deduplication, merge pipeline. |
| **Manual add** | Add a URL, note, quote, or text snippet. |
| **Drag-and-drop** | Drop URLs, images, PDFs, video files, or text into the app window. |
| **Clipboard** | Monitor clipboard for URLs and provide a quick-save prompt (optional). No data is sent anywhere — entirely local. **Deferred to post-v1.** |
| **File import** | Import local files — images, PDFs, markdown, text. Files are copied to a user-chosen location on disk, or to the configurable "imports folder" set in Preferences. |

### 2.2 Import Pipeline (Browser)

- **Sources:** Google Chrome, Brave Browser, Helium Browser.
- **Method:** Copy database files to a temporary folder before reading. Ignore incognito/private history. **Browsers must be fully quit (Cmd+Q) before import** — SQLite locks the database while the browser is running. The import UI shows a warning if a source browser is still running.
- **Default:** Import current year's full stored browser history + all bookmarks.
- **Bookmark structure:** Import bookmark URLs but not the browser's folder structure.
- **Batch size:** Up to 50,000 records per run, cancellable, partial results visible as they arrive.
- **Target performance:** 50,000 rows imported and classified in under 1 minute.
- **Progress UI:** Live progress bars, timestamped console log (togglable panels).
- **Profile management:** Users can select which browsers and profiles to sync. Do not store source profile names — store source browser names only.
- **Permissions:** macOS app-or-folder picker flow. Clear instructions when Full Disk Access is required.
- **Deletion model:** If a browser-source entry disappears on resync, remove that occurrence. If a canonical item has no sources and wasn't manually added, remove it. User deletions create tombstones in `deleted_items`.

### 2.3 URL Normalization and Deduplication

- Store the original URL as imported. Compute a **normalized URL** as the unique identity.
- Normalization rules:
  - Strip tracking parameters (`utm_*`, `fbclid`, `gclid`).
  - Ignore URL fragments (`#section`).
  - Merge `http://` and `https://`.
  - Merge trailing slash variants.
  - Normalize YouTube URLs across `youtube.com/watch`, `youtu.be/`, Shorts, and playlist forms.
  - Normalize Google Drive URLs by file ID.
- Same normalized URL = same item, regardless of source.
- For imported metadata conflicts, most recent source timestamp wins unless manually edited.
- Maintenance dedupe pass on app startup and after sync.

### 2.4 Content Types

All captured content normalizes into a unified **item** model with a type discriminator.

| Type | Metadata | Display Behavior |
|---|---|---|
| `bookmark` | URL, title, description, og:image | Rich link card |
| `article` | URL, full article body, summary | Article card, reading mode |
| `image` | File, dimensions, format, EXIF | Image preview + metadata |
| `pdf` | File, page count, AI summary | PDF reader |
| `video` | URL or file, platform, duration | Embedded preview or file |
| `note` | Text content, optional title | Compact note card |
| `quote` | Source text, attribution, context | Quote card |
| `highlight` | Source URL, selected text, context | Highlight card with backlink to source |
| `product` | URL, price, image, store | Product card |
| `recipe` | URL, ingredients, instructions | Recipe card |
| `book` | Title, author, ISBN, cover | Book card |

Type classification on capture is automatic (via URL pattern, file extension, and/or content analysis). Users can override the type manually.

### 2.5 Metadata Fetching

- On capture, fetch page metadata:
  - **Title:** `og:title` → `twitter:title` → `<title>`
  - **Description:** `og:description` → `twitter:description` → `<meta name="description">`
  - **Image:** `og:image` → `twitter:image`
- For articles, use Mozilla Readability to extract full body text.
- Failed metadata fetches are retried only on user trigger.
- Field-level user-edit locks prevent overwrite.
- **Note:** Structured extraction for `product` (price, store) and `recipe` (ingredients, instructions) types is not in v1. These types fall back to standard metadata fetching. Structured extraction requires schema.org parsing or ML extraction — deferred to post-v1.

### 2.6 Reading Mode

For articles and recipes, Koshas saves the full rendered content (extracted body HTML converted to Markdown via Turndown, stored as `bodyText`). This content remains readable even if the original source disappears. It feeds into full-text search (FTS5) and AI summarization.

---

## 3. Notes Sheath

The Notes Sheath handles writing, editing, and managing Markdown files on the user's local filesystem. It is a full-featured Markdown workspace that behaves like a hybrid of Obsidian (knowledge-base vault) and VS Code (multi-root workspace file manager).

### 3.1 Notebook Model

- A **Notebook** is a virtual collection of one or more folder paths from anywhere on the filesystem — not a single root folder. Analogous to a VS Code multi-root workspace.
- Each Notebook has a **user-designated default save location** chosen from its member folders.
- The **active notebook** is global app state shared between the Notes Sheath view and the Explorer tab.
- Notebooks are listed in the Notes sidebar. Clicking a Notebook opens its grid/list view in the main panel.
- A Notebook can be renamed, reordered, or deleted. Deleting a Notebook does not delete the folders or files on disk — it only removes the virtual grouping.

### 3.2 Filesystem Integration

- **Full bidirectional sync** — all file operations inside the app write immediately to disk. External changes (via Tauri filesystem watcher) are reflected in near real-time.
- **Tree view** (Explorer tab) shows all files in the Notebook's folders. Sorting: folders first (alphabetically), then files (alphabetically). File-type icons.
- **Large folders** use progressive loading — a "Show more" link at the bottom of clipped lists. Initial load capped at ~100 items per directory.
- **Conflict model:** Last-write-wins. If the file changes externally while open in the editor, the editor refreshes silently from disk. No conflict dialogs in v1.
- **Hidden files** — files and folders starting with `.` are hidden from the tree view by default (togglable via "Show hidden files").
- **File deletions (external):** When a file is deleted from Finder and the watcher catches it, the app records the deletion in `deleted_items`. Any backlinks pointing to the deleted note remain visible but display as *"broken link — file deleted"* in a gray style (hover shows the original file path). If the file reappears at the same path (user restores from trash or recreates it), the link reactivates automatically on the next file scan.

### 3.3 Editor Architecture

The editor is a single pane with a **view switcher** that cycles through three modes. Markdown text is always the source of truth.

| Mode | Engine | Capabilities |
|---|---|---|
| **Source** | CodeMirror 6 | Line numbers, syntax highlighting, multiple cursors, bracket matching, search/replace, undo history |
| **WYSIWYG** | TipTap (ProseMirror) | Full rich-text toolbar: headings (H1–H6), bold, italic, strikethrough, ordered/unordered lists, task lists, blockquotes, code blocks, inline code, links, images, tables, horizontal rules, text alignment. No drag blocks — standard toolbar buttons. |
| **Preview** | remark/rehype | GitHub Flavored Markdown rendered to HTML. Syntax-highlighted code blocks. Read-only. |

**Mode switching behavior:**
- Source → WYSIWYG: Markdown parsed through `remark-parse` → ProseMirror document.
- WYSIWYG → Source: ProseMirror serialized back to Markdown via `remark-stringify`.
- To Preview: Content rendered through remark/rehype pipeline with GFM support. Read-only.
- The view switcher is a button group in the editor toolbar.
- Mode is per-file — the editor remembers which mode you were in for each open file within the session.

### 3.4 Toolbar (WYSIWYG Mode)

| Group | Actions |
|---|---|
| **Format** | Bold, Italic, Strikethrough, Inline Code |
| **Headings** | H1–H6 dropdown or toggle buttons |
| **Lists** | Ordered list, Unordered list, Task list |
| **Insert** | Link, Image, Table, Horizontal rule, Blockquote, Code block |
| **Alignment** | Left, Center, Right (for block elements) |
| **Undo/Redo** | Standard |

Toolbar is docked at the top of the editor pane. In Source mode, only Undo/Redo and the view switcher are active.

### 3.5 Markdown Flavor

Koshas supports **GitHub Flavored Markdown (GFM)**:
- Tables with alignment
- Task lists with `[ ]` / `[x]`
- Strikethrough (`~~text~~`)
- Autolinks
- Fenced code blocks with language tags
- Footnotes (remark-gfm)

**Not required in v1:** KaTeX math, Mermaid diagrams, custom containers/callouts.

### 3.6 Frontmatter Management (Managed Mode)

Koshas takes a **managed** approach to YAML frontmatter — it reads, preserves, and can update frontmatter, but never destroys user-defined fields.

**On file open (ingestion):**
1. Parse the file. If valid YAML frontmatter exists between `---` delimiters, extract it.
2. If the frontmatter cannot be parsed (malformed YAML), the app shows a **non-blocking warning banner** at the top of the editor: "Frontmatter could not be parsed. Fix or remove it to enable managed fields." The file opens in **Source mode** automatically. The broken frontmatter block is preserved as-is.
3. If valid, recognize first-class fields: `title`, `description`, `image`, `group`, `tags`, `created`, `updated`.
4. All other fields are preserved as-is in a **custom frontmatter store** and written back unchanged.

**On file save:**
1. Merge the recognized fields with the preserved custom fields.
2. Serialize through `js-yaml` with proper quoting and escaping.
3. Write the full file: frontmatter `---` block + Markdown body.

**Frontmatter-first-class fields:**

| Field | App Behavior |
|---|---|
| `title` | Displayed in grid cards. Falls back to first H1 if absent. App can write this. |
| `description` | Card description text. Read-only. |
| `image` | Card thumbnail URL. Read-only. |
| `group` | Shared with Groups system. App can write and sync this. |
| `tags` | Pass-through. Not treated as groups. |
| `created` | App can write on first save if absent. |
| `updated` | App updates on every save. |

**Frontmatter editing:** Users can manage frontmatter through a **metadata sidebar panel** (togglable, right side) when viewing a note. The panel shows editable fields for `title` and `group`. Other recognized fields are displayed read-only. Custom fields are visible but not editable in v1.

### 3.7 File Indexing and Search

When a folder is added to a Notebook, Koshas indexes all `.md` files for fast search:

1. **Initial scan** — Recursively walk the folder tree. For each `.md` file:
   - Parse frontmatter (extract title, description, etc.)
   - Extract plain text body (strip Markdown syntax)
   - Tokenize and write to FTS5 virtual table
   - Record file metadata (path, size, mtime) in the `notes` index table
2. **Incremental updates** — File watcher triggers re-indexing for changed files.
3. **Batch performance target:** Index 10,000 files in under 5 seconds.

**Search query flow:**
- User types in search bar → FTS5 `MATCH` query → BM25 ranking → join back to `notes` table → display in results grouped by notebook.
- Notes search results are merged with Collect Sheath results in global search (Cmd+Shift+F).
- **Scope:** Notes Sheath search returns results from **all notebooks** (not just the active one).

### 3.8 Quick Notes

- Always-accessible input field (floating button or Cmd+Shift+N).
- Typing text and pressing Enter immediately saves a new note-type item to the active notebook's default save location.
- The file is created as a minimal `.md` file with `title` and `created` frontmatter.
- Quick Notes do not open the editor — they land silently in the notebook grid.

### 3.9 Focus Mode

- Full-screen, distraction-free writing mode.
- Sidebar collapses, editor fills the window. Only the document and minimal toolbar remain visible.
- Toolbar in Focus Mode: Undo/Redo, view switcher, "Exit Focus Mode" button.
- Cmd+Shift+Return toggles Focus Mode.
- Exiting Focus Mode restores the previous layout.

### 3.10 File Openability Matrix

| Extension | Behavior |
|---|---|
| `.md` | Editable in all 3 modes |
| `.txt` | Editable in Source mode only |
| `.json` | Editable in Source mode; toggleable JSON tree viewer |
| Images (`.png`, `.jpg`, `.gif`, `.webp`, `.svg`) | Preview panel with metadata |
| `.pdf` | Inline PDF reader |
| `.doc` / `.docx` | Read-only viewer |
| `.js`, `.ts`, `.py`, `.css`, `.html`, other code | Not openable |

### 3.11 Media Assets in Notes

When a user drags-and-drops or pastes an image into a note, Koshas copies the file into a notebook-level `assets/` folder and inserts a relative Markdown image link.

- Koshas creates (or reuses) an `assets/` directory at the **notebook's root** (`defaultSaveLocation`).
- The image is saved as `assets/{note-name-slug}-{timestamp}.{ext}`.
- The Markdown link is relative to the note's location: `![alt text](../assets/my-note-20260603-143022.png)`.
- Supported image types: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`.
- Collision-safe naming with timestamp-based suffixes.

---

## 4. Graph Sheath

The Graph Sheath is the connective tissue of Koshas. It surfaces relationships between everything you've captured and written, turning the collection into a browsable knowledge graph.

### 4.1 Bidirectional References

- Any item can be linked to any other item.
- In the Notes editor, users create references using **`[[` (wikilink syntax)** — typing `[[` opens an autocomplete search across all items.
- **On save:** `[[wikilink]]` is converted to `[Item Title](koshas://item/{uuid})` in the raw Markdown file. This renders as a clickable hyperlink anywhere, though the URL only resolves inside Koshas.
- **On open (ingestion):** The app recognizes both `[[wikilink]]` syntax and `koshas://item/{uuid}` links, resolving them to the corresponding item.
- The `link_references` table tracks `(source_item_id, target_item_id)`.
- When item A is referenced from item B, item A shows **"Referenced by N items"** in its detail view.
- Backlinks are visible in a dedicated panel when viewing any item.

### 4.2 Knowledge Graph Visualization

- An interactive visual graph view showing items as nodes and references as edges.
- Node shapes/colors are distinguishable by item type.
- The graph is navigable — pan, zoom, click a node to open that item's detail.
- Force-directed layout (stable, centered).
- Search within the graph — typing filters visible nodes.
- Users can explore the graph to discover connections they didn't explicitly create.

### 4.3 Cross-Type Search

- Global search searches across all types — bookmark titles/URLs/descriptions, note titles/content, image filenames/metadata, article text, quotes, etc.
- Results grouped by type with clear distinction.
- Search scope toggles: Current Sheath / Everything.

### 4.4 Serendipity

- A surface-forgotten-items mode. On demand (or configurable periodic reminder), Koshas surfaces items the user hasn't viewed in a configurable time window.
- Each surfaced item shows "Keep" and "Forget/Delete" actions.
- "Keep" gives the item a "seen" timestamp and suppresses it from future Serendipity for a configurable cooldown period.
- "Forget/Delete" tombstone-deletes the item.
- Cyclical rediscovery prevents knowledge from becoming static accumulation.

### 4.5 Important Assumption to Validate

The Graph Sheath makes a strong assumption: **users will navigate their knowledge through a visual graph.** This may not be true. Research should validate this before heavy investment. The graph may function better as a **discovery layer** (serendipity, exploration) than as a **navigation layer** (finding specific items). Search may remain the primary navigation surface.

---

## 5. Cross-Cutting: AI Enrichment Pipeline

AI capabilities are not a sheath — they are an infrastructure layer that enriches items asynchronously after capture.

AI enrichment is transparent — users always know what is AI-generated vs original. The app works without AI; enrichment failures never block the user.

### 5.1 Transparency Principle

Every AI-generated field has a provenance marker. In the UI, AI tags, summaries, and classifications are visually distinguishable from user-created content (e.g., an AI badge icon, a dotted border, or a subtle color distinction). Users can dismiss or override AI-generated metadata.

### 5.2 Auto-Tagging and Classification

- AI assigns visible tags to images (objects, scenes, styles, colors).
- URLs/bookmarks get tags derived from domain, title, keywords, and content analysis.
- Content is automatically classified into **stacks** (see §6.3).
- Manual tags coexist with AI tags. Manual tags are explicitly marked with `#tag` in search.
- AI tags can be dismissed individually (removing them from the item and optionally adding them to a "never tag" blocklist).

### 5.3 OCR / Image Text Recognition

- Text inside images, screenshots, memes, photos, and handwriting is extracted via OCR.
- OCR text is indexed in the FTS5 search table.
- Runs on image capture. On large existing collections, runs as a background batch job.
- OCR engine: Tesseract (local, via Tauri sidecar or Rust binding) or a lightweight local model.

### 5.4 AI Summarization

- Articles, web pages, products, books, and PDFs can be AI-summarized.
- The summary is stored alongside the item and used to enrich search results and card previews.
- Summarization can run on capture (auto) or on-demand (manual trigger).
- Summaries are clearly labeled as AI-generated. Users can replace them with their own summary.

### 5.5 Embeddings and Semantic Search

- **Deferred to post-v1.** See ADR-015 for rationale.
- The `embedding BLOB` column is reserved in the `items` table schema for future use.
- Vector search infrastructure will be re-evaluated when a stable SQLite vector extension or viable in-process approach exists.

### 5.6 Color Extraction

- Images automatically have their dominant color palette extracted.
- Colors are stored and searchable — find items by color as a search facet.

### 5.7 Enrichment Pipeline Flow

```
Capture → Classify type → Fetch metadata → Queue enrichment jobs (async):
   ├─ OCR (images) [stub in v1]
   ├─ Auto-tagging (images + content) [stub in v1]
   ├─ Summarization (articles, PDFs) [stub in v1]
   ├─ Embedding generation [deferred — see ADR-015]
   ├─ Color extraction (images) [stub in v1]
   └─ Classification into stacks [stub in v1]
→ Each job writes to its own field → Update FTS5 index → UI reflects enrichment
```

Enrichment jobs are non-blocking. The item is visible immediately. Each item has `enrichmentStatus`: `pending`, `enriching`, `done`, `failed`. The UI shows enrichment progress per card with a subtle indicator.

**Real AI handler implementation is deferred to post-v1.** T-010 creates the framework (job queue, handler interface, status management) with empty stubs. The individual handlers (OCR, auto-tagging, summarization, color extraction, stack classification) are not implemented in v1. This is intentional — the framework allows adding handlers later without architectural changes.

---

## 6. Cross-Cutting: Search

Search reveals truthfully what the user has saved, without manipulation. No "recommended" results, no engagement-optimized ordering. Results are ranked by relevance (BM25) and recency.

### 6.1 Search Capabilities

| Search Mode | Backed By | Description |
|---|---|---|
| Full-text (items) | FTS5 | Bookmarks, articles, notes, quotes, highlights, OCR text — one unified FTS5 virtual table |
| Full-text (notes) | FTS5 | Note titles + body text, indexed separately. Notes search spans **all notebooks**. |
| Semantic | Vector embeddings | "Same vibe" search, natural-language queries |
| Faceted | SQL query filters | Filter by type, date range, tags, groups, spaces, stacks, color, source browser |
| Tag | `items.manualTags` | Search with `#tagname` for exact tag matches |

**FTS5 index architecture:**
- One FTS5 virtual table (`items_fts`) indexing all item content.
- One FTS5 virtual table (`notes_fts`) indexing note-specific content.
- Both tables kept in sync via triggers or application-level write-back.
- BM25 ranking for relevance scoring.

### 6.2 Global Search

- **Keyboard shortcut:** Cmd+Shift+F.
- Opens a search overlay with a single input field.
- Results appear grouped by type as the user types.
- Quick filter chips: type, group/space, date range, tags.
- Navigating results: arrow keys, Enter to open, Escape to close.

### 6.3 Command Palette (Cmd+K)

- VS Code-style command palette overlay.
- Lists all available actions as searchable items, grouped by category:

  | Category | Actions |
  |---|---|
  | **Navigation** | Switch to Collect Sheath, Switch to Notes Sheath, Switch to Graph Sheath |
  | **Creation** | New Note, New Quick Note, New Notebook, Add Link |
  | **Actions** | Toggle Browser Sync, Toggle Console, Focus Mode, Export as Markdown, Open Preferences |
  | **Search** | Global Search, Search Current Notebook, Search Collect Sheath |
  | **Help** | Keyboard Shortcuts Reference |

- Typing filters the action list. Selected action runs on Enter.
- Fuzzy matching on recently opened items for quick navigation.
- The command palette is extensible — new actions can register themselves.

---

## 7. Cross-Cutting: Organization Layer

### 7.1 Groups (Rule-Based)

Groups are the primary explicit organization system, shared across all sheaths.

- **Smart groups** with matching rules (domain, keyword, substring). Rules can target URL, title, description, or all fields.
- An item can belong to multiple groups simultaneously.
- **Manual override:** Users can manually include or exclude an item from a group. Manual choices survive reclassification.
- **Starred** (always present, manual only) and **Other** (fallback) are special groups.
- Groups can have a **preferred browser** for routing when opening links.
- Reclassification runs on import and when rules change. Background, cancellable, with progress.

### 7.2 Spaces (Curated Collections)

| Type | Behavior |
|---|---|
| **Manual Space** | User manually adds and removes items. Explicit curation. |
| **Smart Space** | A saved search that dynamically populates. New matching items appear automatically. |

- An item can belong to multiple Spaces.
- Smart Spaces are stored as query definitions, not duplicated data.

### 7.3 Stacks (AI Auto-Groupings)

Stacks are auto-generated content clusters based on AI classification. Examples: "Articles", "Recipes", "Products", "Design Inspiration", "Tutorials".

- Stacks are generated automatically during enrichment.
- Sorted by how much content exists inside each stack.
- Stacks are a discovery layer — they surface content the AI has grouped together.
- Users can promote a Stack to a Space (saved) or dismiss it.
- Stacks have **transparency** — users can see why an item was classified into a stack.

### 7.4 Groups vs Spaces vs Stacks

| | Groups | Spaces | Stacks |
|---|---|---|---|
| **How created** | Rule-based + manual | Manual curation + saved searches | AI auto-generated |
| **User control** | Full (rules, overrides) | Full (add/remove) | Emergent (can promote to Space) |
| **Scope** | Classification | Curation | Discovery |
| **Shared across sheaths?** | Yes | Yes | Yes |

---

## 8. Browser Routing

- Each Group can have a preferred browser (Chrome, Brave, Helium, system default).
- When opening an item, the app checks the item's groups and uses the preferred browser.
- If multiple groups with conflicting preferences, show a picker (default to system default).
- Opening from a specific Group context uses that Group's routing.

---

## 9. Chrome Extension

- Sideloadable for v1. Chrome Web Store publication not required.
- **Protocol:** Custom URL scheme (`koshas://add?url=<encoded_url>&title=<encoded_title>&selection=<encoded_text>`).
- **Minimum viable:** Right-click → "Save to Koshas" → popup confirmation.
- Extension behaviour:
  - Sends the current page URL, title, and optionally selected text.
  - Optionally allows group selection before saving.
  - Supports right-click on images and highlighted text.

---

## 10. Export

### 10.1 Markdown Export (Collect Sheath)

1. Fetch page HTML (unauthenticated HTTP request, 15s timeout, follow redirects, set User-Agent).
2. Extract content via Mozilla Readability — prefers `<article>` → `<main>` → `<body>`.
3. Strip `<script>`, `<style>`, `<nav>`, `<footer>`.
4. Convert to Markdown via **Turndown**.
5. Generate YAML frontmatter via **js-yaml**.
6. Save `.md` file via save dialog.

**Portability:** Exported `.md` files contain `koshas://item/{uuid}` links that only resolve inside Koshas. An optional "Export as portable" mode converts these to relative path references or plain markdown links. In-app, links always use the `koshas://` format for integrity.

**Error handling:**

| Scenario | Behavior |
|---|---|
| Timeout, DNS, SSL, network failure | Save frontmatter-only + `*[Content could not be fetched]*` |
| Non-HTML content | Save frontmatter-only + note |
| Empty/malformed HTML | Save frontmatter-only + note |
| Converter returns empty | Fall back to raw body text |
| Auth/paywall content | Save fetched visible content if meaningful; otherwise frontmatter-only + note |

**Frontmatter format:**

```yaml
---
title: "{link title}"
url: "{link URL}"
description: "{link description}"
groups:
  - "{group name}"
source_browsers:
  - "{browser name}"
exported_at: "{ISO 8601 timestamp}"
---
```

### 10.2 Full Archive Export

- **Format:** Single `.koshas` zip containing:
  - `koshas.db` — full SQLite database dump.
  - `assets/` — thumbnails, cached images, downloaded article bodies.
  - `manifest.json` — metadata file with app version, export date, item count.
- **Export:** File → Export Archive. Save dialog.
- **Restore:** File → Import Archive. File picker for `.koshas` files. Confirmation dialog. Full replacement only.

---

## 11. Data Model

### 11.1 Core Table: `items`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| itemType | String | `bookmark`, `article`, `image`, `pdf`, `video`, `note`, `quote`, `highlight`, `product`, `recipe`, `book` |
| sourceUrl | String? | Original URL if applicable |
| normalizedUrl | String? | Deduplication key (URL-based items only) |
| title | String | Auto-fetched or user-provided |
| description | String? | |
| bodyText | Text? | Extracted article body, note content, quote text, etc. |
| thumbnail | String? | Remote URL or local file path |
| filePath | String? | Local file path (for file-based items) |
| fileSize | Int? | Bytes |
| metadata | JSON | Type-specific metadata (product price, recipe ingredients, image dimensions, etc.) |
| aiTags | JSON? | AI-generated tags (string array) — **visually marked as AI-generated in UI** |
| manualTags | JSON? | User-assigned tags (string array) |
| colors | JSON? | Extracted color palette (hex string array) |
| ocrText | Text? | OCR-extracted text |
| summary | Text? | AI-generated summary — **visually marked as AI-generated in UI** |
| embedding | BLOB? | Vector embedding for semantic search |
| enrichmentStatus | String | `pending`, `enriching`, `done`, `failed` |
| titleUserEdited | Bool | Field-level overwrite lock |
| descriptionUserEdited | Bool | Field-level overwrite lock |
| thumbnailUserEdited | Bool | Field-level overwrite lock |
| seenAt | Date? | Last Serendipity "keep" acknowledgment |
| manuallyAdded | Bool | True when created manually or via extension |
| createdAt | Date | |
| updatedAt | Date | |

### 11.2 Sources

| Field | Type | Notes |
|---|---|---|
| itemId | FK items.id | |
| sourceType | String | `browser_history`, `browser_bookmark`, `extension`, `manual`, `file_import` |
| sourceName | String | Browser name or "manual" or "extension" |
| sourceId | String? | Browser-specific ID for deduplication |
| firstSeenAt | Date | |
| lastSeenAt | Date | |

### 11.3 Visits

| Field | Type | Notes |
|---|---|---|
| itemId | FK items.id | |
| visitedAt | Date | |
| sourceContext | String? | How the visit occurred |

### 11.4 Groups

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| description | String? | |
| whitelist | JSON | Rule entries |
| blacklist | JSON | Rule entries |
| preferredBrowser | String? | |
| isBuiltIn | Bool | |
| isSpecial | Bool | Starred/Other |
| sortOrder | Int | |
| createdAt | Date | |
| updatedAt | Date | |

### 11.5 Item_Groups

| Field | Type | Notes |
|---|---|---|
| itemId | FK items.id | |
| groupId | FK groups.id | |
| assignmentType | String | `rule`, `manualInclude`, `manualExclude` |
| createdAt | Date | |

### 11.6 Spaces

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| description | String? | |
| spaceType | String | `manual` or `smart` |
| queryDefinition | JSON? | Saved search criteria (for Smart Spaces) |
| sortOrder | Int | |
| createdAt | Date | |
| updatedAt | Date | |

### 11.7 Space_Items

| Field | Type | Notes |
|---|---|---|
| spaceId | FK spaces.id | |
| itemId | FK items.id | |
| addedAt | Date | |

### 11.8 Link_References

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| sourceItemId | FK items.id | |
| targetItemId | FK items.id | |
| referenceType | String? | `explicit` (user-created), `auto_detected` |
| createdAt | Date | |

### 11.9 Deleted_Items (Tombstones)

| Field | Type | Notes |
|---|---|---|
| normalizedUrl | String unique | Canonical URL tombstone |
| filePath | String? | File path tombstone (for notes) |
| deletedAt | Date | |

### 11.10 Notebooks

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| defaultSaveLocation | String (path) | |
| sortOrder | Int | |
| createdAt | Date | |
| updatedAt | Date | |

### 11.11 Notebook_Folders

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| notebookId | FK notebooks.id | |
| folderPath | String | |
| addedAt | Date | |

### 11.12 Notes (Index)

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| itemId | FK items.id | |
| filePath | String (unique) | |
| notebookId | FK notebooks.id | |
| frontmatter | JSON? | Full raw frontmatter, managed |
| fileModifiedAt | Date | Filesystem mtime |
| createdAt | Date | |
| updatedAt | Date | |

### 11.13 FTS5 Virtual Tables

- **`items_fts`** — indexes `title`, `description`, `bodyText`, `ocrText`, `summary`.
- **`notes_fts`** — indexes `title`, `bodyText` scoped to notes.

### 11.14 Sync_Runs

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| startedAt | Date | |
| finishedAt | Date? | |
| status | String | `running`, `succeeded`, `failed`, `cancelled` |
| sourceName | String? | Browser name |
| importedCount | Int | |
| errorMessage | String? | |

### 11.15 Edit Priority

- Field-level user edit flags protect fields from being overwritten by imports, metadata fetches, or AI enrichment.
- Group assignment changes are preserved through `item_groups.assignmentType`.
- Users cannot unlock fields for future overwrite in v1.

---

## 12. App Lifecycle

- Menu bar extra / status item supported. Closing the main window hides it (if menu bar extra enabled).
- Cmd+Q quits the app.
- Window size/position and last selected view remembered via UserDefaults.
- Drag-and-drop URLs and files into the window supported.
- Spotlight indexing supported.

---

## 13. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Cmd+K** | Open command palette |
| **Cmd+Shift+F** | Global search overlay |
| **Cmd+N** | New note |
| **Cmd+S** | Save current note |
| **Cmd+P** | Toggle editor view mode (Source ↔ WYSIWYG ↔ Preview) |
| **Cmd+F** | Focus current-view search |
| **Cmd+Shift+E** | Export item as Markdown |
| **Cmd+B** | Toggle browser sync panel |
| **Cmd+J** | Toggle console log panel |
| **Cmd+Shift+N** | Quick Note |
| **Cmd+Shift+Return** | Focus Mode |
| **Cmd+[** | Navigate back |
| **Cmd+]** | Navigate forward |
| **Cmd+,** | Open Preferences |
| **Cmd+W** | Close modal / close current tab |
| **Cmd+Q** | Quit app |
| **Cmd+/** | Open keyboard shortcuts reference overlay |

---

## 14. Onboarding

Four sequential screens on first launch:

1. **Welcome** — "Koshas is your knowledge companion. Capture anything, connect everything." Brief explanation of the three sheaths. The welcome language emphasizes service and ownership — "Your knowledge stays on your device. This tool serves you, not a corporation."

2. **Permissions** — "Koshas needs access to your browser data to import bookmarks and history." Two options:
   - "Grant Full Disk Access" — opens macOS Security & Privacy settings.
   - "I'll do this later" — skips. Browser import shows an error with a link back.

3. **Browser selection** — Detected browsers shown with pre-checked checkboxes. "Import bookmarks and history from the last year." **A note: "You are in full control. Nothing is sent anywhere. Your data stays on your machine."** Sync does not start automatically.

4. **First Notebook (optional)** — "Add a folder to create your first notebook." macOS folder picker. Named "My Notebook" by default. Skip available.

Post-onboarding landing: Collect Sheath with groups view. Onboarding is replayable from Preferences > Reset Onboarding.

---

## 15. Backup and Restore

### 15.1 Archive Format

- Single `.koshas` zip archive containing:
  - `koshas.db` — full SQLite database file.
  - `assets/` — thumbnails, cached article bodies, enrichment artifacts.
  - `manifest.json` — metadata file.

### 15.2 Export

- File → Export Archive.
- Save dialog with default filename `Koshas-backup-{date}.koshas`.
- Database copied atomically (SQLite `VACUUM INTO` or file-level copy).

### 15.3 Restore

- File → Import Archive.
- File picker filtered to `.koshas` files.
- Confirmation dialog: "This will replace all current data. This cannot be undone."
- Validation, summary, replacement, and restart.
- Partial restore not supported in v1.

---

## 16. The Team

Koshas is built by a four-person development team, each with a distinct ownership area and a bridge to the others.

**Canonical team structure:** See `docs/core-docs/team.md` for the team structure, identifiers, ownership areas, and operating model. The table below is a summary reference.

| Role | Identifier | Focus |
|---|---|---|
| **Project Steward** (default) | `steward` | Repository health, conventions, audit, agent onboarding |
| **Product Lead** (Orchestrator) | `orchestrator` | Strategy, roadmap, prioritization |
| **Design Head** | `designer` | User research, information architecture, design system |
| **Back-End Engineer** | `backend` | Architecture, database, AI pipeline, APIs |
| **Interaction Engineer** | `frontend` | Frontend, state, animation, UI, editor integration |

### 16.1 Product Lead

**Identity:** You are the strategic driver of Koshas. You define what gets built and why. Your job is to ensure every feature ships with a clear purpose, a measurable outcome, and a coherent fit within the product vision. You do not design interfaces or write code — you create clarity so the team can move fast.

**Ownership:**
- Product strategy and long-term vision alignment.
- Roadmap definition and release planning.
- Feature prioritization against user value and engineering effort.
- Success criteria definition for every feature and milestone.
- Stakeholder communication and scope management.
- Cross-sheath coherence — ensuring all three sheaths feel like one product, not three apps.

**Koshas-specific responsibilities:**
- Define phasing strategy — which sheaths ship in which order.
- Resolve scope tension between sheaths.
- Define the capture-first philosophy and ensure every team decision respects it.
- Prioritize AI enrichment features against infrastructure work.
- Decide on-platform vs off-platform AI — local models vs API calls.
- Define success: what does a "shippable" sheath look like?

**Skills to use:**

| Task | Skill |
|---|---|
| Writing release notes / product changelog | `changelog-maintenance` |
| Creating project README | `writing-effective-readme` |
| Creating user-facing documentation | `effective-user-documentation` |
| Discovering new skills as the project evolves | `find-skills` |

**Agent instructions:**
- Start every feature with a one-paragraph **problem statement**: "A user needs to X because Y. Currently they cannot because Z. We will know this works when W."
- Before a feature enters a milestone, write **acceptance criteria** as bullet points a non-technical person could verify.
- Maintain `docs/orchestration.md`, `docs/milestones.md`, and `docs/core-docs/koshas-plan-v1.md`.
- When the team disagrees, you make the final call. Synthesize input and decide.
- Review every spec section before implementation. Your question: "Does this serve a user need we've committed to solving?"
- Ensure every feature passes the user trust test — "Does this serve the user's well-being, or does it serve our metrics?"

**Artifacts:**
- `docs/orchestration.md` — project state file
- `docs/milestones.md` — milestone scope and deliverables
- `docs/core-docs/koshas-plan-v1.md` — roadmap
- Feature briefs (one-page problem + acceptance criteria)
- Milestone release notes

### 16.2 Design Head

**Identity:** You are the person who makes Koshas feel like something people want to use. You define the visual language, the interaction patterns, the information architecture, and the emotional texture of the product. You do not build the UI — you design the system that the interaction engineer brings to life.

**Ownership:**
- User research and usability testing.
- User journeys and task flows across all three sheaths.
- Information architecture — how sheaths connect, how navigation works, how content is surfaced.
- Design system — visual language, typography, spacing, component patterns, motion principles.
- High-fidelity visual assets and specifications for every screen state.
- Accessibility baseline.

**Koshas-specific responsibilities:**
- Design the visual hierarchy of a card-based interface with 11 content types.
- Design the Sheath navigation model — moving between Collect, Notes, and Graph.
- Design the capture moment — micro-interactions and confirmation states.
- Design the Search experience — full-text, semantic, faceted, and tag search in one interface.
- Design empty states for every view.
- Design the graph visualization language.
- Ensure the UI contains no dark patterns — no engagement loops, no addictive patterns, no manipulative defaults.

**Skills to use:**

| Task | Skill |
|---|---|
| Generating high-fidelity frontend UI mockups | `frontend-design` |
| Reviewing UI against accessibility guidelines | `web-design-guidelines` |

**Agent instructions:**
- Every screen you design must account for four states: **loading, empty, populated, error.**
- Build the **design system tokens** first — spacing, typography, color, elevation. Everything else derives from these.
- Design in **user flows**, not screens.
- For v1, prioritize **functional clarity** over visual novelty. The interface should fade into the background.
- Document design decisions in `docs/agents/design-head/design-decisions.md`.
- Work in low-fidelity first, then high-fidelity.
- When handing off to the Interaction Engineer: one source-of-truth file per screen, states and behaviors spec, motion intent note.
- Before finalizing any interaction pattern, review it against user trust principles — no manipulation, full transparency, user serves first.

**Artifacts:**
- Design system tokens specification (`docs/core-docs/DESIGN.md`)
- User flow diagrams
- Screen specs (high-fidelity mockups with states)
- `docs/agents/design-head/design-decisions.md` — design rationale log

### 16.3 Back-End Engineer

**Identity:** You are the person who makes Koshas work correctly, durably, and performantly. You own the data layer, the business logic, the enrichment pipeline, and the integrations. The other team members trust you to make the right technical decisions so that the frontend has clean, reliable data to work with.

**Ownership:**
- Database architecture, schema design, migration management (Drizzle ORM + SQLite).
- All data pipelines: browser import, URL normalization/deduplication, metadata fetching, file indexing.
- AI enrichment infrastructure: OCR, auto-tagging, summarization, embeddings, color extraction.
- Search infrastructure: FTS5 full-text indexing, vector embeddings.
- File system integration: file watching, bidirectional sync.
- Export pipeline: Markdown generation, archive backup/restore.
- Chrome extension protocol and custom URL scheme handler.
- Data integrity: migration safety, field-level edit locks, tombstone management.

**Koshas-specific responsibilities:**
- Design and maintain the `items` table schema with polymorphic metadata.
- Implement the URL normalization engine.
- Build the browser import pipeline (50k records in under 1 minute).
- Build the file watcher service (Tauri `fs.watch`) with debounce and conflict resolution.
- Implement the AI enrichment pipeline as an async job queue.
- Set up FTS5 full-text search and vector index.
- Implement the backup/restore system.
- Ensure that **the app works fully without AI** — enrichment failures never block the user. The enrichment pipeline is designed so that each step is idempotent and independently retryable.

**Skills to use:**

| Task | Skill |
|---|---|
| Tauri v2 project structure, IPC, capabilities | `tauri-v2` |
| Drizzle schema, migrations, complex queries | `drizzle-orm-patterns` |
| Rust backend architecture, async patterns, state management | `rust-desktop-applications` |
| Tauri event emission (import progress, enrichment status) | `tauri-event-system` |
| Code review | `TRAE-code-review` |

**Agent instructions:**
- Write the **Drizzle schema definition first**, before any business logic.
- Every table gets `createdAt` and `updatedAt`. Every nullable field is explicitly typed. Every foreign key is indexed.
- Write **migrations as you go**. Never modify an existing migration — create a new one. Never manually edit the database.
- The `items` table uses a JSON `metadata` column for type-specific fields. Define TypeScript interfaces for each type.
- The enrichment pipeline is designed as isolated, idempotent job handlers. Each step reads and writes its own fields only.
- Store enrichment model configuration in a config file, not in code.
- The browser import pipeline writes progress events to a Tauri event channel. Import runs in a background thread.
- Every data write path must handle partial failure.
- Write tests for: URL normalization (20+ edge cases), deduplication merge logic, group classification rules, enrichment pipeline idempotency.

**Artifacts:**
- `database/schema.ts` — Drizzle schema definitions
- `database/migrations/` — migration files
- `src/lib/server/` — all backend logic
- `docs/core-docs/architecture-decisions.md` — technical decision records
- `docs/agents/back-end-engineer/architecture-decisions.md` — additional technical decision records

### 16.4 Interaction Engineer

**Identity:** You are the person who makes Koshas feel alive. You take the Design Head's static visuals and the Back-End Engineer's data and build the actual screens, transitions, micro-interactions, and responsive behaviors that the user touches. You are the bridge between design intent and engineering reality.

**Ownership:**
- Frontend application architecture (SvelteKit 5 with runes).
- Component tree, state management, and routing within the Tauri webview.
- All animation, transition, and micro-interaction implementation.
- Editor integration (CodeMirror 6, TipTap, remark/rehype).
- Search UI — search input, results rendering, faceted filters, cross-sheath result grouping.
- Card system — 11 content types from a unified component tree.
- Graph visualization — interactive node/edge rendering.
- Drag-and-drop capture, keyboard shortcuts, menu bar integration.
- Sync progress UI, console/log panel, onboarding flow.

**Koshas-specific responsibilities:**
- Build the sidebar tab system (Collect, Notes, Graph) with smooth transitions.
- Implement the card system component — unified `<Card>` rendering different layouts per type.
- Build the Search experience — full-text, tag, faceted, and semantic search in one interface.
- Build the three-mode editor with seamless markdown-as-truth switching.
- Build the Graph visualization — interactive, zoomable, pannable.
- Implement the Serendipity view.
- Build Quick Note capture and Focus Mode.
- Never implement a pattern that manipulates user behavior. No infinite scroll on content feeds. No notification badges that aren't user-requested. All animations and transitions serve clarity, not engagement.

**Skills to use:**

| Task | Skill |
|---|---|
| Writing components with Svelte 5 runes | `svelte-runes` |
| Setting up routes, layouts, page config | `sveltekit-routing` |
| Data fetching and form handling | `sveltekit-data-flow` |
| Typing SvelteKit boundaries | `sveltekit-typescript` |
| Writing Playwright E2E tests | `webapp-testing` |
| Tauri IPC invocation, backend events | `tauri-event-system` + `tauri-v2` |
| Code review | `TRAE-code-review` |

**Agent instructions:**
- Write **Svelte 5 with runes** (`$state`, `$derived`, `$effect`, `$props`). No legacy patterns.
- Use **TypeScript** for all files. Every component has typed props.
- Component tree structured by domain:
  ```
  src/lib/components/
    layout/         — Shell, sidebar, panels
    collect/        — Import UI, browser sync, add link
    notes/          — Editor, notebook grid, tree view
    graph/          — Visualization, backlinks panel
    search/         — Search input, results, filters
    cards/          — Card component + type-specific layouts
    shared/         — Buttons, inputs, modals, dropdowns
  ```
- Data lives in Tauri (SQLite). Frontend fetches on demand and caches in runes. Do not mirror the full database in frontend state.
- Use Svelte transitions for list animations and panel open/close. Use CSS `@keyframes` for hover states. Use `requestAnimationFrame` for graph rendering.
- Duration: 150ms micro-interactions, 300ms panel transitions, 500ms mode switches.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entering, `cubic-bezier(0.4, 0, 0.68, 0.06)` for exiting.
- Every data-fetching UI shows a skeleton or placeholder within 200ms. Never show a blank screen.
- Every Tauri invoke call is wrapped in try/catch. Errors surface as inline toast notifications. Critical errors get a modal dialog.
- Performance: search results within 100ms, card grids at 200 items without jank, graph handles 500 nodes without frame drops.
- Write Playwright tests for critical user flows: import, search, create note, edit note, create reference.

**Artifacts:**
- Full SvelteKit component tree under `src/lib/components/`
- Route pages under `src/routes/`
- `docs/agents/interaction-engineer/component-tree.md` — documented component hierarchy
- `docs/agents/interaction-engineer/state-model.md` — documented state management approach

### 16.5 Team Operating Model

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
- Before milestone: Product Lead writes the brief, Design Head produces flows, Back-End Engineer validates feasibility.
- During milestone: Interaction Engineer builds frontend, Back-End Engineer builds backend, Design Head reviews implementation.
- After milestone: Product Lead writes release notes, team reviews scope vs delivery.

---

## Appendix: Open Implementation Questions

1. ~~**OCR engine:** Tesseract sidecar vs Rust crate vs local ML model.~~ → Deferred to post-v1 (AI enrichment stubs, see §5.7).
2. ~~**Embedding model:** Local (ONNX/Candle) vs API-based. v1 starts local.~~ → Deferred to post-v1 (ADR-015, see §5.5).
3. **Image thumbnail generation:** Rust `image` crate vs Tauri plugin vs frontend canvas. **Must be resolved before T-012 (Card System).**
4. **PDF rendering:** PDF.js vs native webview vs Tauri plugin.
5. **DOC/DOCX reader:** Conversion library for read-only display.
6. **ENV config model:** Enrichment API keys, model paths, prompt templates in a config file.
7. **Assumption validation:** Validate that users want a visual graph for navigation before committing to heavy graph UI investment.

**Status:** Questions 1-2 resolved (deferred). Question 3 is a blocking dependency for T-012. Questions 4-7 remain open and should be resolved before their respective implementation tasks begin. See PT-002 (Resolve Open Technical Questions) in tasks.md.
