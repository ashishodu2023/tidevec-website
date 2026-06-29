import { useState, useEffect, useRef, useCallback } from "react";

/* ── Design tokens — blue/white sibling of CortexOps ─────────── */
const C = {
  // Backgrounds
  bg:       "#ffffff",
  bgAlt:    "#f8faff",
  bgDeep:   "#0a0f1e",   // hero canvas bg — deep navy
  bgCode:   "#0d1117",

  // Brand blues
  blue:     "#2563eb",   // primary — same as CortexOps
  blueDk:   "#1d4ed8",
  blueLt:   "#dbeafe",
  indigo:   "#4f46e5",
  indigoDk: "#4338ca",

  // Accent — cyan for vector rays / search animation
  cyan:     "#06b6d4",
  cyanLt:   "#cffafe",
  cyanGlow: "rgba(6,182,212,0.35)",

  // Temporal amber
  amber:    "#f59e0b",
  amberLt:  "#fef3c7",

  // Text
  ink:      "#0f172a",
  body:     "#374151",
  muted:    "#6b7280",
  mutedLt:  "#9ca3af",

  // Borders
  border:   "#e2e8f0",
  borderLt: "#f1f5f9",

  // Vector dot colors
  dotBlue:  "#3b82f6",
  dotCyan:  "#06b6d4",
  dotViolet:"#8b5cf6",
  dotAmber: "#f59e0b",
};

const F = {
  sans:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Space Grotesk', 'Inter', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #fff; color: #0f172a; font-family: ${F.sans}; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 3px; }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes ripple   { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
  @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
  @keyframes float    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
  .fade-up   { animation: fadeUp 0.6s ease both; }
  .fade-in   { animation: fadeIn 0.4s ease both; }
  @media (prefers-reduced-motion: reduce) {
    .fade-up, .fade-in { animation: none; }
  }
`;

/* ── Vector Space Canvas — hero animation ─────────────────────── */
function VectorCanvas() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({
    dots: [], query: null, searchActive: false,
    searchTimer: null, phase: "idle", tick: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create clusters of dots (representing vector embeddings)
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const CLUSTERS = [
      { cx: 0.2, cy: 0.35, color: C.dotBlue,   label: "policy docs",   n: 12 },
      { cx: 0.55, cy: 0.25, color: C.dotCyan,   label: "ML papers",     n: 10 },
      { cx: 0.75, cy: 0.55, color: C.dotViolet, label: "code snippets", n: 14 },
      { cx: 0.35, cy: 0.68, color: C.dotAmber,  label: "chat logs",     n: 9  },
      { cx: 0.82, cy: 0.28, color: C.dotBlue,   label: "tickets",       n: 8  },
    ];

    const s = stateRef.current;
    s.dots = [];

    CLUSTERS.forEach(cl => {
      for (let i = 0; i < cl.n; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const radius = (0.04 + Math.random() * 0.08);
        s.dots.push({
          x:      cl.cx + Math.cos(angle) * radius,
          y:      cl.cy + Math.sin(angle) * radius,
          vx:     (Math.random() - 0.5) * 0.0002,
          vy:     (Math.random() - 0.5) * 0.0002,
          r:      2 + Math.random() * 2.5,
          color:  cl.color,
          label:  cl.label,
          cluster: cl,
          score:  0,
          highlighted: false,
          age:    Math.random() * 100, // simulates temporal age
        });
      }
    });

    // Query dot starts off screen
    s.query = { x: 0.5, y: 0.5, active: false };

    let queryInterval = null;

    const triggerSearch = () => {
      // Pick random query position near center
      s.query.x = 0.3 + Math.random() * 0.4;
      s.query.y = 0.2 + Math.random() * 0.6;
      s.query.active = true;
      s.searchActive = true;
      s.phase = "searching";
      s.tick  = 0;

      // Compute distances and scores
      s.dots.forEach(d => {
        const dx = d.x - s.query.x;
        const dy = d.y - s.query.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Temporal blend: mix semantic similarity with recency
        const semantic  = Math.max(0, 1 - dist / 0.35);
        const temporal  = Math.max(0, 1 - d.age / 120);
        d.score       = semantic * 0.7 + temporal * 0.3;
        d.highlighted = false;
      });

      // Sort and highlight top-5
      const sorted = [...s.dots].sort((a,b) => b.score - a.score);
      sorted.slice(0, 5).forEach(d => d.highlighted = true);

      // Reset after 3s
      if (s.searchTimer) clearTimeout(s.searchTimer);
      s.searchTimer = setTimeout(() => {
        s.dots.forEach(d => { d.highlighted = false; d.score = 0; });
        s.query.active  = false;
        s.searchActive  = false;
        s.phase         = "idle";
        // Age all dots slightly
        s.dots.forEach(d => { d.age = Math.min(120, d.age + 5); });
        // Random new doc appears "fresh"
        const lucky = s.dots[Math.floor(Math.random() * s.dots.length)];
        lucky.age = 0;
      }, 3000);
    };

    // Auto-trigger search every 4s
    triggerSearch();
    queryInterval = setInterval(triggerSearch, 4500);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      s.tick++;

      // Background grid (subtle)
      ctx.strokeStyle = "rgba(99,102,241,0.07)";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw connection lines between close dots
      s.dots.forEach((a, i) => {
        s.dots.slice(i+1).forEach(b => {
          if (a.cluster !== b.cluster) return;
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 60) {
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.strokeStyle = a.highlighted && b.highlighted
              ? `rgba(6,182,212,0.4)`
              : `rgba(99,102,241,0.08)`;
            ctx.lineWidth = a.highlighted && b.highlighted ? 1.5 : 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw search rays from query to highlighted dots
      if (s.query.active && s.searchActive) {
        const qx = s.query.x * w;
        const qy = s.query.y * h;
        const rayProgress = Math.min(1, s.tick / 30);

        s.dots.filter(d => d.highlighted).forEach((d, i) => {
          const dx = d.x * w - qx;
          const dy = d.y * h - qy;
          const ex = qx + dx * rayProgress;
          const ey = qy + dy * rayProgress;

          // Ray line
          const grad = ctx.createLinearGradient(qx, qy, ex, ey);
          grad.addColorStop(0, "rgba(6,182,212,0.8)");
          grad.addColorStop(1, "rgba(6,182,212,0)");
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Score label at endpoint
          if (rayProgress > 0.8 && d.score > 0) {
            ctx.fillStyle = C.cyan;
            ctx.font = `600 10px ${F.mono}`;
            ctx.fillText(d.score.toFixed(2), ex + 6, ey - 4);
          }
        });

        // Temporal decay ring around stale results
        s.dots.filter(d => d.highlighted && d.age > 60).forEach(d => {
          ctx.beginPath();
          ctx.arc(d.x * w, d.y * h, d.r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245,158,11,0.5)`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = C.amber;
          ctx.font = `500 9px ${F.mono}`;
          ctx.fillText("⚠ stale", d.x * w + d.r + 4, d.y * h - d.r - 2);
        });
      }

      // Draw dots
      s.dots.forEach(d => {
        // Drift
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0.05 || d.x > 0.95) d.vx *= -1;
        if (d.y < 0.05 || d.y > 0.95) d.vy *= -1;

        const px = d.x * w;
        const py = d.y * h;

        // Temporal age affects opacity
        const freshness = Math.max(0.3, 1 - d.age / 120);

        if (d.highlighted) {
          // Glow effect
          const glow = ctx.createRadialGradient(px, py, 0, px, py, d.r * 5);
          glow.addColorStop(0, "rgba(6,182,212,0.4)");
          glow.addColorStop(1, "rgba(6,182,212,0)");
          ctx.beginPath();
          ctx.arc(px, py, d.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Ripple
          if (s.tick % 20 === 0) {
            ctx.beginPath();
            ctx.arc(px, py, d.r + (s.tick % 20) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6,182,212,${0.6 - (s.tick % 20) * 0.03})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, d.highlighted ? d.r * 1.6 : d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.highlighted
          ? C.cyan
          : `${d.color}${Math.floor(freshness * 200).toString(16).padStart(2,'0')}`;
        ctx.fill();

        if (d.highlighted) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Draw query dot
      if (s.query.active) {
        const qx = s.query.x * w;
        const qy = s.query.y * h;

        // Query pulse rings
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(qx, qy, 6 + i * 8 + (s.tick % 30) * 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(37,99,235,${0.4 - i * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Query dot
        const qGlow = ctx.createRadialGradient(qx, qy, 0, qx, qy, 16);
        qGlow.addColorStop(0, "rgba(37,99,235,0.8)");
        qGlow.addColorStop(1, "rgba(37,99,235,0)");
        ctx.beginPath();
        ctx.arc(qx, qy, 16, 0, Math.PI * 2);
        ctx.fillStyle = qGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(qx, qy, 7, 0, Math.PI * 2);
        ctx.fillStyle = C.blue;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // "query" label
        ctx.fillStyle = C.blue;
        ctx.font = `700 11px ${F.mono}`;
        ctx.fillText("query →", qx + 12, qy - 8);
      }

      // Cluster labels
      const shown = new Set();
      CLUSTERS.forEach(cl => {
        if (shown.has(cl.label)) return;
        shown.add(cl.label);
        ctx.fillStyle = "rgba(99,102,241,0.5)";
        ctx.font = `500 10px ${F.mono}`;
        ctx.fillText(cl.label, cl.cx * w, cl.cy * h - 18);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(queryInterval);
      clearTimeout(s.searchTimer);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      width:"100%", height:"100%",
      display:"block", cursor:"crosshair",
    }}/>
  );
}

/* ── Terminal demo ─────────────────────────────────────────────── */
const DEMO = [
  { t:0,    k:"cmd",   s:"$ pip install gettidevec" },
  { t:700,  k:"ok",    s:"✓ Successfully installed gettidevec-0.1.0" },
  { t:1200, k:"blank", s:"" },
  { t:1500, k:"py",    s:">>> from tidevec import TideVec, HalfLife" },
  { t:2000, k:"py",    s:'>>> db = TideVec("localhost:6399")' },
  { t:2500, k:"py",    s:'>>> db.create_collection("docs", dim=768,' },
  { t:2700, k:"py",    s:'...     half_life_ms=HalfLife.ONE_WEEK)' },
  { t:3200, k:"ok",    s:"✓ Collection ready  [4 shards · TVIndex · CAGRA]" },
  { t:3700, k:"blank", s:"" },
  { t:4000, k:"py",    s:'>>> results = db.search("docs", query,' },
  { t:4200, k:"py",    s:'...     top_k=5, temporal_blend=0.3,' },
  { t:4400, k:"py",    s:'...     mode="causal_expand")' },
  { t:5000, k:"res",   s:"policy_v2   score=0.914  ⏱ 0.89  ✓ fresh" },
  { t:5300, k:"res",   s:"compliance  score=0.871  ⏱ 0.91  ✓ fresh" },
  { t:5600, k:"warn",  s:"policy_v1   score=0.893  ⚠ stale (18 days)" },
  { t:6000, k:"trace", s:"# GPU_CAGRA · 2.8ms · recall=0.95 · 1M QPS" },
  { t:6500, k:"blink", s:"█" },
];

const dc = k => ({
  cmd:"#94a3b8", ok:"#34d399", py:"#e2e8f0",
  res:"#93c5fd", warn:"#fbbf24", trace:"#818cf8",
  blank:"transparent", blink:"#94a3b8",
}[k]||"#e2e8f0");

function Terminal() {
  const [lines, setLines] = useState([]);
  const [loop, setLoop]   = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    setLines([]);
    const timers = DEMO.map(l => setTimeout(() => {
      setLines(p => [...p, l]);
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }, l.t));
    const restart = setTimeout(() => setLoop(n => n+1),
      DEMO[DEMO.length-1].t + 3000);
    return () => { timers.forEach(clearTimeout); clearTimeout(restart); };
  }, [loop]);

  return (
    <div style={{
      background:"#0d1117", borderRadius:12,
      border:"1px solid #21262d", overflow:"hidden",
      boxShadow:"0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)",
    }}>
      <div style={{
        background:"#161b22", padding:"10px 16px",
        borderBottom:"1px solid #21262d",
        display:"flex", alignItems:"center", gap:8,
      }}>
        {["#ff5f57","#ffbd2e","#28c840"].map((c,i)=>(
          <div key={i} style={{width:11,height:11,borderRadius:"50%",background:c}}/>
        ))}
        <span style={{
          color:"#8b949e", fontSize:11, marginLeft:6, fontFamily:F.mono,
        }}>python — tidevec</span>
      </div>
      <div ref={boxRef} style={{
        padding:"16px 18px", height:280, overflowY:"auto",
        fontFamily:F.mono, fontSize:12.5, lineHeight:1.9,
      }}>
        {lines.map((l,i)=>(
          <div key={i} style={{color:dc(l.k)}}>
            {l.k==="blink"
              ? <span style={{animation:"blink 1s step-end infinite"}}>{l.s}</span>
              : l.s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Similarity Search Demo ───────────────────────────────────── */
function SimilarityDemo() {
  const [active, setActive] = useState(null);
  const items = [
    { id:"policy_v2", score:0.914, temporal:0.89, age:"2 days",  fresh:true,  color:C.blue },
    { id:"compliance",score:0.871, temporal:0.91, age:"5 days",  fresh:true,  color:C.blue },
    { id:"policy_v1", score:0.893, temporal:0.32, age:"18 days", fresh:false, color:C.amber },
    { id:"old_memo",  score:0.841, temporal:0.11, age:"47 days", fresh:false, color:C.amber },
    { id:"guidelines",score:0.812, temporal:0.78, age:"3 days",  fresh:true,  color:C.blue },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* Query bar */}
      <div style={{
        background:"#f8faff",
        border:`2px solid ${C.blue}`,
        borderRadius:10, padding:"10px 14px",
        display:"flex", alignItems:"center", gap:10,
        marginBottom:4,
      }}>
        <div style={{
          width:28, height:28, borderRadius:6,
          background:`linear-gradient(135deg,${C.blue},${C.cyan})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#fff", fontSize:13, flexShrink:0,
        }}>⊛</div>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.blue,fontFamily:F.mono}}>
            query vector
          </div>
          <div style={{fontSize:11,color:C.muted}}>
            temporal_blend=0.3 · mode=causal_expand · top_k=5
          </div>
        </div>
        <div style={{
          marginLeft:"auto", fontSize:11,
          fontFamily:F.mono, color:C.cyan, fontWeight:600,
        }}>
          2.8ms · GPU
        </div>
      </div>

      {/* Results */}
      {items.map((item,i)=>(
        <div key={item.id}
          onMouseEnter={()=>setActive(i)}
          onMouseLeave={()=>setActive(null)}
          style={{
            border:`1.5px solid ${active===i
              ? (item.fresh ? C.blue : C.amber)
              : C.border}`,
            borderLeft:`4px solid ${item.fresh ? C.blue : C.amber}`,
            background: active===i
              ? (item.fresh ? "#f0f7ff" : "#fffbeb")
              : "#fff",
            borderRadius:8, padding:"10px 14px",
            display:"flex", alignItems:"center", gap:12,
            transition:"all 0.15s", cursor:"pointer",
          }}
        >
          {/* Rank */}
          <div style={{
            width:20, height:20, borderRadius:"50%",
            background: item.fresh ? C.blueLt : C.amberLt,
            color: item.fresh ? C.blue : C.amber,
            fontSize:11, fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>{i+1}</div>

          {/* ID */}
          <div style={{flex:1}}>
            <div style={{fontFamily:F.mono,fontSize:13,fontWeight:600,color:C.ink}}>
              {item.id}
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>
              {item.age} old · temporal {item.temporal.toFixed(2)}
            </div>
          </div>

          {/* Score bar */}
          <div style={{width:100}}>
            <div style={{
              height:4, background:C.borderLt, borderRadius:4, overflow:"hidden",
            }}>
              <div style={{
                height:"100%", borderRadius:4,
                width:`${item.score * 100}%`,
                background:`linear-gradient(90deg, ${item.fresh ? C.blue : C.amber}, ${item.fresh ? C.cyan : "#fcd34d"})`,
                transition:"width 0.4s ease",
              }}/>
            </div>
            <div style={{
              fontSize:11, fontFamily:F.mono,
              fontWeight:700, color:C.ink, marginTop:2, textAlign:"right",
            }}>{item.score.toFixed(3)}</div>
          </div>

          {/* Badge */}
          <span style={{
            fontSize:10, fontWeight:700, padding:"2px 8px",
            borderRadius:20, fontFamily:F.mono,
            background: item.fresh ? C.blueLt : C.amberLt,
            color: item.fresh ? C.blue : C.amber,
            flexShrink:0,
          }}>{item.fresh ? "✓ fresh" : "⚠ stale"}</span>
        </div>
      ))}

      <div style={{
        padding:"8px 14px",
        background:`linear-gradient(135deg,${C.blueLt},#f0fdfa)`,
        borderRadius:8, border:`1px solid ${C.border}`,
        fontFamily:F.mono, fontSize:11, color:C.indigo, fontWeight:600,
      }}>
        RetrievalTrace: GPU_CAGRA · 2.8ms · recall≈0.95 · 5 causal neighbors expanded
      </div>
    </div>
  );
}

/* ── Navbar ────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  },[]);

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      transition:"all 0.25s",
    }}>
      <div style={{
        maxWidth:1100, margin:"0 auto", padding:"0 24px",
        display:"flex", alignItems:"center",
        justifyContent:"space-between", height:60,
      }}>
        {/* Logo */}
        <a href="/" style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:`linear-gradient(135deg,${C.blue},${C.cyan})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:900, fontSize:16, fontFamily:F.mono,
            boxShadow:`0 2px 12px rgba(37,99,235,0.35)`,
          }}>C</div>
          <span style={{
            fontFamily:F.display, fontWeight:800, fontSize:19,
            letterSpacing:"-0.03em",
            background:`linear-gradient(135deg,${C.blue},${C.cyan})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>TideVec</span>
        </a>

        {/* Links */}
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          {[["Features","#features"],["Compare","#compare"],
            ["Pricing","#pricing"],["Docs","/docs"],
            ["GitHub","https://github.com/ashishodu2023/TideVec"]
          ].map(([l,h])=>(
            <a key={l} href={h} style={{
              color: scrolled ? C.body : "rgba(255,255,255,0.8)",
              fontSize:14, fontWeight:500,
              padding:"6px 12px", borderRadius:6,
              transition:"color 0.15s",
            }}
              onMouseEnter={e=>e.currentTarget.style.color=scrolled?C.ink:"#fff"}
              onMouseLeave={e=>e.currentTarget.style.color=scrolled?C.body:"rgba(255,255,255,0.8)"}
            >{l}</a>
          ))}
          <a href="#pricing" style={{
            marginLeft:8,
            background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
            color:"#fff", padding:"8px 18px", borderRadius:8,
            fontSize:13, fontWeight:700,
            boxShadow:`0 2px 10px rgba(37,99,235,0.3)`,
            transition:"opacity 0.15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
          >Get started</a>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ──────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{position:"relative", overflow:"hidden"}}>
      {/* Canvas background */}
      <div style={{
        position:"absolute", inset:0,
        background:`linear-gradient(160deg, ${C.bgDeep} 0%, #0f172a 60%, #0a0f1e 100%)`,
      }}/>
      <div style={{position:"absolute",inset:0}}>
        <VectorCanvas/>
      </div>

      {/* Overlay gradient at bottom */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:120,
        background:"linear-gradient(to bottom, transparent, #fff)",
        pointerEvents:"none",
      }}/>

      {/* Content */}
      <div style={{
        position:"relative", zIndex:10,
        maxWidth:1100, margin:"0 auto",
        padding:"130px 24px 80px",
        display:"grid", gridTemplateColumns:"1fr 1fr",
        gap:60, alignItems:"center",
      }}>
        {/* Left */}
        <div className="fade-up">
          {/* Eyebrow */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(37,99,235,0.15)",
            border:"1px solid rgba(37,99,235,0.3)",
            borderRadius:20, padding:"5px 14px", marginBottom:24,
          }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background:C.cyan, animation:"pulse 2s infinite",
            }}/>
            <span style={{
              fontSize:12, color:C.cyan, fontWeight:700,
              fontFamily:F.mono, letterSpacing:"0.08em",
            }}>LIVE · vector search · temporal decay</span>
          </div>

          <h1 style={{
            fontFamily:F.display,
            fontSize:"clamp(36px,4vw,58px)",
            fontWeight:800, lineHeight:1.05,
            letterSpacing:"-0.03em",
            color:"#fff", marginBottom:20,
          }}>
            The vector DB<br/>
            <span style={{
              background:`linear-gradient(135deg,${C.cyan} 0%,${C.blue} 60%)`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>that knows what<br/>time it is</span>
          </h1>

          <p style={{
            fontSize:17, color:"rgba(255,255,255,0.65)",
            lineHeight:1.8, marginBottom:32, maxWidth:420,
          }}>
            Temporal decay, causal graphs, GPU CAGRA kernels.
            Fresh vectors rank higher — automatically.
            Built in C++20 for agentic AI.
          </p>

          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:36}}>
            <a href="https://github.com/ashishodu2023/TideVec" style={{
              background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
              color:"#fff", padding:"12px 26px", borderRadius:9,
              fontWeight:700, fontSize:15,
              boxShadow:`0 4px 20px rgba(37,99,235,0.4)`,
              transition:"transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 8px 25px rgba(37,99,235,0.5)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=`0 4px 20px rgba(37,99,235,0.4)`;}}
            >Get started →</a>
            <a href="/docs" style={{
              background:"rgba(255,255,255,0.08)",
              border:"1px solid rgba(255,255,255,0.2)",
              color:"#fff", padding:"12px 26px", borderRadius:9,
              fontWeight:600, fontSize:15, backdropFilter:"blur(4px)",
              transition:"background 0.15s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
            >Read the docs</a>
          </div>

          {/* Install command */}
          <div style={{
            background:"rgba(0,0,0,0.4)",
            border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8, padding:"10px 16px",
            display:"inline-flex", alignItems:"center", gap:12,
            backdropFilter:"blur(4px)",
          }}>
            <code style={{
              fontFamily:F.mono, fontSize:13, color:C.cyan,
            }}>pip install gettidevec</code>
            <span style={{
              fontSize:11, color:"rgba(255,255,255,0.4)",
              fontFamily:F.mono,
            }}>v0.1.0</span>
          </div>
        </div>

        {/* Right — terminal */}
        <div className="fade-up" style={{animationDelay:"0.15s"}}>
          <Terminal/>

          {/* Stats below terminal */}
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)",
            gap:1, marginTop:16,
            background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, overflow:"hidden",
          }}>
            {[["33–77×","faster than HNSW"],["11","nines durability"],["2M","QPS on TPU"]].map(([v,l],i)=>(
              <div key={i} style={{
                padding:"14px 0", textAlign:"center",
                borderRight:i<2?"1px solid rgba(255,255,255,0.08)":"none",
              }}>
                <div style={{
                  fontFamily:F.mono, fontSize:20, fontWeight:800,
                  color:C.cyan,
                }}>{v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Announcement bar ──────────────────────────────────────────── */
function AnnouncementBar() {
  return (
    <div style={{
      background:`linear-gradient(90deg,${C.blue},${C.indigo})`,
      color:"#fff", textAlign:"center",
      padding:"9px 0", fontSize:13, fontWeight:500,
    }}>
      🎉 v0.1.0 live on PyPI —{" "}
      <code style={{
        fontFamily:F.mono, fontSize:12, fontWeight:700,
        background:"rgba(255,255,255,0.15)",
        padding:"1px 7px", borderRadius:4,
      }}>pip install gettidevec</code>
      {" "}· Docker Hub: <code style={{fontFamily:F.mono,fontSize:12,fontWeight:700}}>averm004/tidevec</code>
    </div>
  );
}

/* ── Section label ─────────────────────────────────────────────── */
function Label({children}) {
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:6,
      background:C.blueLt, color:C.blue,
      padding:"4px 12px", borderRadius:20,
      fontSize:11, fontWeight:700,
      letterSpacing:"0.1em", fontFamily:F.mono,
      marginBottom:16,
    }}>{children}</div>
  );
}

/* ── How it works ──────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { icon:"📦", n:"01", title:"Install",
      desc:"One command. Connects to local or hosted TideVec server.",
      code:"pip install gettidevec\n\nfrom tidevec import TideVec\ndb = TideVec(\"localhost:6399\")" },
    { icon:"🗂️", n:"02", title:"Create collection",
      desc:"Set embedding dimension and temporal decay half-life.",
      code:"db.create_collection(\"docs\",\n  dim=768,\n  half_life_ms=ONE_WEEK,\n  temporal_blend=0.3)" },
    { icon:"⚡", n:"03", title:"Upsert with edges",
      desc:"Add causal relationships between vectors in one call.",
      code:"db.upsert(\"docs\",[{\n  \"id\":\"policy_v2\",\n  \"embedding\": vec,\n  \"edges\":[{\"target_id\":\n    \"policy_v1\",\n    \"type\":\"UPDATES\"}]\n}])" },
    { icon:"🔍", n:"04", title:"Search — fresh first",
      desc:"Temporal scoring + causal expansion + staleness warnings.",
      code:"for hit in db.search(\n  \"docs\", query,\n  temporal_blend=0.3,\n  mode=\"causal_expand\"):\n  print(hit.id, hit.score)" },
  ];

  return (
    <section style={{
      background:C.bgAlt,
      borderTop:`1px solid ${C.border}`,
      padding:"80px 24px",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <Label>⚙️ How it works</Label>
        <h2 style={{
          fontFamily:F.display,
          fontSize:"clamp(28px,3vw,42px)",
          fontWeight:800, letterSpacing:"-0.03em",
          color:C.ink, marginBottom:48,
        }}>
          From install to temporal search{" "}
          <span style={{color:C.blue}}>in 2 minutes</span>
        </h2>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          {steps.map((s,i)=>(
            <div key={i} style={{
              background:"#fff",
              border:`1px solid ${C.border}`,
              borderRadius:14, overflow:"hidden",
              boxShadow:"0 2px 12px rgba(37,99,235,0.06)",
              transition:"transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 30px rgba(37,99,235,0.12)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(37,99,235,0.06)";}}
            >
              <div style={{padding:"22px 20px 16px"}}>
                <div style={{
                  fontSize:11, fontFamily:F.mono,
                  color:C.blue, fontWeight:700, marginBottom:8,
                }}>STEP {s.n}</div>
                <div style={{fontSize:22, marginBottom:8}}>{s.icon}</div>
                <div style={{fontWeight:700,fontSize:15,color:C.ink,marginBottom:6}}>{s.title}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{s.desc}</div>
              </div>
              <div style={{
                background:C.bgCode,
                padding:"14px 16px",
                borderTop:"1px solid #21262d",
              }}>
                <pre style={{
                  margin:0, fontFamily:F.mono, fontSize:11,
                  lineHeight:1.8, color:"#c9d1d9",
                  whiteSpace:"pre-wrap", wordBreak:"break-all",
                }}>{s.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Search Demo Section ───────────────────────────────────────── */
function SearchSection() {
  return (
    <section id="search" style={{padding:"80px 24px",maxWidth:1100,margin:"0 auto"}}>
      <Label>🔍 Similarity search · temporal scoring</Label>
      <h2 style={{
        fontFamily:F.display,
        fontSize:"clamp(28px,3vw,42px)",
        fontWeight:800, letterSpacing:"-0.03em",
        color:C.ink, marginBottom:12,
      }}>
        Fresh vectors rank higher.{" "}
        <span style={{color:C.blue}}>Automatically.</span>
      </h2>
      <p style={{
        fontSize:16, color:C.body,
        lineHeight:1.8, marginBottom:48, maxWidth:560,
      }}>
        TVIndex bakes Ebbinghaus exponential decay into HNSW graph traversal.
        No re-embedding. No manual TTL. Stale vectors lose rank during the search itself.
      </p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:40}}>
        {/* Code */}
        <div style={{
          background:C.bgCode, borderRadius:12,
          border:"1px solid #21262d",
          overflow:"hidden",
          boxShadow:`0 8px 30px rgba(0,0,0,0.15)`,
        }}>
          <div style={{
            background:"#161b22", padding:"10px 16px",
            borderBottom:"1px solid #21262d",
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span style={{color:"#8b949e",fontSize:11,fontFamily:F.mono}}>python · temporal search</span>
          </div>
          <pre style={{
            padding:"20px", margin:0,
            fontFamily:F.mono, fontSize:12.5,
            lineHeight:1.9, color:"#c9d1d9", overflowX:"auto",
          }}>{`from tidevec import TideVec, HalfLife

db = TideVec("localhost:6399")
db.create_collection("docs",
    dim=768,
    half_life_ms=HalfLife.ONE_WEEK,
    temporal_blend=0.3)

# Fresh vectors rank higher — automatically
results = db.search("docs", query,
    top_k=5,
    mode="causal_expand",
    include_staleness_warnings=True,
    include_trace=True)

for hit in results:
    print(hit.id, hit.score,
          hit.temporal_score)
    if hit.staleness_warning:
        print(f"  ⚠ {hit.staleness_reason}")`}</pre>
        </div>

        {/* Live results */}
        <SimilarityDemo/>
      </div>
    </section>
  );
}

/* ── Features ──────────────────────────────────────────────────── */
function Features() {
  const feats = [
    { icon:"⏱", title:"TVIndex — temporal HNSW",   tier:"Free",
      desc:"Ebbinghaus decay baked into graph traversal. Fresh vectors rank higher — zero re-embedding." },
    { icon:"🔗", title:"CausalEdge graph",          tier:"Free",
      desc:"CAUSES, CONTRADICTS, UPDATES, ENTITY_OF edges co-located with vectors. BFS up to N hops." },
    { icon:"⚡", title:"GPU CAGRA kernels",          tier:"Free",
      desc:"CUDA NN-Descent + warp-level beam search. 33–77× faster than HNSW at 95% recall." },
    { icon:"🌐", title:"4-language SDKs",            tier:"Free",
      desc:"Python, Go, Java, C++ from a single proto. REST + gRPC. Drop into any pipeline." },
    { icon:"🛡️", title:"RS(10,4) erasure coding",   tier:"Pro",
      desc:"Reed-Solomon GF(256). 14 shards, any 10 reconstruct. 11-nines durability. 1.4× overhead." },
    { icon:"🏛️", title:"Raft 5-node consensus",      tier:"Pro",
      desc:"Leader election <150ms. Linearisable reads. No split-brain. 9-nines availability." },
    { icon:"🔭", title:"RetrievalTrace (OTel)",      tier:"Pro",
      desc:"Every query emits staleness warnings, recall estimates, causal expansion trace. CortexOps native." },
    { icon:"🧠", title:"TPU XLA matmul search",      tier:"Pro",
      desc:"JIT-compiled XLA on MXU. bf16 throughput. 2M QPS on TPU v5e. 100% recall." },
  ];

  return (
    <section id="features" style={{
      background:C.bgAlt,
      borderTop:`1px solid ${C.border}`,
      padding:"80px 24px",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <Label>✨ Features</Label>
        <h2 style={{
          fontFamily:F.display,
          fontSize:"clamp(28px,3vw,42px)",
          fontWeight:800, letterSpacing:"-0.03em",
          color:C.ink, marginBottom:12,
        }}>
          Built for retrieval that{" "}
          <span style={{color:C.blue}}>ages gracefully</span>
        </h2>
        <p style={{fontSize:16,color:C.body,marginBottom:48,lineHeight:1.8}}>
          Core search is Apache 2.0, free forever. Pro adds cloud hosting, observability, and enterprise durability.
        </p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
          {feats.map((f,i)=>(
            <div key={i} style={{
              background:"#fff",
              border:`1px solid ${C.border}`,
              borderRadius:12, padding:"22px 24px",
              boxShadow:"0 1px 8px rgba(37,99,235,0.05)",
              transition:"border-color 0.2s, box-shadow 0.2s, transform 0.2s",
            }}
              onMouseEnter={e=>{
                e.currentTarget.style.borderColor=C.blue;
                e.currentTarget.style.boxShadow=`0 6px 24px rgba(37,99,235,0.1)`;
                e.currentTarget.style.transform="translateY(-2px)";
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.borderColor=C.border;
                e.currentTarget.style.boxShadow="0 1px 8px rgba(37,99,235,0.05)";
                e.currentTarget.style.transform="";
              }}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{f.icon}</span>
                  <span style={{fontWeight:700,fontSize:15,color:C.ink}}>{f.title}</span>
                </div>
                <span style={{
                  fontSize:10, fontWeight:700,
                  padding:"2px 8px", borderRadius:20,
                  fontFamily:F.mono,
                  background: f.tier==="Free" ? "#dcfce7" : C.blueLt,
                  color: f.tier==="Free" ? "#166534" : C.blue,
                }}>{f.tier}</span>
              </div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.65,paddingLeft:30}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Compare ───────────────────────────────────────────────────── */
function Compare() {
  const rows = [
    ["Temporal decay scoring",       "✓ TVIndex",       "❌",         "❌"],
    ["Native causal graph",          "✓ CausalEdge",    "❌",         "❌"],
    ["Per-query OTel trace",         "✓ RetrievalTrace","❌",         "❌"],
    ["Zero-downtime model migration","✓ DriftBridge",   "❌",         "❌"],
    ["GPU CAGRA kernels",            "✓ 33–77× faster", "✓ cuVS",    "❌"],
    ["RS erasure coding (11 nines)", "✓ RS(10,4)",      "❌",         "Partial"],
    ["Raft consensus",               "✓ 5-node",        "❌",         "✓"],
    ["Open source",                  "✓ Apache 2.0",    "✓ Apache 2.0","❌"],
    ["Pricing",                      "$0 / $49 / custom","$0/$299+/mo","$70+/mo"],
  ];

  return (
    <section id="compare" style={{padding:"80px 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <Label>📊 vs Qdrant & Pinecone</Label>
        <h2 style={{
          fontFamily:F.display,
          fontSize:"clamp(28px,3vw,42px)",
          fontWeight:800, letterSpacing:"-0.03em",
          color:C.ink, marginBottom:12,
        }}>
          Know what you're getting{" "}
          <span style={{color:C.blue}}>before you commit</span>
        </h2>
        <p style={{fontSize:16,color:C.body,marginBottom:48,lineHeight:1.8}}>
          Pinecone charges per vector and per query. Qdrant managed starts at $299/mo.
          TideVec is $49/seat flat — or self-host free forever.
        </p>

        <div style={{
          borderRadius:14, overflow:"hidden",
          border:`1px solid ${C.border}`,
          boxShadow:`0 8px 30px rgba(37,99,235,0.08)`,
        }}>
          <div style={{
            display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
            background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
          }}>
            {["Capability","TideVec","Qdrant","Pinecone"].map((h,i)=>(
              <div key={i} style={{
                padding:"14px 20px", fontSize:12,
                fontWeight:700, color:"#fff",
                fontFamily:F.mono, letterSpacing:"0.06em",
                textAlign:i>0?"center":"left",
              }}>{h}</div>
            ))}
          </div>
          {rows.map((row,i)=>(
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
              background:i%2===0?"#fff":C.bgAlt,
              borderTop:`1px solid ${C.border}`,
              transition:"background 0.15s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background=C.blueLt+"44"}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":C.bgAlt}
            >
              {row.map((cell,j)=>(
                <div key={j} style={{
                  padding:"12px 20px", fontSize:13,
                  color: j===1 ? C.blue : C.body,
                  fontWeight: j===1 ? 700 : 400,
                  textAlign: j>0 ? "center" : "left",
                  fontFamily: j>0 ? F.mono : F.sans,
                }}>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────────────── */
function Pricing() {
  const [showCheckout, setShowCheckout] = useState(false);
  const plans = [
    { name:"Free", price:"$0", sub:"Self-host forever. No credit card.",
      highlight:false,
      cta:{label:"Get started →",href:"https://github.com/ashishodu2023/TideVec"},
      items:["pip install gettidevec","Unlimited vectors (self-hosted)",
        "TVIndex + CausalEdge","Python/Go/Java/C++ SDKs",
        "REST + gRPC API","Docker CPU/GPU/TPU","Apache 2.0"],
    },
    { name:"Pro", price:"$49", priceSub:"/seat/mo",
      sub:"Hosted cloud, GPU search, observability.",
      highlight:true, badge:"Most popular",
      items:["Everything in Free","Hosted cloud",
        "GPU CAGRA search","RetrievalTrace (OTel)",
        "Prometheus + Grafana","RS(10,4) 11-nines","Slack alerts"],
    },
    { name:"Enterprise", price:"Custom", sub:"VPC, SSO, SLA, dedicated support.",
      highlight:false,
      cta:{label:"Talk to us",href:"mailto:contact@gettidevec.com?subject=Enterprise"},
      items:["Everything in Pro","VPC / on-prem","SSO / SAML",
        "Raft 5-node cluster","Custom retention","SLA","Dedicated Slack"],
    },
  ];

  return (
    <section id="pricing" style={{
      background:C.bgAlt, borderTop:`1px solid ${C.border}`,
      padding:"80px 24px",
    }}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <Label>💳 Pricing</Label>
        <h2 style={{
          fontFamily:F.display,
          fontSize:"clamp(28px,3vw,42px)",
          fontWeight:800, letterSpacing:"-0.03em",
          color:C.ink, marginBottom:12,
        }}>
          Start free.{" "}
          <span style={{color:C.blue}}>Scale with your vectors.</span>
        </h2>
        <p style={{fontSize:16,color:C.body,marginBottom:48,lineHeight:1.8}}>
          No credit card for free tier. Pro activates immediately after PayPal payment.
        </p>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
          {plans.map((p,i)=>(
            <div key={i} style={{
              background: p.highlight
                ? `linear-gradient(160deg,${C.blue},${C.indigo})`
                : "#fff",
              border:`1.5px solid ${p.highlight?C.blue:C.border}`,
              borderRadius:16, overflow:"hidden",
              display:"flex", flexDirection:"column",
              boxShadow: p.highlight
                ? `0 20px 50px rgba(37,99,235,0.3)`
                : `0 4px 16px rgba(37,99,235,0.07)`,
            }}>
              {p.badge && (
                <div style={{
                  background:"rgba(255,255,255,0.15)",color:"#fff",
                  textAlign:"center",padding:"6px",
                  fontSize:11,fontWeight:700,letterSpacing:"0.08em",fontFamily:F.mono,
                }}>{p.badge}</div>
              )}
              <div style={{padding:"28px 28px 20px"}}>
                <div style={{fontSize:13,fontWeight:600,
                  color:p.highlight?"rgba(255,255,255,0.7)":C.muted,marginBottom:8}}>
                  {p.name}
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:6}}>
                  <span style={{
                    fontFamily:F.mono, fontSize:38, fontWeight:800,
                    color:p.highlight?"#fff":C.ink,letterSpacing:"-0.03em",
                  }}>{p.price}</span>
                  {p.priceSub&&(
                    <span style={{fontSize:13,color:p.highlight?"rgba(255,255,255,0.6)":C.muted}}>
                      {p.priceSub}
                    </span>
                  )}
                </div>
                <div style={{fontSize:13,color:p.highlight?"rgba(255,255,255,0.7)":C.muted,marginBottom:24}}>
                  {p.sub}
                </div>

                {p.highlight ? (
                  showCheckout ? (
                    <div style={{background:"#fff",borderRadius:10,padding:"16px"}}>
                      <div style={{fontSize:13,color:C.muted,marginBottom:8,textAlign:"center"}}>
                        Contact us to start Pro
                      </div>
                      <a href="mailto:contact@gettidevec.com?subject=TideVec Pro"
                        style={{
                          display:"block",textAlign:"center",
                          background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
                          color:"#fff",padding:"10px",borderRadius:8,
                          fontWeight:700,fontSize:14,
                        }}>Email us →</a>
                      <button onClick={()=>setShowCheckout(false)} style={{
                        display:"block",width:"100%",
                        background:"none",border:"none",
                        color:C.muted,fontSize:12,marginTop:8,cursor:"pointer",
                      }}>← Back</button>
                    </div>
                  ) : (
                    <button onClick={()=>setShowCheckout(true)} style={{
                      display:"block",width:"100%",textAlign:"center",
                      background:"#fff",color:C.blue,
                      padding:"11px",borderRadius:9,
                      fontWeight:800,fontSize:14,border:"none",cursor:"pointer",
                      boxShadow:"0 4px 15px rgba(255,255,255,0.3)",
                      transition:"transform 0.15s",
                    }}
                      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
                      onMouseLeave={e=>e.currentTarget.style.transform=""}
                    >Start Pro — Pay with PayPal →</button>
                  )
                ) : (
                  <a href={p.cta.href} style={{
                    display:"block",textAlign:"center",
                    background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
                    color:"#fff",padding:"10px",borderRadius:8,
                    fontWeight:700,fontSize:14,
                    transition:"opacity 0.15s",
                  }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="1"}
                  >{p.cta.label}</a>
                )}
              </div>

              {!showCheckout && (
                <div style={{
                  padding:"0 28px 28px", paddingTop:20, flex:1,
                  borderTop:`1px solid ${p.highlight?"rgba(255,255,255,0.15)":C.border}`,
                }}>
                  {p.items.map((item,j)=>(
                    <div key={j} style={{
                      display:"flex",gap:8,fontSize:13,
                      color:p.highlight?"rgba(255,255,255,0.85)":C.body,
                      marginBottom:9,
                    }}>
                      <span style={{
                        color:p.highlight?"#93c5fd":"#16a34a",
                        fontWeight:700,flexShrink:0,
                      }}>✓</span>{item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:20}}>
          Cancel anytime · <a href="mailto:contact@gettidevec.com"
            style={{color:C.blue,fontWeight:600}}>contact@gettidevec.com</a>
        </p>
      </div>
    </section>
  );
}

/* ── CTA ───────────────────────────────────────────────────────── */
function CTA() {
  return (
    <section style={{
      background:`linear-gradient(135deg,${C.bgDeep} 0%,#0f172a 100%)`,
      padding:"80px 24px", textAlign:"center", position:"relative",
      overflow:"hidden",
    }}>
      {/* Decorative dots */}
      {[...Array(20)].map((_,i)=>(
        <div key={i} style={{
          position:"absolute",
          left:`${Math.random()*100}%`,
          top:`${Math.random()*100}%`,
          width: 2+Math.random()*3,
          height: 2+Math.random()*3,
          borderRadius:"50%",
          background:[C.blue,C.cyan,C.indigo,"#8b5cf6"][i%4],
          opacity:0.3+Math.random()*0.4,
          animation:`float ${3+Math.random()*4}s ease-in-out infinite`,
          animationDelay:`${Math.random()*4}s`,
        }}/>
      ))}

      <div style={{maxWidth:600,margin:"0 auto",position:"relative",zIndex:1}}>
        <h2 style={{
          fontFamily:F.display,
          fontSize:"clamp(28px,4vw,44px)",
          fontWeight:800, color:"#fff",
          marginBottom:16, letterSpacing:"-0.02em",
        }}>
          Ready to ship time-aware retrieval?
        </h2>
        <p style={{
          fontSize:17, color:"rgba(255,255,255,0.65)",
          marginBottom:36, lineHeight:1.8,
        }}>
          Apache 2.0. Free to self-host. GPU kernels, WAL,
          gRPC, REST, Python/Go/Java/C++ all included.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <a href="https://github.com/ashishodu2023/TideVec" style={{
            background:"#fff", color:C.blue,
            padding:"13px 30px", borderRadius:9,
            fontWeight:800, fontSize:15,
            boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
            transition:"transform 0.15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
            onMouseLeave={e=>e.currentTarget.style.transform=""}
          >⭐ Star on GitHub</a>
          <a href="/docs" style={{
            background:"rgba(255,255,255,0.1)",color:"#fff",
            padding:"13px 30px",borderRadius:9,
            fontWeight:700,fontSize:15,
            border:"1.5px solid rgba(255,255,255,0.25)",
            transition:"background 0.15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
          >Read the docs</a>
        </div>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:20}}>
          Part of the{" "}
          <a href="https://getcortexops.com"
            style={{color:"rgba(255,255,255,0.6)",textDecoration:"underline"}}>
            Cortex Platform
          </a>
          {" "}· CortexOps (observability) + TideVec (vector storage)
        </p>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{background:"#fff",borderTop:`1px solid ${C.border}`,padding:"48px 24px 32px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{
          display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",
          gap:40, marginBottom:40,
        }}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
              <div style={{
                width:28,height:28,borderRadius:7,
                background:`linear-gradient(135deg,${C.blue},${C.cyan})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"#fff",fontWeight:900,fontSize:14,fontFamily:F.mono,
              }}>C</div>
              <span style={{
                fontFamily:F.display,fontWeight:800,fontSize:17,
                background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              }}>TideVec</span>
            </div>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:10}}>
              The vector database that knows what time it is.
              Temporal decay, causal graph, 11-nines durability.
            </p>
            <p style={{fontSize:12,color:C.mutedLt}}>Apache 2.0 · Built by Ashish Verma</p>
          </div>

          {[
            {title:"Product",links:[["Search","#search"],["Features","#features"],["Compare","#compare"],["Pricing","#pricing"]]},
            {title:"Developers",links:[["GitHub","https://github.com/ashishodu2023/TideVec"],["PyPI (gettidevec)","https://pypi.org/project/gettidevec"],["Docker Hub","https://hub.docker.com/r/averm004/tidevec"],["Docs","/docs"]]},
            {title:"Company",links:[["Contact","mailto:contact@gettidevec.com"],["CortexOps","https://getcortexops.com"],["LinkedIn","https://www.linkedin.com/in/ashishodu2023/"]]},
          ].map(col=>(
            <div key={col.title}>
              <div style={{
                fontSize:11,fontWeight:700,color:C.muted,
                letterSpacing:"0.1em",marginBottom:14,
                fontFamily:F.mono,textTransform:"uppercase",
              }}>{col.title}</div>
              {col.links.map(([label,href])=>(
                <a key={label} href={href} style={{
                  display:"block",fontSize:13,
                  color:C.body,marginBottom:9,
                  transition:"color 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.color=C.blue}
                  onMouseLeave={e=>e.currentTarget.style.color=C.body}
                >{label}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop:`1px solid ${C.border}`,paddingTop:24,
          display:"flex",justifyContent:"space-between",alignItems:"center",
        }}>
          <span style={{fontSize:12,color:C.muted}}>
            © 2026 TideVec · Apache 2.0 · Built by{" "}
            <a href="https://github.com/ashishodu2023"
              style={{color:C.blue,fontWeight:600}}>Ashish Verma</a>
          </span>
          <span style={{fontSize:12,color:C.muted}}>
            Part of the{" "}
            <a href="https://getcortexops.com"
              style={{color:C.blue,fontWeight:600}}>Cortex Platform</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ── Root ──────────────────────────────────────────────────────── */
export default function App() {
  return (
    <div style={{background:"#fff",color:C.ink,fontFamily:F.sans,minHeight:"100vh"}}>
      <style>{GLOBAL_CSS}</style>
      <Navbar/>
      <AnnouncementBar/>
      <Hero/>
      <HowItWorks/>
      <SearchSection/>
      <Features/>
      <Compare/>
      <Pricing/>
      <CTA/>
      <Footer/>
    </div>
  );
}
