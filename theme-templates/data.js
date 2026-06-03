/* Koshas — shared sample knowledge collection.
   Themed around knowledge / nature / growth so the green palette reads intentional.
   Exposes window.KOSHAS_DATA = { items, notes, groups, stacks, spaces }      */
(function () {
  // Each item.colors is an extracted palette (used for glow / pigment swatches).
  // Image-type items have no real photo — we render gradient placeholders from `colors`.
  const items = [
    {
      id: "i01", type: "article", saved: "2d",
      title: "The Wood Wide Web: how trees talk underground",
      desc: "Suzanne Simard's decades of work showing forests trade carbon, water and warning signals through mycorrhizal fungal networks.",
      domain: "nautil.us", url: "https://nautil.us/the-wood-wide-web",
      readMins: 14, colors: ["#1f7a4d", "#2f9e63", "#86c8a0", "#0c3a24"],
      aiTags: ["ecology", "mycorrhiza", "systems"], manualTags: ["foundational"],
      group: "Forests", stack: "Long reads", status: "done",
      summary: "Trees are nodes in a fungal trading network — 'mother trees' route resources to seedlings, and the forest behaves as one cooperative organism rather than a set of competitors.",
      refs: 4, sameVibe: ["i05", "i07", "i11"]
    },
    {
      id: "i02", type: "image", saved: "2d",
      title: "Fern unfurling, backlit",
      desc: "Macro, shot at dawn. Koshas extracted the palette automatically.",
      colors: ["#3f7d2e", "#9fc25a", "#d8e6a0", "#23431b"],
      aiTags: ["plant", "macro", "green", "morning"], manualTags: [],
      group: "Field notes", stack: "Texture", status: "done",
      meta: { dims: "4032 × 3024", fmt: "HEIC", ocr: null },
      refs: 1, sameVibe: ["i06", "i09"]
    },
    {
      id: "i03", type: "book", saved: "5d",
      title: "The Hidden Life of Trees",
      desc: "Peter Wohlleben on the social networks of the forest.",
      colors: ["#2e6b46", "#6ba77f", "#0f2c1d", "#cdab74"],
      aiTags: ["nature", "non-fiction"], manualTags: ["to-read"],
      group: "Forests", stack: "Books", status: "done",
      meta: { author: "Peter Wohlleben", year: 2015, pages: 288 },
      refs: 2, sameVibe: ["i01", "i07"]
    },
    {
      id: "i04", type: "quote", saved: "5d",
      title: null,
      body: "What we observe is not nature itself, but nature exposed to our method of questioning.",
      attribution: "Werner Heisenberg",
      desc: "On the entanglement of observer and observed.",
      colors: ["#1d5b3a", "#3f8f63"],
      aiTags: ["epistemology", "physics"], manualTags: [],
      group: "Mind", stack: "Quotes", status: "done",
      refs: 0, sameVibe: ["i08"]
    },
    {
      id: "i05", type: "highlight", saved: "1w",
      title: "Highlight from “Entangled Life”",
      body: "Fungi don't just connect plants — they negotiate. A fungus can charge a higher 'price' in carbon to a plant that has more to spare.",
      desc: "Selected while reading. Backlinks to the source article.",
      sourceTitle: "Entangled Life — Merlin Sheldrake", sourceUrl: "https://example.com/entangled",
      colors: ["#246a44", "#7bbf95"],
      aiTags: ["mycology", "economics"], manualTags: ["foundational"],
      group: "Forests", stack: "Highlights", status: "done",
      refs: 1, sameVibe: ["i01", "i11"]
    },
    {
      id: "i06", type: "recipe", saved: "1w",
      title: "Wild nettle & potato soup",
      desc: "Forager's spring soup. Sting goes away the moment it hits heat.",
      domain: "seriouseats.com", url: "https://example.com/nettle-soup",
      colors: ["#3a7d34", "#8fbf4a", "#cfe08e", "#214a16"],
      aiTags: ["foraging", "spring", "vegetarian"], manualTags: [],
      group: "Kitchen", stack: "Recipes", status: "done",
      meta: { time: "35 min", serves: 4, ingredients: ["young nettle tops", "waxy potato", "leek", "stock", "crème fraîche"] },
      refs: 0, sameVibe: ["i02"]
    },
    {
      id: "i07", type: "video", saved: "1w",
      title: "How trees secretly talk to each other",
      desc: "BBC Ideas — animated short, narrated.",
      domain: "youtube.com", url: "https://youtu.be/example",
      colors: ["#1a5e3c", "#4f9d6e", "#0a2a1b"],
      aiTags: ["explainer", "ecology"], manualTags: [],
      group: "Forests", stack: "Watch later", status: "enriching",
      meta: { duration: "4:32", platform: "YouTube" },
      refs: 1, sameVibe: ["i01", "i03"]
    },
    {
      id: "i08", type: "note", saved: "3d",
      title: "On second brains",
      body: "A note isn't storage, it's a future conversation with yourself. The value compounds only if past-me wrote so present-me can re-enter the thought.",
      desc: "Quick note, captured with ⌘⇧N.",
      colors: ["#2b6a47"],
      aiTags: ["pkm", "writing"], manualTags: ["seed"],
      group: "Mind", stack: "Notes", status: "done",
      refs: 3, sameVibe: ["i04", "i10"]
    },
    {
      id: "i09", type: "product", saved: "2w",
      title: "Hario V60 ceramic dripper",
      desc: "Olive green, size 02. For the slow morning ritual.",
      domain: "hario.com", url: "https://example.com/v60",
      colors: ["#5d7c4a", "#9fb87f", "#36492a"],
      aiTags: ["coffee", "ceramic"], manualTags: ["wishlist"],
      group: "Kitchen", stack: "Products", status: "done",
      meta: { price: "$23", store: "Hario" },
      refs: 0, sameVibe: ["i02", "i06"]
    },
    {
      id: "i10", type: "bookmark", saved: "2w",
      title: "Are.na — connect ideas, build knowledge",
      desc: "A quieter, calmer place to organize the internet into channels.",
      domain: "are.na", url: "https://are.na",
      colors: ["#2f6b4a", "#84b79a", "#13301f"],
      aiTags: ["tool", "research", "calm-tech"], manualTags: ["inspiration"],
      group: "Tools", stack: "Inspiration", status: "done",
      refs: 2, sameVibe: ["i08", "i11"]
    },
    {
      id: "i11", type: "pdf", saved: "3w",
      title: "Mycorrhizal networks mediate plant communication",
      desc: "Gorzelak et al., 2015. 18 pages. AI summary ready.",
      colors: ["#1f7048", "#5fa37d", "#0d2c1d"],
      aiTags: ["paper", "biology", "peer-reviewed"], manualTags: ["foundational"],
      group: "Forests", stack: "Papers", status: "done",
      meta: { pages: 18, fileSize: "2.4 MB" },
      summary: "Review of evidence that common mycorrhizal networks transfer nutrients and defense signals between plants, influencing seedling establishment and community dynamics.",
      refs: 2, sameVibe: ["i01", "i05"]
    }
  ];

  const groups = [
    { name: "Starred", count: 6, special: true },
    { name: "Forests", count: 5 },
    { name: "Mind", count: 3 },
    { name: "Kitchen", count: 4 },
    { name: "Tools", count: 2 },
    { name: "Field notes", count: 3 }
  ];

  const stacks = [
    { name: "Long reads", count: 7, why: "Articles & papers over ~10 min read time" },
    { name: "Design inspiration", count: 12, why: "Visual, tool & layout references" },
    { name: "Recipes", count: 5, why: "Pages with ingredient + step structure" },
    { name: "Forest ecology", count: 9, why: "Semantic cluster: trees, fungi, soil, networks" }
  ];

  const spaces = [
    { name: "Spring foraging", type: "smart", count: 8 },
    { name: "Reading 2026", type: "manual", count: 14 },
    { name: "Same vibe: calm tools", type: "smart", count: 6 }
  ];

  // ---- Notes Sheath sample (the editor) ----
  const notes = [
    {
      id: "n01", title: "Forests as a single organism", group: "Forests",
      updated: "today · 14:22", words: 312, mode: "wysiwyg",
      frontmatter: { title: "Forests as a single organism", group: "Forests", tags: ["ecology", "seed"], created: "2026-05-28", updated: "2026-06-03" },
      backlinks: [
        { id: "n02", title: "Reading log — June" },
        { id: "i01", title: "The Wood Wide Web", type: "article" }
      ],
      // light-markup blocks for rendering
      blocks: [
        { t: "h1", x: "Forests as a single organism" },
        { t: "p", x: "If you stop treating a forest as a collection of competing trees and start treating it as one cooperative body, almost everything gets easier to explain." },
        { t: "callout", x: "Working claim: the unit of selection in a mature forest is closer to the stand than the individual." },
        { t: "h2", x: "Evidence so far" },
        { t: "li", x: "Carbon moves from sun-rich trees to shaded seedlings via fungal networks." , done: true },
        { t: "li", x: "“Mother trees” preferentially route resources to kin.", done: true },
        { t: "li", x: "Defense signals propagate faster than wind or insects could carry them.", done: false },
        { t: "p", x: "The clearest write-up is still the [[The Wood Wide Web]] piece — pull the Simard citations from there." },
        { t: "h2", x: "Open questions" },
        { t: "p", x: "Is the cooperation real, or are the fungi farming the trees? See the [[Highlight from “Entangled Life”]] — the negotiation framing complicates the romance." },
        { t: "quote", x: "What we observe is not nature itself, but nature exposed to our method of questioning." }
      ]
    },
    {
      id: "n02", title: "Reading log — June", group: "Mind",
      updated: "today · 09:10", words: 140, mode: "wysiwyg",
      frontmatter: { title: "Reading log — June", group: "Mind", tags: ["log"], created: "2026-06-01", updated: "2026-06-03" },
      backlinks: [],
      blocks: [
        { t: "h1", x: "Reading log — June" },
        { t: "p", x: "Tracking what actually gets finished, not what gets saved." },
        { t: "li", x: "Entangled Life — ch. 3 (the negotiation chapter)", done: true },
        { t: "li", x: "The Hidden Life of Trees — start", done: false },
        { t: "p", x: "Threads back into [[Forests as a single organism]]." }
      ]
    },
    {
      id: "n03", title: "Capture-first, organize later", group: "Mind",
      updated: "yesterday", words: 96, mode: "preview",
      frontmatter: { title: "Capture-first, organize later", group: "Mind", tags: ["pkm", "principle"], created: "2026-05-30", updated: "2026-06-02" },
      backlinks: [{ id: "i08", title: "On second brains", type: "note" }],
      blocks: [
        { t: "h1", x: "Capture-first, organize later" },
        { t: "p", x: "Friction at capture is where knowledge dies. Save in one motion; let structure emerge from tags, search and connections instead of folders." },
        { t: "callout", x: "Rule: if saving takes more than one decision, it's too slow." }
      ]
    }
  ];

  const notebooks = [
    { name: "Research", folders: 3, count: 41, active: true },
    { name: "Journal", folders: 1, count: 88 },
    { name: "Kitchen", folders: 2, count: 16 }
  ];

  window.KOSHAS_DATA = { items, notes, groups, stacks, spaces, notebooks };
  // friendly type labels + iconography hints
  window.KOSHAS_TYPES = {
    article: "Article", image: "Image", book: "Book", quote: "Quote",
    highlight: "Highlight", recipe: "Recipe", video: "Video", note: "Note",
    product: "Product", bookmark: "Bookmark", pdf: "PDF"
  };
})();
