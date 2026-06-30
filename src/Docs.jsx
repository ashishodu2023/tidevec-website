import { useState, useEffect } from "react";

const C = {
  primary:   "#2563eb",   // was indigo #4f46e5 — now TideVec blue, matches App.jsx
  accent:    "#06b6d4",   // was violet #7c3aed — now TideVec cyan
  secondary: "#06b6d4",   // was sky #0ea5e9 — unified with cyan accent
  bg:        "#ffffff",   // was #f0f4ff (light indigo wash) — now pure white like App.jsx
  bgAlt:     "#f8faff",
  bgCode:    "#0d1117",   // was deep indigo #1e1b4b — now App.jsx's GitHub-dark code bg
  bgCodeBar: "#161b22",   // was #2d2a6e — matches App.jsx terminal bar
  ink:       "#0f172a",   // was deep indigo #1e1b4b — now App.jsx ink
  body:      "#374151",
  muted:     "#6b7280",
  border:    "#e2e8f0",   // was indigo-tinted #c7d2fe — now App.jsx neutral border
  borderLt:  "#f1f5f9",   // was #e0e7ff
  primaryLt: "#dbeafe",   // was #e0e7ff — now App.jsx blueLt
  green:     "#059669",
  greenLt:   "#d1fae5",
  amber:     "#f59e0b",   // staleness/temporal accent, matches App.jsx
  amberLt:   "#fef3c7",
};
const F = {
  sans:"'Inter',-apple-system,sans-serif",
  mono:"'JetBrains Mono','Fira Code',monospace",
};

const SECTIONS = [
  { id:"quickstart",  label:"Quickstart" },
  { id:"docker",      label:"Docker" },
  { id:"python",      label:"Python SDK" },
  { id:"go",          label:"Go SDK" },
  { id:"java",        label:"Java SDK" },
  { id:"cpp",         label:"C++ SDK" },
  { id:"rest",        label:"REST API" },
  { id:"grpc",        label:"gRPC / proto" },
  { id:"algorithms",  label:"Search Algorithms" },
  { id:"durability",  label:"Durability & Raft" },
  { id:"temporal",    label:"Temporal Scoring" },
  { id:"causal",      label:"Causal Graph" },
  { id:"gpu",         label:"GPU & TPU" },
];

// ── Syntax highlighter — lightweight regex tokenizer, GitHub Dark palette ──
// Matches the same color scheme already used in App.jsx's terminal demo.
const TOKEN_COLOR = {
  comment: "#8b949e",
  string:  "#a5d6ff",
  keyword: "#ff7b72",
  func:    "#d2a8ff",
  number:  "#79c0ff",
  type:    "#ffa657",
  builtin: "#79c0ff",
  op:      "#c9d1d9",
  plain:   "#c9d1d9",
};

const KEYWORDS = {
  python: ["from","import","def","class","return","if","else","elif","for","while",
    "in","not","and","or","is","None","True","False","try","except","finally",
    "with","as","yield","lambda","pass","break","continue","raise","async","await","self"],
  go: ["package","import","func","return","if","else","for","range","var","const",
    "type","struct","interface","map","chan","go","defer","select","switch","case",
    "default","nil","true","false","err","make","new"],
  java: ["public","private","protected","static","final","class","interface","extends",
    "implements","new","return","if","else","for","while","try","catch","finally",
    "throw","throws","void","this","super","null","true","false","import","package",
    "record","var"],
  cpp: ["include","namespace","class","struct","public","private","protected","return",
    "if","else","for","while","const","static","void","int","float","double","bool",
    "auto","using","template","typename","true","false","nullptr","new","delete"],
  bash: ["docker","run","build","cd","mkdir","git","clone","pip","install","python",
    "echo","export","curl","cmake","make"],
  xml:  [],
  text: [],
};

function highlightLine(line, lang) {
  // Comments — full line takeover
  const commentMarkers = { python:"#", bash:"#", go:"//", java:"//", cpp:"//", xml:"<!--" };
  const marker = commentMarkers[lang];
  if (marker && line.trim().startsWith(marker)) {
    return <span style={{color:TOKEN_COLOR.comment}}>{line}</span>;
  }

  // XML/tags — highlight angle brackets and attribute names
  if (lang === "xml") {
    const parts = line.split(/(<\/?[\w.-]+|>|\/>)/g);
    return parts.map((p, i) => {
      if (/^<\/?[\w.-]+$/.test(p)) return <span key={i} style={{color:TOKEN_COLOR.keyword}}>{p}</span>;
      if (p === ">" || p === "/>") return <span key={i} style={{color:TOKEN_COLOR.op}}>{p}</span>;
      return <span key={i} style={{color:TOKEN_COLOR.plain}}>{p}</span>;
    });
  }

  const kws = KEYWORDS[lang] || [];
  // Tokenize: strings, numbers, words, punctuation/whitespace
  const tokenRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  const out = [];
  let m, i = 0;
  while ((m = tokenRe.exec(line)) !== null) {
    const [, str, num, word, ws, sym] = m;
    if (str !== undefined) {
      out.push(<span key={i++} style={{color:TOKEN_COLOR.string}}>{str}</span>);
    } else if (num !== undefined) {
      out.push(<span key={i++} style={{color:TOKEN_COLOR.number}}>{num}</span>);
    } else if (word !== undefined) {
      const isKw = kws.includes(word);
      const isCall = line[m.index + word.length] === "(";
      const isType = /^[A-Z]/.test(word) && !isKw;
      const color = isKw ? TOKEN_COLOR.keyword
        : isCall ? TOKEN_COLOR.func
        : isType ? TOKEN_COLOR.type
        : TOKEN_COLOR.plain;
      out.push(<span key={i++} style={{color}}>{word}</span>);
    } else if (ws !== undefined) {
      out.push(ws);
    } else if (sym !== undefined) {
      out.push(<span key={i++} style={{color:TOKEN_COLOR.op}}>{sym}</span>);
    }
  }
  return out;
}

function Highlighted({ code, lang }) {
  const lines = code.split("\n");
  return lines.map((line, idx) => (
    <div key={idx}>{line.length ? highlightLine(line, lang) : "\u00a0"}</div>
  ));
}

function Code({ lang, children }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background:C.bgCode, borderRadius:10,
      border:"1px solid #21262d", overflow:"hidden",
      marginBottom:24,
    }}>
      <div style={{
        background:C.bgCodeBar, padding:"9px 16px",
        borderBottom:"1px solid #21262d",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{color:"#8b949e",fontSize:11,fontFamily:F.mono}}>{lang}</span>
        <button onClick={()=>{navigator.clipboard.writeText(children.trim());setCopied(true);setTimeout(()=>setCopied(false),2000);}}
          style={{
            background:"none", border:"1px solid #30363d",
            color:copied?"#34d399":"#06b6d4",
            borderRadius:5, padding:"2px 10px", cursor:"pointer",
            fontSize:11, fontFamily:F.mono, transition:"color 0.2s",
          }}>{copied?"✓ copied":"copy"}</button>
      </div>
      <pre style={{
        margin:0, padding:"18px 20px",
        fontFamily:F.mono, fontSize:13, lineHeight:1.85,
        color:"#c9d1d9", overflowX:"auto", whiteSpace:"pre",
      }}><Highlighted code={children.trim()} lang={lang}/></pre>
    </div>
  );
}

function H2({ id, children }) {
  return (
    <h2 id={id} style={{
      fontSize:26, fontWeight:800, color:C.ink,
      letterSpacing:"-0.02em", marginBottom:12, marginTop:48,
      paddingTop:16,
      borderTop:`2px solid ${C.borderLt}`,
    }}>
      <a href={`#${id}`} style={{textDecoration:"none",color:"inherit"}}>{children}</a>
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3 style={{
      fontSize:18, fontWeight:700, color:C.ink,
      marginBottom:10, marginTop:28,
    }}>{children}</h3>
  );
}

function P({ children }) {
  return <p style={{fontSize:15,color:C.body,lineHeight:1.8,marginBottom:16}}>{children}</p>;
}

function Note({ children }) {
  return (
    <div style={{
      background:C.primaryLt, border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${C.primary}`,
      borderRadius:8, padding:"14px 18px", marginBottom:20,
      fontSize:14, color:C.ink, lineHeight:1.7,
    }}>💡 {children}</div>
  );
}

export default function Docs() {
  const [active, setActive] = useState("quickstart");

  useEffect(()=>{
    const hash = window.location.hash.replace("#","");
    if(hash) setActive(hash);
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setActive(e.target.id); });
    },{rootMargin:"-20% 0px -70% 0px"});
    SECTIONS.forEach(s=>{ const el=document.getElementById(s.id); if(el) obs.observe(el); });
    return ()=>obs.disconnect();
  },[]);

  return (
    <div style={{background:C.bg,fontFamily:F.sans,minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#ffffff;color:#0f172a;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;}
        a{color:inherit;text-decoration:none;}
        ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#bfdbfe;border-radius:3px;}
      `}</style>

      {/* Top nav */}
      <nav style={{
        position:"sticky",top:0,zIndex:100,
        background:"#fff",borderBottom:`1px solid ${C.border}`,
        padding:"0 32px",
      }}>
        <div style={{
          maxWidth:1200,margin:"0 auto",
          display:"flex",alignItems:"center",justifyContent:"space-between",height:56,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <a href="/" style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{
                width:28,height:28,borderRadius:7,
                background:`linear-gradient(135deg,${C.primary},${C.accent})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                color:"#fff",fontWeight:900,fontSize:14,fontFamily:F.mono,
              }}>T</div>
              <span style={{
                fontWeight:900,fontSize:17,letterSpacing:"-0.02em",
                background:`linear-gradient(135deg,${C.primary},${C.accent})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              }}>TideVec</span>
            </a>
            <span style={{color:C.border,fontSize:20}}>/</span>
            <span style={{fontSize:14,fontWeight:600,color:C.muted}}>Docs</span>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <a href="/" style={{fontSize:13,color:C.muted,fontWeight:500}}>← Back to site</a>
            <a href="https://github.com/ashishodu2023/TideVec"
              style={{
                background:`linear-gradient(135deg,${C.primary},${C.accent})`,
                color:"#fff",padding:"6px 14px",borderRadius:7,
                fontSize:12,fontWeight:700,
              }}>GitHub →</a>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"220px 1fr",gap:0}}>

        {/* Sidebar */}
        <aside style={{
          position:"sticky",top:56,height:"calc(100vh - 56px)",
          overflowY:"auto",
          borderRight:`1px solid ${C.border}`,
          padding:"24px 0",background:"#fff",
        }}>
          <div style={{padding:"0 16px 12px",fontSize:11,fontWeight:700,
            color:C.muted,letterSpacing:"0.1em",fontFamily:F.mono}}>
            CONTENTS
          </div>
          {SECTIONS.map(s=>(
            <a key={s.id} href={`#${s.id}`}
              onClick={()=>setActive(s.id)}
              style={{
                display:"block",padding:"8px 20px",
                fontSize:14,fontWeight:active===s.id?700:400,
                color:active===s.id?C.primary:C.body,
                background:active===s.id?C.primaryLt:"transparent",
                borderLeft:active===s.id?`3px solid ${C.primary}`:"3px solid transparent",
                transition:"all 0.15s",
              }}
            >{s.label}</a>
          ))}
        </aside>

        {/* Main content */}
        <main style={{padding:"40px 56px 80px",maxWidth:800}}>

          <div style={{marginBottom:32}}>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:6,
              background:C.primaryLt,color:C.primary,
              padding:"4px 12px",borderRadius:20,
              fontSize:11,fontWeight:700,letterSpacing:"0.1em",
              fontFamily:F.mono,marginBottom:12,
            }}>📚 DOCUMENTATION</div>
            <h1 style={{
              fontSize:36,fontWeight:800,color:C.ink,
              letterSpacing:"-0.03em",marginBottom:12,
            }}>TideVec Docs</h1>
            <P>Complete reference for TideVec — the temporally-aware causal vector database.
              C++20 core, Python/Go/Java/C++ SDKs, GPU CAGRA, RS(10,4) 11-nines durability.</P>
          </div>

          {/* ── QUICKSTART ── */}
          <H2 id="quickstart">Quickstart</H2>
          <P>Get TideVec running and execute your first temporal vector search in under 2 minutes.</P>

          <H3>1. Start the server</H3>
          <Code lang="bash">{`
# Docker (fastest — no build required)
docker run -p 6399:6399 averm004/tidevec:latest

# Or build from source (requires GCC 12+ and CMake 3.20+)
git clone https://github.com/ashishodu2023/TideVec
cd TideVec && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./tidevec-server --host 0.0.0.0 --port 6399
          `}</Code>

          <H3>2. Install Python SDK</H3>
          <Code lang="bash">{`pip install tidevec-py`}</Code>

          <H3>3. Run your first search</H3>
          <Code lang="python">{`
from tidevec import TideVec, HalfLife

# Connect
db = TideVec("localhost:6399")

# Create a collection with 7-day temporal decay
db.create_collection("docs",
    dim=768,
    half_life_ms=HalfLife.ONE_WEEK,   # fresh vectors rank higher
    temporal_blend=0.3)               # 70% semantic + 30% recency

# Upsert a vector
db.upsert("docs", [{
    "id":        "policy_v2",
    "embedding": [0.1, 0.2, ...],     # your 768-dim embedding
    "payload":   {"source": "confluence", "team": "platform"},
    "edges":     [{"target_id": "policy_v1", "type": "UPDATES", "weight": 0.95}],
}])

# Search — fresh vectors automatically rank higher
for hit in db.search("docs", query_embedding, top_k=10, temporal_blend=0.3):
    print(f"{hit.id}  score={hit.score:.4f}  temporal={hit.temporal_score:.3f}")
    if hit.staleness_warning:
        print(f"  ⚠  {hit.staleness_reason}")
          `}</Code>

          <Note>The <code style={{fontFamily:F.mono,fontSize:13}}>temporal_blend=0.3</code> means results are 70% semantic similarity + 30% recency. Set to 0.0 for pure vector search.</Note>

          {/* ── DOCKER ── */}
          <H2 id="docker">Docker</H2>
          <P>Three pre-built images for CPU, GPU (NVIDIA CUDA), and TPU (Google XLA).</P>

          <H3>CPU (any machine)</H3>
          <Code lang="bash">{`
docker run -p 6399:6399 -v $(pwd)/data:/data \\
  averm004/tidevec:cpu
          `}</Code>

          <H3>GPU (NVIDIA, requires nvidia-container-toolkit)</H3>
          <Code lang="bash">{`
docker run --gpus all -p 6399:6399 -v $(pwd)/data:/data \\
  averm004/tidevec:gpu
          `}</Code>

          <H3>Full observability stack</H3>
          <Code lang="bash">{`
git clone https://github.com/ashishodu2023/TideVec
docker compose -f docker/docker-compose.yml up

# Services:
# TideVec   → http://localhost:6399
# Prometheus → http://localhost:9090
# Grafana    → http://localhost:3000  (admin/tidevec)
# Jaeger     → http://localhost:16686
          `}</Code>

          <H3>Environment variables</H3>
          <Code lang="bash">{`
TIDEVEC_PORT=6399          # REST API port
TIDEVEC_GRPC_PORT=6400     # gRPC port
TIDEVEC_DATA_DIR=./data    # data directory
TIDEVEC_THREADS=8          # worker threads
TIDEVEC_DEVICE=auto        # auto | cpu | gpu | tpu
TIDEVEC_API_KEY=           # empty = no auth
          `}</Code>

          {/* ── PYTHON ── */}
          <H2 id="python">Python SDK</H2>
          <Code lang="bash">{`pip install tidevec-py`}</Code>

          <H3>HalfLife presets</H3>
          <Code lang="python">{`
from tidevec import HalfLife

HalfLife.ONE_HOUR   # 3,600,000 ms — agent sessions
HalfLife.ONE_DAY    # 86,400,000 ms — news feeds
HalfLife.ONE_WEEK   # 604,800,000 ms — support tickets
HalfLife.ONE_MONTH  # 2,592,000,000 ms — documents (default)
HalfLife.ONE_YEAR   # 31,536,000,000 ms — long-term knowledge
          `}</Code>

          <H3>Search modes</H3>
          <Code lang="python">{`
# Standard ANN with temporal scoring
results = db.search("docs", query, top_k=10, temporal_blend=0.3)

# Causal expansion — results + their causal neighbours
results = db.search("docs", query, mode="causal_expand", causal_hops=2)

# Contradiction detection
results = db.search("docs", query, mode="contradiction_check")
for hit in results:
    if hit.contradicted_by:
        print(f"{hit.id} contradicted by {hit.contradicted_by}")

# GPU batch search
responses = db.batch_search("docs",
    query_vectors=[q1, q2, q3],
    top_k=5, device="gpu")

# Async client
import asyncio
from tidevec import AsyncTideVec

async def main():
    async with AsyncTideVec("localhost:6399") as db:
        results = await db.search("docs", query)
asyncio.run(main())
          `}</Code>

          <H3>Causal edges</H3>
          <Code lang="python">{`
db.add_edges("docs", [
    {"src":"policy_v2","tgt":"policy_v1","type":"UPDATES",     "weight":0.95},
    {"src":"fact_a",   "tgt":"fact_b",   "type":"CONTRADICTS", "weight":0.88},
    {"src":"doc_1",    "tgt":"doc_2",    "type":"CAUSES",      "weight":0.75},
])

# Edge types: CAUSES | CONTRADICTS | UPDATES | RELATED_TO | ENTITY_OF | SUPPORTS
          `}</Code>

          {/* ── GO ── */}
          <H2 id="go">Go SDK</H2>
          <Code lang="bash">{`go get github.com/ashishodu2023/tidevec/sdk/go`}</Code>
          <Code lang="go">{`
import "github.com/ashishodu2023/tidevec/sdk/go/tidevec"

db, err := tidevec.New("localhost:6399")
if err != nil { log.Fatal(err) }
defer db.Close()

// Create collection
err = db.CreateCollection(ctx, tidevec.CollectionConfig{
    Name:          "docs",
    Dim:           768,
    HalfLifeMs:    tidevec.HalfLifeOneWeek,
    TemporalBlend: 0.3,
})

// Upsert
err = db.Upsert(ctx, "docs", []tidevec.Vector{{
    ID:        "v1",
    Embedding: embedding,
    Payload:   map[string]string{"src": "wiki"},
    Edges: []tidevec.CausalEdge{{
        TargetID: "v0", Type: tidevec.EdgeUpdates, Weight: 0.9,
    }},
}})

// Search
resp, err := db.Search(ctx, "docs", tidevec.SearchRequest{
    Vector:        queryEmbedding,
    TopK:          10,
    TemporalBlend: 0.3,
    Mode:          tidevec.ModeCausalExpand,
    Device:        tidevec.DeviceGPU,
})
for _, hit := range resp.Hits {
    fmt.Printf("%s  score=%.4f  temporal=%.3f\n",
        hit.ID, hit.Score, hit.TemporalScore)
}
          `}</Code>

          {/* ── JAVA ── */}
          <H2 id="java">Java SDK</H2>
          <Code lang="xml">{`
<dependency>
  <groupId>io.tidevec</groupId>
  <artifactId>tidevec-java</artifactId>
  <version>0.1.0</version>
</dependency>
          `}</Code>
          <Code lang="java">{`
import io.tidevec.TideVecClient;
import io.tidevec.TideVecClient.*;

try (TideVecClient db = TideVecClient
        .builder("localhost", 6399).build()) {

    // Create collection
    db.createCollection(CollectionConfig.builder("docs")
        .dim(768)
        .halfLifeMs(HalfLife.ONE_WEEK)
        .temporalBlend(0.3f)
        .build());

    // Upsert
    db.upsert("docs", List.of(
        Vector.builder("v1", embedding)
            .payload("source", "confluence")
            .edge("v0", EdgeType.UPDATES, 0.95f)
            .build()));

    // Search
    SearchResponse resp = db.search("docs",
        SearchRequest.builder(queryEmbedding)
            .topK(10)
            .temporalBlend(0.3f)
            .mode(QueryMode.CAUSAL_EXPAND)
            .includeStalenessWarnings(true)
            .build());

    for (SearchHit hit : resp.getHits())
        System.out.printf("%s  score=%.4f%n",
            hit.getId(), hit.getScore());
}
          `}</Code>

          {/* ── C++ ── */}
          <H2 id="cpp">C++ SDK</H2>
          <P>TideVec is written in C++20. The native C++ API gives full access to all internal components.</P>
          <Code lang="cpp">{`
#include <tidevec/accelerator/accelerated_collection.hpp>

tidevec::AcceleratedCollection::Config cfg;
cfg.durable.name = "docs";
cfg.durable.dim  = 768;
cfg.durable.temporal.half_life_ms   = 604'800'000; // 1 week
cfg.durable.temporal.temporal_blend = 0.3f;
cfg.accel.preferred = tidevec::accel::DeviceType::GPU;

tidevec::AcceleratedCollection db(cfg);

// Upsert
tidevec::CortexVector v("v1", embedding);
v.payload["source"] = "confluence";
v.add_edge("v0", tidevec::EdgeType::UPDATES, 0.95f);
db.upsert(v);

// Search
tidevec::QueryOptions opts;
opts.top_k         = 10;
opts.temporal_blend= 0.3f;
opts.mode          = tidevec::QueryMode::CAUSAL_EXPAND;

tidevec::RetrievalTrace trace;
auto results = db.search(query_embedding, opts, &trace);

for (const auto& r : results)
    std::cout << r.id << "  score=" << r.score
              << "  temporal=" << r.temporal_score << "\\n";

// Print GPU/TPU device info
db.print_device_info();
          `}</Code>

          {/* ── REST API ── */}
          <H2 id="rest">REST API</H2>
          <P>Full HTTP/1.1 REST API on port 6399. All endpoints return JSON.</P>

          <H3>Create collection</H3>
          <Code lang="bash">{`
curl -X POST http://localhost:6399/v1/collections \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name":          "docs",
    "dim":           768,
    "index_type":    "tvindex",
    "n_shards":      4,
    "n_replicas":    1,
    "temporal": {
      "half_life_ms":    604800000,
      "temporal_blend":  0.3
    }
  }'
          `}</Code>

          <H3>Upsert vectors</H3>
          <Code lang="bash">{`
curl -X POST http://localhost:6399/v1/collections/docs/upsert \\
  -H 'Content-Type: application/json' \\
  -d '{
    "vectors": [{
      "id":        "policy_v2",
      "embedding": [0.1, 0.2, ...],
      "payload":   {"source": "confluence"},
      "edges":     [{"target_id":"policy_v1","type":"UPDATES","weight":0.95}]
    }]
  }'
          `}</Code>

          <H3>Search</H3>
          <Code lang="bash">{`
curl -X POST http://localhost:6399/v1/collections/docs/search \\
  -H 'Content-Type: application/json' \\
  -d '{
    "vector":         [0.1, 0.2, ...],
    "top_k":          10,
    "temporal_blend": 0.3,
    "mode":           "causal_expand",
    "include_trace":  true
  }'
          `}</Code>

          <H3>All endpoints</H3>
          <Code lang="text">{`
GET    /health                              server status
GET    /v1/info                             feature manifest
GET    /metrics                             Prometheus metrics
GET    /v1/collections                      list collections
POST   /v1/collections                      create collection
GET    /v1/collections/{name}               get stats
DELETE /v1/collections/{name}               drop collection
POST   /v1/collections/{name}/upsert        upsert vectors
POST   /v1/collections/{name}/delete        delete by id
POST   /v1/collections/{name}/search        ANN search
POST   /v1/collections/{name}/edges         add causal edges
PUT    /v1/collections/{name}/temporal      update decay config
          `}</Code>

          {/* ── gRPC ── */}
          <H2 id="grpc">gRPC / proto</H2>
          <P>TideVec exposes a gRPC API on port 6400. The proto is the single source of truth for all 4 language SDKs.</P>
          <Code lang="bash">{`
# Generate stubs from proto
python -m grpc_tools.protoc \\
  -I proto \\
  --python_out=. \\
  --grpc_python_out=. \\
  proto/tidevec.proto

# Proto source:
# github.com/ashishodu2023/TideVec/blob/main/proto/tidevec.proto
          `}</Code>

          {/* ── ALGORITHMS ── */}
          <H2 id="algorithms">Search Algorithms</H2>
          <P>TideVec routes each query to the optimal algorithm based on batch size, hardware, and recall budget.</P>

          <H3>TVIndex — Modified HNSW (default)</H3>
          <P>HNSW with Ebbinghaus temporal decay baked into graph traversal scoring:</P>
          <Code lang="text">{`
final_score(v, q, t) = α · cosine(v, q) + β · exp(−λ · Δt / half_life)

where:
  α = 1 - temporal_blend  (semantic weight)
  β = temporal_blend       (recency weight)
  λ = decay constant
  Δt = time since vector was inserted
          `}</Code>

          <H3>GPU CAGRA</H3>
          <P>CUDA NN-Descent graph + warp-level beam search. 33–77× faster than HNSW at 95% recall. Each warp (32 CUDA threads) handles one query.</P>

          <H3>TPU XLA matmul</H3>
          <P>JIT-compiled XLA computation graph: <code style={{fontFamily:F.mono}}>S[B,N] = Q[B,D] × DB[D,N]ᵀ</code>. 100% recall, 2M QPS on TPU v5e pod.</P>

          <H3>CPU IVF</H3>
          <P>k-means Voronoi cells (nlist=1024, nprobe=64). Searches 6.25% of database at ~95% recall. 50K QPS on 64-core server.</P>

          <H3>Dispatch logic</H3>
          <Code lang="text">{`
batch_size ≥ 64  AND  GPU available  →  CAGRA warp beam search
batch_size ≥ 32  AND  TPU available  →  XLA matmul (exact, 100% recall)
recall_budget = 1.0                  →  FlatIndex (exact brute force)
N > 10M  AND  CPU-only               →  IVF (nprobe scan)
default                              →  TVIndex HNSW (temporal-aware)
          `}</Code>

          {/* ── DURABILITY ── */}
          <H2 id="durability">Durability & Raft</H2>

          <H3>RS(10,4) Erasure Coding — 11 nines</H3>
          <Code lang="text">{`
Reed-Solomon RS(10,4):
  14 total shards (10 data + 4 parity)
  Any 10 of 14 shards reconstruct original data
  Survives 4 simultaneous disk failures

Durability math (p_fail=0.004/year per disk):
  P(data loss) ≈ 1.7 × 10⁻¹¹ per year
  = 99.999999998% = 10.8 nines ≈ 11 nines

Storage overhead: 1.4× (vs 3× for 3-way replication)
          `}</Code>

          <H3>Raft Consensus — 9 nines availability</H3>
          <Code lang="text">{`
5-node Raft cluster:
  Tolerates 2 simultaneous leader failures
  Leader election < 150ms
  Linearisable reads (no stale reads possible)
  No split-brain ever (majority voting)

Availability math (p_node_down=0.001):
  P(≥3 of 5 down) ≈ 1 × 10⁻⁸
  = 99.999999% = 8 nines
  With multi-AZ: 9 nines
          `}</Code>

          <H3>WAL Group Commit</H3>
          <P>Batches up to 1,000 writes into a single fsync. At 10ms fsync latency: 1,000× throughput improvement over naive WAL.</P>

          {/* ── TEMPORAL ── */}
          <H2 id="temporal">Temporal Scoring</H2>

          <H3>Half-life presets</H3>
          <Code lang="python">{`
from tidevec import HalfLife

# Use case             half_life_ms
HalfLife.ONE_HOUR    # Agent session memory
HalfLife.ONE_DAY     # News / RSS feeds
HalfLife.ONE_WEEK    # Support tickets, Jira issues
HalfLife.ONE_MONTH   # Documentation (default)
HalfLife.ONE_YEAR    # Long-term knowledge base
          `}</Code>

          <H3>Custom decay</H3>
          <Code lang="python">{`
# Update temporal config on a live collection
db.set_temporal("docs",
    half_life_ms=86_400_000,    # 1 day
    temporal_blend=0.4)          # 40% recency weight
          `}</Code>

          <H3>Staleness warnings</H3>
          <Code lang="python">{`
results = db.search("docs", query,
    include_staleness_warnings=True)

for hit in results:
    if hit.staleness_warning:
        # temporal_score dropped below staleness_threshold
        print(f"⚠ {hit.id}: {hit.staleness_reason}")
        # e.g. "Vector is 45 days old (temporal_score=0.11)"
          `}</Code>

          {/* ── CAUSAL ── */}
          <H2 id="causal">Causal Graph</H2>

          <H3>Edge types</H3>
          <Code lang="text">{`
CAUSES       → A caused B to happen
CONTRADICTS  → A and B assert conflicting facts
UPDATES      → B is a newer version of A
RELATED_TO   → A and B are semantically related
ENTITY_OF    → A and B refer to the same entity
SUPPORTS     → A provides evidence for B
          `}</Code>

          <H3>Causal expansion</H3>
          <Code lang="python">{`
# Find vectors AND their causal neighbours up to 2 hops
results = db.search("docs", query,
    mode="causal_expand",
    causal_hops=2)

for hit in results:
    print(hit.id, hit.causal_neighbors)
          `}</Code>

          <H3>Contradiction detection</H3>
          <Code lang="python">{`
results = db.search("docs", query,
    mode="contradiction_check")

for hit in results:
    if hit.contradicted_by:
        print(f"{hit.id} is contradicted by {hit.contradicted_by}")
          `}</Code>

          {/* ── GPU ── */}
          <H2 id="gpu">GPU & TPU</H2>

          <H3>Build with CUDA</H3>
          <Code lang="bash">{`
# A100 / H100
cmake .. -DCMAKE_BUILD_TYPE=Release \\
         -DTIDEVEC_CUDA=ON \\
         -DCMAKE_CUDA_ARCHITECTURES="80;90"
make -j$(nproc)

# RTX 30/40 series
cmake .. -DTIDEVEC_CUDA=ON \\
         -DCMAKE_CUDA_ARCHITECTURES="86;89"
          `}</Code>

          <H3>Build with TPU (XLA)</H3>
          <Code lang="bash">{`
cmake .. -DCMAKE_BUILD_TYPE=Release \\
         -DTIDEVEC_XLA=ON
make -j$(nproc)
          `}</Code>

          <H3>Device selection</H3>
          <Code lang="python">{`
# Auto (dispatcher picks best available)
db.search("docs", query, device="auto")

# Force GPU
db.search("docs", query, device="gpu")

# Force TPU
db.search("docs", query, device="tpu")

# GPU batch (highest throughput)
db.batch_search("docs",
    query_vectors=[q1, q2, ..., q1000],
    top_k=10, device="gpu")
          `}</Code>

          <Note>
            GPU CAGRA is 33–77× faster than HNSW at 90–95% recall.
            TPU XLA matmul achieves 100% recall at 2M QPS on TPU v5e pod.
            The dispatcher automatically uses GPU when batch_size ≥ 64.
          </Note>

          {/* bottom nav */}
          <div style={{
            marginTop:60,paddingTop:24,
            borderTop:`1px solid ${C.border}`,
            display:"flex",justifyContent:"space-between",
          }}>
            <a href="/" style={{color:C.primary,fontSize:14,fontWeight:600}}>
              ← Back to gettidevec.com
            </a>
            <a href="https://github.com/ashishodu2023/TideVec"
              style={{color:C.primary,fontSize:14,fontWeight:600}}>
              View source on GitHub →
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}