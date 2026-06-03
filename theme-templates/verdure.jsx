const { useState, useRef, useEffect, useLayoutEffect, useMemo } = React;
const D = window.KOSHAS_DATA, TYPES = window.KOSHAS_TYPES;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ---------- icons ---------- */
const VP = {
  search:"M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  plus:"M12 5v14M5 12h14",
  grid:"M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list:"M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  play:"M8 5v14l11-7L8 5Z",
  link:"M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  check:"M5 12l4 4L19 6",
  leaf:"M11 3C6 4 3 8 3 13c0 4 2 7 2 7s8-1 12-5c3-3 4-9 4-9s-7-4-10-3ZM5 19C9 14 13 10 18 7",
  sprout:"M12 22V11M12 11C12 7 9 5 4 5c0 5 3 7 8 7M12 13c0-3 2.5-5 7-5 0 4-3 6-7 6",
  bell:"M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0",
  cog:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8M4.6 9a1.6 1.6 0 0 0-.3-1.8",
  bolt:"M13 2 4 14h7l-1 8 9-12h-7l1-6Z",
  quote:"M7 7H4v6h3c0 2-1 3-3 3M17 7h-3v6h3c0 2-1 3-3 3",
  bold:"M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z",
  ital:"M14 4h-4M14 20h-4M15 4 9 20",
  h:"M5 5v14M13 5v14M5 12h8M17 9v10M17 9l3-1",
  code:"M8 7l-5 5 5 5M16 7l5 5-5 5",
  star:"M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z",
  book:"M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5ZM18 17H6",
  edit:"M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3ZM14.5 7.5l3 3",
  graph:"M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.6 6 17 7.5M8.8 14.5 17 9"
};
const I = ({d,s=18,w=1.6,fill}) => <svg className="ic" viewBox="0 0 24 24" width={s} height={s} fill={fill||"none"} stroke={fill?"none":"currentColor"} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={VP[d]}/></svg>;

function parseInline(text,onLink){
  const parts=[]; const re=/\[\[([^\]]+)\]\]/g; let last=0,m,k=0;
  while((m=re.exec(text))){
    if(m.index>last) parts.push(text.slice(last,m.index));
    parts.push(<a key={k++} className="wikilink" onClick={()=>onLink&&onLink(m[1])}><span className="lf">❧ </span>{m[1]}</a>);
    last=m.index+m[0].length;
  }
  if(last<text.length) parts.push(text.slice(last));
  return parts;
}
function blocksToMd(note){
  const rows=[["---"]];
  Object.entries(note.frontmatter).forEach(([k,v])=>rows.push([k+": ",Array.isArray(v)?("["+v.join(", ")+"]"):v]));
  rows.push(["---"],[""]);
  note.blocks.forEach(b=>{
    if(b.t==="h1")rows.push(["# ",b.x]); else if(b.t==="h2")rows.push(["## ",b.x]);
    else if(b.t==="li")rows.push([b.done!==undefined?(b.done?"- [x] ":"- [ ] "):"- ",b.x]);
    else if(b.t==="callout"||b.t==="quote")rows.push(["> ",b.x]);
    else rows.push(["",b.x]);
    rows.push([""]);
  });
  return rows;
}

/* =================== CARD =================== */
function Card({item, onLink}){
  const c = item.colors||["#4a7d4a"];
  const grad = `linear-gradient(150deg, ${c[0]}, ${c[1]||c[0]} 55%, ${c[2]||c[0]})`;
  const Tags = () => (
    <div className="tags">
      {(item.manualTags||[]).map(t=><span key={t} className="tag man">#{t}</span>)}
      {(item.aiTags||[]).map(t=><span key={t} className="tag ai"><span className="ai-leaf"><I d="leaf" s={10}/></span>{t}</span>)}
    </div>
  );
  const Type = () => (
    <div className="type-row"><span className="dot"></span>
      <span className="type-tag">{TYPES[item.type]}</span>
      <span className="saved">{item.saved}</span></div>
  );

  return (
    <div className={cx("card", item.type==="highlight"&&"hl")}>
      {item.type==="image" && <div className="media"><div className="grad" style={{background:grad}}></div><div className="grain"></div><div className="cap">photograph · {item.meta.dims}</div></div>}
      {item.type==="video" && <div className="media"><div className="grad" style={{background:grad}}></div><div className="grain"></div><div className="play"><span><I d="play" s={18} fill="currentColor"/></span></div><div className="dur">{item.meta.duration}</div></div>}
      {item.type==="book" && <div className="media" style={{height:130}}><div className="grad" style={{background:grad}}></div><div className="grain"></div><div style={{position:"absolute",left:0,top:0,bottom:0,width:9,background:"rgba(0,0,0,.22)"}}></div><div className="cap">book cover</div></div>}
      {item.type==="recipe" && <div className="media" style={{height:124}}><div className="grad" style={{background:grad}}></div><div className="grain"></div><div className="cap">dish · {item.meta.time}</div></div>}
      {item.type==="product" && <div className="media" style={{height:128}}><div className="grad" style={{background:grad}}></div><div className="grain"></div><div className="cap">product shot</div></div>}

      <div className="card-body">
        <Type/>
        {item.type==="quote" ? (
          <React.Fragment>
            <div className="q-text"><span className="qm">“</span>{item.body}<span className="qm">”</span></div>
            <div className="q-attr">— {item.attribution}</div><Tags/>
          </React.Fragment>
        ) : item.type==="highlight" ? (
          <React.Fragment>
            <div className="hl-text">{item.body}</div>
            <button className="backlink"><I d="link" s={12}/> {item.sourceTitle}</button><Tags/>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {item.title && <h3>{item.title}</h3>}
            {item.type==="note" ? <p className="desc" style={{fontFamily:'"Google Sans"',fontSize:14}}>{item.body}</p> : item.desc && <p className="desc">{item.desc}</p>}
            {item.type==="image" && <div className="pigments">{c.map((x,i)=><span key={i} className="sw" style={{background:x}}/>)}<small>pigments</small></div>}
            {item.type==="article" && <div className="domain"><span className="fav" style={{background:grad}}></span>{item.domain} · {item.readMins} min</div>}
            {item.type==="bookmark" && <div className="domain"><span className="fav" style={{background:grad}}></span>{item.domain}</div>}
            {item.type==="video" && <div className="domain"><span className="fav" style={{background:grad}}></span>{item.meta.platform}</div>}
            {item.type==="book" && <div className="metarow"><span><b>{item.meta.author}</b></span><span>{item.meta.year}</span><span>{item.meta.pages} pp</span></div>}
            {item.type==="pdf" && <div className="metarow"><span><b>{item.meta.pages}</b> pages</span><span>{item.meta.fileSize}</span></div>}
            {item.type==="recipe" && <React.Fragment><div className="metarow"><span>⏱ {item.meta.time}</span><span>serves {item.meta.serves}</span></div><div className="ing">{item.meta.ingredients.slice(0,4).map(x=><span key={x}>{x}</span>)}</div></React.Fragment>}
            {item.type==="product" && <div className="metarow" style={{alignItems:"center"}}><span className="price">{item.meta.price}</span><span>{item.meta.store}</span></div>}
            {item.summary && <div className="ai-summary"><div className="lbl"><I d="leaf" s={11}/> AI summary</div><div className="txt">{item.summary}</div></div>}
            <Tags/>
          </React.Fragment>
        )}
        {item.status==="enriching" && <div className="enriching-tag"><span className="sprout"><I d="sprout" s={14}/></span>enriching · tags + summary</div>}
        {item.refs>0 && <div className="refs"><I d="graph" s={13}/> referenced by {item.refs}</div>}
      </div>
    </div>
  );
}

/* =================== COLLECT =================== */
function Collect(){
  const [view,setView] = useState("grid");
  return (
    <div className="content-pad">
      <div className="collect-head">
        <div>
          <div className="eyebrow">Forests · group</div>
          <h1>The <em>wood-wide</em> web</h1>
        </div>
      </div>
      <div className="headrow-sub">
        <span>5 items</span>
        <span className="pill">rule: domain or keyword matches “forest, fungi, tree”</span>
        <span>·</span><span>opens links in Helium</span>
        <div className="viewtoggle">
          <button className={cx(view==="grid"&&"on")} onClick={()=>setView("grid")}><I d="grid" s={15}/></button>
          <button className={cx(view==="list"&&"on")} onClick={()=>setView("list")}><I d="list" s={15}/></button>
        </div>
      </div>
      <div className="masonry">
        {D.items.map(it=><Card key={it.id} item={it}/>)}
      </div>
    </div>
  );
}

/* =================== NOTES (manuscript) =================== */
const MODES=["source","wysiwyg","preview"];
function Notes({active,onLink}){
  const [mode,setMode]=useState("wysiwyg");
  const note=D.notes.find(n=>n.id===active);
  const tabsRef=useRef(null),pillRef=useRef(null);
  useLayoutEffect(()=>{ const t=tabsRef.current,p=pillRef.current; if(!t||!p)return;
    const b=t.querySelectorAll("button")[MODES.indexOf(mode)]; p.style.left=b.offsetLeft+"px"; p.style.width=b.offsetWidth+"px"; },[mode,active]);
  const rb=(b,i)=>{
    if(b.t==="h1")return <h1 key={i}>{b.x}</h1>;
    if(b.t==="h2")return <h2 key={i}>{b.x}</h2>;
    if(b.t==="li")return <div key={i} className={cx("li",b.done&&"done")}><span className={cx("box",b.done&&"done")}>{b.done&&<I d="check" s={13}/>}</span><span className="tx">{parseInline(b.x,onLink)}</span></div>;
    if(b.t==="callout")return <div key={i} className="callout"><span className="ci"><I d="bolt" s={18}/></span><div>{parseInline(b.x,onLink)}</div></div>;
    if(b.t==="quote")return <blockquote key={i}>{b.x}</blockquote>;
    return <p key={i}>{parseInline(b.x,onLink)}</p>;
  };
  const md=blocksToMd(note);
  return (
    <div className="notes-shell" style={{display:"flex",flexDirection:"column"}}>
      <div className="ed-top">
        <div ref={tabsRef} className="modetabs"><span ref={pillRef} className="pill"></span>
          {MODES.map(m=><button key={m} className={cx(mode===m&&"on")} onClick={()=>setMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>)}</div>
        <span className="tb-sep"></span>
        {mode==="wysiwyg"?(<React.Fragment>
          <button className="tb-btn"><I d="bold" s={16}/></button>
          <button className="tb-btn"><I d="ital" s={16}/></button>
          <button className="tb-btn"><I d="h" s={16}/></button>
          <span className="tb-sep"></span>
          <button className="tb-btn"><I d="list" s={16}/></button>
          <button className="tb-btn"><I d="check" s={16}/></button>
          <button className="tb-btn"><I d="quote" s={16}/></button>
          <button className="tb-btn"><I d="link" s={16}/></button>
          <button className="tb-btn"><I d="code" s={16}/></button>
        </React.Fragment>):<span style={{fontFamily:'"Google Sans"',fontSize:12,color:"var(--fore-tertiary)"}}>{mode==="source"?"markdown source · the truth on disk":"rendered · GitHub-flavoured · read-only"}</span>}
        <div className="right">{note.words} words · saved {note.updated}</div>
      </div>
      <div className="ed-scroll">
        {mode==="source"?(
          <div className="source" key="src">
            {md.map((row,i)=>{const head=row[0]||"",body=row[1]||"";
              const cls=head==="---"||/^[a-z_]+: $/.test(head)?"fm":head.startsWith("#")?"h":(head.startsWith(">")||head.startsWith("-"))?"mk":"";
              return <div className="ln" key={i}><span className="n">{i+1}</span><span><span className={cls}>{head}</span><span>{body}</span></span></div>;})}
          </div>
        ):(
          <div className="parchment" key={mode}>
            <div className="sheet">
              {mode==="preview" && <div className="preview-ribbon"><I d="book" s={11}/> PREVIEW · GFM · read-only</div>}
              {mode==="wysiwyg" && (
                <div className="fm-card">
                  <span className="fm-lbl">frontmatter · managed</span>
                  <div className="fm-row"><span className="k">title</span><span className="v edit">{note.frontmatter.title}</span></div>
                  <div className="fm-row"><span className="k">group</span><span className="v edit">{note.frontmatter.group}</span></div>
                  <div className="fm-row"><span className="k">tags</span><span className="v">{note.frontmatter.tags.map(t=>"#"+t).join("  ")}</span></div>
                  <div className="fm-row"><span className="k">created</span><span className="v">{note.frontmatter.created}</span></div>
                </div>
              )}
              <div className="doc">{note.blocks.map(rb)}</div>
            </div>
            <div className="margin">
              <h4>In this notebook</h4>
              {D.notes.map(n=><button key={n.id} className={cx("bk")} onClick={()=>onLink(n.title)} style={n.id===active?{color:"var(--theme-main)",fontWeight:600}:null}>{n.title}<small>{n.words} words</small></button>)}
              <h4>Linked from · {note.backlinks.length}</h4>
              {note.backlinks.length?note.backlinks.map(b=>(
                <button key={b.id} className="bk" onClick={()=>onLink(b.title)}>{b.title}<small>{b.type||"note"}</small></button>
              )):<div style={{fontFamily:'"Google Sans"',fontSize:13,color:"var(--fore-tertiary)",fontStyle:"italic"}}>Nothing links here yet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =================== COMMAND PALETTE =================== */
const CMDS=[
  {cat:"Navigation",items:[["leaf","Open Collect","C"],["edit","Open Notes","N"],["graph","Open Graph","G"]]},
  {cat:"Creation",items:[["plus","New note","⌘N"],["bolt","Quick note","⌘⇧N"],["link","Add link","⌘L"]]},
  {cat:"Search",items:[["search","Search everything","⌘⇧F"]]},
  {cat:"Actions",items:[["book","Export as Markdown","⌘⇧E"],["cog","Preferences","⌘,"]]},
];
function CmdK({open,onClose,onNav}){
  const [q,setQ]=useState(""),[sel,setSel]=useState(0); const inp=useRef(null);
  const flat=useMemo(()=>{const f=[];CMDS.forEach(g=>g.items.forEach(it=>{if(!q||it[1].toLowerCase().includes(q.toLowerCase()))f.push({cat:g.cat,it});}));return f;},[q]);
  useEffect(()=>{if(open){setQ("");setSel(0);setTimeout(()=>inp.current&&inp.current.focus(),40);}},[open]);
  useEffect(()=>{if(!open)return;const h=e=>{
    if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,flat.length-1));}
    else if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}
    else if(e.key==="Enter"){const c=flat[sel];if(c)run(c.it[1]);}
    else if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);return ()=>window.removeEventListener("keydown",h);},[open,flat,sel]);
  const run=l=>{if(l.includes("Collect"))onNav("collect");if(l.includes("Notes"))onNav("notes");if(l.includes("Graph"))onNav("graph");onClose();};
  if(!open)return null; let lastCat=null;
  return (
    <div className="cmdk-scrim" onClick={onClose}>
      <div className="cmdk" onClick={e=>e.stopPropagation()}>
        <div className="cmdk-in"><I d="search" s={20}/><input ref={inp} value={q} onChange={e=>{setQ(e.target.value);setSel(0);}} placeholder="Search, or run a command…"/><span className="mono" style={{fontSize:11,color:"var(--fore-tertiary)"}}>esc</span></div>
        <div className="cmdk-list">
          {flat.length===0&&<div style={{padding:28,textAlign:"center",color:"var(--fore-tertiary)",fontFamily:'"Google Sans"'}}>Nothing matches “{q}”.</div>}
          {flat.map((c,i)=>{const sc=c.cat!==lastCat;lastCat=c.cat;return <React.Fragment key={i}>
            {sc&&<div className="cmdk-cat">{c.cat}</div>}
            <div className={cx("cmdk-row",i===sel&&"sel")} onMouseEnter={()=>setSel(i)} onClick={()=>run(c.it[1])}>
              <span className="ck"><I d={c.it[0]} s={17}/></span>{c.it[1]}<span className="kbd">{c.it[2]}</span></div>
          </React.Fragment>;})}
        </div>
      </div>
    </div>
  );
}

function GraphView(){
  return <div className="content-pad" style={{height:"100%",display:"grid",placeItems:"center"}}>
    <div style={{textAlign:"center",maxWidth:440}}>
      <div style={{width:64,height:64,margin:"0 auto 18px",borderRadius:"50%",display:"grid",placeItems:"center",background:"var(--surface-00)",boxShadow:"var(--sh-2)",color:"var(--theme-secondary)"}}><I d="graph" s={30}/></div>
      <h1 className="serif" style={{fontSize:30,fontWeight:500,marginBottom:10}}>The Graph sheath</h1>
      <p className="serif" style={{fontSize:17,lineHeight:1.6,color:"var(--fore-secondary)"}}>A living map of how everything connects. We focused this round on <b style={{color:"var(--theme-main)"}}>Collect</b> and <b style={{color:"var(--theme-main)"}}>Notes</b> — the graph grows from the links you make there.</p>
    </div></div>;
}

/* =================== APP =================== */
const SHEATHS=[
  {id:"collect",ico:"leaf",label:"Collect",sub:"Everything you save"},
  {id:"notes",ico:"edit",label:"Notes",sub:"Write & connect"},
  {id:"graph",ico:"graph",label:"Graph",sub:"See the whole"},
];
function App(){
  const [sheath,setSheath]=useState("collect");
  const [cmd,setCmd]=useState(false);
  const [active,setActive]=useState("n01");
  const [toast,setToast]=useState(null);
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCmd(o=>!o);}};
    window.addEventListener("keydown",h);return ()=>window.removeEventListener("keydown",h);},[]);
  const onLink=title=>{const n=D.notes.find(x=>x.title===title);if(n){setSheath("notes");setActive(n.id);}else{setToast(`❧ ${title} — broken link · file not found`);setTimeout(()=>setToast(null),1800);}};
  return (
    <div className="win">
      <div className="titlebar">
        <div className="lights"><i></i><i></i><i></i></div>
        <span className="wm">Koshas</span>
        <span className="tag">verdure · everything stays on your device</span>
      </div>
      <div className="shell">
        {/* left rail */}
        <div className="rail">
          <div className="rail-head">
            <div className="koshas"><span className="seal"></span>Koshas</div>
            <div className="tagline">a knowledge companion that grows with you</div>
          </div>
          <div className="vine">
            <div className="stem"></div>
            {SHEATHS.map(s=>(
              <button key={s.id} className={cx("node",sheath===s.id&&"on")} onClick={()=>setSheath(s.id)}>
                <span className="bud"><i></i></span>
                <span className="leaf"></span>
                <span className="txt"><b>{s.label}</b><small>{s.sub}</small></span>
              </button>
            ))}
          </div>
          {sheath==="collect"&&(
            <div className="rail-scroll">
              <div className="sec">
                <div className="sec-h">Groups<span className="ln"></span></div>
                {D.groups.map(g=>(
                  <button key={g.name} className={cx("r-item",g.special&&"star",g.name==="Forests"&&"on")}>
                    {!g.special&&<span className="gl" style={{background:g.name==="Forests"?"var(--theme-main)":"var(--medium-20)"}}></span>}
                    {g.name}<span className="ct">{g.count}</span></button>
                ))}
              </div>
              <div className="sec">
                <div className="sec-h"><span className="ai-leaf"><I d="leaf" s={11}/></span>Stacks · grown by AI<span className="ln"></span></div>
                {D.stacks.map(s=>(
                  <button key={s.name} className="r-item" title={s.why}>
                    <span className="stackico"><span></span><span></span><span></span></span>
                    {s.name}<span className="ct">{s.count}</span></button>
                ))}
              </div>
              <div className="sec">
                <div className="sec-h">Spaces<span className="ln"></span></div>
                {D.spaces.map(s=>(
                  <button key={s.name} className="r-item">
                    <span className="gl" style={{background:s.type==="smart"?"var(--medium-40)":"var(--theme-secondary)",borderRadius:s.type==="smart"?"50%":3}}></span>
                    {s.name}<span className="ct">{s.count}</span></button>
                ))}
              </div>
            </div>
          )}
          {sheath==="notes"&&(
            <div className="rail-scroll">
              <div className="sec">
                <div className="sec-h">Notebooks<span className="ln"></span></div>
                {D.notebooks.map(n=>(
                  <button key={n.name} className={cx("r-item",n.active&&"on")}>
                    <span className="stackico"><span></span><span></span><span></span></span>
                    {n.name}<span className="ct">{n.count}</span></button>
                ))}
              </div>
              <div className="sec">
                <div className="sec-h">Research · notes<span className="ln"></span></div>
                {D.notes.map(n=>(
                  <button key={n.id} className={cx("note-li",active===n.id&&"on")} onClick={()=>setActive(n.id)}>
                    <span className="ti">{n.title}</span><small>{n.words}w</small></button>
                ))}
              </div>
            </div>
          )}
          {sheath==="graph"&&<div className="rail-scroll"><div className="sec"><div className="sec-h">Filters<span className="ln"></span></div>
            <div style={{padding:"4px 12px",fontFamily:'"Google Sans"',fontSize:14,color:"var(--fore-tertiary)",lineHeight:1.5}}>Narrow the map by type, group, or how recently you visited.</div></div></div>}
        </div>

        {/* main */}
        <div className="main">
          <div className="topbar">
            <div className="search"><I d="search" s={17}/><input placeholder={sheath==="notes"?"Search notes across all notebooks…":"Search everything you've saved…"}/><span className="kbd">⌘⇧F</span></div>
            {sheath==="collect"&&<div className="scope"><button className="on">Everything</button><button>This group</button></div>}
            <button className="btn-cap" onClick={()=>setToast("Saved to Koshas · enriching now ❧")}><I d="plus" s={17}/>Capture</button>
          </div>
          <div className="content">
            {sheath==="collect"&&<Collect/>}
            {sheath==="notes"&&<Notes key={active} active={active} onLink={onLink}/>}
            {sheath==="graph"&&<GraphView/>}
          </div>
        </div>
      </div>
      {toast&&<div className="toast"><I d="check" s={16}/>{toast}</div>}
      <CmdK open={cmd} onClose={()=>setCmd(false)} onNav={setSheath}/>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
