const {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo
} = React;
const D = window.KOSHAS_DATA,
  TYPES = window.KOSHAS_TYPES;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ---------- icons (simple stroke set) ---------- */
const P = {
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5",
  pen: "M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3ZM14.5 7.5l3 3",
  graph: "M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.6 6 17 7.5M8.8 14.5 17 9",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  star: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-6Z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
  play: "M8 5v14l11-7L8 5Z",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  back: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  sidebar: "M4 4h16v16H4zM10 4v16",
  check: "M5 12l4 4L19 6",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  ital: "M14 4h-4M14 20h-4M15 4 9 20",
  h: "M5 5v14M13 5v14M5 12h8M17 9v10M17 9l3-1",
  quote: "M7 7H4v6h3c0 2-1 3-3 3M17 7h-3v6h3c0 2-1 3-3 3",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5",
  add: "M12 8v8M8 12h8"
};
const Icon = ({
  d,
  s = 18,
  w = 1.7,
  fill
}) => /*#__PURE__*/React.createElement("svg", {
  className: "ic",
  viewBox: "0 0 24 24",
  width: s,
  height: s,
  fill: fill || "none",
  stroke: fill ? "none" : "currentColor",
  strokeWidth: w,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: {
    width: s,
    height: s
  }
}, /*#__PURE__*/React.createElement("path", {
  d: P[d]
}));

/* ---------- inline wikilink parser ---------- */
function parseInline(text, onLink) {
  const parts = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let last = 0,
    m,
    k = 0;
  while (m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(/*#__PURE__*/React.createElement("a", {
      key: k++,
      className: "wikilink",
      onClick: () => onLink && onLink(m[1])
    }, m[1]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function blocksToMd(note) {
  const fm = note.frontmatter;
  let out = [["---"]];
  Object.entries(fm).forEach(([k, v]) => out.push([k + ": ", Array.isArray(v) ? "[" + v.join(", ") + "]" : v]));
  out.push(["---"], [""]);
  note.blocks.forEach(b => {
    if (b.t === "h1") out.push(["# ", b.x]);else if (b.t === "h2") out.push(["## ", b.x]);else if (b.t === "li") out.push([b.done !== undefined ? b.done ? "- [x] " : "- [ ] " : "- ", b.x]);else if (b.t === "callout") out.push(["> ", b.x]);else if (b.t === "quote") out.push(["> ", b.x]);else out.push(["", b.x]);
    out.push([""]);
  });
  return out;
}

/* =================== CARD =================== */
function Card({
  item,
  vibe,
  dimmed,
  cardRef,
  onHover,
  onLink
}) {
  const c = item.colors || ["#3f8f63"];
  const style = undefined;
  const grad = "linear-gradient(150deg, oklch(0.275 0.008 160), oklch(0.185 0.006 160) 58%, oklch(0.235 0.007 160))";
  const typeLabel = TYPES[item.type];
  const Badge = () => /*#__PURE__*/React.createElement("div", {
    className: "type-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "type-badge"
  }, /*#__PURE__*/React.createElement("i", {
    className: "gl"
  }), typeLabel), /*#__PURE__*/React.createElement("span", {
    className: "saved"
  }, item.saved));
  const Tags = ({
    withMargin = true
  }) => /*#__PURE__*/React.createElement("div", {
    className: "tags",
    style: withMargin ? null : {
      marginTop: 0
    }
  }, (item.manualTags || []).map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "tag man"
  }, "#", t)), (item.aiTags || []).map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "tag ai"
  }, /*#__PURE__*/React.createElement("span", {
    className: "spark"
  }, "\u2726"), t)));
  const hasMedia = ["image", "video", "book", "recipe", "product"].includes(item.type);
  return /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: cx("card", item.type === "quote" && "q", vibe && "vibe-on", item.status === "enriching" && "enriching"),
    style: style,
    "data-id": item.id,
    onMouseEnter: () => onHover(item.id),
    onMouseLeave: () => onHover(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "glow",
    style: {
      background: "radial-gradient(120% 90% at 50% 0%, oklch(0.95 0.01 160/0.10), transparent 70%)"
    }
  }), item.type === "image" && /*#__PURE__*/React.createElement("div", {
    className: "media"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "stripes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "photograph \xB7 ", item.meta.dims)), item.type === "video" && /*#__PURE__*/React.createElement("div", {
    className: "media"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "stripes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "play"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    d: "play",
    s: 18,
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dur"
  }, item.meta.duration)), item.type === "book" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "stripes"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 10,
      background: "rgba(0,0,0,.25)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "book cover")), item.type === "recipe" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "stripes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "dish photo \xB7 ", item.meta.time)), item.type === "product" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 118
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "stripes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "product shot")), /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, item.type === "quote" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, null), /*#__PURE__*/React.createElement("div", {
    className: "q-mark"
  }, "\u201C"), /*#__PURE__*/React.createElement("div", {
    className: "q-text"
  }, item.body), /*#__PURE__*/React.createElement("div", {
    className: "q-attr"
  }, "\u2014 ", item.attribution), /*#__PURE__*/React.createElement(Tags, null)) : item.type === "highlight" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hl-bar"
  }), /*#__PURE__*/React.createElement(Badge, null), /*#__PURE__*/React.createElement("div", {
    className: "q-text",
    style: {
      fontSize: 14,
      fontStyle: "normal"
    }
  }, item.body), /*#__PURE__*/React.createElement("button", {
    className: "backlink"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "link",
    s: 12
  }), " ", item.sourceTitle), /*#__PURE__*/React.createElement(Tags, null)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, null), item.title && /*#__PURE__*/React.createElement("h3", null, item.title), item.type === "note" ? /*#__PURE__*/React.createElement("p", {
    className: "desc",
    style: {
      fontSize: 13.5
    }
  }, item.body) : item.desc && /*#__PURE__*/React.createElement("p", {
    className: "desc"
  }, item.desc), item.type === "image" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "swatches"
  }, c.map((x, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    style: {
      background: x
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "swcap"
  }, "extracted palette \xB7 ", c.length, " colors")), item.type === "book" && /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, item.meta.author)), /*#__PURE__*/React.createElement("span", null, item.meta.year), /*#__PURE__*/React.createElement("span", null, item.meta.pages, " pp")), item.type === "article" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav"
  }), item.domain, " \xB7 ", item.readMins, " min read"), item.type === "bookmark" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav"
  }), item.domain), item.type === "pdf" && /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, item.meta.pages), " pages"), /*#__PURE__*/React.createElement("span", null, item.meta.fileSize)), item.type === "recipe" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("span", null, "\u23F1 ", item.meta.time), /*#__PURE__*/React.createElement("span", null, "serves ", item.meta.serves)), /*#__PURE__*/React.createElement("div", {
    className: "ing"
  }, item.meta.ingredients.slice(0, 4).map(x => /*#__PURE__*/React.createElement("span", {
    key: x
  }, x)))), item.type === "product" && /*#__PURE__*/React.createElement("div", {
    className: "metarow",
    style: {
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, item.meta.price), /*#__PURE__*/React.createElement("span", null, item.meta.store)), item.type === "video" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav"
  }), item.meta.platform), item.summary && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px dashed var(--hair-2)",
      background: "oklch(0.95 0.01 160/0.03)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "chip-ai",
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "spark",
    s: 11
  }), " AI summary"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dim)"
    }
  }, item.summary)), /*#__PURE__*/React.createElement(Tags, null)), item.status === "enriching" && /*#__PURE__*/React.createElement("div", {
    className: "enrich-note"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pulse"
  }), "enriching \xB7 OCR + tags"), item.refs > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 11,
      fontSize: 11,
      color: "var(--fore-tertiary)",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "graph",
    s: 12
  }), " referenced by ", item.refs)));
}

/* =================== COLLECT VIEW =================== */
function Collect({
  onLink
}) {
  const [hover, setHover] = useState(null);
  const [view, setView] = useState("grid");
  const gridRef = useRef(null);
  const refs = useRef({});
  const [paths, setPaths] = useState([]);
  const vibeSet = useMemo(() => {
    if (!hover) return null;
    const it = D.items.find(i => i.id === hover);
    return new Set([hover, ...(it.sameVibe || [])]);
  }, [hover]);
  useLayoutEffect(() => {
    if (!hover || !gridRef.current) {
      setPaths([]);
      return;
    }
    const it = D.items.find(i => i.id === hover);
    const cont = gridRef.current.getBoundingClientRect();
    const a = refs.current[hover];
    if (!a) return;
    const ar = a.getBoundingClientRect();
    const ax = ar.left - cont.left + ar.width / 2,
      ay = ar.top - cont.top + ar.height / 2;
    const next = [];
    (it.sameVibe || []).forEach(tid => {
      const el = refs.current[tid];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const bx = r.left - cont.left + r.width / 2,
        by = r.top - cont.top + r.height / 2;
      const mx = (ax + bx) / 2,
        my = (ay + by) / 2 - 40;
      next.push(`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`);
    });
    setPaths(next);
  }, [hover]);
  return /*#__PURE__*/React.createElement("div", {
    className: "content-pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "collect-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Forests"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "5 items \xB7 hover any card to reveal its ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--mint)"
    }
  }, "same-vibe"), " threads")), /*#__PURE__*/React.createElement("div", {
    className: "viewtoggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: cx(view === "grid" && "on"),
    onClick: () => setView("grid")
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "grid",
    s: 15
  })), /*#__PURE__*/React.createElement("button", {
    className: cx(view === "list" && "on"),
    onClick: () => setView("list")
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "list",
    s: 15
  })))), /*#__PURE__*/React.createElement("div", {
    ref: gridRef,
    className: cx("masonry", hover && "grid-dim"),
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    id: "threads"
  }, paths.map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d
  }))), D.items.map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.id,
    item: it,
    cardRef: el => refs.current[it.id] = el,
    vibe: vibeSet ? vibeSet.has(it.id) : false,
    onHover: setHover,
    onLink: onLink
  }))));
}

/* =================== NOTES VIEW =================== */
const MODES = ["source", "wysiwyg", "preview"];
function Notes({
  onLink
}) {
  const [active, setActive] = useState("n01");
  const [mode, setMode] = useState("wysiwyg");
  const [showMeta, setShowMeta] = useState(true);
  const note = D.notes.find(n => n.id === active);
  const pillRef = useRef(null),
    switchRef = useRef(null);
  useLayoutEffect(() => {
    const sw = switchRef.current,
      pill = pillRef.current;
    if (!sw || !pill) return;
    const btn = sw.querySelectorAll("button")[MODES.indexOf(mode)];
    pill.style.left = btn.offsetLeft + "px";
    pill.style.width = btn.offsetWidth + "px";
  }, [mode, active]);
  const renderBlock = (b, i) => {
    if (b.t === "h1") return /*#__PURE__*/React.createElement("h1", {
      key: i
    }, b.x);
    if (b.t === "h2") return /*#__PURE__*/React.createElement("h2", {
      key: i
    }, b.x);
    if (b.t === "li") return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: cx("li", b.done && "done")
    }, /*#__PURE__*/React.createElement("span", {
      className: cx("box", b.done && "done")
    }, b.done && /*#__PURE__*/React.createElement(Icon, {
      d: "check",
      s: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "txt"
    }, parseInline(b.x, onLink)));
    if (b.t === "callout") return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "callout"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ci"
    }, /*#__PURE__*/React.createElement(Icon, {
      d: "bolt",
      s: 17
    })), /*#__PURE__*/React.createElement("div", null, parseInline(b.x, onLink)));
    if (b.t === "quote") return /*#__PURE__*/React.createElement("blockquote", {
      key: i
    }, b.x);
    return /*#__PURE__*/React.createElement("p", {
      key: i
    }, parseInline(b.x, onLink));
  };
  const md = blocksToMd(note);
  return /*#__PURE__*/React.createElement("div", {
    className: cx("editor-wrap", !showMeta && "no-meta"),
    style: {
      transition: "grid-template-columns .35s var(--ease-in)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    ref: switchRef,
    className: "modeswitch"
  }, /*#__PURE__*/React.createElement("span", {
    ref: pillRef,
    className: "pill"
  }), MODES.map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    className: cx(mode === m && "on"),
    onClick: () => setMode(m)
  }, m[0].toUpperCase() + m.slice(1)))), /*#__PURE__*/React.createElement("span", {
    className: "tb-sep"
  }), mode === "wysiwyg" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "bold",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "ital",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "h",
    s: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "tb-sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "list",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "check",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "quote",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "link",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "code",
    s: 16
  }))) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fore-tertiary)",
      fontFamily: "Google Sans"
    }
  }, mode === "source" ? "markdown source · read-write" : "rendered · read-only"), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tb-btn wide",
    onClick: () => setShowMeta(s => !s),
    title: "Toggle metadata"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "sidebar",
    s: 15
  })))), /*#__PURE__*/React.createElement("div", {
    className: "ed-scroll"
  }, mode === "source" ? /*#__PURE__*/React.createElement("div", {
    className: "source",
    key: "src"
  }, md.map((row, i) => {
    const head = row[0] || "";
    const body = row[1] || "";
    const cls = head === "---" || /^[a-z_]+: $/.test(head) ? "fm" : head.startsWith("#") ? "h" : head.startsWith(">") || head.startsWith("-") ? "mk" : "txt";
    return /*#__PURE__*/React.createElement("div", {
      className: "ln",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "n"
    }, i + 1), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: cls
    }, head), /*#__PURE__*/React.createElement("span", {
      className: "txt"
    }, body)));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "sheet",
    key: mode
  }, mode === "preview" && /*#__PURE__*/React.createElement("span", {
    className: "preview-ribbon"
  }, "PREVIEW \xB7 GFM"), /*#__PURE__*/React.createElement("div", {
    className: "doc"
  }, note.blocks.map(renderBlock))))), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "meta-pad"
  }, /*#__PURE__*/React.createElement("h4", null, "File"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Google Sans",
      fontSize: 11.5,
      color: "var(--dim)",
      lineHeight: 1.6,
      wordBreak: "break-all"
    }
  }, "~/Research/", note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), ".md"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--fore-tertiary)",
      marginTop: 8
    }
  }, note.words, " words \xB7 saved ", note.updated), /*#__PURE__*/React.createElement("h4", null, "Frontmatter ", /*#__PURE__*/React.createElement("span", {
    className: "chip-ai",
    style: {
      marginLeft: 6,
      color: "var(--fore-tertiary)",
      borderColor: "var(--hair)"
    }
  }, "managed")), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "title \xB7 editable"), /*#__PURE__*/React.createElement("input", {
    defaultValue: note.frontmatter.title
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "group \xB7 editable"), /*#__PURE__*/React.createElement("input", {
    defaultValue: note.frontmatter.group
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "tags \xB7 read-only"), /*#__PURE__*/React.createElement("div", {
    className: "ro"
  }, note.frontmatter.tags.map(t => "#" + t).join("  "))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "created \xB7 read-only"), /*#__PURE__*/React.createElement("div", {
    className: "ro"
  }, note.frontmatter.created)), /*#__PURE__*/React.createElement("h4", null, "Backlinks \xB7 ", note.backlinks.length), note.backlinks.length ? note.backlinks.map(b => /*#__PURE__*/React.createElement("button", {
    key: b.id,
    className: "bl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ic"
  }), b.title)) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fore-tertiary)"
    }
  }, "No notes link here yet."))));
}

/* =================== NOTES SIDEBAR =================== */
function NotesSidebar({
  active,
  setActive
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "side-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Notebooks"), D.notebooks.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.name,
    className: cx("s-item", n.active && "on")
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "layers",
    s: 15
  }), n.name, /*#__PURE__*/React.createElement("span", {
    className: "ct"
  }, n.count)))), /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Research \xB7 notes"), D.notes.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: cx("note-li", active === n.id && "on"),
    onClick: () => setActive(n.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "g"
  }), n.title, /*#__PURE__*/React.createElement("small", null, n.words, "w")))));
}

/* =================== COMMAND PALETTE =================== */
const CMDS = [{
  cat: "Navigation",
  items: [["layers", "Switch to Collect", "C"], ["pen", "Switch to Notes", "N"], ["graph", "Switch to Graph", "G"]]
}, {
  cat: "Creation",
  items: [["add", "New Note", "⌘N"], ["bolt", "New Quick Note", "⌘⇧N"], ["link", "Add Link", "⌘L"]]
}, {
  cat: "Search",
  items: [["search", "Global Search", "⌘⇧F"], ["spark", "Same-vibe from selection", ""]]
}, {
  cat: "Actions",
  items: [["pen", "Toggle Focus Mode", ""], ["cog", "Open Preferences", "⌘,"]]
}];
function CmdK({
  open,
  onClose,
  onNav
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inp = useRef(null);
  const flat = useMemo(() => {
    const f = [];
    CMDS.forEach(g => g.items.forEach(it => {
      if (!q || it[1].toLowerCase().includes(q.toLowerCase())) f.push({
        cat: g.cat,
        it
      });
    }));
    return f;
  }, [q]);
  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inp.current && inp.current.focus(), 40);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = e => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel(s => Math.min(s + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel(s => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        const c = flat[sel];
        if (c) {
          run(c.it[1]);
        }
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, flat, sel]);
  const run = label => {
    if (label.includes("Collect")) onNav("collect");
    if (label.includes("Notes")) onNav("notes");
    if (label.includes("Graph")) onNav("graph");
    onClose();
  };
  if (!open) return null;
  let idx = -1;
  let lastCat = null;
  return /*#__PURE__*/React.createElement("div", {
    className: "cmdk-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "cmdk",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cmdk-in"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "search",
    s: 20
  }), /*#__PURE__*/React.createElement("input", {
    ref: inp,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setSel(0);
    },
    placeholder: "Type a command or search\u2026"
  }), /*#__PURE__*/React.createElement("span", {
    className: "kbd",
    style: {
      fontFamily: "Google Sans",
      fontSize: 11,
      color: "var(--fore-tertiary)"
    }
  }, "esc")), /*#__PURE__*/React.createElement("div", {
    className: "cmdk-list"
  }, flat.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px",
      textAlign: "center",
      color: "var(--fore-tertiary)",
      fontSize: 13
    }
  }, "No matches"), flat.map((c, i) => {
    idx++;
    const showCat = c.cat !== lastCat;
    lastCat = c.cat;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, showCat && /*#__PURE__*/React.createElement("div", {
      className: "cmdk-cat"
    }, c.cat), /*#__PURE__*/React.createElement("div", {
      className: cx("cmdk-row", i === sel && "sel"),
      onMouseEnter: () => setSel(i),
      onClick: () => run(c.it[1])
    }, /*#__PURE__*/React.createElement("span", {
      className: "ck"
    }, /*#__PURE__*/React.createElement(Icon, {
      d: c.it[0],
      s: 17
    })), c.it[1], c.it[2] && /*#__PURE__*/React.createElement("span", {
      className: "kbd"
    }, c.it[2])));
  }))));
}

/* =================== GRAPH (light placeholder peek) =================== */
function GraphView() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content-pad",
    style: {
      height: "100%",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 70,
      height: 70,
      margin: "0 auto 20px",
      display: "grid",
      placeItems: "center",
      borderRadius: 20,
      background: "var(--glass)",
      border: "1px solid var(--hair-2)",
      color: "var(--mint)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "graph",
    s: 32
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "Google Sans",
      fontSize: 24,
      marginBottom: 10
    }
  }, "Graph sheath"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--dim)",
      fontSize: 14,
      lineHeight: 1.6
    }
  }, "The force-directed knowledge map lives here. For this round we focused on ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--mint)"
    }
  }, "Collect"), " and ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--mint)"
    }
  }, "Notes"), " \u2014 but you already get a peek of the graph as ", /*#__PURE__*/React.createElement("i", null, "same-vibe threads"), " when hovering cards.")));
}

/* =================== APP =================== */
const SHEATHS = [{
  id: "collect",
  ico: "layers",
  label: "Collect"
}, {
  id: "notes",
  ico: "pen",
  label: "Notes"
}, {
  id: "graph",
  ico: "graph",
  label: "Graph"
}];
function App() {
  const [sheath, setSheath] = useState("collect");
  const [cmd, setCmd] = useState(false);
  const [activeNote, setActiveNote] = useState("n01");
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd(o => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const onLink = title => {
    const n = D.notes.find(x => x.title === title);
    if (n) {
      setSheath("notes");
      setActiveNote(n.id);
    } else {
      setFlash(title);
      setTimeout(() => setFlash(null), 1600);
    }
  };
  const sideTitle = sheath === "collect" ? ["Collect sheath", "Library"] : sheath === "notes" ? ["Notes sheath", "Workspace"] : ["Graph sheath", "Connections"];
  return /*#__PURE__*/React.createElement("div", {
    className: "win"
  }, /*#__PURE__*/React.createElement("div", {
    className: "titlebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lights"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
    className: "wname"
  }, /*#__PURE__*/React.createElement("b", null, "\u25C8"), " Koshas"), /*#__PURE__*/React.createElement("span", {
    className: "tag mono"
  }, "aurora \xB7 local \xB7 nothing leaves this device")), /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brandmark"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ring"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ring"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ring"
  }), /*#__PURE__*/React.createElement("span", {
    className: "core"
  })), /*#__PURE__*/React.createElement("div", {
    className: "sheaths"
  }, SHEATHS.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    className: cx("sheath", sheath === s.id && "active"),
    onClick: () => setSheath(s.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "layer l3"
  }), /*#__PURE__*/React.createElement("span", {
    className: "layer l2"
  }), /*#__PURE__*/React.createElement("span", {
    className: "layer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: s.ico,
    s: 21
  })), /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, s.label)))), /*#__PURE__*/React.createElement("div", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "mini"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "bell",
    s: 18
  })), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    onClick: () => setCmd(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "cog",
    s: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "side-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k mono"
  }, sideTitle[0]), /*#__PURE__*/React.createElement("h2", null, sideTitle[1])), sheath === "collect" && /*#__PURE__*/React.createElement("div", {
    className: "side-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Groups"), D.groups.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.name,
    className: cx("s-item", g.name === "Forests" && "on")
  }, g.special ? /*#__PURE__*/React.createElement("span", {
    className: "star"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "star",
    s: 14,
    fill: "currentColor"
  })) : /*#__PURE__*/React.createElement(Icon, {
    d: "layers",
    s: 14
  }), g.name, /*#__PURE__*/React.createElement("span", {
    className: "ct"
  }, g.count)))), /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "spark",
    s: 12
  }), "Stacks \xB7 AI"), D.stacks.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.name,
    className: "s-item",
    title: s.why
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      display: "grid",
      placeItems: "center",
      color: "var(--fore-tertiary)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "spark",
    s: 13
  })), s.name, /*#__PURE__*/React.createElement("span", {
    className: "ct"
  }, s.count)))), /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Spaces"), D.spaces.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.name,
    className: "s-item"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: s.type === "smart" ? "bolt" : "star",
    s: 13
  }), s.name, /*#__PURE__*/React.createElement("span", {
    className: "ct"
  }, s.count))))), sheath === "notes" && /*#__PURE__*/React.createElement(NotesSidebar, {
    active: activeNote,
    setActive: setActiveNote
  }), sheath === "graph" && /*#__PURE__*/React.createElement("div", {
    className: "side-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "s-group"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lab"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Filters"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 10px",
      fontSize: 12.5,
      color: "var(--fore-tertiary)",
      lineHeight: 1.6
    }
  }, "Filter the map by type, group or recency.")))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "search",
    s: 17
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: sheath === "notes" ? "Search notes across all notebooks…" : "Search everything you've saved…"
  }), /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u2318\u21E7F")), sheath === "collect" && /*#__PURE__*/React.createElement("div", {
    className: "scope"
  }, /*#__PURE__*/React.createElement("button", {
    className: "on"
  }, "Everything"), /*#__PURE__*/React.createElement("button", null, "This group")), /*#__PURE__*/React.createElement("button", {
    className: "btn-cap",
    onClick: () => setFlash("Captured ✦ enriching now")
  }, /*#__PURE__*/React.createElement(Icon, {
    d: "plus",
    s: 17
  }), "Capture")), /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, sheath === "collect" && /*#__PURE__*/React.createElement(Collect, {
    onLink: onLink
  }), sheath === "notes" && /*#__PURE__*/React.createElement(Notes, {
    key: activeNote,
    onLink: onLink
  }), sheath === "graph" && /*#__PURE__*/React.createElement(GraphView, null)))), flash && /*#__PURE__*/React.createElement("div", {
    className: "vibe-hint",
    style: {
      left: "50%",
      top: "auto",
      bottom: 36,
      transform: "translateX(-50%)",
      position: "fixed"
    }
  }, flash.startsWith("Captured") ? flash : `⬡ ${flash} — broken link · file not found`), /*#__PURE__*/React.createElement(CmdK, {
    open: cmd,
    onClose: () => setCmd(false),
    onNav: setSheath
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
