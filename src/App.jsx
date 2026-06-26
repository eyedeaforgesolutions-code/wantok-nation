import { useState, useEffect, useCallback, useRef } from "react";

const storage = {
  async get(key) {
    try { return await window.storage.get(key); } catch {
      try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; }
    }
  },
  async set(key, value) {
    try { return await window.storage.set(key, value); } catch {
      try { localStorage.setItem(key, value); return { value }; } catch { return null; }
    }
  },
  async delete(key) {
    try { return await window.storage.delete(key); } catch {
      try { localStorage.removeItem(key); return { deleted: true }; } catch { return null; }
    }
  },
};

async function callAI(prompt, maxTokens = 800) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return (data.content?.map(b => b.text || "").join("") || "").replace(/```json[\s\S]*?```|```/g, "").trim();
}

const ai = {
  async analyseAlert(alert, user) {
    const ctx = user ? `User from ${user.homeProvince || "unknown"}, lives in ${user.residenceProvince || "unknown"}. Life connections: ${(user.connections || []).join(", ") || "none"}.` : "General PNG citizen.";
    try {
      return JSON.parse(await callAI(`You are the Wantok Nation intelligence engine for Papua New Guinea.
Alert: "${alert.headline}"
Summary: "${alert.summary}"
Province: ${alert.province}
User context: ${ctx}
Respond ONLY with valid JSON:
{"sections":[{"label":"What Happened","content":"2-3 precise factual sentences"},{"label":"The Full Picture","content":"2-3 sentences on broader significance"},{"label":"Who Is Affected","content":"2-3 sentences on which communities and how"}],"timeline":[{"period":"Right Now","text":"Immediate situation today"},{"period":"3 Months","text":"Near-term consequences"},{"period":"1 Year","text":"Medium-term impact"},{"period":"5 Years","text":"Long-term structural change for PNG"}],"personalNote":"One sentence on why this specifically matters to this user."}`, 1000));
    } catch { return null; }
  },
  async structureAlert(text, province, category) {
    try {
      return JSON.parse(await callAI(`You are the Wantok Nation editorial AI for Papua New Guinea.
Text: "${text}"
Province: ${province}
Category: ${category}
Respond ONLY with valid JSON:
{"headline":"Precise headline under 15 words","summary":"2-3 sentence factual summary","urgency":"CRITICAL|HIGH|MEDIUM|LOW","categoryLabel":"Short label","icon":"Single emoji"}`, 400));
    } catch { return { headline: text.slice(0, 80), summary: text, urgency: "MEDIUM", categoryLabel: "Community", icon: "📢" }; }
  },
  async analyseMp(mp) {
    try {
      return JSON.parse(await callAI(`You are the Wantok Nation MP intelligence engine for Papua New Guinea.
MP: ${mp.name}, ${mp.title}, ${mp.province}, ${mp.party}
Attendance: ${mp.attendance}%
Votes FOR: ${mp.votes.for}, AGAINST: ${mp.votes.against}, ABSENT: ${mp.votes.absent}
Key votes: ${mp.keyVotes?.map(v => `${v.bill}: ${v.vote}`).join("; ")}
Respond ONLY with valid JSON:
{"rating":"Strong|Good|Fair|Poor","summary":"2 sentences on performance","strength":"One specific strength","concern":"One specific concern","provinceImpact":"One sentence on province impact"}`, 500));
    } catch { return null; }
  },
  async landQuery(question) {
    try {
      return JSON.parse(await callAI(`You are the PNG land intelligence assistant. Question: "${question}"
Respond ONLY with valid JSON:
{"answer":"3-4 sentence plain language answer","legalBasis":"Relevant PNG law","nextSteps":["Step 1","Step 2","Step 3"],"warning":"Important caution or null"}`, 600));
    } catch { return null; }
  },
  async landAnalysis(record) {
    try {
      return JSON.parse(await callAI(`You are the PNG land registry intelligence engine.
Title: ${record.title}, Location: ${record.location}, Area: ${record.area}
Type: ${record.type}, Status: ${record.status}, Owner: ${record.owner}
Flag: ${record.flag || "None"}
Respond ONLY with valid JSON:
{"riskLevel":"High|Medium|Low","riskSummary":"2 sentences on risk","historicalContext":"1-2 sentences","affectedParties":"Who is affected","recommendation":"What to do now"}`, 600));
    } catch { return null; }
  },
  async publisherDraft(text, province, category) {
    try {
      return JSON.parse(await callAI(`You are the Wantok Nation editorial AI for PNG.
Text: "${text}", Province: ${province}, Category: ${category}
Respond ONLY with valid JSON:
{"headline":"Under 15 words","summary":"2-3 sentences","urgency":"CRITICAL|HIGH|MEDIUM|LOW","estimatedReach":12000,"matchedSegments":["Segment 1","Segment 2","Segment 3"],"editorialNote":"One sentence on significance"}`, 600));
    } catch { return null; }
  },
};

const PROVINCES = ["Central","Chimbu (Simbu)","Eastern Highlands","East New Britain","East Sepik","Enga","Gulf","Hela","Jiwaka","Madang","Manus","Milne Bay","Morobe","National Capital District","New Ireland","Northern (Oro)","Southern Highlands","West New Britain","Western","Western Highlands","West Sepik (Sandaun)","Bougainville (AROB)"];

const LIFE_CONNECTIONS = [
  { id:"schools", icon:"🎓", label:"Children's Schools", sub:"School alerts, safety, fees" },
  { id:"clinics", icon:"🏥", label:"Medical Clinics", sub:"Health facility alerts" },
  { id:"land", icon:"🌾", label:"Land Interests", sub:"Land registry, disputes" },
  { id:"business", icon:"🏢", label:"Business", sub:"Licensing, tax, regulations" },
  { id:"church", icon:"⛪", label:"Church / Community", sub:"LLG and community news" },
  { id:"parliament", icon:"🗳️", label:"Parliament / Politics", sub:"MP activity, bills" },
  { id:"mining", icon:"⛏️", label:"Industry / Mining", sub:"Resource project alerts" },
  { id:"family", icon:"👨‍👩‍👧", label:"Family Provinces", sub:"Where your family lives" },
];

const URGENCY_CFG = {
  CRITICAL: { color:"#E74C3C", bar:"#E74C3C" },
  HIGH:     { color:"#F39C12", bar:"#F39C12" },
  MEDIUM:   { color:"#3498DB", bar:"#3498DB" },
  LOW:      { color:"#27AE60", bar:"#27AE60" },
};

const CAT_COLORS = { land:"#F39C12", health:"#E74C3C", economy:"#27AE60", community:"#9B59B6", environment:"#1ABC9C", politics:"#F5A623" };

const G = {
  black:"#08090C", surface:"#131720", surface2:"#191E2A", surface3:"#1F2534",
  border:"rgba(212,168,67,.12)", borderL:"rgba(255,255,255,.06)",
  gold:"#D4A843", gold2:"#F0C060", red:"#E74C3C", green:"#27AE60", blue:"#2980B9",
  text:"#E0DCD4", muted:"#606878", mutedL:"#909AA8",
};

const NOTIF_CATEGORIES = [
  { id:"land", icon:"🌾", label:"Land & Property", sub:"Titles, disputes, boundaries" },
  { id:"health", icon:"🏥", label:"Health Alerts", sub:"Hospital supply, clinic closures" },
  { id:"politics", icon:"🗳️", label:"Parliament & Politics", sub:"Bills, votes, MP activity" },
  { id:"economy", icon:"💰", label:"Economy & Business", sub:"Budget, tax, licensing" },
  { id:"safety", icon:"🚨", label:"Safety & Crime", sub:"Police, emergency, disaster" },
  { id:"education", icon:"🎓", label:"Education", sub:"Schools, fees, closures" },
  { id:"environment", icon:"🌿", label:"Environment", sub:"Mining, climate, DEC" },
  { id:"community", icon:"⛪", label:"Community & Events", sub:"Church, LLG, festivals" },
];

const SEED_ALERTS = [
  { id:"a1", province:"Central", urgency:"CRITICAL", category:"land", categoryLabel:"Land Rights", icon:"🌾", headline:"Keith Iduhu files landmark petition — Motu-Koitabu land boundaries challenged in Parliament", summary:"A formal petition before the National Parliament's Land Committee challenges the 2019 boundary determination affecting an estimated 4,200 hectares of customary land across 12 clans in Central Province.", timeAgo:"4 min ago", reactions:1247, comments:386, shares:712, relevantTo:["Central","land","parliament"], verified:true, breaking:true },
  { id:"a2", province:"Morobe", urgency:"CRITICAL", category:"health", categoryLabel:"Health Alert", icon:"🏥", headline:"Lae General Hospital — Type O negative blood supply reaches zero", summary:"Morobe Provincial Health Authority confirms zero units of Type O negative remain. All elective surgeries postponed 72 hours. Blood drives confirmed at Lae Secondary School and Unitech today 10AM–4PM.", timeAgo:"22 min ago", reactions:2103, comments:891, shares:1847, relevantTo:["Morobe","clinics"], verified:true, breaking:true },
  { id:"a3", province:"National", urgency:"HIGH", category:"economy", categoryLabel:"Economy", icon:"💰", headline:"K850M supplementary budget passes Parliament — K200M to provincial health", summary:"Parliament passed the 2026 supplementary appropriation. Allocation: K200M health, K180M roads, K150M education, K120M disaster response. Warrant issuance within 30 days.", timeAgo:"1 hr ago", reactions:4891, comments:1203, shares:3344, relevantTo:["parliament","clinics","business"], verified:true, breaking:false },
  { id:"a4", province:"Eastern Highlands", urgency:"MEDIUM", category:"community", categoryLabel:"Community", icon:"🎉", headline:"Goroka Show 2026 — road closures confirmed for September 14–18", summary:"Eastern Highlands Provincial Administration has issued all required permits. Key routes affected: Highlands Highway Goroka bypass and Okuk Highway sections.", timeAgo:"2 hr ago", reactions:3210, comments:441, shares:2180, relevantTo:["Eastern Highlands","church","family"], verified:true, breaking:false },
  { id:"a5", province:"Western", urgency:"HIGH", category:"environment", categoryLabel:"Environment", icon:"🌿", headline:"Ok Tedi environmental review — 3 violations cited, consultation mandated", summary:"The Department of Environment and Conservation released findings from the 2025–26 Ok Tedi mine audit. Three violations cited relating to riverine tailings disposal. Community consultation mandated within 60 days.", timeAgo:"3 hr ago", reactions:987, comments:334, shares:621, relevantTo:["Western","mining","land"], verified:true, breaking:false },
  { id:"a6", province:"National Capital District", urgency:"MEDIUM", category:"politics", categoryLabel:"Parliament", icon:"🗳️", headline:"Public Service Amendment Bill 2026 tabled — implications for 80,000 public servants", summary:"The Minister for Public Service tabled the Amendment Bill. Key provisions: performance-based contract renewal, salary band restructuring, mandatory superannuation increases.", timeAgo:"5 hr ago", reactions:6234, comments:2109, shares:4401, relevantTo:["parliament","business"], verified:true, breaking:false },
  { id:"a7", province:"Hela", urgency:"HIGH", category:"health", categoryLabel:"Health", icon:"🏥", headline:"Tari General Hospital receives emergency medical supplies — first shipment in 4 months", summary:"PNG Health Department confirmed delivery of essential medicines to Tari General Hospital following 4-month supply disruption. Supplies cover only 6 weeks at current patient load.", timeAgo:"6 hr ago", reactions:1876, comments:567, shares:934, relevantTo:["Hela","clinics"], verified:true, breaking:false },
];

const SEED_MPs = [
  { id:"mp1", name:"James Marape", title:"Prime Minister", province:"Hela", party:"Pangu Pati", electorate:"Tari-Pori Open", attendance:94, votes:{for:142,against:8,absent:12}, lastActive:"Today", status:"active", keyVotes:[{bill:"Supplementary Budget 2026",vote:"FOR"},{bill:"Public Service Amendment",vote:"FOR"},{bill:"Land Act Review",vote:"AGAINST"}] },
  { id:"mp2", name:"Douglas Tomuriesa", title:"Deputy PM", province:"Western", party:"United Resources Party", electorate:"Fly River Governor", attendance:88, votes:{for:128,against:14,absent:20}, lastActive:"Today", status:"active", keyVotes:[{bill:"Supplementary Budget 2026",vote:"FOR"},{bill:"Ok Tedi Review Bill",vote:"FOR"},{bill:"Land Act Review",vote:"FOR"}] },
  { id:"mp3", name:"Rainbo Paita", title:"Minister for Finance", province:"Eastern Highlands", party:"Pangu Pati", electorate:"Kainantu Open", attendance:91, votes:{for:138,against:6,absent:18}, lastActive:"Yesterday", status:"active", keyVotes:[{bill:"Supplementary Budget 2026",vote:"FOR"},{bill:"Public Service Amendment",vote:"FOR"},{bill:"Mining Revenue Bill",vote:"FOR"}] },
  { id:"mp4", name:"Kessy Sawang", title:"Minister for Education", province:"East New Britain", party:"People's National Congress", electorate:"Open Bay Open", attendance:79, votes:{for:110,against:22,absent:30}, lastActive:"2 days ago", status:"watch", keyVotes:[{bill:"Education Funding Bill",vote:"FOR"},{bill:"School Fees Act",vote:"FOR"},{bill:"Public Service Amendment",vote:"ABSENT"}] },
  { id:"mp5", name:"Lino Tom", title:"Opposition Leader", province:"Madang", party:"People's Movement for Change", electorate:"Usino-Bundi Open", attendance:97, votes:{for:44,against:112,absent:6}, lastActive:"Today", status:"active", keyVotes:[{bill:"Supplementary Budget 2026",vote:"AGAINST"},{bill:"Public Service Amendment",vote:"AGAINST"},{bill:"Land Act Review",vote:"FOR"}] },
  { id:"mp6", name:"William Duma", title:"MP", province:"Western Highlands", party:"United Resources Party", electorate:"Hagen Open", attendance:72, votes:{for:98,against:28,absent:36}, lastActive:"1 week ago", status:"inactive", keyVotes:[{bill:"Highlands Highway Bill",vote:"FOR"},{bill:"Supplementary Budget 2026",vote:"ABSENT"},{bill:"Land Act Review",vote:"ABSENT"}] },
  { id:"mp7", name:"Sam Basil", title:"MP", province:"Morobe", party:"Wantok Party", electorate:"Bulolo Open", attendance:85, votes:{for:118,against:18,absent:26}, lastActive:"Yesterday", status:"active", keyVotes:[{bill:"Morobe Development Fund",vote:"FOR"},{bill:"Supplementary Budget 2026",vote:"FOR"},{bill:"Mining Revenue Bill",vote:"AGAINST"}] },
  { id:"mp8", name:"Justin Tkatchenko", title:"Minister for Foreign Affairs", province:"National Capital District", party:"Pangu Pati", electorate:"Moresby South Open", attendance:82, votes:{for:126,against:12,absent:24}, lastActive:"3 days ago", status:"watch", keyVotes:[{bill:"Pacific Agreement 2026",vote:"FOR"},{bill:"Supplementary Budget 2026",vote:"FOR"},{bill:"Public Service Amendment",vote:"ABSENT"}] },
];

const SEED_LAND = [
  { id:"l1", title:"State Lease Vol.24 Fol.88", location:"Motu-Koitabu, Central", area:"4,200 ha", type:"Customary", status:"DISPUTED", lastUpdated:"Today", flag:"Petition filed — Iduhu 2026/114", owner:"Motu-Koitabu LLG", registered:"1987-03-12" },
  { id:"l2", title:"State Lease Vol.31 Fol.12", location:"Waigani, NCD", area:"0.8 ha", type:"State Lease", status:"ACTIVE", lastUpdated:"2 days ago", flag:null, owner:"NCD Urban Dev Corp", registered:"2001-07-04" },
  { id:"l3", title:"Customary Land Reg. 2019/44C", location:"Goroka, Eastern Highlands", area:"840 ha", type:"Customary", status:"REVIEW", lastUpdated:"1 week ago", flag:"Boundary review initiated by DEC", owner:"Goroka Clans Collective", registered:"2019-11-20" },
  { id:"l4", title:"Mining Lease ML-2024-07W", location:"Tabubil, Western", area:"12,400 ha", type:"Mining Lease", status:"REVIEW", lastUpdated:"Today", flag:"Ok Tedi audit violation — review triggered", owner:"Ok Tedi Mining Ltd", registered:"2024-01-08" },
  { id:"l5", title:"State Lease Vol.18 Fol.203", location:"Lae, Morobe", area:"1.2 ha", type:"Commercial", status:"ACTIVE", lastUpdated:"3 days ago", flag:null, owner:"Lae Port Holdings Ltd", registered:"1998-05-15" },
  { id:"l6", title:"Customary Land Reg. 2021/88B", location:"Buka, Bougainville", area:"2,100 ha", type:"Customary", status:"ACTIVE", lastUpdated:"2 weeks ago", flag:null, owner:"Buka Clan Chiefs", registered:"2021-03-30" },
];

const TIERS = [
  { tier:"TOK SAVE", name:"Tok Save", meaning:"Must Know", price:"K0", period:"Forever free", features:["3 province connections","Basic push notifications","National-level alerts","24hr delay on deep analysis","Community read access"], featured:false },
  { tier:"WANTOK", name:"Wantok", meaning:"One of Us", price:"K15", period:"per month", features:["Unlimited province connections","Full Life Map","Real-time notifications","Full AI forensic depth","Family notification network","Comment, discuss, verify"], featured:true },
  { tier:"BIKMAN", name:"Bikman", meaning:"Leader / Decision Maker", price:"K45", period:"per month", features:["Everything in Wantok","Business intelligence layer","MP voting record tracker","Land dispute early warning","Custom keyword monitoring","Export & API access"], featured:false },
  { tier:"GAVMAN", name:"Gavman", meaning:"Government / NGO", price:"K200+", period:"custom pricing", features:["Verified publisher badge","Direct community broadcasts","Analytics dashboard","Bulk subscriber tools","Dedicated account manager","Priority SLA"], featured:false },
];

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#08090C;color:#E0DCD4;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(212,168,67,.2);border-radius:2px;}
button,input,select,textarea{font-family:'DM Sans',sans-serif;outline:none;}
@keyframes pulseRing{0%{transform:scale(.5);opacity:.6}100%{transform:scale(2.4);opacity:0}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes loadBar{from{width:0}to{width:100%}}
@keyframes hexPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
`;

function PulseDot({ color = G.gold }) {
  return (
    <span style={{ position:"relative", display:"inline-block", width:7, height:7, flexShrink:0 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color }} />
      <span style={{ position:"absolute", inset:-3, borderRadius:"50%", background:color, opacity:.4, animation:"pulseRing 1.8s ease-out infinite" }} />
    </span>
  );
}

function Spinner() {
  return <span style={{ width:13, height:13, border:"2px solid rgba(255,255,255,.07)", borderTopColor:G.gold, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0, display:"inline-block" }} />;
}

function Tag({ children, color = G.gold }) {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:2, fontFamily:"'Space Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:".09em", textTransform:"uppercase", color, background:`${color}12`, border:`1px solid ${color}40` }}>{children}</span>;
}

function Btn({ children, variant = "gold", onClick, style = {}, disabled = false }) {
  const [h, setH] = useState(false);
  const base = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 18px", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, letterSpacing:".04em", borderRadius:3, cursor:disabled?"not-allowed":"pointer", border:"none", transition:"all .18s", opacity:disabled?.4:1, ...style };
  if (variant==="gold") return <button disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{...base,background:h?G.gold2:G.gold,color:G.black}}>{children}</button>;
  if (variant==="ghost") return <button disabled={disabled} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{...base,background:"transparent",color:h?G.gold:G.mutedL,border:`1px solid ${h?"rgba(212,168,67,.4)":G.borderL}`}}>{children}</button>;
  if (variant==="danger") return <button disabled={disabled} onClick={onClick} style={{...base,background:"rgba(231,76,60,.1)",color:G.red,border:"1px solid rgba(231,76,60,.25)"}}>{children}</button>;
  return <button disabled={disabled} onClick={onClick} style={{...base,background:G.surface2,color:G.mutedL,border:`1px solid ${G.borderL}`}}>{children}</button>;
}

function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${G.borderL}` }}>
      <div>
        <div style={{ fontSize:13, color:G.text, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:G.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <button onClick={onChange} style={{ width:38, height:20, borderRadius:10, cursor:"pointer", background:value?G.gold:G.surface3, border:`1px solid ${value?G.gold:G.borderL}`, position:"relative", transition:"all .2s", flexShrink:0 }}>
        <div style={{ position:"absolute", top:3, left:value?20:3, width:14, height:14, borderRadius:"50%", background:value?G.black:G.muted, transition:"left .2s" }} />
      </button>
    </div>
  );
}

function StatBox({ value, label, sub, color = G.gold }) {
  return (
    <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:14 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:G.text, fontWeight:500, marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:G.muted, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color = G.gold, sub }) {
  const pct = Math.min(100, Math.round((value/max)*100));
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:5 }}>
        <span style={{ color:G.text }}>{label}</span>
        <span style={{ color:G.muted, fontFamily:"'Space Mono',monospace" }}>{sub??`${pct}%`}</span>
      </div>
      <div style={{ height:3, background:G.surface3, borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2, transition:"width .8s ease" }} />
      </div>
    </div>
  );
}

function AIBadge({ label = "AI Analysis" }) {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:"rgba(212,168,67,.08)", border:"1px solid rgba(212,168,67,.2)", borderRadius:2, fontFamily:"'Space Mono',monospace", fontSize:9, color:G.gold, fontWeight:700, letterSpacing:".08em" }}>⚡ {label}</span>;
}

function SLabel({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, fontFamily:"'Space Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:G.gold, marginBottom:12 }}>
      <div style={{ width:20, height:1, background:G.gold, opacity:.6 }} />{children}
    </div>
  );
}

function Hex({ size = 32, fontSize = 12 }) {
  return (
    <div style={{ width:size, height:size, background:G.gold, clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize, color:G.black, flexShrink:0 }}>W</div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const inp = { width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"11px 14px", color:G.text, fontSize:13, marginBottom:10 };
  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onAuth({ id:`u_${Date.now()}`, name:name||email.split("@")[0], email, phone, homeProvince:"", residenceProvince:"", workProvince:"", connections:[], onboarded:false, notifSettings:{ push:true, sms:false, email:false, categories:Object.fromEntries(NOTIF_CATEGORIES.map(c=>[c.id,true])), urgencyThreshold:"LOW", quietHours:true, quietStart:"22:00", quietEnd:"06:00", myProvincesOnly:false, verifiedOnly:false, familyAlert:true }, tier:"tok-save", joinedAt:new Date().toISOString() });
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:G.black, padding:20, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)`, backgroundSize:"56px 56px", maskImage:"radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)" }} />
      <div style={{ width:"100%", maxWidth:460, background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"36px 32px", position:"relative", zIndex:2, animation:"slideUp .4s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          <Hex /><span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:G.text }}>Wantok <span style={{ color:G.gold }}>Nation</span></span>
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, marginBottom:8, color:G.text, letterSpacing:"-.02em" }}>{mode==="login"?"Welcome back.":"Join the nation."}</h1>
        <p style={{ fontSize:13, color:G.muted, marginBottom:22, lineHeight:1.65 }}>{mode==="login"?"Sign in to your Life Map.":"Papua New Guinea's civic intelligence platform. Free."}</p>
        <div style={{ display:"flex", marginBottom:22, border:`1px solid ${G.borderL}`, borderRadius:4, overflow:"hidden" }}>
          {["login","register"].map(m=><button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:9, background:mode===m?G.gold:"transparent", border:"none", color:mode===m?G.black:G.muted, fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>{m==="login"?"Sign In":"Register Free"}</button>)}
        </div>
        {mode==="register"&&<input style={inp} placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} />}
        <input style={inp} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
        {mode==="register"&&<input style={inp} type="tel" placeholder="Phone (for SMS alerts)" value={phone} onChange={e=>setPhone(e.target.value)} />}
        {mode==="login"&&<input style={inp} type="password" placeholder="Password" />}
        <Btn onClick={submit} disabled={loading||!email.trim()} style={{ width:"100%", marginTop:4, marginBottom:16 }}>{loading?<><Spinner /> Processing…</>:mode==="login"?"Sign In →":"Create Account — Free →"}</Btn>
        <div style={{ padding:"11px 13px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:5 }}>
          <div style={{ fontSize:9, color:G.gold, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", marginBottom:4 }}>📍 HAPPENING RIGHT NOW</div>
          <div style={{ fontSize:12, color:G.text, fontWeight:500 }}>Keith Iduhu petition — Central Province land rights</div>
          <div style={{ fontSize:11, color:G.muted, marginTop:3 }}>4,200 hectares of customary land affected.</div>
        </div>
        <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:G.muted }}>Free forever · No credit card</div>
      </div>
    </div>
  );
}

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [hp, setHP] = useState("");
  const [rp, setRP] = useState("");
  const [wp, setWP] = useState("");
  const [conns, setConns] = useState(new Set());
  const toggleConn = id => { const n=new Set(conns); n.has(id)?n.delete(id):n.add(id); setConns(n); };
  const pChip = (p, val, setter) => <div key={p} onClick={()=>setter(p)} style={{ padding:"8px 10px", background:val===p?"rgba(212,168,67,.1)":G.surface2, border:`1px solid ${val===p?G.gold:G.borderL}`, borderRadius:4, fontSize:10, cursor:"pointer", textAlign:"center", color:val===p?G.gold:G.muted, fontWeight:val===p?600:400, transition:"all .15s" }}>{p}</div>;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(8,9,12,.97)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(20px)" }}>
      <div style={{ width:"100%", maxWidth:540, background:G.surface, border:`1px solid ${G.border}`, borderRadius:8, padding:"36px 32px", maxHeight:"92vh", overflowY:"auto", animation:"slideUp .4s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ display:"flex", gap:5, marginBottom:24 }}>{[0,1,2,3,4].map(i=><div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=step?G.gold:G.borderL, transition:"background .3s" }} />)}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}><Hex size={30} fontSize={11} /><span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, color:G.text }}>Wantok <span style={{ color:G.gold }}>Nation</span></span></div>
        {step===0&&<div style={{ animation:"slideUp .3s ease" }}><h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>Know what matters.<br/>To you. Right now.</h2><p style={{ fontSize:13, color:G.muted, marginBottom:20, lineHeight:1.65 }}>Build your Life Map — provinces, schools, clinics, land. The moment anything changes that affects your life, you know first.</p><div style={{ padding:"11px 13px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:5, marginBottom:20 }}><div style={{ fontSize:9, color:G.gold, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", marginBottom:4 }}>📍 FIRST ALERT WAITING</div><div style={{ fontSize:12, color:G.text, fontWeight:500 }}>Keith Iduhu petition — Central Province land rights</div></div><Btn onClick={()=>setStep(1)} style={{ width:"100%" }}>Build My Life Map →</Btn><div style={{ textAlign:"center", marginTop:10, fontSize:11, color:G.muted }}>Takes 2 minutes · Change any time</div></div>}
        {step===1&&<div style={{ animation:"slideUp .3s ease" }}><h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>Where are you from?</h2><p style={{ fontSize:13, color:G.muted, marginBottom:16, lineHeight:1.65 }}>Your home province — roots, family, customary land.</p><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(118px,1fr))", gap:6, marginBottom:16, maxHeight:300, overflowY:"auto" }}>{PROVINCES.map(p=>pChip(p,hp,setHP))}</div><Btn onClick={()=>hp&&setStep(2)} style={{ width:"100%", opacity:hp?1:.4 }}>{hp?`Roots: ${hp} ✓`:"Select your home province"}</Btn></div>}
        {step===2&&<div style={{ animation:"slideUp .3s ease" }}><h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>Where do you live now?</h2><p style={{ fontSize:13, color:G.muted, marginBottom:16, lineHeight:1.65 }}>Your current province for local alerts.</p><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(118px,1fr))", gap:6, marginBottom:12, maxHeight:250, overflowY:"auto" }}>{PROVINCES.map(p=>pChip(p,rp,setRP))}</div><div style={{ marginBottom:14 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:6 }}>Work Province (optional)</div><select style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"10px 12px", color:G.text, fontSize:13 }} value={wp} onChange={e=>setWP(e.target.value)}><option value="">Select…</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select></div><Btn onClick={()=>rp&&setStep(3)} style={{ width:"100%", opacity:rp?1:.4 }}>{rp?`Living in ${rp} ✓`:"Select where you live"}</Btn></div>}
        {step===3&&<div style={{ animation:"slideUp .3s ease" }}><h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>What connects your life?</h2><p style={{ fontSize:13, color:G.muted, marginBottom:16, lineHeight:1.65 }}>The more you tell us, the more precisely we alert you.</p><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>{LIFE_CONNECTIONS.map(c=><div key={c.id} onClick={()=>toggleConn(c.id)} style={{ padding:"13px 11px", background:conns.has(c.id)?"rgba(212,168,67,.07)":G.surface2, border:`1px solid ${conns.has(c.id)?"rgba(212,168,67,.4)":G.borderL}`, borderRadius:5, cursor:"pointer", transition:"all .15s" }}><div style={{ fontSize:20, marginBottom:5 }}>{c.icon}</div><div style={{ fontSize:12, fontWeight:600, color:conns.has(c.id)?G.text:G.mutedL }}>{c.label}</div><div style={{ fontSize:11, color:G.muted, lineHeight:1.4, marginTop:2 }}>{c.sub}</div></div>)}</div><Btn onClick={()=>setStep(4)} style={{ width:"100%" }}>{conns.size>0?`My Map: ${conns.size} connections →`:"Continue →"}</Btn></div>}
        {step===4&&<div style={{ animation:"slideUp .3s ease", textAlign:"center", padding:"8px 0" }}><div style={{ fontSize:48, marginBottom:14 }}>🎉</div><h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:"-.02em" }}>Your Life Map is ready.</h2><p style={{ fontSize:13, color:G.muted, marginBottom:20, lineHeight:1.65 }}>Enable notifications and you will never miss what matters again.</p><div style={{ padding:"11px 13px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:5, marginBottom:20, textAlign:"left" }}><div style={{ fontSize:9, color:G.gold, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", marginBottom:5 }}>YOUR FIRST ALERT</div><div style={{ fontSize:13, color:G.text, fontWeight:500 }}>📍 Central Province — Keith Iduhu Petition</div><div style={{ fontSize:12, color:G.muted, marginTop:4 }}>4,200 hectares of customary land affected.</div></div><Btn onClick={()=>onComplete({ homeProvince:hp, residenceProvince:rp, workProvince:wp, connections:[...conns], onboarded:true })} style={{ width:"100%" }}>🔔 Enable Notifications & Enter</Btn></div>}
      </div>
    </div>
  );
}

function Ticker() {
  const items = [["CENTRAL","Keith Iduhu petition — land rights review active"],["MOROBE","Lae General Hospital blood drive — today 10AM–4PM"],["NCD","Parliament live — Public Service Bill 2026"],["EASTERN HIGHLANDS","Goroka Show road closures Sept 14–18"],["WESTERN","Ok Tedi audit — 3 violations cited"],["NATIONAL","K850M budget — provincial allocations released"],["HELA","Tari Hospital emergency supply delivered"],["BOUGAINVILLE","ABG independence committee vote expected"]];
  const doubled = [...items,...items];
  return (
    <div style={{ position:"fixed", top:92, left:0, right:0, zIndex:890, height:28, background:"rgba(212,168,67,.05)", borderBottom:`1px solid ${G.border}`, overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, display:"flex", alignItems:"center", padding:"0 14px", background:G.gold, color:G.black, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:9, letterSpacing:".12em", zIndex:2, whiteSpace:"nowrap" }}>⚡ LIVE</div>
      <div style={{ display:"flex", alignItems:"center", height:"100%", paddingLeft:72, animation:"ticker 38s linear infinite" }}>
        {doubled.map(([p,t],i)=><span key={i} style={{ display:"flex", alignItems:"center", gap:8, paddingRight:32, fontSize:11, color:G.muted, whiteSpace:"nowrap", borderRight:`1px solid ${G.borderL}` }}><strong style={{ color:G.gold, fontSize:10, letterSpacing:".08em" }}>{p}</strong>{t}</span>)}
      </div>
    </div>
  );
}

function ToastSystem({ toasts }) {
  return (
    <div style={{ position:"fixed", bottom:22, right:22, zIndex:8000, display:"flex", flexDirection:"column", gap:9, pointerEvents:"none" }}>
      {toasts.map(t=><div key={t.id} style={{ background:G.surface2, border:`1px solid ${G.borderL}`, borderLeft:`3px solid ${t.urgent?G.red:G.gold}`, borderRadius:5, padding:"11px 14px", maxWidth:295, animation:"slideIn .3s ease", pointerEvents:"all", cursor:"pointer" }}><div style={{ fontSize:9, color:t.urgent?G.red:G.gold, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:3, fontFamily:"'Space Mono',monospace" }}>📍 {t.province}</div><div style={{ fontSize:12, color:G.text, fontWeight:500, lineHeight:1.4 }}>{t.text}</div><div style={{ fontSize:10, color:G.muted, marginTop:3 }}>Tap to read analysis →</div></div>)}
    </div>
  );
}

function AlertCard({ alert, user, onAI }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(alert.reactions);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const urg = URGENCY_CFG[alert.urgency]||URGENCY_CFG.MEDIUM;
  const catColor = CAT_COLORS[alert.category]||G.gold;
  const isRelevant = (alert.relevantTo||[]).some(r=>r===user?.homeProvince||r===user?.residenceProvince||(user?.connections||[]).includes(r))||alert.province==="National";
  const handleAI = async e => { e.stopPropagation(); setExpanded(true); if(aiData)return; setLoading(true); const r=await onAI(alert,user); setAiData(r); setLoading(false); };
  return (
    <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderLeft:`3px solid ${urg.bar}`, borderRadius:6, overflow:"hidden", marginBottom:8, cursor:"pointer" }}>
      <div style={{ padding:"16px 18px" }} onClick={()=>setExpanded(!expanded)}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:8 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{alert.breaking&&<Tag color={G.red}>⚡ Breaking</Tag>}<Tag color={catColor}>{alert.icon} {alert.categoryLabel}</Tag>{alert.province!=="National"&&<Tag color={G.muted}>📍 {alert.province}</Tag>}{alert.verified&&<Tag color={G.green}>✓ Verified</Tag>}</div>
          <div style={{ fontSize:10, color:G.muted, whiteSpace:"nowrap", flexShrink:0, fontFamily:"'Space Mono',monospace" }}>{alert.timeAgo}</div>
        </div>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, lineHeight:1.35, marginBottom:7, color:G.text }}>{alert.headline}</h3>
        <p style={{ fontSize:12, color:G.muted, lineHeight:1.65 }}>{alert.summary}</p>
        {isRelevant&&<div style={{ marginTop:10, padding:"8px 11px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:3, fontSize:11, color:G.gold, lineHeight:1.5 }}>📍 <strong>Connected to your Life Map</strong> — {alert.province==="National"?"National event, all users notified":`Matches your ${alert.province===user?.homeProvince?"home province":"province connection"}`}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"9px 18px", borderTop:`1px solid ${G.borderL}` }} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>{setLiked(!liked);setLikes(l=>liked?l-1:l+1);}} style={{ background:"none", border:"none", color:liked?G.red:G.muted, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>{liked?"❤️":"🤍"} {likes.toLocaleString()}</button>
        <button style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12 }}>💬 {alert.comments.toLocaleString()}</button>
        <button style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontSize:12 }}>↗ {alert.shares.toLocaleString()}</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:7 }}>
          <Btn variant="ghost" onClick={e=>{e.stopPropagation();setFollowing(!following);}} style={{ padding:"5px 12px", fontSize:11 }}>{following?"✓ Following":"🔔 Follow"}</Btn>
          <Btn variant={aiData?"subtle":"gold"} onClick={handleAI} style={{ padding:"5px 12px", fontSize:11 }}>{loading?<><Spinner /> Analysing…</>:aiData?"✓ Analysis":"⚡ Deep Analysis"}</Btn>
        </div>
      </div>
      {expanded&&<div style={{ borderTop:`1px solid ${G.borderL}`, padding:18, background:G.surface2, animation:"slideUp .22s ease" }} onClick={e=>e.stopPropagation()}>
        {loading&&<div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 0", color:G.muted, fontSize:13 }}><Spinner /> Intelligence engine processing…</div>}
        {!aiData&&!loading&&<div style={{ textAlign:"center", padding:"10px 0" }}><p style={{ fontSize:13, color:G.muted, marginBottom:14 }}>Get the full forensic depth — who, what, why, and what happens in 5 years.</p><Btn onClick={handleAI}>⚡ Generate Deep Analysis</Btn></div>}
        {aiData&&!loading&&<div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted }}>AI Intelligence Report</div><AIBadge /></div>
          {aiData.sections?.map((s,i)=><div key={i}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:5 }}>{s.label}</div><div style={{ fontSize:13, color:G.text, lineHeight:1.72 }}>{s.content}</div></div>)}
          {aiData.timeline&&<div><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:8 }}>Impact Timeline</div><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:7 }}>{aiData.timeline.map((t,i)=><div key={i} style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:10 }}><div style={{ fontSize:9, color:G.gold, fontWeight:700, letterSpacing:".08em", marginBottom:4, fontFamily:"'Space Mono',monospace" }}>{t.period}</div><div style={{ fontSize:11, color:G.mutedL, lineHeight:1.55 }}>{t.text}</div></div>)}</div></div>}
          {aiData.personalNote&&<div style={{ padding:"9px 12px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:4, fontSize:12, color:G.gold, lineHeight:1.55 }}>📍 <strong>Why This Matters To You:</strong> {aiData.personalNote}</div>}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}><Btn variant="ghost" style={{ padding:"5px 12px", fontSize:11 }}>📄 Full Document</Btn><Btn variant="ghost" style={{ padding:"5px 12px", fontSize:11 }}>📤 Share</Btn><Btn variant="ghost" style={{ padding:"5px 12px", fontSize:11 }}>🔔 Track</Btn></div>
        </div>}
      </div>}
    </div>
  );
}

function AlertFeed({ alerts, user, onPublish }) {
  const [fp, setFP] = useState("All");
  const [fc, setFC] = useState("All");
  const [qText, setQT] = useState("");
  const [qProv, setQP] = useState("");
  const [qLoad, setQL] = useState(false);
  const handleAI = useCallback(async (a,u)=>await ai.analyseAlert(a,u),[]);
  const filtered = alerts.filter(a=>(fp==="All"||a.province===fp||a.province==="National")&&(fc==="All"||a.category===fc));
  const handleQuickPublish = async()=>{ if(!qText.trim()||!qProv)return; setQL(true); await onPublish({text:qText,province:qProv,category:"community"}); setQT("");setQP("");setQL(false); };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 282px", gap:20, alignItems:"start" }}>
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}>
          <StatBox value="22" label="Provinces" sub="All PNG" /><StatBox value="47+" label="Sources" sub="Live feeds" /><StatBox value="26,934" label="Alerts today" sub="Dispatched" /><StatBox value="<90s" label="Speed" sub="To your phone" />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <select style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"7px 11px", color:G.text, fontSize:12 }} value={fp} onChange={e=>setFP(e.target.value)}><option value="All">All Provinces</option>{["Central","Morobe","National Capital District","Eastern Highlands","Western","Hela","National"].map(p=><option key={p}>{p}</option>)}</select>
          <select style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"7px 11px", color:G.text, fontSize:12 }} value={fc} onChange={e=>setFC(e.target.value)}><option value="All">All Categories</option>{["land","health","economy","politics","environment","community"].map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select>
          <span style={{ marginLeft:"auto", fontSize:11, color:G.muted, fontFamily:"'Space Mono',monospace" }}>{filtered.length} alerts</span>
        </div>
        {filtered.map(a=><AlertCard key={a.id} alert={a} user={user} onAI={handleAI}/>)}
      </div>
      <div style={{ position:"sticky", top:130, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"14px 16px" }}>
          <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.gold, marginBottom:12 }}>My Life Map</div>
          {[["🏡","Home",user?.homeProvince],["📍","Residence",user?.residenceProvince]].map(([icon,label,val])=><div key={label} style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:9, marginBottom:9, borderBottom:`1px solid ${G.borderL}` }}><span style={{ fontSize:16 }}>{icon}</span><div><div style={{ fontSize:10, color:G.muted }}>{label}</div><div style={{ fontSize:13, color:val?G.text:G.muted, fontWeight:500 }}>{val||"Not set"}</div></div></div>)}
          {(user?.connections||[]).length>0&&<div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{user.connections.map(c=><span key={c} style={{ fontSize:10, padding:"2px 7px", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:3, color:G.mutedL }}>{c}</span>)}</div>}
        </div>
        <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"14px 16px" }}>
          <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.gold, marginBottom:10 }}>📢 Quick Publish</div>
          <textarea style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"9px 11px", color:G.text, fontSize:12, resize:"vertical", minHeight:66, fontFamily:"'DM Sans',sans-serif", marginBottom:8 }} placeholder="Share an announcement…" value={qText} onChange={e=>setQT(e.target.value)}/>
          <select style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"8px 11px", color:G.text, fontSize:12, marginBottom:8 }} value={qProv} onChange={e=>setQP(e.target.value)}><option value="">Province…</option><option value="National">🌐 National</option>{PROVINCES.slice(0,8).map(p=><option key={p}>{p}</option>)}</select>
          <Btn onClick={handleQuickPublish} disabled={!qText.trim()||!qProv||qLoad} style={{ width:"100%", fontSize:11 }}>{qLoad?<><Spinner/>Publishing…</>:"Publish & Notify →"}</Btn>
        </div>
        <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"14px 16px" }}>
          <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.gold, marginBottom:12 }}>Coming Next</div>
          {[["Month 3","Android App + SMS"],["Month 6","Tok Pisin AI"],["Year 1","Parliament + Land APIs"],["Year 2","Predictive alerts"]].map(([p,i])=><div key={p} style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}><div style={{ fontSize:9, color:G.gold, fontFamily:"'Space Mono',monospace", fontWeight:700, flexShrink:0, paddingTop:2 }}>{p}</div><div style={{ fontSize:12, color:G.muted, lineHeight:1.5 }}>{i}</div></div>)}
        </div>
      </div>
    </div>
  );
}

function LifeMapScreen({ user, onUpdate }) {
  const [hp,setHP]=useState(user?.homeProvince||"");
  const [rp,setRP]=useState(user?.residenceProvince||"");
  const [wp,setWP]=useState(user?.workProvince||"");
  const [conns,setConns]=useState(new Set(user?.connections||[]));
  const [saved,setSaved]=useState(false);
  const toggleConn=id=>{ const n=new Set(conns); n.has(id)?n.delete(id):n.add(id); setConns(n); };
  const save=async()=>{ await onUpdate({homeProvince:hp,residenceProvince:rp,workProvince:wp,connections:[...conns]}); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      <SLabel>Personalization</SLabel>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6, letterSpacing:"-.02em" }}>{user?.name?`${user.name}'s`:"Your"} Life Map</h2>
      <p style={{ color:G.muted, marginBottom:20, fontSize:13 }}>Every connection tells the platform what matters to you.</p>
      <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"18px 20px", marginBottom:12 }}>
        <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:14 }}>Province Connections</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[["Home Province",hp,setHP,"Origin · roots · customary land"],["Residence Province",rp,setRP,"Where you live today"],["Work Province",wp,setWP,"Optional"]].map(([label,val,setter,desc])=><div key={label}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:5 }}>{label}</div><select style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"9px 11px", color:G.text, fontSize:12 }} value={val} onChange={e=>setter(e.target.value)}><option value="">Select…</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select><div style={{ fontSize:10, color:G.muted, marginTop:4 }}>{desc}</div></div>)}
        </div>
      </div>
      <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"18px 20px", marginBottom:12 }}>
        <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:14 }}>Active Life Connections <span style={{ color:G.gold }}>{conns.size} active</span></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:8 }}>
          {LIFE_CONNECTIONS.map(c=><div key={c.id} onClick={()=>toggleConn(c.id)} style={{ padding:"13px 11px", background:conns.has(c.id)?"rgba(212,168,67,.07)":G.surface2, border:`1px solid ${conns.has(c.id)?"rgba(212,168,67,.4)":G.borderL}`, borderRadius:5, cursor:"pointer", transition:"all .15s" }}><div style={{ fontSize:20, marginBottom:5 }}>{c.icon}</div><div style={{ fontSize:12, fontWeight:600, color:conns.has(c.id)?G.text:G.mutedL }}>{c.label}</div><div style={{ fontSize:11, color:G.muted, lineHeight:1.4, marginTop:2 }}>{c.sub}</div></div>)}
        </div>
      </div>
      <Btn onClick={save} style={{ minWidth:160 }}>{saved?"✓ Saved!":"💾 Save Life Map"}</Btn>
    </div>
  );
}

function MPTracker({ userProvince }) {
  const [search,setSearch]=useState("");
  const [fp,setFP]=useState("All");
  const [fs,setFS]=useState("All");
  const [selected,setSelected]=useState(null);
  const [aiData,setAiData]=useState({});
  const [loadingAI,setLoadingAI]=useState(null);
  const [watching,setWatching]=useState(new Set(["mp1"]));
  const SC={active:G.green,watch:G.gold,inactive:G.red};
  const SL={active:"Active",watch:"Watch",inactive:"Inactive"};
  const VC={FOR:G.green,AGAINST:G.red,ABSENT:G.muted};
  const filtered=SEED_MPs.filter(mp=>(fp==="All"||mp.province===fp)&&(fs==="All"||mp.status===fs)&&(!search||mp.name.toLowerCase().includes(search.toLowerCase())||mp.electorate.toLowerCase().includes(search.toLowerCase())));
  const loadAI=async mp=>{ if(aiData[mp.id]||loadingAI===mp.id)return; setLoadingAI(mp.id); const r=await ai.analyseMp(mp); setAiData(p=>({...p,[mp.id]:r||{error:true}})); setLoadingAI(null); };
  const toggleSel=mp=>{ const n=selected?.id===mp.id; setSelected(n?null:mp); if(!n&&!aiData[mp.id])loadAI(mp); };
  const toggleW=(id,e)=>{ e.stopPropagation(); const n=new Set(watching); n.has(id)?n.delete(id):n.add(id); setWatching(n); };
  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      <SLabel>Parliament Intelligence</SLabel>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6, letterSpacing:"-.02em" }}>MP Tracker</h2>
      <p style={{ color:G.muted, marginBottom:18, fontSize:13 }}>Every Member of Parliament — attendance, voting record, AI performance assessment.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}><StatBox value={SEED_MPs.length} label="MPs tracked"/><StatBox value={watching.size} label="Watching"/><StatBox value="89%" label="Avg attendance" color={G.green}/><StatBox value="3" label="Bills this week" color={G.blue}/></div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <input style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"8px 12px", color:G.text, fontSize:12, width:190 }} placeholder="Search MP…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"8px 11px", color:G.text, fontSize:12 }} value={fp} onChange={e=>setFP(e.target.value)}><option value="All">All Provinces</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select>
        {["All","active","watch","inactive"].map(s=><button key={s} onClick={()=>setFS(s)} style={{ padding:"6px 12px", borderRadius:12, cursor:"pointer", fontSize:11, fontWeight:500, background:fs===s?"rgba(212,168,67,.12)":"transparent", border:`1px solid ${fs===s?"rgba(212,168,67,.4)":G.borderL}`, color:fs===s?G.gold:G.muted, transition:"all .15s" }}>{s==="All"?"All":SL[s]}</button>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:8 }}>
        {filtered.map(mp=>{
          const isSel=selected?.id===mp.id; const isW=watching.has(mp.id); const isMyP=mp.province===userProvince; const d=aiData[mp.id];
          const rColor=d?.rating==="Strong"?G.green:d?.rating==="Good"?G.gold:d?.rating==="Fair"?G.gold:G.red;
          return <div key={mp.id} style={{ background:G.surface, border:`1px solid ${isSel?"rgba(212,168,67,.5)":isMyP?"rgba(212,168,67,.2)":G.borderL}`, borderRadius:6, overflow:"hidden", cursor:"pointer" }}>
            <div style={{ padding:"14px 16px" }} onClick={()=>toggleSel(mp)}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}><div><div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}><div style={{ width:8, height:8, borderRadius:"50%", background:SC[mp.status], flexShrink:0 }}/><div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:G.text }}>{mp.name}</div></div><div style={{ fontSize:11, color:G.muted }}>{mp.title} · {mp.electorate}</div></div><button onClick={e=>toggleW(mp.id,e)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:isW?G.gold:G.muted, padding:2 }}>{isW?"★":"☆"}</button></div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}><Tag color={SC[mp.status]}>{SL[mp.status]}</Tag><Tag color={G.blue}>{mp.province}</Tag>{isMyP&&<Tag color={G.gold}>📍 Your Province</Tag>}</div>
              <ProgressBar label="Attendance" value={mp.attendance} max={100} color={mp.attendance>90?G.green:mp.attendance>75?G.gold:G.red} sub={`${mp.attendance}%`}/>
              <div style={{ display:"flex", gap:12, fontSize:11, fontFamily:"'Space Mono',monospace" }}><span style={{ color:G.green }}>✓ {mp.votes.for}</span><span style={{ color:G.red }}>✗ {mp.votes.against}</span><span style={{ color:G.muted }}>— {mp.votes.absent}</span></div>
              <div style={{ marginTop:8, fontSize:10, color:G.muted }}>Last active: <span style={{ color:mp.lastActive==="Today"?G.green:G.mutedL }}>{mp.lastActive}</span></div>
            </div>
            {isSel&&<div style={{ borderTop:`1px solid ${G.borderL}`, padding:16, background:G.surface2, animation:"slideUp .22s ease" }}>
              <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:G.muted, marginBottom:8 }}>Key Votes</div>
              {mp.keyVotes?.map((v,i)=><div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${G.borderL}`, fontSize:12 }}><span style={{ color:G.mutedL, flex:1, marginRight:10 }}>{v.bill}</span><Tag color={VC[v.vote]}>{v.vote}</Tag></div>)}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, marginBottom:8 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:G.muted }}>AI Assessment</div><AIBadge/></div>
              {loadingAI===mp.id&&<div style={{ display:"flex", alignItems:"center", gap:8, color:G.muted, fontSize:13 }}><Spinner/> Analysing…</div>}
              {d&&!d.error&&<div style={{ display:"flex", flexDirection:"column", gap:9 }}><div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:rColor }}>{d.rating}</div><p style={{ fontSize:13, color:G.text, lineHeight:1.7 }}>{d.summary}</p><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}><div style={{ padding:10, background:"rgba(39,174,96,.07)", border:"1px solid rgba(39,174,96,.2)", borderRadius:4 }}><div style={{ fontSize:9, color:G.green, fontWeight:700, marginBottom:4, fontFamily:"'Space Mono',monospace", letterSpacing:".1em" }}>STRENGTH</div><div style={{ fontSize:12, color:G.mutedL, lineHeight:1.5 }}>{d.strength}</div></div><div style={{ padding:10, background:"rgba(231,76,60,.06)", border:"1px solid rgba(231,76,60,.2)", borderRadius:4 }}><div style={{ fontSize:9, color:G.red, fontWeight:700, marginBottom:4, fontFamily:"'Space Mono',monospace", letterSpacing:".1em" }}>WATCH</div><div style={{ fontSize:12, color:G.mutedL, lineHeight:1.5 }}>{d.concern}</div></div></div>{d.provinceImpact&&<div style={{ padding:"9px 12px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:4, fontSize:12, color:G.gold, lineHeight:1.55 }}>📍 {d.provinceImpact}</div>}</div>}
              {!d&&loadingAI!==mp.id&&<Btn variant="ghost" style={{ width:"100%", marginTop:4 }} onClick={()=>loadAI(mp)}>⚡ Generate AI Assessment</Btn>}
            </div>}
          </div>;
        })}
      </div>
    </div>
  );
}

function LandRegistry() {
  const [search,setSearch]=useState("");
  const [fs,setFS]=useState("All");
  const [selected,setSelected]=useState(null);
  const [aiData,setAiData]=useState({});
  const [loadingAI,setLoadingAI]=useState(null);
  const [watching,setWatching]=useState(new Set(["l1"]));
  const [query,setQuery]=useState("");
  const [qResult,setQR]=useState(null);
  const [qLoading,setQL]=useState(false);
  const SC={ACTIVE:G.green,DISPUTED:G.red,REVIEW:G.gold};
  const filtered=SEED_LAND.filter(r=>(fs==="All"||r.status===fs)&&(!search||r.title.toLowerCase().includes(search.toLowerCase())||r.location.toLowerCase().includes(search.toLowerCase())));
  const loadAI=async r=>{ if(aiData[r.id])return; setLoadingAI(r.id); const res=await ai.landAnalysis(r); setAiData(p=>({...p,[r.id]:res||{error:true}})); setLoadingAI(null); };
  const handleQuery=async()=>{ if(!query.trim())return; setQL(true); setQR(null); const r=await ai.landQuery(query); setQR(r||{error:true}); setQL(false); };
  const toggleW=id=>{ const n=new Set(watching); n.has(id)?n.delete(id):n.add(id); setWatching(n); };
  const toggleSel=r=>{ const n=selected?.id===r.id; setSelected(n?null:r); if(!n&&!aiData[r.id])loadAI(r); };
  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      <SLabel>Land Intelligence</SLabel>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6, letterSpacing:"-.02em" }}>Land Registry Watcher</h2>
      <p style={{ color:G.muted, marginBottom:18, fontSize:13 }}>Monitor land titles, disputes, boundary changes. Ask the AI assistant anything about PNG land law.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}><StatBox value={SEED_LAND.length} label="Records"/><StatBox value={SEED_LAND.filter(r=>r.status==="DISPUTED").length} label="Disputes" color={G.red}/><StatBox value={SEED_LAND.filter(r=>r.status==="REVIEW").length} label="Under review" color={G.gold}/><StatBox value={watching.size} label="Watching" color={G.blue}/></div>
      <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"18px 20px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted }}>AI Land Intelligence Assistant</div><AIBadge label="Powered by Claude"/></div>
        <p style={{ fontSize:13, color:G.muted, marginBottom:12, lineHeight:1.6 }}>Ask about PNG land law, customary rights, disputes — in plain language.</p>
        <div style={{ display:"flex", gap:8, marginBottom:qResult?14:0 }}>
          <input style={{ flex:1, background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"10px 13px", color:G.text, fontSize:12 }} placeholder='"What are my rights if someone builds on my customary land?"' value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleQuery()}/>
          <Btn onClick={handleQuery} disabled={!query.trim()||qLoading}>{qLoading?<><Spinner/>Thinking…</>:"Ask →"}</Btn>
        </div>
        {qResult&&!qResult.error&&<div style={{ display:"flex", flexDirection:"column", gap:10, animation:"slideUp .22s ease" }}><div style={{ fontSize:13, color:G.text, lineHeight:1.72 }}>{qResult.answer}</div>{qResult.legalBasis&&<div style={{ fontSize:11, color:G.muted }}><strong style={{ color:G.gold }}>Legal basis:</strong> {qResult.legalBasis}</div>}{qResult.nextSteps?.length>0&&<div><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:6 }}>Next Steps</div>{qResult.nextSteps.map((s,i)=><div key={i} style={{ display:"flex", gap:7, fontSize:12, color:G.mutedL, marginBottom:5, alignItems:"flex-start" }}><span style={{ color:G.gold, fontWeight:700, fontFamily:"'Space Mono',monospace", fontSize:10, flexShrink:0, paddingTop:1 }}>{i+1}.</span>{s}</div>)}</div>}{qResult.warning&&<div style={{ padding:"9px 12px", background:"rgba(231,76,60,.07)", border:"1px solid rgba(231,76,60,.2)", borderRadius:3, fontSize:12, color:G.red, lineHeight:1.5 }}>⚠️ {qResult.warning}</div>}</div>}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"8px 12px", color:G.text, fontSize:12, width:210 }} placeholder="Search title, location…" value={search} onChange={e=>setSearch(e.target.value)}/>
        {["All","ACTIVE","DISPUTED","REVIEW"].map(s=><button key={s} onClick={()=>setFS(s)} style={{ padding:"6px 12px", borderRadius:12, cursor:"pointer", fontSize:11, fontWeight:500, background:fs===s?"rgba(212,168,67,.12)":"transparent", border:`1px solid ${fs===s?"rgba(212,168,67,.4)":G.borderL}`, color:fs===s?G.gold:G.muted, transition:"all .15s" }}>{s}</button>)}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {filtered.map(record=>{
          const isSel=selected?.id===record.id; const d=aiData[record.id];
          const rc=d?.riskLevel==="High"?G.red:d?.riskLevel==="Medium"?G.gold:G.green;
          return <div key={record.id} style={{ background:G.surface, border:`1px solid ${isSel?"rgba(212,168,67,.5)":record.status==="DISPUTED"?"rgba(231,76,60,.3)":G.borderL}`, borderLeft:`${record.status==="DISPUTED"?"3px solid "+G.red:"1px solid "+G.borderL}`, borderRadius:6, overflow:"hidden", cursor:"pointer" }}>
            <div style={{ padding:"14px 16px" }} onClick={()=>toggleSel(record)}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:6 }}><div><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:5 }}><Tag color={SC[record.status]}>{record.status}</Tag><Tag color={G.blue}>{record.type}</Tag>{record.flag&&<Tag color={G.red}>⚠️ Flagged</Tag>}</div><div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:G.text, marginBottom:2 }}>{record.title}</div><div style={{ fontSize:11, color:G.muted }}>📍 {record.location} · {record.area} · {record.owner}</div></div><button onClick={e=>{e.stopPropagation();toggleW(record.id);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:watching.has(record.id)?G.gold:G.muted, flexShrink:0 }}>{watching.has(record.id)?"★":"☆"}</button></div>
              {record.flag&&<div style={{ marginTop:8, padding:"6px 10px", background:"rgba(231,76,60,.07)", border:"1px solid rgba(231,76,60,.2)", borderRadius:3, fontSize:11, color:G.red }}>⚠️ {record.flag}</div>}
              <div style={{ marginTop:8, fontSize:10, color:G.muted, fontFamily:"'Space Mono',monospace" }}>Registered: {record.registered} · Updated: {record.lastUpdated}</div>
            </div>
            {isSel&&<div style={{ borderTop:`1px solid ${G.borderL}`, padding:16, background:G.surface2, animation:"slideUp .22s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:G.muted }}>AI Land Risk Analysis</div><AIBadge/></div>
              {loadingAI===record.id&&<div style={{ display:"flex", alignItems:"center", gap:8, color:G.muted, fontSize:13 }}><Spinner/> Analysing land record…</div>}
              {d&&!d.error&&<div style={{ display:"flex", flexDirection:"column", gap:11 }}><div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:rc }}>{d.riskLevel} Risk</div><p style={{ fontSize:13, color:G.text, lineHeight:1.7 }}>{d.riskSummary}</p><div style={{ fontSize:12, color:G.mutedL, lineHeight:1.6 }}><strong style={{ color:G.muted }}>Historical:</strong> {d.historicalContext}</div><div style={{ fontSize:12, color:G.mutedL, lineHeight:1.6 }}><strong style={{ color:G.muted }}>Affected:</strong> {d.affectedParties}</div><div style={{ padding:"9px 12px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:4, fontSize:12, color:G.gold, lineHeight:1.55 }}><strong>What to do now:</strong> {d.recommendation}</div></div>}
              {!d&&loadingAI!==record.id&&<Btn variant="ghost" style={{ width:"100%" }} onClick={()=>loadAI(record)}>⚡ Generate Land Risk Analysis</Btn>}
            </div>}
          </div>;
        })}
      </div>
    </div>
  );
}

function Publisher({ onPublish, user }) {
  const [text,setText]=useState("");
  const [province,setProv]=useState("");
  const [category,setCat]=useState("community");
  const [loading,setLoading]=useState(false);
  const [draft,setDraft]=useState(null);
  const [published,setPub]=useState(false);
  const UC={CRITICAL:G.red,HIGH:G.gold,MEDIUM:G.blue,LOW:G.green};
  const handleDraft=async()=>{ if(!text.trim())return; setLoading(true); const r=await ai.publisherDraft(text,province||"National",category); setDraft(r); setLoading(false); };
  const handlePublish=async()=>{ setLoading(true); await onPublish({text,province:province||"National",category}); setPub(true); setTimeout(()=>{setPub(false);setText("");setProv("");setDraft(null);},2000); setLoading(false); };
  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      <SLabel>Publisher</SLabel>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:6, letterSpacing:"-.02em" }}>Publish an Alert</h2>
      <p style={{ color:G.muted, marginBottom:18, fontSize:13, lineHeight:1.7 }}>Know something your province needs to know? AI structures it, scores urgency, notifies connected users within seconds.</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}><StatBox value="48,203" label="Total reach" color={G.gold}/><StatBox value="284" label="Alerts published"/><StatBox value="7" label="Today" color={G.blue}/><StatBox value="68%" label="Avg engagement" color={G.green}/></div>
      <div style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, padding:"20px", marginBottom:18 }}>
        <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:14 }}>Compose Alert</div>
        <textarea style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"11px 13px", color:G.text, fontSize:13, resize:"vertical", minHeight:90, fontFamily:"'DM Sans',sans-serif", marginBottom:10 }} placeholder="Write your announcement. Include who, what, where, and any action required…" value={text} onChange={e=>setText(e.target.value)}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          <select style={{ background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"10px 12px", color:G.text, fontSize:13 }} value={province} onChange={e=>setProv(e.target.value)}><option value="">Province…</option><option value="National">🌐 National</option>{PROVINCES.map(p=><option key={p}>{p}</option>)}</select>
          <select style={{ background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"10px 12px", color:G.text, fontSize:13 }} value={category} onChange={e=>setCat(e.target.value)}>{["community","health","land","politics","economy","environment"].map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <div style={{ display:"flex", gap:8 }}><Btn onClick={handleDraft} disabled={!text.trim()||loading}>{loading&&!draft?<><Spinner/>Generating…</>:"⚡ AI Draft & Score"}</Btn>{draft&&<Btn variant="ghost" onClick={()=>setDraft(null)}>Clear</Btn>}</div>
        {draft&&!draft.error&&<div style={{ marginTop:16, padding:16, background:G.surface3, border:`1px solid ${G.border}`, borderRadius:5, animation:"slideUp .22s ease" }}>
          <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:G.gold, marginBottom:10 }}>AI Draft Preview</div>
          <div style={{ display:"flex", gap:7, marginBottom:10 }}><Tag color={UC[draft.urgency]||G.gold}>{draft.urgency}</Tag><Tag color={G.blue}>Est. {draft.estimatedReach?.toLocaleString()} reach</Tag></div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:G.text, marginBottom:6, lineHeight:1.35 }}>{draft.headline}</div>
          <p style={{ fontSize:13, color:G.mutedL, lineHeight:1.65, marginBottom:12 }}>{draft.summary}</p>
          {draft.editorialNote&&<div style={{ padding:"9px 12px", background:"rgba(212,168,67,.06)", border:`1px solid ${G.border}`, borderRadius:4, fontSize:12, color:G.gold, marginBottom:14 }}>📋 {draft.editorialNote}</div>}
          {published?<div style={{ textAlign:"center", padding:12, background:"rgba(39,174,96,.1)", border:"1px solid rgba(39,174,96,.25)", borderRadius:4, fontSize:13, color:G.green, fontWeight:600 }}>✅ Published — notifications dispatching</div>:<div style={{ display:"flex", gap:8 }}><Btn onClick={handlePublish} disabled={loading} style={{ flex:1 }}>{loading?<><Spinner/>Publishing…</>:"🚀 Publish & Notify"}</Btn><Btn variant="ghost">Edit</Btn></div>}
        </div>}
      </div>
    </div>
  );
}

function Settings({ user, onUpdate, onLogout }) {
  const [s,setS]=useState({ push:true,sms:false,email:false,quietHours:true,quietStart:"22:00",quietEnd:"06:00",myProvincesOnly:false,verifiedOnly:false,familyAlert:true,urgencyThreshold:"LOW",categories:Object.fromEntries(NOTIF_CATEGORIES.map(c=>[c.id,true])),...user?.notifSettings });
  const [section,setSection]=useState("notifications");
  const [saved,setSaved]=useState(false);
  const toggle=k=>setS(p=>({...p,[k]:!p[k]}));
  const toggleCat=id=>setS(p=>({...p,categories:{...p.categories,[id]:!p.categories[id]}}));
  const save=async()=>{ await onUpdate({notifSettings:s}); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      <SLabel>Configuration</SLabel>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, marginBottom:18, letterSpacing:"-.02em" }}>Settings</h2>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["notifications","🔔 Notifications"],["tiers","⭐ Plans"],["account","👤 Account"]].map(([id,label])=><button key={id} onClick={()=>setSection(id)} style={{ padding:"8px 16px", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600, background:section===id?"rgba(212,168,67,.12)":G.surface2, border:`1px solid ${section===id?"rgba(212,168,67,.4)":G.borderL}`, color:section===id?G.gold:G.mutedL, transition:"all .15s" }}>{label}</button>)}
      </div>
      {section==="notifications"&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[["Delivery Channels",[["push","Push Notifications","In-app and browser push"],["sms","SMS Alerts","Premium only"],["email","Email Digest","Daily summary"]]],["Smart Filters",[["myProvincesOnly","My Provinces Only","Life Map provinces only"],["verifiedOnly","Verified Publishers Only","Skip unverified"],["familyAlert","Family Province Alerts","Critical events in family provinces"]]]].map(([title,items])=><div key={title} style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"16px 18px" }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:12 }}>{title}</div>{items.map(([k,l,sub])=><Toggle key={k} value={s[k]} onChange={()=>toggle(k)} label={l} sub={sub}/>)}</div>)}
          <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"16px 18px" }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:12 }}>Quiet Hours</div><Toggle value={s.quietHours} onChange={()=>toggle("quietHours")} label="Enable quiet hours" sub="CRITICAL alerts always override"/>{s.quietHours&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>{[["quietStart","Start"],["quietEnd","End"]].map(([k,l])=><div key={k}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:5 }}>{l}</div><input type="time" style={{ width:"100%", background:G.surface2, border:`1px solid ${G.borderL}`, borderRadius:4, padding:"9px 10px", color:G.text, fontSize:12 }} value={s[k]} onChange={e=>setS(p=>({...p,[k]:e.target.value}))}/></div>)}</div>}</div>
          <div style={{ padding:"12px 0" }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:10 }}>Minimum Urgency</div><div style={{ display:"flex", gap:6 }}>{["LOW","MEDIUM","HIGH","CRITICAL"].map(u=><button key={u} onClick={()=>setS(p=>({...p,urgencyThreshold:u}))} style={{ padding:"5px 11px", borderRadius:12, cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:"'Space Mono',monospace", letterSpacing:".06em", background:s.urgencyThreshold===u?"rgba(212,168,67,.12)":"transparent", border:`1px solid ${s.urgencyThreshold===u?"rgba(212,168,67,.4)":G.borderL}`, color:s.urgencyThreshold===u?G.gold:G.muted, transition:"all .15s" }}>{u}</button>)}</div></div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"16px 18px" }}>
            <div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:12 }}>Alert Categories</div>
            {NOTIF_CATEGORIES.map(cat=><div key={cat.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${G.borderL}` }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:18 }}>{cat.icon}</span><div><div style={{ fontSize:13, color:G.text, fontWeight:500 }}>{cat.label}</div><div style={{ fontSize:11, color:G.muted }}>{cat.sub}</div></div></div><button onClick={()=>toggleCat(cat.id)} style={{ width:38, height:20, borderRadius:10, cursor:"pointer", background:s.categories[cat.id]?G.gold:G.surface3, border:`1px solid ${s.categories[cat.id]?G.gold:G.borderL}`, position:"relative", transition:"all .2s", flexShrink:0 }}><div style={{ position:"absolute", top:3, left:s.categories[cat.id]?20:3, width:14, height:14, borderRadius:"50%", background:s.categories[cat.id]?G.black:G.muted, transition:"left .2s" }}/></button></div>)}
          </div>
          <Btn onClick={save} style={{ width:"100%" }}>{saved?"✓ Saved!":"💾 Save Settings"}</Btn>
        </div>
      </div>}
      {section==="tiers"&&<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:8 }}>{TIERS.map(t=><div key={t.tier} style={{ background:t.featured?G.surface2:G.surface, border:`1px solid ${t.featured?G.border:G.borderL}`, borderRadius:6, padding:"20px 18px", position:"relative", overflow:"hidden" }}>{t.featured&&<div style={{ position:"absolute", top:0, right:0, background:G.gold, color:G.black, fontSize:8, fontFamily:"'Syne',sans-serif", fontWeight:800, letterSpacing:".1em", padding:"4px 10px" }}>POPULAR</div>}<div style={{ fontSize:9, color:G.muted, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".14em", marginBottom:4 }}>{t.tier}</div><div style={{ fontFamily:"'Syne',sans-serif", fontSize:19, fontWeight:800, color:G.text, marginBottom:2 }}>{t.name}</div><div style={{ fontSize:11, color:G.muted, fontStyle:"italic", marginBottom:14 }}>"{t.meaning}"</div><div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:G.text, marginBottom:2 }}>{t.price}</div><div style={{ fontSize:10, color:G.muted, marginBottom:16, fontFamily:"'Space Mono',monospace" }}>{t.period}</div><ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:6, marginBottom:18 }}>{t.features.map(f=><li key={f} style={{ fontSize:12, color:G.mutedL, display:"flex", gap:7, alignItems:"flex-start" }}><span style={{ color:G.gold, flexShrink:0 }}>→</span>{f}</li>)}</ul><Btn variant={t.featured?"gold":"ghost"} style={{ width:"100%" }}>{t.price==="K0"?"Current Plan":`Get ${t.name}`}</Btn></div>)}</div>}
      {section==="account"&&<div style={{ maxWidth:480 }}><div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"18px 20px", marginBottom:12 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:14 }}>Account Details</div>{[["Name",user?.name||"—"],["Email",user?.email||"—"],["Phone",user?.phone||"Not set"],["Member Since",user?.joinedAt?new Date(user.joinedAt).toLocaleDateString():"—"]].map(([l,v])=><div key={l} style={{ marginBottom:12 }}><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:4 }}>{l}</div><div style={{ fontSize:14, color:G.text }}>{v}</div></div>)}<div><div style={{ fontSize:9, fontFamily:"'Space Mono',monospace", fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:G.muted, marginBottom:6 }}>Current Plan</div><Tag color={G.gold}>{user?.tier||"Tok Save"}</Tag></div></div><div style={{ background:G.surface, border:`1px solid ${G.borderL}`, borderRadius:6, padding:"16px 18px", marginBottom:12 }}><div style={{ fontSize:13, color:G.muted, lineHeight:1.7 }}>Wantok Nation · Papua New Guinea's national civic intelligence platform<br/>Built by EyedeaForge Solutions · Port Moresby, PNG · 2026</div></div><Btn variant="danger" onClick={onLogout} style={{ width:"100%" }}>Sign Out</Btn></div>}
    </div>
  );
}

const NAV_TABS = [
  { id:"feed", label:"📡 Live Feed" },
  { id:"map", label:"🗺 Life Map" },
  { id:"mps", label:"🗳 MP Tracker" },
  { id:"land", label:"🌾 Land Registry" },
  { id:"publish", label:"📢 Publish" },
  { id:"settings", label:"⚙ Settings" },
];

export default function WantokNation() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [tab, setTab] = useState("feed");
  const [unread, setUnread] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const su = await storage.get("wn_user");
        const sa = await storage.get("wn_alerts");
        if (su) { setUser(JSON.parse(su.value)); setAlerts(sa?JSON.parse(sa.value):SEED_ALERTS); setScreen("app"); }
        else { setAlerts(SEED_ALERTS); setScreen("auth"); }
      } catch { setAlerts(SEED_ALERTS); setScreen("auth"); }
    })();
  }, []);

  useEffect(() => {
    if (screen!=="app") return;
    const queue = [
      { province:"Central Province", text:"Keith Iduhu petition — land rights review active", urgent:true },
      { province:"Morobe", text:"Blood drive: Lae Secondary School 10AM–4PM today", urgent:true },
      { province:"National", text:"K850M budget — provincial health allocations released" },
      { province:"Eastern Highlands", text:"Goroka Show road closures confirmed Sept 14–18" },
      { province:"Bougainville", text:"ABG independence committee vote expected today" },
    ];
    let idx = 0;
    const show = () => {
      const t = { ...queue[idx%queue.length], id:Date.now()+Math.random() };
      setToasts(p=>[...p.slice(-2),t]);
      setUnread(c=>c+1);
      setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==t.id)),6500);
      idx++;
      timerRef.current = setTimeout(show, 9500);
    };
    timerRef.current = setTimeout(show, 3000);
    return () => clearTimeout(timerRef.current);
  }, [screen]);

  const handleAuth = useCallback(async userData => {
    await storage.set("wn_user", JSON.stringify(userData));
    await storage.set("wn_alerts", JSON.stringify(SEED_ALERTS));
    setUser(userData); setAlerts(SEED_ALERTS); setScreen("app");
  }, []);

  const handlePublish = useCallback(async ({ text, province, category }) => {
    const draft = await ai.structureAlert(text, province, category);
    const newAlert = { id:`ua-${Date.now()}`, province, category, categoryLabel:draft.categoryLabel||"Community", icon:draft.icon||"📢", headline:draft.headline||text.slice(0,80), summary:draft.summary||text, urgency:draft.urgency||"MEDIUM", timeAgo:"Just now", reactions:0, comments:0, shares:0, relevantTo:[province,category], verified:false, breaking:draft.urgency==="CRITICAL", publishedBy:user?.name||"Community" };
    const updated = [newAlert,...alerts];
    setAlerts(updated);
    await storage.set("wn_alerts", JSON.stringify(updated));
    setToasts(p=>[...p,{ id:Date.now(), province, text:draft.headline, urgent:draft.urgency==="CRITICAL" }]);
  }, [alerts, user]);

  const updateUser = useCallback(async updates => {
    const u = { ...user, ...updates };
    await storage.set("wn_user", JSON.stringify(u));
    setUser(u);
  }, [user]);

  const handleLogout = useCallback(async () => {
    await storage.delete("wn_user");
    setUser(null); setScreen("auth");
  }, []);

  if (screen==="loading") return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, background:G.black }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, animation:"fadeIn .6s ease" }}><Hex size={38} fontSize={14}/><span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:G.text }}>Wantok <em style={{ fontStyle:"normal", color:G.gold }}>Nation</em></span></div>
        <div style={{ width:200, height:2, background:G.surface2, overflow:"hidden", borderRadius:1 }}><div style={{ height:"100%", background:G.gold, animation:"loadBar 1.8s ease forwards" }}/></div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:G.muted, letterSpacing:".1em", animation:"fadeIn 1s ease .5s both" }}>Connecting to PNG Intelligence Network...</div>
      </div>
    </>
  );

  if (screen==="auth") return <><style>{GLOBAL_CSS}</style><AuthScreen onAuth={handleAuth}/></>;

  const SCREENS = {
    feed: <AlertFeed alerts={alerts} user={user} onPublish={handlePublish}/>,
    map: <LifeMapScreen user={user} onUpdate={updateUser}/>,
    mps: <MPTracker userProvince={user?.homeProvince}/>,
    land: <LandRegistry/>,
    publish: <Publisher onPublish={handlePublish} user={user}/>,
    settings: <Settings user={user} onUpdate={updateUser} onLogout={handleLogout}/>,
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {!user?.onboarded&&<Onboarding onComplete={async profile=>{ const u={...user,...profile}; await storage.set("wn_user",JSON.stringify(u)); setUser(u); }}/>}
      <div style={{ minHeight:"100vh", background:G.black }}>
        <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:900, background:"rgba(8,9,12,.95)", backdropFilter:"blur(24px)", borderBottom:`1px solid ${G.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 22px", height:56 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}><Hex size={30} fontSize={11}/><span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:G.text }}>Wantok <em style={{ fontStyle:"normal", color:G.gold }}>Nation</em></span></div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontFamily:"'Space Mono',monospace", fontSize:10, color:G.gold, fontWeight:700, letterSpacing:".08em" }}><PulseDot/>LIVE · {alerts.length} ALERTS</div>
              <div style={{ position:"relative" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:G.gold, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:12, color:G.black, cursor:"pointer" }}>{user?.name?.[0]?.toUpperCase()||"U"}</div>
                {unread>0&&<div style={{ position:"absolute", top:-3, right:-3, width:14, height:14, background:G.red, borderRadius:"50%", fontSize:8, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>{unread>9?"9+":unread}</div>}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:0, padding:"0 18px", borderTop:`1px solid ${G.borderL}`, overflowX:"auto" }}>
            {NAV_TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setUnread(0);}} style={{ padding:"10px 14px", fontSize:12, fontWeight:600, color:tab===t.id?G.gold:G.muted, background:"none", border:"none", borderBottom:`2px solid ${tab===t.id?G.gold:"transparent"}`, cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s", fontFamily:"'DM Sans',sans-serif" }}>{t.label}</button>)}
          </div>
        </nav>
        <Ticker/>
        <div style={{ paddingTop:120, maxWidth:1160, margin:"0 auto", padding:"120px 18px 40px" }}>
          {SCREENS[tab]||SCREENS.feed}
        </div>
        <ToastSystem toasts={toasts}/>
      </div>
    </>
  );
}
