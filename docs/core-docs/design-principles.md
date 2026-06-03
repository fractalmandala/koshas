# Design Principles

**Derived from:** koshas-specs-v1.md, design-notes.md

---

## Core Principles

### 1. Capture First, Organize Later
Saving anything must be nearly frictionless. Organization emerges from AI enrichment, saved searches, tags, and connections — not from manual folder structures at capture time.

### 2. Filesystem is the Source of Truth
For notes, the filesystem is the canonical store. The database indexes and enriches, but the `.md` files on disk are what survive. No proprietary format locks.

### 3. App Works Without AI
AI enrichment is a bonus layer, not a requirement. Every feature must function fully with AI disabled. Enrichment failures never block the user.

### 4. Transparency on AI-Generated Content
Every AI-generated field has a provenance marker. Users can always distinguish what the system decided from what they created. AI tags, summaries, and classifications are visually marked.

### 5. No Dark Patterns
No engagement loops. No notification spam. No infinite scroll. No manipulative defaults. No recommended/biased search results. Results are ranked by relevance (BM25) and recency.

### 6. Cross-Sheath Integration
The three sheaths (Collect, Notes, Graph) share tags, groups, search, and bidirectional references. They feel like one product, not three apps.

### 7. Local-First
Core functionality runs entirely on the user's machine. No server farms required. No data leaves the device without explicit user action.

---

## Interaction Principles

### Speed
- Minimize time from "I want to save this" to "it's saved." Every click is a tax.
- Search results return within 100ms.
- Import 50k records in under 1 minute.

### Trust
- The filesystem is the source for notes. The database is the source for the index. Never confuse the two.
- Field-level edit locks prevent overwrite of user changes.
- Tombstone deletion model prevents accidental data loss.

### Joy
- Micro-interactions are not cosmetic — they build the emotional texture that makes people want to use the tool.
- Animations serve clarity, not engagement: 150ms micro-interactions, 300ms panel transitions, 500ms mode switches.

### Progressive Disclosure
- Show more on large lists. Initial load capped at ~100 items.
- Command palette (Cmd+K) surfaces all actions without cluttering the UI.
- Focus mode strips away everything but the document.

---

## Content Hierarchy

1. **Items** (unified model) — everything is an item with a type discriminator
2. **Groups** — rule-based + manual organization, shared across sheaths
3. **Spaces** — manual curation or saved searches
4. **Stacks** — AI auto-generated clusters (discovery layer only)
5. **Tags** — flat, cross-cutting, user-defined
