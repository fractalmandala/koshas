# Koshas Design System

**Derived from:** `theme-templates/koshas-default-dark.html`, `theme-templates/koshas-default-light.html`, `theme-templates/styling.sass`

---

> This document captures the design system as it exists in the clickable prototypes. It is the reference for both the Design Head and Interaction Engineer during implementation.

---

## Design Direction

Two themes: **Dark** and **Light**, sharing the same component structure and tokens.

---

## Color Tokens

### Light Theme (`body.light`)

| Token | Value | Usage |
|---|---|---|
| `--surface-00` | `#ffffff` | Primary surface (cards, sidebar, main) |
| `--surface-10` | `#E4E4E4` | Secondary surface (shell background) |
| `--surface-20` | `#F4F4F4` | Tertiary surface (hover states, small elements) |
| `--fore-primary` | `#222224` | Headings, primary text |
| `--fore-secondary` | `#707279` | Body text, secondary content |
| `--fore-tertiary` | `#989aa1` | Captions, timestamps, metadata |
| `--theme-main` | `#2eaf7d` | Primary accent (buttons, active states, focus rings) |
| `--theme-secondary` | `#0b8e55` | Darker accent (hover, highlights, labels) |
| `--theme-tertiary` | `#0cac3a` | Tertiary accent |
| `--medium-00` | `#ececec` | Subtle borders |
| `--medium-10` | `#cecece` | Borders, dividers |
| `--medium-20` | `#e5e5e5` | Scrollbars, muted elements |
| `--medium-30` | `#999ba2` | Hover scrollbar |
| 	`--medium-40` | `#898b92` | |
| `--shadow-1-color` | RGBA `(50,52,58,0.06)` | Subtle card shadow |
| `--shadow-2-color` | RGBA `(50,52,58,0.05)` | Elevated surface shadow |
| `--shadow-3-color` | RGBA `(50,52,58,0.18)` | Elevated surface shadow |
| `--shadow-4-color` | RGBA `(50,52,58,0.20)` | Modal/dropdown shadow |

refer file [[./theme-templates/koshas-default-light.html]] for up-to-date usage of light theme

### Dark Theme (`body.dark`)

| Token | Value | Usage |
|---|---|---|
| `--surface-00` | `#0b0b0b` | Primary surface |
| `--surface-10` | `#141414` | Secondary surface |
| `--surface-20` | `#222220` | Tertiary surface |
| `--fore-primary` | `#e0e0e1` | Headings, primary text |
| `--fore-secondary` | `#909091` | Body text |
| `--fore-tertiary` | `#626262` | Captions, metadata |
| `--theme-main` | `#0ab858` | Primary accent |
| `--theme-secondary` | `#0dd179` | Darker accent |
| `--theme-tertiary` | `#0cac3a` | Tertiary accent |
| `--medium-00` | `#1e1e1c` | Subtle borders |
| `--medium-10` | `#303030` | Borders, dividers |
| `--medium-20` | `#505050` | Scrollbars, muted elements |
| `--medium-30` |  `#999ba2` | |
| `--medium-40` | `#898b92` | |
| `--shadow-1-color` | RGBA `(0,0,0,0.7)` | |
| `--shadow-2-color` | RGBA `(0,0,0,1)` | |
| `--shadow-3-color` | RGBA `(0,0,0,1)` | |
| `--shadow-4-color` | RGBA `(0,0,0,0.8)` | |

refer file [[./theme-templates/koshas-default-dark.html]] for up-to-date usage of dark theme

---

## Typography

| Property | Value |
|---|---|
| **Font family** | `"Google Sans", system-ui, sans-serif` |
| **Headings (h1)** | 500 weight, 42px (collect), 40px (editor), letter-spacing -0.01em |
| **Headings (h2)** | 600 weight, 24px |
| **Body (editor)** | 18px, line-height 1.66 |
| **Body (cards)** | 13px, line-height 1.55 |
| **Small/captions** | 10-12px |
| **Serif** | `"Google Sans", sans-serif` (reserved for quotes, at 21px italic) |
| **Mono** | `"Google Sans", sans-serif` (reserved for source mode, at 13.5px) |
| **Font smoothing** | `-webkit-font-smoothing: antialiased` |

---

## Layout

```
┌─────────────────────────────────────────────────┐
│ Titlebar (56px)    [●●●]    [search] [capture] │
├───────────┬─────────────────────────────────────┤
│           │                                     │
│  Rail     │  Content                            │
│  (280px)  │  (flex: 1, scrollable)              │
│           │                                     │
│  ┌───┐    │  ┌── masonry (4 cols, min 248px) ─┐│
│  │ ○ │    │  │ ┌──────┐ ┌──────┐ ┌──────┐    ││
│  │ ○ │    │  │ │ card │ │ card │ │ card │    ││
│  │ ○ │    │  │ └──────┘ └──────┘ └──────┘    ││
│  └───┘    │  │ ┌──────┐ ┌──────┐             ││
│           │  │ │ card │ │ card │             ││
│           │  │ └──────┘ └──────┘             ││
│           │  └───────────────────────────────┘│
└───────────┴─────────────────────────────────────┘
```

- **App shell:** `.win` (flex column) → `.titlebar` + `.shell` (grid: 280px sidebar / 1fr)
- **Rail (sidebar):** `.rail` with rounded corners, border, shadow, offset from edges (16px top/left, -48px height)
- **Content:** `.main` (flex column) → `.topbar` + `.content-pad` (scrollable, 30px/36px padding)
- **Editor layout:** `.parchment` (grid: 1fr / 280px margin) with `.sheet` area centered by `padding: 0 160px`

---

## Component Tokens

### Cards (Collect Sheath)
- **Border radius:** 8px (`--radius`)
- **Size:** Fill column width, break inside column
- **Layered paper effect:** `::before` with offset `box-shadow` (5px 6px → 8px 11px on hover)
- **Hover:** translateY(-3px), elevated shadow
- **Body padding:** 17px 18px
- **Media header:** 152px height with gradient overlay + grain

### Sidebar Nodes (Rail)
- **Bud (circle):** 16px, border 2px, centered dot (5px). Active: fill theme color, dot white
- **Node layout:** flex with 14px gap, 8px padding
- **Title:** 17px, 500 weight
- **Label:** 11px, tertiary color
- **Leaf decoration:** 22×13px, rotated, displayed on active node

### Editor
- **Sheet:** White surface, bordered left/right, 64px padding
- **Frontmatter card:** Rounded (12px), bordered, with floating label (position absolute, -8px)
- **Mode tabs:** Segmented control (3px padding, 7px radius). Active pill slides with 0.45s ease
- **Margin:** 54px padding top, 280px width. Backlinks styled as block buttons with hover

### Command Palette
- **Scrim:** Fixed inset, backdrop-filter blur(3px), semi-transparent
- **Modal:** 600px max-width, 16px radius, prominent shadow
- **Input:** 18px, border-bottom separator
- **Results:** 14.5px rows, 10px radius, selected state has green tinted background

### Search Bar
- **Height:** 36px, max-width 480px
- **Border:** 1px solid, 8px radius
- **Focus:** Border color change, 4px ring at 16% opacity theme color

---

## Animation Tokens

| Context | Duration | Easing | Property |
|---|---|---|---|
| Micro-interactions (hover) | 160ms | ease | background, color |
| Card hover (transform + shadow) | 350ms | `cubic-bezier(0.16,1,0.3,1)` | transform, box-shadow |
| Sidebar node hover | 250ms | `cubic-bezier(0.16,1,0.3,1)` | color, border |
| Editor mode pill slide | 450ms | `cubic-bezier(0.16,1,0.3,1)` | left, width |
| Enriching spinner | 2400ms | `cubic-bezier(0.16,1,0.3,1)` | rotate |
| Scrollbar | thin, 11px, rounded (10px), 3px transparent border padding |

---

## Prototypes

The design system is implemented as clickable prototypes in `theme-templates/`:

| File | Content |
|---|---|
| `theme-templates/koshas-start.html` | Direction picker — Aurora (dark) vs Verdure (light) |
| `theme-templates/koshas-default-dark.html` | Full dark theme prototype (Verdure direction) |
| `theme-templates/koshas-default-light.html` | Full light theme prototype (Verdure direction) |
| `theme-templates/styling.sass` | Complete SASS source with all tokens, components, and responsive rules |
| `theme-templates/styling.css` | Compiled CSS (maps to styling.css.map) |
| `theme-templates/data.js` | Sample data: 11 items, groups, stacks, spaces, 3 notes with backlinks |

The prototypes are built with React + Babel for interactive rendering (not the production stack). The SASS is the canonical source of truth for the design system.

---

## Design Principles (from prototypes)

1. **Nature as metaphor.** The visual system takes cues from forests, growth, paper, and organic materials — not from glass, plastic, or digital skeuomorphism.
2. **Paper grain grounds the digital.** Subtle noise textures prevent the UI from feeling sterile. Light theme uses multiply blending; dark theme uses screen blending.
3. **Depth through layering, not shadows alone.** The `::before` pseudo-element on cards creates a physical "stack of paper" feel that pure box-shadow cannot.
4. **Green is intentional, not decorative.** Every green swatch carries meaning: interaction cues, active states, enrichment indicators, growth markers.
5. **Information density, not crowding.** Card layouts are spacious within but dense in aggregate (4-column masonry). The editor provides generous reading margins.
