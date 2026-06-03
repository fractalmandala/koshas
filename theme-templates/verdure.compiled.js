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

/* ---------- icons ---------- */
const VP = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  play: "M8 5v14l11-7L8 5Z",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  check: "M5 12l4 4L19 6",
  leaf: "M11 3C6 4 3 8 3 13c0 4 2 7 2 7s8-1 12-5c3-3 4-9 4-9s-7-4-10-3ZM5 19C9 14 13 10 18 7",
  sprout: "M12 22V11M12 11C12 7 9 5 4 5c0 5 3 7 8 7M12 13c0-3 2.5-5 7-5 0 4-3 6-7 6",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-6Z",
  quote: "M7 7H4v6h3c0 2-1 3-3 3M17 7h-3v6h3c0 2-1 3-3 3",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  ital: "M14 4h-4M14 20h-4M15 4 9 20",
  h: "M5 5v14M13 5v14M5 12h8M17 9v10M17 9l3-1",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5",
  star: "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z",
  book: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5ZM18 17H6",
  edit: "M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3ZM14.5 7.5l3 3",
  graph: "M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.6 6 17 7.5M8.8 14.5 17 9"
};
const I = ({
  d,
  s = 18,
  w = 1.6,
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
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: VP[d]
}));
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
    }, /*#__PURE__*/React.createElement("span", {
      className: "lf"
    }, "\u2767 "), m[1]));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function blocksToMd(note) {
  const rows = [["---"]];
  Object.entries(note.frontmatter).forEach(([k, v]) => rows.push([k + ": ", Array.isArray(v) ? "[" + v.join(", ") + "]" : v]));
  rows.push(["---"], [""]);
  note.blocks.forEach(b => {
    if (b.t === "h1") rows.push(["# ", b.x]);else if (b.t === "h2") rows.push(["## ", b.x]);else if (b.t === "li") rows.push([b.done !== undefined ? b.done ? "- [x] " : "- [ ] " : "- ", b.x]);else if (b.t === "callout" || b.t === "quote") rows.push(["> ", b.x]);else rows.push(["", b.x]);
    rows.push([""]);
  });
  return rows;
}

/* =================== CARD =================== */
function Card({
  item,
  onLink
}) {
  const c = item.colors || ["#4a7d4a"];
  const grad = `linear-gradient(150deg, ${c[0]}, ${c[1] || c[0]} 55%, ${c[2] || c[0]})`;
  const Tags = () => /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, (item.manualTags || []).map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "tag man"
  }, "#", t)), (item.aiTags || []).map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "tag ai"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ai-leaf"
  }, /*#__PURE__*/React.createElement(I, {
    d: "leaf",
    s: 10
  })), t)));
  const Type = () => /*#__PURE__*/React.createElement("div", {
    className: "type-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "type-tag"
  }, TYPES[item.type]), /*#__PURE__*/React.createElement("span", {
    className: "saved"
  }, item.saved));
  return /*#__PURE__*/React.createElement("div", {
    className: cx("card", item.type === "highlight" && "hl")
  }, item.type === "image" && /*#__PURE__*/React.createElement("div", {
    className: "media"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grain"
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
    className: "grain"
  }), /*#__PURE__*/React.createElement("div", {
    className: "play"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(I, {
    d: "play",
    s: 18,
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dur"
  }, item.meta.duration)), item.type === "book" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 130
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grain"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 9,
      background: "rgba(0,0,0,.22)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "book cover")), item.type === "recipe" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 124
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grain"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "dish \xB7 ", item.meta.time)), item.type === "product" && /*#__PURE__*/React.createElement("div", {
    className: "media",
    style: {
      height: 128
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "grad",
    style: {
      background: grad
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "grain"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cap"
  }, "product shot")), /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement(Type, null), item.type === "quote" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "q-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "qm"
  }, "\u201C"), item.body, /*#__PURE__*/React.createElement("span", {
    className: "qm"
  }, "\u201D")), /*#__PURE__*/React.createElement("div", {
    className: "q-attr"
  }, "\u2014 ", item.attribution), /*#__PURE__*/React.createElement(Tags, null)) : item.type === "highlight" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "hl-text"
  }, item.body), /*#__PURE__*/React.createElement("button", {
    className: "backlink"
  }, /*#__PURE__*/React.createElement(I, {
    d: "link",
    s: 12
  }), " ", item.sourceTitle), /*#__PURE__*/React.createElement(Tags, null)) : /*#__PURE__*/React.createElement(React.Fragment, null, item.title && /*#__PURE__*/React.createElement("h3", null, item.title), item.type === "note" ? /*#__PURE__*/React.createElement("p", {
    className: "desc",
    style: {
      fontFamily: '"Google Sans"',
      fontSize: 14
    }
  }, item.body) : item.desc && /*#__PURE__*/React.createElement("p", {
    className: "desc"
  }, item.desc), item.type === "image" && /*#__PURE__*/React.createElement("div", {
    className: "pigments"
  }, c.map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "sw",
    style: {
      background: x
    }
  })), /*#__PURE__*/React.createElement("small", null, "pigments")), item.type === "article" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav",
    style: {
      background: grad
    }
  }), item.domain, " \xB7 ", item.readMins, " min"), item.type === "bookmark" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav",
    style: {
      background: grad
    }
  }), item.domain), item.type === "video" && /*#__PURE__*/React.createElement("div", {
    className: "domain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fav",
    style: {
      background: grad
    }
  }), item.meta.platform), item.type === "book" && /*#__PURE__*/React.createElement("div", {
    className: "metarow"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, item.meta.author)), /*#__PURE__*/React.createElement("span", null, item.meta.year), /*#__PURE__*/React.createElement("span", null, item.meta.pages, " pp")), item.type === "pdf" && /*#__PURE__*/React.createElement("div", {
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
  }, item.meta.price), /*#__PURE__*/React.createElement("span", null, item.meta.store)), item.summary && /*#__PURE__*/React.createElement("div", {
    className: "ai-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, /*#__PURE__*/React.createElement(I, {
    d: "leaf",
    s: 11
  }), " AI summary"), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, item.summary)), /*#__PURE__*/React.createElement(Tags, null)), item.status === "enriching" && /*#__PURE__*/React.createElement("div", {
    className: "enriching-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sprout"
  }, /*#__PURE__*/React.createElement(I, {
    d: "sprout",
    s: 14
  })), "enriching \xB7 tags + summary"), item.refs > 0 && /*#__PURE__*/React.createElement("div", {
    className: "refs"
  }, /*#__PURE__*/React.createElement(I, {
    d: "graph",
    s: 13
  }), " referenced by ", item.refs)));
}

/* =================== COLLECT =================== */
function Collect() {
  const [view, setView] = useState("grid");
  return /*#__PURE__*/React.createElement("div", {
    className: "content-pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "collect-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Forests \xB7 group"), /*#__PURE__*/React.createElement("h1", null, "The ", /*#__PURE__*/React.createElement("em", null, "wood-wide"), " web"))), /*#__PURE__*/React.createElement("div", {
    className: "headrow-sub"
  }, /*#__PURE__*/React.createElement("span", null, "5 items"), /*#__PURE__*/React.createElement("span", {
    className: "pill"
  }, "rule: domain or keyword matches \u201Cforest, fungi, tree\u201D"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "opens links in Helium"), /*#__PURE__*/React.createElement("div", {
    className: "viewtoggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: cx(view === "grid" && "on"),
    onClick: () => setView("grid")
  }, /*#__PURE__*/React.createElement(I, {
    d: "grid",
    s: 15
  })), /*#__PURE__*/React.createElement("button", {
    className: cx(view === "list" && "on"),
    onClick: () => setView("list")
  }, /*#__PURE__*/React.createElement(I, {
    d: "list",
    s: 15
  })))), /*#__PURE__*/React.createElement("div", {
    className: "masonry"
  }, D.items.map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.id,
    item: it
  }))));
}

/* =================== NOTES (manuscript) =================== */
const MODES = ["source", "wysiwyg", "preview"];
function Notes({
  active,
  onLink
}) {
  const [mode, setMode] = useState("wysiwyg");
  const note = D.notes.find(n => n.id === active);
  const tabsRef = useRef(null),
    pillRef = useRef(null);
  useLayoutEffect(() => {
    const t = tabsRef.current,
      p = pillRef.current;
    if (!t || !p) return;
    const b = t.querySelectorAll("button")[MODES.indexOf(mode)];
    p.style.left = b.offsetLeft + "px";
    p.style.width = b.offsetWidth + "px";
  }, [mode, active]);
  const rb = (b, i) => {
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
    }, b.done && /*#__PURE__*/React.createElement(I, {
      d: "check",
      s: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "tx"
    }, parseInline(b.x, onLink)));
    if (b.t === "callout") return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "callout"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ci"
    }, /*#__PURE__*/React.createElement(I, {
      d: "bolt",
      s: 18
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
    className: "notes-shell",
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ed-top"
  }, /*#__PURE__*/React.createElement("div", {
    ref: tabsRef,
    className: "modetabs"
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
  }, /*#__PURE__*/React.createElement(I, {
    d: "bold",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "ital",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "h",
    s: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "tb-sep"
  }), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "list",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "check",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "quote",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "link",
    s: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "tb-btn"
  }, /*#__PURE__*/React.createElement(I, {
    d: "code",
    s: 16
  }))) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '"Google Sans"',
      fontSize: 12,
      color: "var(--fore-tertiary)"
    }
  }, mode === "source" ? "markdown source · the truth on disk" : "rendered · GitHub-flavoured · read-only"), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, note.words, " words \xB7 saved ", note.updated)), /*#__PURE__*/React.createElement("div", {
    className: "ed-scroll"
  }, mode === "source" ? /*#__PURE__*/React.createElement("div", {
    className: "source",
    key: "src"
  }, md.map((row, i) => {
    const head = row[0] || "",
      body = row[1] || "";
    const cls = head === "---" || /^[a-z_]+: $/.test(head) ? "fm" : head.startsWith("#") ? "h" : head.startsWith(">") || head.startsWith("-") ? "mk" : "";
    return /*#__PURE__*/React.createElement("div", {
      className: "ln",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "n"
    }, i + 1), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: cls
    }, head), /*#__PURE__*/React.createElement("span", null, body)));
  })) : /*#__PURE__*/React.createElement("div", {
    className: "parchment",
    key: mode
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet"
  }, mode === "preview" && /*#__PURE__*/React.createElement("div", {
    className: "preview-ribbon"
  }, /*#__PURE__*/React.createElement(I, {
    d: "book",
    s: 11
  }), " PREVIEW \xB7 GFM \xB7 read-only"), mode === "wysiwyg" && /*#__PURE__*/React.createElement("div", {
    className: "fm-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fm-lbl"
  }, "frontmatter \xB7 managed"), /*#__PURE__*/React.createElement("div", {
    className: "fm-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "title"), /*#__PURE__*/React.createElement("span", {
    className: "v edit"
  }, note.frontmatter.title)), /*#__PURE__*/React.createElement("div", {
    className: "fm-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "group"), /*#__PURE__*/React.createElement("span", {
    className: "v edit"
  }, note.frontmatter.group)), /*#__PURE__*/React.createElement("div", {
    className: "fm-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "tags"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, note.frontmatter.tags.map(t => "#" + t).join("  "))), /*#__PURE__*/React.createElement("div", {
    className: "fm-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "created"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, note.frontmatter.created))), /*#__PURE__*/React.createElement("div", {
    className: "doc"
  }, note.blocks.map(rb))), /*#__PURE__*/React.createElement("div", {
    className: "margin"
  }, /*#__PURE__*/React.createElement("h4", null, "In this notebook"), D.notes.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: cx("bk"),
    onClick: () => onLink(n.title),
    style: n.id === active ? {
      color: "var(--theme-main)",
      fontWeight: 600
    } : null
  }, n.title, /*#__PURE__*/React.createElement("small", null, n.words, " words"))), /*#__PURE__*/React.createElement("h4", null, "Linked from \xB7 ", note.backlinks.length), note.backlinks.length ? note.backlinks.map(b => /*#__PURE__*/React.createElement("button", {
    key: b.id,
    className: "bk",
    onClick: () => onLink(b.title)
  }, b.title, /*#__PURE__*/React.createElement("small", null, b.type || "note"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Google Sans"',
      fontSize: 13,
      color: "var(--fore-tertiary)",
      fontStyle: "italic"
    }
  }, "Nothing links here yet.")))));
}

/* =================== COMMAND PALETTE =================== */
const CMDS = [{
  cat: "Navigation",
  items: [["leaf", "Open Collect", "C"], ["edit", "Open Notes", "N"], ["graph", "Open Graph", "G"]]
}, {
  cat: "Creation",
  items: [["plus", "New note", "⌘N"], ["bolt", "Quick note", "⌘⇧N"], ["link", "Add link", "⌘L"]]
}, {
  cat: "Search",
  items: [["search", "Search everything", "⌘⇧F"]]
}, {
  cat: "Actions",
  items: [["book", "Export as Markdown", "⌘⇧E"], ["cog", "Preferences", "⌘,"]]
}];
function CmdK({
  open,
  onClose,
  onNav
}) {
  const [q, setQ] = useState(""),
    [sel, setSel] = useState(0);
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
        if (c) run(c.it[1]);
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, flat, sel]);
  const run = l => {
    if (l.includes("Collect")) onNav("collect");
    if (l.includes("Notes")) onNav("notes");
    if (l.includes("Graph")) onNav("graph");
    onClose();
  };
  if (!open) return null;
  let lastCat = null;
  return /*#__PURE__*/React.createElement("div", {
    className: "cmdk-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "cmdk",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "cmdk-in"
  }, /*#__PURE__*/React.createElement(I, {
    d: "search",
    s: 20
  }), /*#__PURE__*/React.createElement("input", {
    ref: inp,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setSel(0);
    },
    placeholder: "Search, or run a command\u2026"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: "var(--fore-tertiary)"
    }
  }, "esc")), /*#__PURE__*/React.createElement("div", {
    className: "cmdk-list"
  }, flat.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      textAlign: "center",
      color: "var(--fore-tertiary)",
      fontFamily: '"Google Sans"'
    }
  }, "Nothing matches \u201C", q, "\u201D."), flat.map((c, i) => {
    const sc = c.cat !== lastCat;
    lastCat = c.cat;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, sc && /*#__PURE__*/React.createElement("div", {
      className: "cmdk-cat"
    }, c.cat), /*#__PURE__*/React.createElement("div", {
      className: cx("cmdk-row", i === sel && "sel"),
      onMouseEnter: () => setSel(i),
      onClick: () => run(c.it[1])
    }, /*#__PURE__*/React.createElement("span", {
      className: "ck"
    }, /*#__PURE__*/React.createElement(I, {
      d: c.it[0],
      s: 17
    })), c.it[1], /*#__PURE__*/React.createElement("span", {
      className: "kbd"
    }, c.it[2])));
  }))));
}
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
      maxWidth: 440
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      margin: "0 auto 18px",
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      background: "var(--surface-00)",
      boxShadow: "var(--sh-2)",
      color: "var(--theme-secondary)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    d: "graph",
    s: 30
  })), /*#__PURE__*/React.createElement("h1", {
    className: "serif",
    style: {
      fontSize: 30,
      fontWeight: 500,
      marginBottom: 10
    }
  }, "The Graph sheath"), /*#__PURE__*/React.createElement("p", {
    className: "serif",
    style: {
      fontSize: 17,
      lineHeight: 1.6,
      color: "var(--fore-secondary)"
    }
  }, "A living map of how everything connects. We focused this round on ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--theme-main)"
    }
  }, "Collect"), " and ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--theme-main)"
    }
  }, "Notes"), " \u2014 the graph grows from the links you make there.")));
}

/* =================== APP =================== */
const SHEATHS = [{
  id: "collect",
  ico: "leaf",
  label: "Collect",
  sub: "Everything you save"
}, {
  id: "notes",
  ico: "edit",
  label: "Notes",
  sub: "Write & connect"
}, {
  id: "graph",
  ico: "graph",
  label: "Graph",
  sub: "See the whole"
}];
function App() {
	const [sheath, setSheath] = useState("collect");
	const [cmd, setCmd] = useState(false);
	const [active, setActive] = useState("n01");
	const [toast, setToast] = useState(null);
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
			setActive(n.id);
		} else {
			setToast(`❧ ${title} — broken link · file not found`);
			setTimeout(() => setToast(null), 1800);
		}
	};
	return /*#__PURE__*/React.createElement("div", {
		className: "win"
	}, /*#__PURE__*/React.createElement("div", {
		className: "titlebar"
	}, /*#__PURE__*/React.createElement("div", {
		className: "lights"
	}, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
		className: "wm"
	}, "Koshas"),

    /* --- TOPBAR MOVED HERE: AFTER 'WM' AND BEFORE 'TAG' --- */
    /*#__PURE__*/React.createElement("div", {
		className: "topbar"
	}, /*#__PURE__*/React.createElement("div", {
		className: "search"
	}, /*#__PURE__*/React.createElement(I, {
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
		onClick: () => setToast("Saved to Koshas · enriching now ❧")
	}, /*#__PURE__*/React.createElement(I, {
		d: "plus",
		s: 17
	}), "Capture"))), /*#__PURE__*/React.createElement("div", {
		className: "shell"
	}, /*#__PURE__*/React.createElement("div", {
		className: "rail"
	},

		/* --- RAIL-SCROLL FOR 'COLLECT' (WITH VINE INSIDE, ABOVE SEC ITEMS) --- */
		sheath === "collect" && /*#__PURE__*/React.createElement("div", {
			className: "rail-scroll"
		}, /*#__PURE__*/React.createElement("div", {
			className: "vine"
		}, /*#__PURE__*/React.createElement("div", {
			className: "stem"
		}), SHEATHS.map(s => /*#__PURE__*/React.createElement("button", {
			key: s.id,
			className: cx("node", sheath === s.id && "on"),
			onClick: () => setSheath(s.id)
		}, /*#__PURE__*/React.createElement("span", {
			className: "bud"
		}, /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
			className: "leaf"
		}), /*#__PURE__*/React.createElement("span", {
			className: "txt"
		}, /*#__PURE__*/React.createElement("b", null, s.label), /*#__PURE__*/React.createElement("small", null, s.sub))))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, "Groups", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), D.groups.map(g => /*#__PURE__*/React.createElement("button", {
			key: g.name,
			className: cx("r-item", g.special && "star", g.name === "Forests" && "on")
		}, !g.special && /*#__PURE__*/React.createElement("span", {
			className: "gl",
			style: {
				background: g.name === "Forests" ? "var(--theme-main)" : "var(--medium-20)"
			}
		}), g.name, /*#__PURE__*/React.createElement("span", {
			className: "ct"
		}, g.count)))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, /*#__PURE__*/React.createElement("span", {
			className: "ai-leaf"
		}, /*#__PURE__*/React.createElement(I, {
			d: "leaf",
			s: 11
		})), "Stacks \xB7 grown by AI", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), D.stacks.map(s => /*#__PURE__*/React.createElement("button", {
			key: s.name,
			className: "r-item",
			title: s.why
		}, /*#__PURE__*/React.createElement("span", {
			className: "stackico"
		}, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), s.name, /*#__PURE__*/React.createElement("span", {
			className: "ct"
		}, s.count)))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, "Spaces", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), D.spaces.map(s => /*#__PURE__*/React.createElement("button", {
			key: s.name,
			className: "r-item"
		}, /*#__PURE__*/React.createElement("span", {
			className: "gl",
			style: {
				background: s.type === "smart" ? "var(--medium-40)" : "var(--theme-secondary)",
				borderRadius: s.type === "smart" ? "50%" : 3
			}
		}), s.name, /*#__PURE__*/React.createElement("span", {
			className: "ct"
		}, s.count))))),

		/* --- RAIL-SCROLL FOR 'NOTES' (WITH VINE INSIDE, ABOVE SEC ITEMS) --- */
		sheath === "notes" && /*#__PURE__*/React.createElement("div", {
			className: "rail-scroll"
		}, /*#__PURE__*/React.createElement("div", {
			className: "vine"
		}, /*#__PURE__*/React.createElement("div", {
			className: "stem"
		}), SHEATHS.map(s => /*#__PURE__*/React.createElement("button", {
			key: s.id,
			className: cx("node", sheath === s.id && "on"),
			onClick: () => setSheath(s.id)
		}, /*#__PURE__*/React.createElement("span", {
			className: "bud"
		}, /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
			className: "leaf"
		}), /*#__PURE__*/React.createElement("span", {
			className: "txt"
		}, /*#__PURE__*/React.createElement("b", null, s.label), /*#__PURE__*/React.createElement("small", null, s.sub))))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, "Notebooks", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), D.notebooks.map(n => /*#__PURE__*/React.createElement("button", {
			key: n.name,
			className: cx("r-item", n.active && "on")
		}, /*#__PURE__*/React.createElement("span", {
			className: "stackico"
		}, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)), n.name, /*#__PURE__*/React.createElement("span", {
			className: "ct"
		}, n.count)))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, "Research \xB7 notes", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), D.notes.map(n => /*#__PURE__*/React.createElement("button", {
			key: n.id,
			className: cx("note-li", active === n.id && "on"),
			onClick: () => setActive(n.id)
		}, /*#__PURE__*/React.createElement("span", {
			className: "ti"
		}, n.title), /*#__PURE__*/React.createElement("small", null, n.words, "w"))))),

		/* --- RAIL-SCROLL FOR 'GRAPH' (WITH VINE INSIDE, ABOVE SEC ITEMS) --- */
		sheath === "graph" && /*#__PURE__*/React.createElement("div", {
			className: "rail-scroll"
		}, /*#__PURE__*/React.createElement("div", {
			className: "vine"
		}, /*#__PURE__*/React.createElement("div", {
			className: "stem"
		}), SHEATHS.map(s => /*#__PURE__*/React.createElement("button", {
			key: s.id,
			className: cx("node", sheath === s.id && "on"),
			onClick: () => setSheath(s.id)
		}, /*#__PURE__*/React.createElement("span", {
			className: "bud"
		}, /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("span", {
			className: "leaf"
		}), /*#__PURE__*/React.createElement("span", {
			className: "txt"
		}, /*#__PURE__*/React.createElement("b", null, s.label), /*#__PURE__*/React.createElement("small", null, s.sub))))), /*#__PURE__*/React.createElement("div", {
			className: "sec"
		}, /*#__PURE__*/React.createElement("div", {
			className: "sec-h"
		}, "Filters", /*#__PURE__*/React.createElement("span", {
			className: "ln"
		})), /*#__PURE__*/React.createElement("div", {
			style: {
				padding: "4px 12px",
				fontFamily: '"Google Sans"',
				fontSize: 14,
				color: "var(--fore-tertiary)",
				lineHeight: 1.5
			}
		}, "Narrow the map by type, group, or how recently you visited.")))), /*#__PURE__*/React.createElement("div", {
			className: "main"
		}, /*#__PURE__*/React.createElement("div", {
			className: "content"
		}, sheath === "collect" && /*#__PURE__*/React.createElement(Collect, null), sheath === "notes" && /*#__PURE__*/React.createElement(Notes, {
			key: active,
			active: active,
			onLink: onLink
		}), sheath === "graph" && /*#__PURE__*/React.createElement(GraphView, null)))), toast && /*#__PURE__*/React.createElement("div", {
			className: "toast"
		}, /*#__PURE__*/React.createElement(I, {
			d: "check",
			s: 16
		}), toast), /*#__PURE__*/React.createElement(CmdK, {
			open: cmd,
			onClose: () => setCmd(false),
			onNav: setSheath
		}));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));