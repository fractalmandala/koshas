const { useState, useRef, useEffect, useLayoutEffect, useMemo } = React;
const D = window.KOSHAS_DATA, TYPES = window.KOSHAS_TYPES;
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
  bold:"M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  ital:"M14 4h-4M14 20h-4M15 4 9 20",
  h:"M5 5v14M13 5v14M5 12h8M17 9v10M17 9l3-1",
  quote:"M7 7H4v6h3c0 2-1 3-3 3M17 7h-3v6h3c0 2-1 3-3 3",
  code:"M8 7l-5 5 5 5M16 7l5 5-5 5",
  add: "M12 8v8M8 12h8"
};
const Icon = ({d, s=18, w=1.7, fill}) =>
  <svg className="ic" viewBox="0 0 24 24" width={s} height={s} fill={fill||"none"}
    stroke={fill?"none":"currentColor"} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
    style={{width:s,height:s}}><path d={P[d]} /></svg>;

/* ---------- inline wikilink parser ---------- */
function parseInline(text, onLink){
  const parts = []; const re = /\[\[([^\]]+)\]\]/g; let last = 0, m, k = 0;
  while((m = re.exec(text))){
    if(m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<a key={k++} className="wikilink" onClick={()=>onLink&&onLink(m[1])}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if(last < text.length) parts.push(text.slice(last));
  return parts;
}
function blocksToMd(note){
  const fm = note.frontmatter;
  let out = [["---"]];
  Object.entries(fm).forEach(([k,v])=> out.push([k+": ", Array.isArray(v)?("["+v.join(", ")+"]"):v]));
  out.push(["---"],[""]);
  note.blocks.forEach(b=>{
    if(b.t==="h1") out.push(["# ", b.x]);
    else if(b.t==="h2") out.push(["## ", b.x]);
    else if(b.t==="li") out.push([b.done!==undefined?(b.done?"- [x] ":"- [ ] "):"- ", b.x]);
    else if(b.t==="callout") out.push(["> ", b.x]);
    else if(b.t==="quote") out.push(["> ", b.x]);
    else out.push(["", b.x]);
    out.push([""]);
  });
  return out;
}

/* =================== CARD =================== */
function Card({item, vibe, dimmed, cardRef, onHover, onLink}){
  const c = item.colors || ["#3f8f63"];
  const style = undefined;
  const grad = "linear-gradient(150deg, oklch(0.275 0.008 160), oklch(0.185 0.006 160) 58%, oklch(0.235 0.007 160))";
  const typeLabel = TYPES[item.type];
  const Badge = () => (
    <div className="type-row">
      <span className="type-badge"><i className="gl"></i>{typeLabel}</span>
      <span className="saved">{item.saved}</span>
    </div>
  );
  const Tags = ({withMargin=true}) => (
    <div className="tags" style={withMargin?null:{marginTop:0}}>
      {(item.manualTags||[]).map(t=> <span key={t} className="tag man">#{t}</span>)}
      {(item.aiTags||[]).map(t=> <span key={t} className="tag ai"><span className="spark">✦</span>{t}</span>)}
    </div>
  );
  const hasMedia = ["image","video","book","recipe","product"].includes(item.type);

  return (
    <div ref={cardRef} className={cx("card", item.type==="quote"&&"q", vibe&&"vibe-on", item.status==="enriching"&&"enriching")}
      style={style} data-id={item.id}
      onMouseEnter={()=>onHover(item.id)} onMouseLeave={()=>onHover(null)}>
      <div className="glow" style={{background:"radial-gradient(120% 90% at 50% 0%, oklch(0.95 0.01 160/0.10), transparent 70%)"}}></div>

      {item.type==="image" && (
        <div className="media"><div className="grad" style={{background:grad}}></div><div className="stripes"></div>
          <div className="cap">photograph · {item.meta.dims}</div></div>)}
      {item.type==="video" && (
        <div className="media"><div className="grad" style={{background:grad}}></div><div className="stripes"></div>
          <div className="play"><span><Icon d="play" s={18} fill="currentColor"/></span></div>
          <div className="dur">{item.meta.duration}</div></div>)}
      {item.type==="book" && (
        <div className="media" style={{height:120}}><div className="grad" style={{background:grad}}></div>
          <div className="stripes"></div>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:10,background:"rgba(0,0,0,.25)"}}></div>
          <div className="cap">book cover</div></div>)}
      {item.type==="recipe" && (
        <div className="media" style={{height:110}}><div className="grad" style={{background:grad}}></div><div className="stripes"></div>
          <div className="cap">dish photo · {item.meta.time}</div></div>)}
      {item.type==="product" && (
        <div className="media" style={{height:118}}><div className="grad" style={{background:grad}}></div><div className="stripes"></div>
          <div className="cap">product shot</div></div>)}

      <div className="card-body">
        {item.type==="quote" ? (
          <React.Fragment>
            <Badge/>
            <div className="q-mark">“</div>
            <div className="q-text">{item.body}</div>
            <div className="q-attr">— {item.attribution}</div>
            <Tags/>
          </React.Fragment>
        ) : item.type==="highlight" ? (
          <React.Fragment>
            <div className="hl-bar"></div>
            <Badge/>
            <div className="q-text" style={{fontSize:14,fontStyle:"normal"}}>{item.body}</div>
            <button className="backlink"><Icon d="link" s={12}/> {item.sourceTitle}</button>
            <Tags/>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Badge/>
            {item.title && <h3>{item.title}</h3>}
            {item.type==="note" ? <p className="desc" style={{fontSize:13.5}}>{item.body}</p> :
              item.desc && <p className="desc">{item.desc}</p>}

            {item.type==="image" && (<React.Fragment>
              <div className="swatches">{c.map((x,i)=><i key={i} style={{background:x}}/>)}</div>
              <div className="swcap">extracted palette · {c.length} colors</div>
            </React.Fragment>)}
            {item.type==="book" && <div className="metarow"><span><b>{item.meta.author}</b></span><span>{item.meta.year}</span><span>{item.meta.pages} pp</span></div>}
            {item.type==="article" && <div className="domain"><span className="fav"></span>{item.domain} · {item.readMins} min read</div>}
            {item.type==="bookmark" && <div className="domain"><span className="fav"></span>{item.domain}</div>}
            {item.type==="pdf" && <div className="metarow"><span><b>{item.meta.pages}</b> pages</span><span>{item.meta.fileSize}</span></div>}
            {item.type==="recipe" && (<React.Fragment>
              <div className="metarow"><span>⏱ {item.meta.time}</span><span>serves {item.meta.serves}</span></div>
              <div className="ing">{item.meta.ingredients.slice(0,4).map(x=><span key={x}>{x}</span>)}</div>
            </React.Fragment>)}
            {item.type==="product" && <div className="metarow" style={{alignItems:"center"}}><span className="price">{item.meta.price}</span><span>{item.meta.store}</span></div>}
            {item.type==="video" && <div className="domain"><span className="fav"></span>{item.meta.platform}</div>}

            {item.summary && (
              <div style={{marginTop:11,padding:"10px 12px",borderRadius:10,border:"1px dashed var(--hair-2)",background:"oklch(0.95 0.01 160/0.03)"}}>
                <div className="chip-ai" style={{marginBottom:6}}><Icon d="spark" s={11}/> AI summary</div>
                <div style={{fontSize:12,lineHeight:1.5,color:"var(--dim)"}}>{item.summary}</div>
              </div>
            )}
            <Tags/>
          </React.Fragment>
        )}

        {item.status==="enriching" && (
          <div className="enrich-note"><span className="pulse"></span>enriching · OCR + tags</div>)}
        {item.refs>0 && (
          <div style={{marginTop:11,fontSize:11,color:"var(--fore-tertiary)",display:"flex",alignItems:"center",gap:6}}>
            <Icon d="graph" s={12}/> referenced by {item.refs}</div>)}
      </div>
    </div>
  );
}

/* =================== COLLECT VIEW =================== */
function Collect({onLink}){
  const [hover, setHover] = useState(null);
  const [view, setView] = useState("grid");
  const gridRef = useRef(null);
  const refs = useRef({});
  const [paths, setPaths] = useState([]);
  const vibeSet = useMemo(()=>{
    if(!hover) return null;
    const it = D.items.find(i=>i.id===hover);
    return new Set([hover, ...(it.sameVibe||[])]);
  }, [hover]);

  useLayoutEffect(()=>{
    if(!hover || !gridRef.current){ setPaths([]); return; }
    const it = D.items.find(i=>i.id===hover);
    const cont = gridRef.current.getBoundingClientRect();
    const a = refs.current[hover]; if(!a) return;
    const ar = a.getBoundingClientRect();
    const ax = ar.left-cont.left+ar.width/2, ay = ar.top-cont.top+ar.height/2;
    const next = [];
    (it.sameVibe||[]).forEach(tid=>{
      const el = refs.current[tid]; if(!el) return;
      const r = el.getBoundingClientRect();
      const bx = r.left-cont.left+r.width/2, by = r.top-cont.top+r.height/2;
      const mx = (ax+bx)/2, my=(ay+by)/2 - 40;
      next.push(`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`);
    });
    setPaths(next);
  }, [hover]);

  return (
    <div className="content-pad">
      <div className="collect-head">
        <div>
          <h1>Forests</h1>
          <div className="sub">5 items · hover any card to reveal its <span style={{color:"var(--mint)"}}>same-vibe</span> threads</div>
        </div>
        <div className="viewtoggle">
          <button className={cx(view==="grid"&&"on")} onClick={()=>setView("grid")}><Icon d="grid" s={15}/></button>
          <button className={cx(view==="list"&&"on")} onClick={()=>setView("list")}><Icon d="list" s={15}/></button>
        </div>
      </div>

      <div ref={gridRef} className={cx("masonry", hover&&"grid-dim")} style={{position:"relative"}}>
        <svg id="threads">{paths.map((d,i)=><path key={i} d={d}/>)}</svg>
        {D.items.map(it=>(
          <Card key={it.id} item={it}
            cardRef={el=>refs.current[it.id]=el}
            vibe={vibeSet?vibeSet.has(it.id):false}
            onHover={setHover} onLink={onLink}/>
        ))}
      </div>
    </div>
  );
}

/* =================== NOTES VIEW =================== */
const MODES = ["source","wysiwyg","preview"];
function Notes({onLink}){
  const [active, setActive] = useState("n01");
  const [mode, setMode] = useState("wysiwyg");
  const [showMeta, setShowMeta] = useState(true);
  const note = D.notes.find(n=>n.id===active);
  const pillRef = useRef(null), switchRef = useRef(null);

  useLayoutEffect(()=>{
    const sw = switchRef.current, pill = pillRef.current; if(!sw||!pill) return;
    const btn = sw.querySelectorAll("button")[MODES.indexOf(mode)];
    pill.style.left = btn.offsetLeft+"px"; pill.style.width = btn.offsetWidth+"px";
  }, [mode, active]);

  const renderBlock = (b,i)=>{
    if(b.t==="h1") return <h1 key={i}>{b.x}</h1>;
    if(b.t==="h2") return <h2 key={i}>{b.x}</h2>;
    if(b.t==="li") return (
      <div key={i} className={cx("li", b.done&&"done")}>
        <span className={cx("box", b.done&&"done")}>{b.done && <Icon d="check" s={13}/>}</span>
        <span className="txt">{parseInline(b.x,onLink)}</span></div>);
    if(b.t==="callout") return <div key={i} className="callout"><span className="ci"><Icon d="bolt" s={17}/></span><div>{parseInline(b.x,onLink)}</div></div>;
    if(b.t==="quote") return <blockquote key={i}>{b.x}</blockquote>;
    return <p key={i}>{parseInline(b.x,onLink)}</p>;
  };
  const md = blocksToMd(note);

  return (
    <div className={cx("editor-wrap", !showMeta&&"no-meta")} style={{transition:"grid-template-columns .35s var(--ease-in)"}}>
      <div className="ed-main">
        <div className="ed-toolbar">
          <div ref={switchRef} className="modeswitch">
            <span ref={pillRef} className="pill"></span>
            {MODES.map(m=> <button key={m} className={cx(mode===m&&"on")} onClick={()=>setMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>)}
          </div>
          <span className="tb-sep"></span>
          {mode==="wysiwyg" ? (
            <React.Fragment>
              <button className="tb-btn"><Icon d="bold" s={16}/></button>
              <button className="tb-btn"><Icon d="ital" s={16}/></button>
              <button className="tb-btn"><Icon d="h" s={16}/></button>
              <span className="tb-sep"></span>
              <button className="tb-btn"><Icon d="list" s={16}/></button>
              <button className="tb-btn"><Icon d="check" s={16}/></button>
              <button className="tb-btn"><Icon d="quote" s={16}/></button>
              <button className="tb-btn"><Icon d="link" s={16}/></button>
              <button className="tb-btn"><Icon d="code" s={16}/></button>
            </React.Fragment>
          ) : <span style={{fontSize:12,color:"var(--fore-tertiary)",fontFamily:"Google Sans"}}>{mode==="source"?"markdown source · read-write":"rendered · read-only"}</span>}
          <div className="right">
            <button className="tb-btn wide" onClick={()=>setShowMeta(s=>!s)} title="Toggle metadata"><Icon d="sidebar" s={15}/></button>
          </div>
        </div>

        <div className="ed-scroll">
          {mode==="source" ? (
            <div className="source" key="src">
              {md.map((row,i)=>{
                const head = row[0]||""; const body = row[1]||"";
                const cls = head==="---"||/^[a-z_]+: $/.test(head)?"fm": head.startsWith("#")?"h": (head.startsWith(">")||head.startsWith("-"))?"mk":"txt";
                return <div className="ln" key={i}><span className="n">{i+1}</span>
                  <span><span className={cls}>{head}</span><span className="txt">{body}</span></span></div>;
              })}
            </div>
          ) : (
            <div className="sheet" key={mode}>
              {mode==="preview" && <span className="preview-ribbon">PREVIEW · GFM</span>}
              <div className="doc">{note.blocks.map(renderBlock)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="meta">
        <div className="meta-pad">
          <h4>File</h4>
          <div style={{fontFamily:"Google Sans",fontSize:11.5,color:"var(--dim)",lineHeight:1.6,wordBreak:"break-all"}}>
            ~/Research/{note.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.md</div>
          <div style={{fontSize:11.5,color:"var(--fore-tertiary)",marginTop:8}}>{note.words} words · saved {note.updated}</div>

          <h4>Frontmatter <span className="chip-ai" style={{marginLeft:6,color:"var(--fore-tertiary)",borderColor:"var(--hair)"}}>managed</span></h4>
          <div className="field"><label>title · editable</label><input defaultValue={note.frontmatter.title}/></div>
          <div className="field"><label>group · editable</label><input defaultValue={note.frontmatter.group}/></div>
          <div className="field"><label>tags · read-only</label><div className="ro">{note.frontmatter.tags.map(t=>"#"+t).join("  ")}</div></div>
          <div className="field"><label>created · read-only</label><div className="ro">{note.frontmatter.created}</div></div>

          <h4>Backlinks · {note.backlinks.length}</h4>
          {note.backlinks.length? note.backlinks.map(b=>(
            <button key={b.id} className="bl"><span className="ic"></span>{b.title}</button>
          )) : <div style={{fontSize:12,color:"var(--fore-tertiary)"}}>No notes link here yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* =================== NOTES SIDEBAR =================== */
function NotesSidebar({active,setActive}){
  return (
    <div className="side-scroll">
      <div className="s-group">
        <div className="lab"><span className="dot"></span>Notebooks</div>
        {D.notebooks.map(n=>(
          <button key={n.name} className={cx("s-item", n.active&&"on")}>
            <Icon d="layers" s={15}/>{n.name}<span className="ct">{n.count}</span></button>
        ))}
      </div>
      <div className="s-group">
        <div className="lab"><span className="dot"></span>Research · notes</div>
        {D.notes.map(n=>(
          <button key={n.id} className={cx("note-li", active===n.id&&"on")} onClick={()=>setActive(n.id)}>
            <span className="g"></span>{n.title}<small>{n.words}w</small></button>
        ))}
      </div>
    </div>
  );
}

/* =================== COMMAND PALETTE =================== */
const CMDS = [
  {cat:"Navigation", items:[["layers","Switch to Collect","C"],["pen","Switch to Notes","N"],["graph","Switch to Graph","G"]]},
  {cat:"Creation", items:[["add","New Note","⌘N"],["bolt","New Quick Note","⌘⇧N"],["link","Add Link","⌘L"]]},
  {cat:"Search", items:[["search","Global Search","⌘⇧F"],["spark","Same-vibe from selection",""]]},
  {cat:"Actions", items:[["pen","Toggle Focus Mode",""],["cog","Open Preferences","⌘,"]]},
];
function CmdK({open,onClose,onNav}){
  const [q,setQ] = useState(""); const [sel,setSel] = useState(0); const inp = useRef(null);
  const flat = useMemo(()=>{ const f=[]; CMDS.forEach(g=>g.items.forEach(it=>{
    if(!q || it[1].toLowerCase().includes(q.toLowerCase())) f.push({cat:g.cat, it}); })); return f; },[q]);
  useEffect(()=>{ if(open){ setQ(""); setSel(0); setTimeout(()=>inp.current&&inp.current.focus(),40);} },[open]);
  useEffect(()=>{
    if(!open) return;
    const h = e=>{
      if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,flat.length-1));}
      else if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}
      else if(e.key==="Enter"){ const c=flat[sel]; if(c){run(c.it[1]);} }
      else if(e.key==="Escape") onClose();
    };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[open,flat,sel]);
  const run = (label)=>{ if(label.includes("Collect"))onNav("collect"); if(label.includes("Notes"))onNav("notes"); if(label.includes("Graph"))onNav("graph"); onClose(); };
  if(!open) return null;
  let idx=-1; let lastCat=null;
  return (
    <div className="cmdk-scrim" onClick={onClose}>
      <div className="cmdk" onClick={e=>e.stopPropagation()}>
        <div className="cmdk-in"><Icon d="search" s={20}/>
          <input ref={inp} value={q} onChange={e=>{setQ(e.target.value);setSel(0);}} placeholder="Type a command or search…"/>
          <span className="kbd" style={{fontFamily:"Google Sans",fontSize:11,color:"var(--fore-tertiary)"}}>esc</span></div>
        <div className="cmdk-list">
          {flat.length===0 && <div style={{padding:"28px",textAlign:"center",color:"var(--fore-tertiary)",fontSize:13}}>No matches</div>}
          {flat.map((c,i)=>{ idx++; const showCat=c.cat!==lastCat; lastCat=c.cat;
            return (<React.Fragment key={i}>
              {showCat && <div className="cmdk-cat">{c.cat}</div>}
              <div className={cx("cmdk-row", i===sel&&"sel")} onMouseEnter={()=>setSel(i)} onClick={()=>run(c.it[1])}>
                <span className="ck"><Icon d={c.it[0]} s={17}/></span>{c.it[1]}
                {c.it[2] && <span className="kbd">{c.it[2]}</span>}</div>
            </React.Fragment>);
          })}
        </div>
      </div>
    </div>
  );
}

/* =================== GRAPH (light placeholder peek) =================== */
function GraphView(){
  return (
    <div className="content-pad" style={{height:"100%",display:"grid",placeItems:"center"}}>
      <div style={{textAlign:"center",maxWidth:420}}>
        <div style={{width:70,height:70,margin:"0 auto 20px",display:"grid",placeItems:"center",borderRadius:20,
          background:"var(--glass)",border:"1px solid var(--hair-2)",color:"var(--mint)"}}><Icon d="graph" s={32}/></div>
        <h1 style={{fontFamily:"Google Sans",fontSize:24,marginBottom:10}}>Graph sheath</h1>
        <p style={{color:"var(--dim)",fontSize:14,lineHeight:1.6}}>The force-directed knowledge map lives here. For this round we focused on <b style={{color:"var(--mint)"}}>Collect</b> and <b style={{color:"var(--mint)"}}>Notes</b> — but you already get a peek of the graph as <i>same-vibe threads</i> when hovering cards.</p>
      </div>
    </div>
  );
}

/* =================== APP =================== */
const SHEATHS = [
  {id:"collect", ico:"layers", label:"Collect"},
  {id:"notes", ico:"pen", label:"Notes"},
  {id:"graph", ico:"graph", label:"Graph"},
];
function App(){
  const [sheath, setSheath] = useState("collect");
  const [cmd, setCmd] = useState(false);
  const [activeNote, setActiveNote] = useState("n01");
  const [flash, setFlash] = useState(null);

  useEffect(()=>{
    const h = e=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setCmd(o=>!o); }
    };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[]);
  const onLink = (title)=>{ const n = D.notes.find(x=>x.title===title); if(n){ setSheath("notes"); setActiveNote(n.id);} else { setFlash(title); setTimeout(()=>setFlash(null),1600);} };

  const sideTitle = sheath==="collect"?["Collect sheath","Library"]:sheath==="notes"?["Notes sheath","Workspace"]:["Graph sheath","Connections"];

  return (
    <div className="win">
      <div className="titlebar">
        <div className="lights"><i></i><i></i><i></i></div>
        <span className="wname"><b>◈</b> Koshas</span>
        <span className="tag mono">aurora · local · nothing leaves this device</span>
      </div>
      <div className="shell">
        {/* rail */}
        <div className="rail">
          <div className="brandmark"><span className="ring"></span><span className="ring"></span><span className="ring"></span><span className="core"></span></div>
          <div className="sheaths">
            {SHEATHS.map(s=>(
              <button key={s.id} className={cx("sheath", sheath===s.id&&"active")} onClick={()=>setSheath(s.id)}>
                <span className="layer l3"></span><span className="layer l2"></span><span className="layer"></span>
                <span className="ico"><Icon d={s.ico} s={21}/></span>
                <span className="lbl">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="spacer"></div>
          <button className="mini"><Icon d="bell" s={18}/></button>
          <button className="mini" onClick={()=>setCmd(true)}><Icon d="cog" s={18}/></button>
        </div>

        {/* contextual sidebar */}
        <div className="side">
          <div className="side-h"><div className="k mono">{sideTitle[0]}</div><h2>{sideTitle[1]}</h2></div>
          {sheath==="collect" && (
            <div className="side-scroll">
              <div className="s-group">
                <div className="lab"><span className="dot"></span>Groups</div>
                {D.groups.map(g=>(
                  <button key={g.name} className={cx("s-item", g.name==="Forests"&&"on")}>
                    {g.special? <span className="star"><Icon d="star" s={14} fill="currentColor"/></span> : <Icon d="layers" s={14}/>}
                    {g.name}<span className="ct">{g.count}</span></button>
                ))}
              </div>
              <div className="s-group">
                <div className="lab"><Icon d="spark" s={12}/>Stacks · AI</div>
                {D.stacks.map(s=>(
                  <button key={s.name} className="s-item" title={s.why}>
                    <span style={{width:14,display:"grid",placeItems:"center",color:"var(--fore-tertiary)"}}><Icon d="spark" s={13}/></span>
                    {s.name}<span className="ct">{s.count}</span></button>
                ))}
              </div>
              <div className="s-group">
                <div className="lab"><span className="dot"></span>Spaces</div>
                {D.spaces.map(s=>(
                  <button key={s.name} className="s-item">
                    <Icon d={s.type==="smart"?"bolt":"star"} s={13}/>{s.name}<span className="ct">{s.count}</span></button>
                ))}
              </div>
            </div>
          )}
          {sheath==="notes" && <NotesSidebar active={activeNote} setActive={setActiveNote}/>}
          {sheath==="graph" && <div className="side-scroll"><div className="s-group"><div className="lab"><span className="dot"></span>Filters</div>
            <div style={{padding:"0 10px",fontSize:12.5,color:"var(--fore-tertiary)",lineHeight:1.6}}>Filter the map by type, group or recency.</div></div></div>}
        </div>

        {/* main */}
        <div className="main">
          <div className="topbar">
            <div className="search"><Icon d="search" s={17}/>
              <input placeholder={sheath==="notes"?"Search notes across all notebooks…":"Search everything you've saved…"}/>
              <span className="kbd">⌘⇧F</span></div>
            {sheath==="collect" && <div className="scope">
              <button className="on">Everything</button><button>This group</button></div>}
            <button className="btn-cap" onClick={()=>setFlash("Captured ✦ enriching now")}><Icon d="plus" s={17}/>Capture</button>
          </div>
          <div className="content">
            {sheath==="collect" && <Collect onLink={onLink}/>}
            {sheath==="notes" && <Notes key={activeNote} onLink={onLink}/>}
            {sheath==="graph" && <GraphView/>}
          </div>
        </div>
      </div>

      {flash && <div className="vibe-hint" style={{left:"50%",top:"auto",bottom:36,transform:"translateX(-50%)",position:"fixed"}}>{flash.startsWith("Captured")?flash:`⬡ ${flash} — broken link · file not found`}</div>}
      <CmdK open={cmd} onClose={()=>setCmd(false)} onNav={setSheath}/>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
