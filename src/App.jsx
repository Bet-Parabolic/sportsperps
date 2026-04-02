import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer,
  CartesianGrid, Tooltip, ReferenceLine, Scatter
} from "recharts";
import {
  Play, Pause, RotateCcw, Zap, X, TrendingUp, TrendingDown,
  Trophy, Target, DollarSign, Activity, ChevronRight, ArrowRight, Shield
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   BRAND — AGGRESSIVE FINTECH
   ═══════════════════════════════════════════════════════════ */
const B = {
  primary: "#14b8a6", primaryLight: "#2dd4bf", warm: "#ff5028",
  green: "#22c55e", greenLight: "#4ade80",
  pink: "#ff2d6f", red: "#ef4444",
  cyan: "#00d4ff", ice: "#5ce1ff", blue: "#0088cc",
  white: "#f0f0f0", dim: "#888888", mute: "#444444",
  bg: "#000000", card: "#0a0a0a", surface: "#111111",
  border: "#1a1a1a", border2: "#252525",
  grad: "linear-gradient(135deg, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00d4ff)",
  gradText: "linear-gradient(90deg, #ff6b2b, #ff9f1c, #5ce1ff, #00d4ff)",
};

/* ─── Backend API ─── */
const API_URL = "https://perpdictions-backend-production.up.railway.app/api";

const fd = "'Plus Jakarta Sans',sans-serif";
const fb = "'DM Sans',sans-serif";
const fm = "'JetBrains Mono','SF Mono',monospace";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap";
const LOGO_NAV = "data:image/png;base64,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";
const LOGO_MARK = "data:image/png;base64,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";

/* ═══════════════════════════════════════════════════════════
   GAME DATASETS
   ═══════════════════════════════════════════════════════════ */
const GAMES = [
  {
    id: "nfl-sb59", sport: "NFL", label: "Super Bowl LIX",
    subtitle: "Feb 9, 2025 · New Orleans", tagline: "Eagles deny Chiefs three-peat — 40-22 blowout",
    emoji: "🏈",
    home: { name: "Eagles", short: "PHI", logo: "🦅", light: "#22c55e" },
    away: { name: "Chiefs", short: "KC", logo: "🏹", light: "#ff2d6f" },
    xTick: v => {const q=Math.floor(v/15)+1;const mInQ=15-(v%15);const m=Math.floor(mInQ);const s=Math.round((mInQ-m)*60);if(v>=60)return"FINAL";if(v%15===0&&v>0)return"Q"+Math.min(q,4);return m+":"+(s<10?"0":"")+s;},
    periodLabel: q => q===0?"HALF":"Q"+q, playsLabel: "SCORING PLAYS",
    raw: [
      [0,.58,0,0,1,"15:00","Kickoff — Eagles receive",false],[2,.62,3,0,1,"11:45","⚡ PHI FG — Elliott 36yd",true],
      [4,.64,3,0,1,"8:30","KC 3-and-out, Mahomes sacked",false],[6,.72,10,0,1,"5:15","⚡ PHI TD — Hurts 1yd tush push!",true],
      [8,.74,10,0,1,"2:30","KC punt, Eagles D dominates",false],[10,.76,13,0,1,"0:30","⚡ PHI FG — Elliott 48yd",true],
      [12,.78,13,0,2,"13:00","KC 3-and-out again",false],[14,.82,13,0,2,"10:30","Mahomes INT! Baun picks it!",false],
      [16,.87,20,0,2,"8:00","⚡ PHI TD — Hurts 18yd to A.J. Brown!",true],[18,.85,20,0,2,"5:30","KC drives to midfield, punt",false],
      [20,.84,20,0,2,"3:45","PHI short drive",false],[22,.92,24,0,2,"2:00","⚡ PHI Pick-6! DeJean birthday INT!",true],
      [24,.90,24,0,2,"0:30","KC incomplete, end of half",false],[26,.90,24,0,0,"HALF","HALFTIME — Eagles dominate 24-0",false],
      [28,.91,24,0,3,"13:00","PHI receives, drives",false],[30,.93,27,0,3,"10:00","⚡ PHI FG — Elliott 33yd",true],
      [32,.92,27,0,3,"7:30","KC finally moves the ball",false],[34,.95,34,0,3,"5:00","⚡ PHI TD — Hurts 46yd to Smith!",true],
      [36,.92,34,0,3,"3:00","KC drives into PHI territory",false],[38,.88,34,8,3,"0:45","⚡ KC TD — Hopkins 7yd + 2pt!",true],
      [40,.89,34,8,4,"14:00","Q4 — PHI up 26",false],[42,.91,37,8,4,"11:00","⚡ PHI FG — Elliott 29yd",true],
      [44,.90,37,8,4,"8:30","KC drives deep",false],[46,.86,37,16,4,"6:00","⚡ KC TD — Worthy 50yd + 2pt!",true],
      [48,.89,37,16,4,"4:00","PHI running clock",false],[50,.93,40,16,4,"2:30","⚡ PHI FG — Elliott 26yd record!",true],
      [52,.91,40,16,4,"1:30","KC hurry-up",false],[54,.90,40,22,4,"0:40","⚡ KC TD — Worthy 2yd",true],
      [56,.94,40,22,4,"0:30","Onside kick — PHI recovers!",false],[58,.97,40,22,4,"0:10","PHI victory formation",false],
      [60,1.0,40,22,4,"FINAL","🏆 EAGLES WIN 40-22!!",true],
    ],
  },
  {
    id: "mlb-ws7", sport: "MLB", label: "World Series Game 7",
    subtitle: "Nov 1, 2025 · Toronto", tagline: "Dodgers' 11th-inning comeback — back-to-back champs",
    emoji: "⚾",
    home: { name: "Dodgers", short: "LAD", logo: "🔵", light: "#60a5fa" },
    away: { name: "Blue Jays", short: "TOR", logo: "🐦", light: "#00d4ff" },
    xTick: v => { if(v>=55)return"11th"; if(v>=50)return"10th"; const i=Math.floor(v/5.5)+1; return i<=9?i+"":"EX"; },
    periodLabel: q => q===0?"MID":"INN "+q, playsLabel: "KEY PLAYS",
    raw: [
      [0,.48,0,0,1,"Top 1","First pitch — Ohtani on the mound",false],[3,.46,0,0,1,"Bot 1","Scoreless 1st",false],
      [5,.45,0,0,2,"Top 2","LAD goes down in order",false],[8,.43,0,0,2,"Bot 2","TOR singles, stranded",false],
      [11,.42,0,0,3,"Top 3","LAD pop out",false],[13,.26,0,3,3,"Bot 3","⚡ TOR 3-run HR! Bichette!",true],
      [16,.28,0,3,4,"Top 4","LAD double play",false],[19,.26,0,3,4,"Bot 4","TOR stranded",false],
      [22,.32,1,3,5,"Top 5","⚡ LAD HR — Ohtani!",true],[25,.30,1,3,5,"Bot 5","TOR 1-2-3",false],
      [27,.33,1,3,6,"Top 6","LAD corners",false],[28,.36,2,3,6,"Top 6","⚡ LAD sac fly — 2-3!",true],
      [30,.30,2,4,6,"Bot 6","⚡ TOR RBI double!",true],[33,.28,2,4,7,"Top 7","LAD double play",false],
      [36,.27,2,4,7,"Bot 7","Yesavage 1-2-3",false],[38,.26,2,4,8,"Top 8","LAD rally...",false],
      [39,.40,3,4,8,"Top 8","⚡ LAD HR! Muncy!",true],[41,.38,3,4,8,"Bot 8","TOR quiet",false],
      [43,.35,3,4,9,"Top 9","Last chance...",false],[44,.32,3,4,9,"Top 9","One out...",false],
      [45,.58,4,4,9,"Top 9","⚡⚡ ROJAS TIES IT! 4-4!!",true],[47,.54,4,4,9,"Bot 9","Yamamoto enters",false],
      [48,.56,4,4,9,"Bot 9","Yamamoto escapes!",false],[50,.52,4,4,10,"Top 10","No run",false],
      [52,.46,4,4,10,"Bot 10","TOR loads bases... escapes!",false],[54,.55,4,4,11,"Top 11","Smith vs Bieber...",false],
      [55,.84,5,4,11,"Top 11","⚡⚡ SMITH HR!! 5-4!!",true],[57,.80,5,4,11,"Bot 11","Yamamoto closing...",false],
      [58,.72,5,4,11,"Bot 11","Guerrero doubles!",false],[59,.88,5,4,11,"Bot 11","DOUBLE PLAY!! OVER!!",false],
      [60,1.0,5,4,11,"FINAL","🏆 DODGERS WIN 5-4!!",true],
    ],
  },
  {
    id: "nba-fin1", sport: "NBA", label: "NBA Finals Game 1",
    subtitle: "Jun 5, 2025 · OKC", tagline: "Haliburton 0.3s buzzer-beater stuns Thunder",
    emoji: "🏀",
    home: { name: "Pacers", short: "IND", logo: "🏎️", light: "#fbbf24" },
    away: { name: "Thunder", short: "OKC", logo: "⚡", light: "#60a5fa" },
    xTick: v => {const q=Math.floor(v/15)+1;const mInQ=12-(v%15)*(12/15);const m=Math.floor(Math.max(0,mInQ));const s=Math.round(Math.max(0,(mInQ-m)*60));if(v>=60)return"FINAL";if(v%15===0&&v>0)return"Q"+Math.min(q,4);return m+":"+(s<10?"0":"")+s;},
    periodLabel: q => q===0?"HALF":"Q"+q, playsLabel: "KEY PLAYS",
    raw: [
      [0,.30,0,0,1,"12:00","Tip-off",false],[2,.26,4,10,1,"9:30","⚡ OKC 10-4 run",true],
      [4,.22,10,18,1,"6:45","⚡ SGA three! OKC up 8",true],[6,.26,18,22,1,"4:00","⚡ IND Siakam and-1!",true],
      [8,.24,22,28,1,"1:30","⚡ OKC Williams jumper",true],[10,.23,24,31,1,"0:00","End Q1 — OKC 31-24",false],
      [12,.20,28,38,2,"9:00","⚡ SGA step-back! Up 10",true],[14,.16,32,45,2,"6:30","⚡ OKC Holmgren block!",true],
      [16,.20,40,49,2,"4:00","⚡ IND Mathurin three!",true],[18,.18,44,55,2,"1:30","⚡ OKC Caruso steal",true],
      [20,.20,48,57,2,"0:00","End Q2 — OKC 57-48",false],[22,.20,48,57,0,"HALF","HALFTIME — Thunder +9",false],
      [24,.15,52,64,3,"9:30","⚡ OKC 7-0 run! Up 12",true],[26,.12,54,70,3,"7:00","⚡ SGA floater! Up 16!",true],
      [28,.18,62,74,3,"4:30","⚡ IND 8-0 run!",true],[30,.22,68,78,3,"2:00","⚡ IND Mathurin three!",true],
      [32,.25,75,83,3,"0:00","End Q3 — OKC 83-75",false],[34,.30,80,87,4,"10:30","⚡ IND Turner dunk!",true],
      [36,.35,86,90,4,"8:00","⚡ IND Mathurin! Within 4!",true],[38,.30,88,95,4,"6:30","⚡ OKC SGA and-1",true],
      [40,.42,95,98,4,"5:00","⚡ IND 7-0 run! Tied 98!",true],[42,.45,98,98,4,"4:15","Pacers rolling!",false],
      [44,.35,100,105,4,"3:00","⚡ OKC SGA 7 straight!",true],[46,.42,105,107,4,"2:00","⚡ IND Haliburton! -2!",true],
      [48,.38,107,110,4,"1:15","⚡ OKC Williams three! +3!",true],[50,.45,110,110,4,"0:45","⚡ IND Siakam ties!",true],
      [52,.48,110,110,4,"0:30","SGA blocked by Turner!",false],[54,.50,110,110,4,"0:15","OKC timeout...",false],
      [56,.48,110,110,4,"0:05","SGA misses!",false],[58,.65,110,110,4,"0:03","IND timeout...",false],
      [59,.95,111,110,4,"0:00","⚡⚡ HALIBURTON!! 0.3s!! IND WINS!!",true],
      [60,1.0,111,110,4,"FINAL","🏆 PACERS 111-110!!",true],
    ],
  },
];

function processGame(g) {
  const plays = g.raw.map(([t,p,hs,as,q,c,e,sc]) => ({t,p,hs,as,q,c,e,scoring:sc}));
  return { ...g, plays, scoringPlays: plays.filter(p => p.scoring && p.e.includes("⚡")) };
}
const PROC_GAMES = GAMES.map(processGame);



const BOX = {
  "nfl-sb59": {
    qtr:[{q:"Q1",h:7,a:0},{q:"Q2",h:17,a:0},{q:"Q3",h:10,a:6},{q:"Q4",h:6,a:16}],
    team:[["1st Downs","22","11"],["Total Yards","345","306"],["Pass Yds","210","226"],["Rush Yds","135","49"],["Turnovers","1","3"],["Sacks-Yds","2-11","6-31"],["Penalties","5-35","3-20"],["3rd Down","6/11","3/12"],["Possession","34:12","25:48"]],
    pass:{h:[["J. Hurts","17/22","221","2","1"],["K. Pickett","0/1","0","0","0"]],a:[["P. Mahomes","21/32","257","3","2"]]},
    rush:{h:[["J. Hurts","11","72","1"],["S. Barkley","25","57","0"],["K. Gainwell","6","10","0"]],a:[["P. Mahomes","4","25","0"],["K. Hunt","3","9","0"],["I. Pacheco","3","7","0"]]},
    rec:{h:[["D. Smith","4","69","1"],["S. Barkley","6","40","0"],["A.J. Brown","5","43","1"],["J. Dotson","2","42","0"],["D. Goedert","2","27","0"]],a:[["X. Worthy","8","157","2"],["T. Kelce","4","39","0"],["D. Hopkins","6","21","1"],["JuJu Smith-S.","1","15","0"]]},
    def:{h:[["J. Sweat","6","2.5","0"],["M. Williams","4","2.0","0"],["Z. Baun","7","0","1"],["C. DeJean","4","0","1"],["O. Burks","5","0","0"]],a:[["D. Tranquill","11","0","0"],["N. Bolton","10","0","0"],["J. Reid","9","0","0"]]},
    passH:["Name","C/A","Yds","TD","INT"],rushH:["Name","Att","Yds","TD"],recH:["Name","Rec","Yds","TD"],defH:["Name","Tkl","Sck","INT"]
  },
  "mlb-ws7": {
    qtr:[{q:"1",h:0,a:0},{q:"2",h:0,a:0},{q:"3",h:0,a:3},{q:"4",h:0,a:0},{q:"5",h:1,a:0},{q:"6",h:1,a:1},{q:"7",h:0,a:0},{q:"8",h:1,a:0},{q:"9",h:1,a:0},{q:"10",h:0,a:0},{q:"11",h:1,a:0}],
    team:[["Hits","9","7"],["Errors","0","1"],["LOB","8","11"],["HRs","4","1"]],
    pass:{h:[["S. Ohtani","4.1 IP","3 ER","6 K",""],["Y. Yamamoto","2.2 IP","0 ER","3 K","W"]],a:[["M. Scherzer","4.1 IP","1 ER","3 K",""],["T. Yesavage","2.0 IP","1 ER","4 K","L"]]},
    rush:{h:[["W. Smith","5 AB","2 H","2 HR"],["S. Ohtani","5 AB","1 H","1 HR"],["M. Muncy","4 AB","1 H","1 HR"],["M. Rojas","4 AB","1 H","1 HR"]],a:[["B. Bichette","4 AB","1 H","1 HR"],["A. Giménez","3 AB","1 H","1 2B"],["V. Guerrero Jr.","5 AB","2 H","1 2B"]]},
    rec:{h:[],a:[]},def:{h:[],a:[]},
    passH:["Pitcher","IP","ERA","K","Dec"],rushH:["Batter","AB","H","XBH"],recH:[],defH:[]
  },
  "nba-fin1": {
    qtr:[{q:"Q1",h:24,a:31},{q:"Q2",h:24,a:26},{q:"Q3",h:27,a:26},{q:"Q4",h:36,a:27}],
    team:[["FG%","45.9%","44.3%"],["3PT%","35.7%","32.4%"],["FT%","78.6%","81.3%"],["Rebounds","44","41"],["Assists","26","28"],["Steals","9","5"],["Blocks","4","6"],["Turnovers","14","16"]],
    pass:{h:[["T. Haliburton","22 pts","8 reb","10 ast","GW"],["B. Mathurin","27 pts","3 reb","2 ast",""],["P. Siakam","20 pts","7 reb","4 ast",""],["M. Turner","18 pts","11 reb","2 blk",""]],a:[["S. Gilgeous-Alexander","38 pts","5 reb","8 ast",""],["J. Williams","19 pts","8 reb","5 ast",""],["C. Holmgren","15 pts","12 reb","5 blk",""],["A. Caruso","12 pts","3 reb","4 stl",""]]},
    rush:{h:[],a:[]},rec:{h:[],a:[]},def:{h:[],a:[]},
    passH:["Player","PTS","REB","AST","Note"],rushH:[],recH:[],defH:[]
  }
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const noise = r => (Math.random()-.5)*2*r;
const fmt3 = n => n.toFixed(3);
const fmtUsd = n => (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
const fmtPct = n => (n>=0?"+":"")+n.toFixed(1)+"%";
const pctClr = n => n>0?B.green:n<0?B.pink:"#7a8599";

function weightedMedian(items) {
  const s=[...items].sort((a,b)=>a.v-b.v); const tot=s.reduce((x,i)=>x+i.w,0); let c=0;
  for(const i of s){c+=i.w;if(c>=tot/2)return i.v;} return s[s.length-1].v;
}
function catmullRom(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);}
function getGameState(t,plays){
  if(t>=plays[plays.length-1].t)return{...plays[plays.length-1]};
  for(let i=0;i<plays.length-1;i++){if(t>=plays[i].t&&t<plays[i+1].t){
    const f=(t-plays[i].t)/(plays[i+1].t-plays[i].t),i0=Math.max(0,i-1),i3=Math.min(plays.length-1,i+2);
    const sp=clamp(catmullRom(plays[i0].p,plays[i].p,plays[i+1].p,plays[i3].p,f),.01,.99);
    return{prob:sp,hs:plays[i].hs,as:plays[i].as,q:plays[i].q,c:plays[i].c,e:plays[i].e};
  }} return{...plays[0]};
}
function makeSources(p){return[
  {name:"Polymarket",v:clamp(p+noise(.012),.01,.99),w:.30,color:"#818cf8"},
  {name:"Kalshi",v:clamp(p+noise(.008),.01,.99),w:.25,color:"#fbbf24"},
  {name:"Books",v:clamp(p+noise(.006),.01,.99),w:.25,color:"#fbbf24"},
  {name:"ESPN",v:clamp(p+noise(.018),.01,.99),w:.10,color:B.pink},
  {name:"Model",v:clamp(p+noise(.010),.01,.99),w:.10,color:B.cyan},
];}
function makeBook(mid){const sp=.004,asks=[],bids=[];for(let i=0;i<8;i++){
  asks.push({price:+(mid+sp/2+i*.003).toFixed(3),size:Math.max(10,Math.round((160-i*14)*(.7+Math.random()*.6)))});
  bids.push({price:+(mid-sp/2-i*.003).toFixed(3),size:Math.max(10,Math.round((160-i*14)*(.7+Math.random()*.6)))});
}return{asks:asks.reverse(),bids};}
function maxLev(p){const d=Math.min(p,1-p);if(d>=.2)return 10;if(d>=.1)return 5;if(d>=.05)return 3;return 2;}
function liqPrice(side,entry,lev){return side==="home"?entry*(1-1/lev):entry*(1+1/lev);}
function calcPnL(side,exposure,entry,mark){return side==="home"?exposure*(mark-entry)/entry:exposure*(entry-mark)/entry;}

function HomeMarkerDot({cx,cy,payload}){
  if(!payload||!payload.mh_marker||cx==null||cy==null)return null;const m=payload.mh_marker;
  if(m==="entry")return(<g><circle cx={cx} cy={cy} r={6} fill="#059669" stroke={B.primary} strokeWidth={2}/><text x={cx} y={cy-12} textAnchor="middle" fill={B.primary} fontSize={9} fontWeight="900">BUY</text></g>);
  if(m==="exit-win")return(<g><polygon points={`${cx},${cy-8} ${cx-6},${cy+4} ${cx+6},${cy+4}`} fill={B.primary} strokeWidth={1}/><text x={cx} y={cy-12} textAnchor="middle" fill={B.primary} fontSize={9} fontWeight="900">WIN</text></g>);
  if(m==="exit-loss")return(<g><polygon points={`${cx},${cy+8} ${cx-6},${cy-4} ${cx+6},${cy-4}`} fill={B.pink}/><text x={cx} y={cy+20} textAnchor="middle" fill={B.pink} fontSize={9} fontWeight="900">LOSS</text></g>);
  if(m==="liquidated")return(<g><rect x={cx-7} y={cy-7} width={14} height={14} rx={3} fill="#dc2626" stroke="#fca5a5" strokeWidth={2}/><text x={cx} y={cy+4} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="900">X</text></g>);
  if(m==="settle")return(<g><circle cx={cx} cy={cy} r={9} fill="rgba(255,159,28,0.12)" stroke={B.primary} strokeWidth={2}/><text x={cx} y={cy+4} textAnchor="middle" fontSize={11} fill={B.primary} fontWeight="900">W</text></g>);
  return null;
}
function AwayMarkerDot({cx,cy,payload}){
  if(!payload||!payload.ma_marker||cx==null||cy==null)return null;const m=payload.ma_marker;
  if(m==="entry")return(<g><circle cx={cx} cy={cy} r={6} fill="#be123c" stroke={B.pink} strokeWidth={2}/><text x={cx} y={cy-12} textAnchor="middle" fill={B.pink} fontSize={9} fontWeight="900">BUY</text></g>);
  if(m==="exit-win")return(<g><polygon points={`${cx},${cy-8} ${cx-6},${cy+4} ${cx+6},${cy+4}`} fill={B.primary}/><text x={cx} y={cy-12} textAnchor="middle" fill={B.primary} fontSize={9} fontWeight="900">WIN</text></g>);
  if(m==="exit-loss")return(<g><polygon points={`${cx},${cy+8} ${cx-6},${cy-4} ${cx+6},${cy-4}`} fill={B.pink}/><text x={cx} y={cy+20} textAnchor="middle" fill={B.pink} fontSize={9} fontWeight="900">LOSS</text></g>);
  if(m==="liquidated")return(<g><rect x={cx-7} y={cy-7} width={14} height={14} rx={3} fill="#dc2626" stroke="#fca5a5" strokeWidth={2}/><text x={cx} y={cy+4} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="900">X</text></g>);
  return null;
}
function ChartTip({active,payload}){
  if(!active||!payload||!payload[0])return null;const d=payload[0].payload;
  return(<div style={{background:"#000",border:"1px solid "+B.border2,borderRadius:8,padding:"8px 14px"}}>
    <div style={{display:"flex",gap:16}}>
      <span style={{color:B.primary,fontWeight:900,fontSize:15,fontFamily:fm}}>{((d.ph||0)*100).toFixed(1)}%</span>
      <span style={{color:B.pink,fontWeight:900,fontSize:15,fontFamily:fm}}>{((d.pa||0)*100).toFixed(1)}%</span>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE — BOLD FINTECH
   ═══════════════════════════════════════════════════════════ */
function LandingPage({ onLaunch, onDocs }) {
  const [vis, setVis] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { setTimeout(() => setVis(true), 50); }, []);
  useEffect(() => { const iv = setInterval(() => setTick(t => t+1), 2000); return () => clearInterval(iv); }, []);

  // Logo palette: red → orange → amber → white → cyan → teal
  const R = "#ff5028", T = "#14b8a6", TL = "#2dd4bf";
  const logoGrad = "linear-gradient(90deg, #ff1744, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00b8d4)";
  const a = (d) => ({
    opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });
  const liveProb = 58.2 + Math.sin(tick * 0.5) * 2.1;

  return (
    <div style={{background:"#030303",minHeight:"100vh",fontFamily:fb,color:"#fff",overflow:"hidden",position:"relative"}}>
      {/* Background — flowing lines in red/teal + ambient glows */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <svg viewBox="0 0 1440 900" style={{width:"100%",height:"100%",position:"absolute"}} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gW" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0.07"/><stop offset="50%" stopColor="#ff6b2b" stopOpacity="0.04"/><stop offset="100%" stopColor="#ff9f1c" stopOpacity="0"/></linearGradient>
            <linearGradient id="gC" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#00b8d4" stopOpacity="0.06"/><stop offset="50%" stopColor="#14b8a6" stopOpacity="0.03"/><stop offset="100%" stopColor="#5ce1ff" stopOpacity="0"/></linearGradient>
            <linearGradient id="gM" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0"/><stop offset="30%" stopColor="#ff6b2b" stopOpacity="0.04"/><stop offset="70%" stopColor="#5ce1ff" stopOpacity="0.04"/><stop offset="100%" stopColor="#00b8d4" stopOpacity="0"/></linearGradient>
            <linearGradient id="gF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fff" stopOpacity="0.02"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></linearGradient>
            <radialGradient id="rR" cx="25%" cy="30%" r="40%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0.06"/><stop offset="100%" stopColor="#ff1744" stopOpacity="0"/></radialGradient>
            <radialGradient id="rT" cx="75%" cy="60%" r="40%"><stop offset="0%" stopColor="#14b8a6" stopOpacity="0.05"/><stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#rR)"/>
          <rect width="1440" height="900" fill="url(#rT)"/>
          <path d="M-100,200 C200,150 450,300 720,180 S1100,250 1540,120" fill="none" stroke="url(#gW)" strokeWidth="2"/>
          <path d="M-100,280 C250,230 400,380 700,260 S1050,330 1540,200" fill="none" stroke="url(#gW)" strokeWidth="1.2"/>
          <path d="M-100,120 C300,80 500,200 800,100 S1200,170 1540,50" fill="none" stroke="url(#gW)" strokeWidth="0.8"/>
          <path d="M-100,550 C200,520 500,620 800,530 S1100,600 1540,490" fill="none" stroke="url(#gC)" strokeWidth="2"/>
          <path d="M-100,650 C300,630 550,710 850,620 S1150,680 1540,590" fill="none" stroke="url(#gC)" strokeWidth="1"/>
          <path d="M-100,750 C250,730 450,790 750,720 S1050,770 1540,680" fill="none" stroke="url(#gC)" strokeWidth="0.7"/>
          <path d="M-100,400 C300,350 550,500 800,380 S1100,450 1540,320" fill="none" stroke="url(#gM)" strokeWidth="1.5"/>
          <path d="M-100,470 C350,440 600,540 900,440 S1200,510 1540,400" fill="none" stroke="url(#gM)" strokeWidth="1"/>
          <path d="M0,-50 C250,100 500,250 750,350 S1100,500 1440,650" fill="none" stroke="url(#gF)" strokeWidth="0.5"/>
          <path d="M300,-50 C450,80 650,200 900,300 S1200,430 1440,550" fill="none" stroke="url(#gF)" strokeWidth="0.4"/>
        </svg>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* NAV */}
        <div style={{...a(0),padding:"16px 32px",display:"flex",justifyContent:"center"}}>
          <nav style={{width:"100%",maxWidth:900,padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0a0a0acc",backdropFilter:"blur(20px)",borderRadius:16,border:"1px solid #1f1f1f"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <img src={LOGO_NAV} style={{height:36,width:"auto"}} alt="Perpdictions"/>
              <span style={{fontFamily:fd,fontWeight:800,fontSize:24,color:"#fff"}}>Perpdictions</span>
            </div>
            <button onClick={onLaunch} style={{padding:"12px 30px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:18,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:10}}>
              Launch App
            </button>
          </nav>
        </div>

        {/* HERO */}
        <section style={{maxWidth:900,margin:"0 auto",padding:"80px 32px 40px",textAlign:"center"}}>
          <div style={{...a(0.05),marginBottom:20}}>
            <span style={{fontSize:13,fontWeight:600,color:T,display:"inline-flex",alignItems:"center",gap:8,padding:"6px 16px",background:T+"10",borderRadius:20,border:"1px solid "+T+"20"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:T,display:"inline-block",animation:"pulse 2s infinite"}}/>
              Leveraged Sports Markets
            </span>
          </div>
          <h1 style={{...a(0.1),fontFamily:fd,fontSize:72,fontWeight:800,lineHeight:1.0,letterSpacing:"-0.04em",margin:"0 0 24px"}}>
            Leveraged sports<br/>
            <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>perpetuals.</span>
          </h1>
          <p style={{...a(0.15),fontSize:18,lineHeight:1.7,color:"#888",maxWidth:560,margin:"0 auto 36px",fontWeight:400}}>
            Trade live win probability with up to 10x leverage. Multi-oracle pricing. Trustless settlement. No counterparty risk.
          </p>
          <div style={{...a(0.2),display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onLaunch} style={{padding:"14px 36px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:15,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:12}}>
              Try Demo
            </button>
            <button onClick={onDocs} style={{padding:"14px 36px",border:"1px solid #2a2a2a",cursor:"pointer",fontFamily:fb,fontWeight:600,fontSize:15,background:"transparent",color:"#888",borderRadius:12}}>
              Read Docs
            </button>
          </div>
        </section>

        {/* TERMINAL PREVIEW */}
        <div style={{...a(0.25),maxWidth:680,margin:"0 auto",padding:"0 32px 60px"}}>
          <div style={{background:"#0a0a0a",border:"1px solid #1f1f1f",borderRadius:20,overflow:"hidden"}}>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #1f1f1f",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#666",fontWeight:600,fontSize:12}}>Perpdictions terminal</span>
              <span style={{color:T,fontSize:11,display:"flex",alignItems:"center",gap:6,fontFamily:fm}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:T,display:"inline-block"}}/>LIVE
              </span>
            </div>
            <div style={{padding:"20px 24px"}}>
              <div style={{fontSize:12,color:"#555",marginBottom:14}}>NFL · Super Bowl LIX</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>🦅 Eagles Win</div>
                  <div style={{fontSize:40,fontWeight:800,color:"#22c55e",lineHeight:1,fontFamily:fm}}>{liveProb.toFixed(1)}<span style={{fontSize:16,color:"#666"}}>%</span></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>🏹 Chiefs Win</div>
                  <div style={{fontSize:40,fontWeight:800,color:"#ef4444",lineHeight:1,fontFamily:fm}}>{(100-liveProb).toFixed(1)}<span style={{fontSize:16,color:"#666"}}>%</span></div>
                </div>
              </div>
              <div style={{height:80,background:"#050505",borderRadius:12,marginBottom:16,position:"relative",overflow:"hidden",border:"1px solid #1a1a1a"}}>
                <svg viewBox="0 0 300 80" style={{width:"100%",height:"100%"}}>
                  <path d="M0,40 Q30,35 60,38 T120,30 T180,25 T240,20 T300,18" fill="none" stroke={R} strokeWidth="2" opacity="0.8"/>
                  <path d="M0,40 Q30,45 60,42 T120,50 T180,55 T240,60 T300,62" fill="none" stroke={T} strokeWidth="1.5" opacity="0.6"/>
                </svg>
                <div style={{position:"absolute",bottom:4,right:10,fontSize:10,color:"#444"}}>Q1 → Q4</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:"#050505",borderRadius:10,padding:"10px 14px",border:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:11,color:"#555",marginBottom:2}}>Bet Amount</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:fm}}>$1,000</div>
                </div>
                <div style={{background:"#050505",borderRadius:10,padding:"10px 14px",border:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:11,color:"#555",marginBottom:2}}>Leverage</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:fm}}>5<span style={{color:"#555"}}>x</span></div>
                </div>
              </div>
              <div style={{background:T+"10",border:"1px solid "+T+"20",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#888",fontSize:13}}>If Eagles Win</span>
                <span style={{color:TL,fontWeight:800,fontSize:15}}>+$3,620</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats ticker */}
        <div style={{...a(0.3),borderTop:"1px solid #1a1a1a",borderBottom:"1px solid #1a1a1a",overflow:"hidden"}}>
          <div style={{display:"flex",animation:"scroll 20s linear infinite"}}>
            {[...Array(2)].map((_,ri) => (
              <div key={ri} style={{display:"flex",flexShrink:0}}>
                {[{l:"Total Addressable Market",v:"$2.4T"},{l:"Max Leverage",v:"10×"},{l:"Oracle Sources",v:"5"},{l:"Price Updates",v:"<1s"},{l:"Settlement",v:"Trustless"},{l:"Counterparty Risk",v:"Zero"},{l:"Liquidation Engine",v:"Real-Time"}].map((s,i) => (
                  <div key={i} style={{padding:"16px 36px",display:"flex",alignItems:"center",gap:10,whiteSpace:"nowrap",borderRight:"1px solid #1a1a1a"}}>
                    <span style={{fontSize:12,color:"#555",fontWeight:500}}>{s.l}</span>
                    <span style={{fontSize:14,color:"#fff",fontWeight:700,fontFamily:fm}}>{s.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <section style={{maxWidth:1100,margin:"0 auto",padding:"100px 32px"}}>
          <div style={{...a(0.35),textAlign:"center",marginBottom:64}}>
            <span style={{fontSize:70,fontWeight:800,letterSpacing:"-0.03em",background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>How it works</span>
            <h2 style={{fontFamily:fd,fontSize:30,fontWeight:700,letterSpacing:"-0.03em",marginTop:12,lineHeight:1.1,color:"#fff"}}>Three steps. Zero complexity.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[{n:"01",title:"Pick a Side",desc:"Select the team you believe wins. You're trading their win probability as a perpetual future.",c:R},{n:"02",title:"Set Leverage",desc:"1x to 10x. Higher leverage amplifies gains and losses. Dynamic liquidation engine protects the pool.",c:"#ff9f1c"},{n:"03",title:"Trade Live",desc:"Watch the game. Your position moves with real-time oracle prices. Close anytime or ride to settlement.",c:T}].map((s,i) => (
              <div key={s.n} style={{...a(0.4+i*0.05),background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:"36px 28px"}}>
                <div style={{fontSize:48,fontWeight:800,color:s.c,lineHeight:1,marginBottom:20,fontFamily:fm}}>{s.n}</div>
                <h3 style={{fontFamily:fd,fontSize:18,fontWeight:700,marginBottom:10,color:s.c}}>{s.title}</h3>
                <p style={{fontSize:14,lineHeight:1.7,color:"#888",fontWeight:400}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section style={{maxWidth:1100,margin:"0 auto",padding:"0 32px 100px"}}>
          <div style={{...a(0.45),textAlign:"center",marginBottom:64}}>
            <span style={{fontSize:70,fontWeight:800,letterSpacing:"-0.03em",background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Architecture</span>
            <h2 style={{fontFamily:fd,fontSize:30,fontWeight:700,letterSpacing:"-0.03em",marginTop:12,lineHeight:1.1,color:"#fff"}}>DeFi-grade infrastructure.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
            {[{title:"Multi-Oracle Consensus",desc:"Weighted median across Polymarket, Kalshi, sportsbooks, ESPN and our internal model. Manipulation-resistant fair price discovery.",icon:"◉",c:R},{title:"Perpetual Futures",desc:"Continuous price exposure to win probability. Not a binary bet — trade in, trade out at any point during the live game.",icon:"∞",c:"#ff9f1c"},{title:"Liquidation Engine",desc:"Real-time mark-to-market. Dynamic max leverage based on oracle confidence. Automatic liquidation protects the pool.",icon:"⚡",c:TL},{title:"Trustless Settlement",desc:"Every trade, funding payment, and liquidation settles trustlessly. Transparent, verifiable, zero counterparty risk.",icon:"◆",c:T}].map((f,i) => (
              <div key={f.title} style={{...a(0.5+i*0.05),background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:"32px 28px"}}>
                <div style={{fontSize:24,color:f.c,marginBottom:16}}>{f.icon}</div>
                <h4 style={{fontFamily:fd,fontSize:16,fontWeight:700,marginBottom:10}}>{f.title}</h4>
                <p style={{fontSize:14,lineHeight:1.7,color:"#888",fontWeight:400}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{...a(0.6),padding:"80px 32px",textAlign:"center"}}>
          <div style={{maxWidth:700,margin:"0 auto",padding:"60px 40px",background:"#0a0a0a",borderRadius:24,border:"1px solid #1f1f1f",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-50%",left:"-20%",width:"140%",height:"200%",background:`radial-gradient(ellipse at 30% 50%, ${R}08 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, ${T}08 0%, transparent 50%)`,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <h2 style={{fontFamily:fd,fontSize:48,fontWeight:800,letterSpacing:"-0.03em",marginBottom:14}}>
                See it <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>live.</span>
              </h2>
              <p style={{fontSize:16,color:"#888",marginBottom:32,fontWeight:400}}>Replay real championship games with the full trading engine.</p>
              <button onClick={onLaunch} style={{padding:"16px 48px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:16,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:12}}>
                Launch Demo →
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{borderTop:"1px solid #1a1a1a",padding:"24px 48px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:"#444"}}>© 2025 Perpdictions</span>
          <div style={{display:"flex",gap:24}}>
            {["Twitter","Discord","GitHub","Docs"].map(t => (<span key={t} style={{fontSize:13,color:"#555",cursor:"pointer"}}>{t}</span>))}
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOCS PAGE
   ═══════════════════════════════════════════════════════════ */
function DocsPage({ onBack, onLaunch }) {
  const [vis, setVis] = useState(false);
  const [activeSection, setActiveSection] = useState("intro");
  useEffect(() => { setTimeout(() => setVis(true), 50); window.scrollTo(0,0); }, []);
  const a = (d) => ({ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)", transition:`all 0.6s cubic-bezier(0.16,1,0.3,1) ${d}s` });

  const T = "#14b8a6", TL = "#2dd4bf", R = "#ff5028";
  const logoGrad = "linear-gradient(90deg, #ff1744, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00b8d4)";

  const sections = [
    {id:"intro",label:"Introduction"},
    {id:"overview",label:"Overview"},
    {id:"how",label:"How It Works"},
    {id:"architecture",label:"System Architecture"},
    {id:"orderbook",label:"Offchain Orderbook"},
    {id:"oracle",label:"Oracle System"},
    {id:"funding",label:"Funding Rates"},
    {id:"margin",label:"Margin & Leverage"},
    {id:"risk",label:"Risk Management"},
    {id:"lifecycle",label:"Market Lifecycle"},
    {id:"fees",label:"Fees"},
    {id:"liquidity",label:"Liquidity & Vaults"},
    {id:"vaultrisk",label:"Vault Risk Mgmt"},
    {id:"feebuffer",label:"Fee Buffer & Safety"},
    {id:"userincentives",label:"LP Incentives"},
    {id:"settlement",label:"Settlement"},
    {id:"custody",label:"Self-Custody"},
    {id:"competitive",label:"Competitive"},
    {id:"faq",label:"FAQ"},
  ];

  const S = ({id,children}) => (<section id={id} style={{marginBottom:64,scrollMarginTop:100}}>{children}</section>);
  const H = ({children}) => (<h2 style={{fontFamily:fd,fontSize:32,fontWeight:800,marginBottom:20,color:"#fff"}}>{children}</h2>);
  const P = ({children}) => (<p style={{fontSize:15,lineHeight:1.8,color:"#999",marginBottom:16}}>{children}</p>);
  const Card = ({children}) => (<div style={{background:"#111",borderRadius:16,border:"1px solid #1f1f1f",padding:"24px 28px",marginBottom:16}}>{children}</div>);
  const Label = ({children}) => (<span style={{fontSize:12,fontWeight:700,color:T,letterSpacing:"0.06em",display:"block",marginBottom:8}}>{children}</span>);
  const Code = ({children}) => (<div style={{background:"#0a0a0a",borderRadius:10,padding:16,fontFamily:fm,fontSize:13,color:TL,lineHeight:1.6,overflowX:"auto",marginTop:8,marginBottom:8}}>{children}</div>);
  const Row = ({items}) => (<div style={{display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,gap:12,marginTop:12}}>{items.map((it,i)=>(
    <div key={i} style={{background:"#0a0a0a",borderRadius:12,padding:16,...(it.hl?{border:"1px solid "+T+"30",background:T+"08"}:{border:"1px solid #1a1a1a"})}}>{it.content}</div>
  ))}</div>);

  return (
    <div style={{background:"#030303",minHeight:"100vh",fontFamily:fb,color:"#fff"}}>
      <div style={{...a(0),padding:"16px 32px",display:"flex",justifyContent:"center",position:"sticky",top:0,zIndex:20}}>
        <nav style={{width:"100%",maxWidth:900,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0a0a0acc",backdropFilter:"blur(20px)",borderRadius:16,border:"1px solid #1f1f1f"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onBack}>
            <img src={LOGO_NAV} style={{height:26,width:"auto"}} alt="Perpdictions"/>
            <span style={{fontFamily:fd,fontWeight:800,fontSize:17,color:"#fff"}}>Perpdictions</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,color:T,fontWeight:600,padding:"6px 14px",cursor:"pointer"}} onClick={onBack}>Home</span>
            <button onClick={onLaunch} style={{padding:"9px 22px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:13,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:10}}>Launch App</button>
          </div>
        </nav>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 32px 0",display:"flex",gap:48}}>
        <div style={{...a(0.05),width:200,flexShrink:0,position:"sticky",top:88,alignSelf:"flex-start",maxHeight:"calc(100vh - 120px)",overflow:"auto"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#555",marginBottom:16}}>Documentation</div>
          {sections.map(s=>(
            <a key={s.id} href={"#"+s.id} onClick={(e)=>{e.preventDefault();setActiveSection(s.id);document.getElementById(s.id)?.scrollIntoView({behavior:"smooth",block:"start"});}}
              style={{display:"block",padding:"7px 12px",fontSize:12,fontWeight:activeSection===s.id?600:400,color:activeSection===s.id?T:"#666",
                borderLeft:activeSection===s.id?"2px solid "+T:"2px solid transparent",textDecoration:"none",marginBottom:1,borderRadius:"0 6px 6px 0",
                background:activeSection===s.id?T+"08":"transparent",cursor:"pointer"}}>{s.label}</a>
          ))}
        </div>

        <div style={{...a(0.1),flex:1,minWidth:0}}>
          <div style={{marginBottom:64}}>
            <h1 style={{fontFamily:fd,fontSize:48,fontWeight:800,letterSpacing:"-0.03em",marginBottom:12}}>
              <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Documentation</span>
            </h1>
            <P>The complete technical reference for Perpdictions — from product mechanics to infrastructure, risk management, and settlement.</P>
          </div>

          {/* INTRODUCTION */}
          <S id="intro">
            <H>Introduction</H>
            <P>To understand Perpdictions, you need to understand two concepts that already exist — and how combining them creates something entirely new.</P>
            <Card>
              <Label>WHAT ARE PERPETUAL FUTURES?</Label>
              <P>Perpetual futures ("perps") are the most traded financial instrument in crypto — over $150 billion in daily volume and $61.8 trillion in annual volume in 2025. They account for roughly 75% of all crypto trading activity. A perpetual future is a contract that lets you speculate on the price of an asset with leverage, without ever owning the asset itself.</P>
              <P>The key innovation: unlike traditional futures that expire on a fixed date, perps have no expiry. You can hold a position indefinitely, entering and exiting whenever you want. Two mechanisms make this work:</P>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,marginBottom:16}}>
                <div style={{background:"#0a0a0a",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:TL,marginBottom:6}}>Funding Rates</div>
                  <div style={{fontSize:13,color:"#888",lineHeight:1.7}}>A periodic payment exchanged between long and short holders that keeps the perp price tethered to the real asset price. When the perp trades above spot, longs pay shorts. When below, shorts pay longs. This continuous rebalancing replaces the expiration mechanism of traditional futures.</div>
                </div>
                <div style={{background:"#0a0a0a",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:TL,marginBottom:6}}>Liquidations</div>
                  <div style={{fontSize:13,color:"#888",lineHeight:1.7}}>Because leverage amplifies both gains and losses, exchanges automatically close ("liquidate") positions when margin falls below a maintenance threshold. A 10x leveraged position faces liquidation on a ~10% adverse move. An insurance fund covers any shortfall.</div>
                </div>
              </div>
              <div style={{background:"#0a0a0a",borderRadius:12,padding:20}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:10}}>Simple example:</div>
                <div style={{fontSize:14,color:"#999",lineHeight:1.8}}>Bitcoin is at $60,000. You open a 10x long with $6,000 margin = $60,000 exposure. Bitcoin up 5% → $3,000 profit (50% return). Bitcoin down 5% → $3,000 loss. Down ~10% → liquidated, margin wiped out.</div>
              </div>
            </Card>
            <Card>
              <Label>WHAT IS A PREDICTION MARKET?</Label>
              <P>Prediction markets let you trade on real-world event outcomes. Platforms like Polymarket and Kalshi host markets where shares pay $1.00 if an event happens, $0.00 if not. The share price represents consensus probability.</P>
              <Row items={[
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:6}}>Strengths</div><div style={{fontSize:13,color:"#888",lineHeight:1.7}}>Real-money price discovery. Transparent odds. Trade in and out before resolution.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:R,marginBottom:6}}>Limitations</div><div style={{fontSize:13,color:"#888",lineHeight:1.7}}>No leverage — need $5,800 for a $10K position at 58%. Limited live in-game trading. Capital inefficient.</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>PERPDICTIONS: THE COMBINATION</Label>
              <P>Perpdictions applies the perpetual futures model to prediction markets. Instead of flat shares, you open leveraged positions on a team's live win probability or an event's likelihood — the underlying asset is "Eagles win probability" instead of "Bitcoin price."</P>
              <div style={{marginTop:16,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"10px 12px",color:"#666",fontWeight:600}}>Feature</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:"#888"}}>Sportsbooks</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:"#888"}}>Prediction Mkts</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:T,fontWeight:700}}>Perpdictions</th>
                  </tr></thead>
                  <tbody>{[["Leverage","❌","❌","✅ Up to 10x"],["Live trading","❌ Pre-game","⚠️ Limited","✅ Continuous"],["Exit anytime","❌ Locked","✅","✅"],["Self-custody","❌","✅","✅"],["Transparent pricing","❌ Opaque","✅","✅ Multi-oracle"],["Capital efficiency","❌ Full amt","❌ Full amt","✅ Leveraged"]].map(([f,s,p,pd],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a"}}>
                      <td style={{padding:"10px 12px",color:"#ccc",fontWeight:600}}>{f}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:s.startsWith("❌")?"#ef4444":"#888"}}>{s}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:p.startsWith("❌")?"#ef4444":p.startsWith("✅")?"#22c55e":"#ff9f1c"}}>{p}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:T,fontWeight:600}}>{pd}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            </Card>
            <Card>
              <Label>WHO IS THIS FOR?</Label>
              <Row items={[
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Sports Bettors</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Better odds, exit positions, leverage, transparent multi-source pricing.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Prediction Traders</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Leverage amplifies conviction. Live in-game trading. On-chain verifiability.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>DeFi Traders</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Familiar perps UX applied to previously untradeable markets — sports, politics, events become tradeable assets.</div></>}
              ]}/>
            </Card>
          </S>

          {/* OVERVIEW */}
          <S id="overview">
            <H>Overview</H>
            <P>Perpdictions is a leveraged sports prediction market where users trade perpetual futures contracts on live win probability. Trade in and out during live games, settle on-chain at game conclusion.</P>
            <Row items={[{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>10x</div><div style={{fontSize:12,color:"#666"}}>Max Leverage</div></>},{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>{"<1s"}</div><div style={{fontSize:12,color:"#666"}}>Price Updates</div></>},{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>$0</div><div style={{fontSize:12,color:"#666"}}>Counterparty Risk</div></>}]}/>
          </S>

          {/* HOW IT WORKS */}
          <S id="how">
            <H>How It Works</H>
            <P>A contract tracks the win probability of a team (price $0.00–$1.00). At game end, contracts settle at $1.00 (win) or $0.00 (loss).</P>
            <Card>
              <Label>EXAMPLE TRADE</Label>
              <P>Eagles at $0.58 (58%). Long $1,000 at 5x = $5,000 exposure.</P>
              <Row items={[
                {content:<><div style={{fontSize:12,color:"#22c55e",fontWeight:700,marginBottom:4}}>Probability → 70%</div><div style={{fontSize:24,fontWeight:800,color:"#22c55e",fontFamily:fm}}>+$1,034</div><div style={{fontSize:11,color:"#666",marginTop:4}}>103.4% ROI</div></>},
                {content:<><div style={{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:4}}>Probability → 40%</div><div style={{fontSize:24,fontWeight:800,color:"#ef4444",fontFamily:fm}}>-$1,552</div><div style={{fontSize:11,color:"#666",marginTop:4}}>Liquidation risk ~46%</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>KEY PROPERTIES</Label>
              {["Binary terminal settlement — contracts settle at exactly $0 or $1","Bounded price — probability constrained 0–1, affects liquidation math","Convexity near extremes — moves become more violent near 0% or 100%","Time decay — probability converges faster as game progresses","Discrete event risk — single plays can move probability 20%+ instantly"].map((s,i)=>(
                <div key={i} style={{padding:"8px 14px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:8,fontSize:13,color:"#888",marginBottom:2}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* SYSTEM ARCHITECTURE */}
          <S id="architecture">
            <H>System Architecture</H>
            <P>Perpdictions uses a hybrid offchain/onchain architecture. Low-latency operations (order matching, risk checks, oracle aggregation) run offchain for speed. Fund custody, settlement, and insurance run on-chain on Base for trustlessness.</P>
            <Card>
              <Label>THREE-LAYER STACK</Label>
              {[{l:"User Layer",d:"Web app + embedded wallet (Privy). Fiat onramp via MoonPay/Stripe → USDC on Base.",c:T},{l:"Offchain Engine",d:"Matching engine, risk engine, oracle aggregator, orderbook manager, API gateway. Sub-100ms latency. Batched settlements every ~10 seconds.",c:"#ff9f1c"},{l:"Onchain (Base)",d:"Vault contract (fund custody), Clearinghouse (positions/margin), Settlement contract (final payouts), Insurance Fund, Oracle Registry.",c:R}].map((layer,i)=>(
                <div key={i} style={{display:"flex",gap:16,padding:"14px 16px",background:"#0a0a0a",borderRadius:10,marginBottom:8,alignItems:"center"}}>
                  <div style={{width:48,textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:28,fontWeight:800,color:layer.c,fontFamily:fm}}>{i+1}</div>
                  </div>
                  <div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}>{layer.l}</div><div style={{fontSize:12,color:"#888",lineHeight:1.6}}>{layer.d}</div></div>
                </div>
              ))}
            </Card>
            <Card>
              <Label>SMART CONTRACTS (BASE)</Label>
              {[{n:"Vault",d:"Holds all user USDC. Only the Clearinghouse can move funds between accounts."},{n:"Clearinghouse",d:"Core accounting — positions, margin balances, realized P&L. Processes batched trade settlements atomically."},{n:"Insurance Fund",d:"USDC pool absorbing liquidation deficits. Funded by 20% of fees + liquidation surplus."},{n:"Settlement",d:"Reads final oracle price at game end. Distributes funds: winners get $1, losers get $0."},{n:"Oracle Registry",d:"Stores latest oracle prices, approved data sources, and game metadata."}].map((c,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",background:"#0a0a0a",borderRadius:8,marginBottom:4,alignItems:"flex-start"}}>
                  <span style={{fontSize:12,fontWeight:700,color:T,fontFamily:fm,flexShrink:0,width:90}}>{c.n}</span>
                  <span style={{fontSize:12,color:"#888"}}>{c.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* OFFCHAIN ORDERBOOK */}
          <S id="orderbook">
            <H>Offchain Orderbook</H>
            <P>A central limit order book (CLOB) maintained offchain for sub-100ms performance. Sports events move fast — a single NFL play can shift probability 15% in under 3 seconds.</P>
            <Card>
              <Label>ORDER TYPES</Label>
              <Row items={[
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Limit</div><div style={{fontSize:11,color:"#888"}}>Specify price + size. Rests on book until filled.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Market</div><div style={{fontSize:11,color:"#888"}}>Execute immediately at best price. Walks the book.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Reduce-Only</div><div style={{fontSize:11,color:"#888"}}>Can only reduce a position. Used for stop-losses.</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>MATCHING FLOW</Label>
              {["User signs order intent with embedded wallet","API Gateway validates signature + margin","Matching Engine checks risk via Risk Engine","Match found → trade executed, positions updated","Trade added to settlement batch queue","Every ~10s, batch submitted on-chain to Clearinghouse"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <P>Why offchain? On-chain orderbooks on Base would add ~2s latency, gas per order, and MEV/frontrunning risk. Mitigation: all trades published to append-only log + periodic Merkle root commitments on-chain.</P>
          </S>

          {/* ORACLE */}
          <S id="oracle">
            <H>Oracle System</H>
            <P>Custom multi-source oracle using weighted median (more manipulation-resistant than weighted average).</P>
            <Card>
              <Label>DATA SOURCES</Label>
              {[{tier:"Tier 1",name:"Prediction Markets",src:"Polymarket, Kalshi",w:"55%",d:"Direct probability pricing"},{tier:"Tier 2",name:"Sportsbooks",src:"DraftKings, FanDuel, Pinnacle",w:"35%",d:"Moneylines → implied probability"},{tier:"Tier 3",name:"Models",src:"ESPN, Internal",w:"10%",d:"Sanity checks + tiebreakers"}].map(s=>(
                <div key={s.tier} style={{display:"flex",gap:16,padding:"12px 16px",background:"#0a0a0a",borderRadius:10,marginBottom:6,alignItems:"center"}}>
                  <div style={{width:48,textAlign:"center",flexShrink:0}}><div style={{fontSize:11,color:T,fontWeight:700}}>{s.tier}</div><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:fm}}>{s.w}</div></div>
                  <div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{s.name} <span style={{color:"#666",fontWeight:400,fontSize:11}}>({s.src})</span></div><div style={{fontSize:12,color:"#888"}}>{s.d}</div></div>
                </div>
              ))}
            </Card>
            <Card>
              <Label>MARK PRICE VS INDEX PRICE</Label>
              <P>Index Price = raw weighted median (true consensus). Mark Price = dampened version for liquidations — prevents flash spikes from triggering mass liquidations.</P>
              <Code>Mark Price = 0.7 × Index Price + 0.3 × 5-second EMA of Index Price</Code>
            </Card>
            <Card>
              <Label>SAFETY MECHANISMS</Label>
              {["Staleness filter — sources not updated in 30s drop to zero weight","Deviation cap — source deviating 10%+ from median is excluded","Smoothing — 3-second EMA prevents flash spikes","Safe mode — 3+ sources fail: prices freeze, max leverage → 2x","Total failure — all sources down 60s+: trading halted"].map((s,i)=>(
                <div key={i} style={{fontSize:12,color:"#888",padding:"6px 0",borderBottom:i<4?"1px solid #1a1a1a":"none"}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* FUNDING RATES */}
          <S id="funding">
            <H>Funding Rates</H>
            <P>Funding keeps the perp price anchored to the oracle. Without it, one-sided sentiment causes the orderbook price to drift from fair value.</P>
            <Card>
              <Label>MECHANISM</Label>
              <P>Every 15 minutes during live games (faster than crypto's 8-hour standard, because sports prices move faster):</P>
              <Code>Funding Rate = clamp( VWAP_mid_price - Oracle_Index_Price, -0.5%, +0.5% )</Code>
              <P>If perp trades above oracle → longs pay shorts. Below oracle → shorts pay longs. Capped at ±0.5% per interval.</P>
              <Row items={[
                {content:<><div style={{fontSize:12,color:T,fontWeight:700,marginBottom:4}}>Live Games</div><div style={{fontSize:12,color:"#888"}}>15-minute intervals. Fast enough to compensate LPs, not so fast it discourages traders.</div></>},
                {content:<><div style={{fontSize:12,color:"#ff9f1c",fontWeight:700,marginBottom:4}}>Pre-Game</div><div style={{fontSize:12,color:"#888"}}>1-hour intervals. Prices more stable before kickoff. Uses pre-game sportsbook lines.</div></>}
              ]}/>
            </Card>
          </S>

          {/* MARGIN & LEVERAGE */}
          <S id="margin">
            <H>Margin & Leverage</H>
            <P>Isolated margin per position. Dynamic max leverage based on probability level.</P>
            <Card>
              <Label>DYNAMIC LEVERAGE</Label>
              <Row items={[{range:"20–80%",lev:"10x",color:"#22c55e"},{range:"10–20%",lev:"5x",color:TL},{range:"5–10%",lev:"3x",color:"#ff9f1c"},{range:"<5%/>95%",lev:"2x",color:R}].map(l=>({content:<><div style={{fontSize:24,fontWeight:800,color:l.color,fontFamily:fm,textAlign:"center",marginBottom:4}}>{l.lev}</div><div style={{fontSize:11,color:"#666",textAlign:"center"}}>{l.range}</div></>}))}/>
            </Card>
            <Card>
              <Label>MARGIN MATH</Label>
              {[["Initial Margin","IM = Notional ÷ Leverage"],["Maintenance Margin","MM = 50% of IM"],["Liquidation (Long)","Liq = Entry × (1 - 1/Leverage × MM_Ratio)"]].map(([l,f])=>(
                <div key={l} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <div style={{fontSize:12,color:"#666",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,color:TL,fontFamily:fm}}>{f}</div>
                </div>
              ))}
            </Card>
          </S>

          {/* RISK MANAGEMENT */}
          <S id="risk">
            <H>Risk Management</H>
            <P>Three layers protect platform solvency. The insurance fund exclusively covers liquidation deficits — it is never used for vault market making losses.</P>
            {[{n:"1",t:"Liquidation Engine",d:"Runs every 100ms. When margin falls below maintenance, position is taken over and closed on the orderbook. Partial liquidation for large positions.",c:T},{n:"2",t:"Insurance Fund",d:"Absorbs liquidation deficits. Funded by 20% of fees (non-negotiable) + liquidation surplus + 10% of vault excess profits. Target: 5% of total OI.",c:"#ff9f1c"},{n:"3",t:"Auto-Deleveraging",d:"Last resort when insurance fund is empty. Force-closes most profitable opposing positions. Extremely rare — minimized by conservative leverage and adequate insurance sizing.",c:R}].map(r=>(
              <Card key={r.n}><div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:r.c+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18,fontWeight:800,color:r.c,fontFamily:fm}}>{r.n}</span></div>
                <div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>{r.t}</div><div style={{fontSize:14,color:"#888",lineHeight:1.7}}>{r.d}</div></div>
              </div></Card>
            ))}
            <Card>
              <Label>POSITION LIMITS</Label>
              {["No single user >10% of OI on one side","Total OI cannot exceed 20x insurance fund balance","One-sided OI >70% triggers liquidity rebalancing alerts"].map((s,i)=>(
                <div key={i} style={{fontSize:13,color:"#888",padding:"6px 0",borderBottom:i<2?"1px solid #1a1a1a":"none"}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* MARKET LIFECYCLE */}
          <S id="lifecycle">
            <H>Market Lifecycle</H>
            <P>Each game market progresses through six states.</P>
            <Card>
              {[{s:"Pre-Game",d:"Opens 24-72h before. Oracle uses pre-game lines. Full trading, 1h funding intervals.",c:T},{s:"Live",d:"Game started. Live oracle feeds. 15-min funding. Dynamic leverage adjustments.",c:"#22c55e"},{s:"Halftime",d:"Trading continues, oracle stable. Good window to adjust positions.",c:"#ff9f1c"},{s:"Final Minutes",d:"Last 5 min. Max leverage reduced 50%. Wider liquidation buffers. Vault begins unwinding.",c:R},{s:"Settlement Countdown",d:"Game over. No new positions. 30-min delay for stat corrections. Existing positions can close.",c:"#888"},{s:"Settled",d:"Settlement contract executes on-chain. Winners → $1.00, losers → $0.00. Funds distributed. Market archived.",c:"#fff"}].map((st,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",borderBottom:i<5?"1px solid #1a1a1a":"none",alignItems:"flex-start"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:st.c,marginTop:6,flexShrink:0}}/>
                  <div><span style={{fontSize:13,fontWeight:700,color:st.c}}>{st.s}</span><span style={{fontSize:12,color:"#888"}}> — {st.d}</span></div>
                </div>
              ))}
            </Card>
          </S>

          {/* FEES */}
          <S id="fees">
            <H>Fees</H>
            <Card>
              <Label>TRADING FEES</Label>
              <Row items={[{type:"Maker",rate:"0–2 bps",note:"Free at base, rebates at higher tiers"},{type:"Taker",rate:"5 bps",note:"Flat, no volume discounts"},{type:"Settlement",rate:"3 bps",note:"At game conclusion"},{type:"Liquidation",rate:"5 bps",note:"On liquidated notional"}].map(f=>({content:<><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{f.type}</span><span style={{fontSize:14,fontWeight:800,color:T,fontFamily:fm}}>{f.rate}</span></div><div style={{fontSize:11,color:"#666"}}>{f.note}</div></>}))}/>
            </Card>
            <Card>
              <Label>FEE DISTRIBUTION</Label>
              <Row items={[{label:"Insurance Fund",pct:"20%",color:R},{label:"Protocol Treasury",pct:"55%",color:"#fff"},{label:"Liquidity Incentives",pct:"25%",color:T}].map(d=>({content:<><div style={{fontSize:22,fontWeight:800,color:d.color,fontFamily:fm,textAlign:"center"}}>{d.pct}</div><div style={{fontSize:11,color:"#666",textAlign:"center",marginTop:4}}>{d.label}</div></>}))}/>
            </Card>
            <P>Taker fees are flat — takers extract liquidity and should pay for it. Makers trade free or earn rebates. See LP Incentives for details.</P>
          </S>

          {/* LIQUIDITY & VAULTS */}
          <S id="liquidity">
            <H>Liquidity & Market Making Vault</H>
            <P>Perpdictions bootstraps liquidity through a protocol-owned MM vault. Anyone deposits USDC, the algorithm market-makes, depositors share 80% of profits.</P>
            <Card>
              <Label>VAULT ALGORITHM</Label>
              {["Quotes around oracle — bid at oracle - spread/2, ask at oracle + spread/2 (1% default)","Dynamic spread — widens 2x on 3% oracle moves, 3x on 8%+ (scoring plays)","Inventory management — asymmetric quoting when skewed, scaling from 2x to 5x adjustment","Game-phase awareness — tighter mid-game, wider at start/end/after scoring events","Terminal convergence — reduces exposure in final 10 min, flat by final 2 min","Multi-market allocation — more capital to high-volume games"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>DEPOSITOR INCENTIVES</Label>
              {[{t:"Profit Share",d:"80% of vault profits to depositors, 20% to protocol."},{t:"Early Boost",d:"Up to 1.5x multiplier in month 1, tapering to 1.0x after 6 months."},{t:"Lockup Tiers",d:"80% base → 85% (7d) → 90% (30d) → 95% (90d lockup)."},{t:"Vault Points",d:"Points = Deposit × Time × Lockup Multiplier. Potential future token claim."}].map(it=>(
                <div key={it.t} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{it.t}</span><span style={{fontSize:12,color:"#888"}}> — {it.d}</span>
                </div>
              ))}
            </Card>
            <P>Protocol seeds $500K-$1M at launch. A DMM partnership is a stretch goal, not a blocker — the vault handles all liquidity at 1-2% spreads, still far better than sportsbook vig.</P>
          </S>

          {/* VAULT RISK MANAGEMENT */}
          <S id="vaultrisk">
            <H>Vault Risk Management</H>
            <P>Seven layers protect vault depositors from directional losses during blowout games.</P>
            <Card>
              {[{n:"1",t:"Dynamic Spread",d:"Convex spread scaling: 1% base → 5% at 75% inventory. Volatility + time adjustments.",c:T},{n:"2",t:"Funding Capture",d:"One-sided flow = high funding income to the vault. Natural hedge — funding is highest exactly when vault risk is highest.",c:TL},{n:"3",t:"Inventory Caps",d:"20% net, 40% gross per game. 60% total across all games. Enforced at matching engine level.",c:"#ff9f1c"},{n:"4",t:"Terminal Convergence",d:"Reduce at 10 min, reduce-only at 5 min, stop at 2 min. Eliminates 60-70% of blowout losses.",c:R},{n:"5",t:"Circuit Breaker",d:"3% game loss → stop quoting. 5% → full halt. Prevents single-game spirals.",c:"#ef4444"},{n:"6",t:"Portfolio Mgmt",d:"5% daily drawdown → 50% size cut. 8% → halt all. Prevents correlated multi-game losses.",c:"#888"},{n:"7",t:"Watermark",d:"10% drawdown from ATH → 50% size + 2x spread until recovery to 5%.Protects from losing streaks.",c:"#666"}].map(r=>(
                <div key={r.n} style={{display:"flex",gap:12,padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:r.c+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:13,fontWeight:800,color:r.c,fontFamily:fm}}>{r.n}</span></div>
                  <div><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{r.t}</span><span style={{fontSize:12,color:"#888"}}> — {r.d}</span></div>
                </div>
              ))}
            </Card>
          </S>

          {/* FEE BUFFER & SAFETY */}
          <S id="feebuffer">
            <H>Market Fee Buffer & Insurance Separation</H>
            <P>Trading fees are pooled per-market during live games, then redirected to cover vault losses before flowing to the treasury — without touching the insurance fund.</P>
            <Card>
              <Label>DAILY SETTLEMENT WATERFALL</Label>
              {["All games settle — each game's fee buffer calculated","Vault net P&L across all games calculated","If net positive → buffers distribute normally (20% insurance, 55% treasury, 25% liquidity)","If net negative → buffers pooled. Up to 80% covers vault loss. 20% always → insurance fund","Remaining vault deficit (if any) hits depositors","Insurance fund is NEVER touched for vault losses"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:i===5?R+"20":T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:i===5?R:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:i===5?"#ef4444":"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>SEPARATION PRINCIPLE</Label>
              <P>The insurance fund and vault are separate pools. One-way valve: vault contributes 10% of excess profits to insurance during good months. Fee buffer softens vault losses. But the insurance fund's core balance is never at risk from vault trading.</P>
            </Card>
          </S>

          {/* LP INCENTIVES */}
          <S id="userincentives">
            <H>User Liquidity Incentives</H>
            <P>External users who provide offsetting liquidity directly reduce vault risk. Perpdictions rewards this behavior with targeted incentives.</P>
            <Card>
              <Label>CONTRARIAN MAKER REBATES</Label>
              <P>When the vault is skewed, users who post orders that would reduce vault inventory earn enhanced rebates:</P>
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"8px",color:"#666"}}>Vault Skew</th>
                    <th style={{textAlign:"right",padding:"8px",color:"#666"}}>Contrarian Rebate</th>
                  </tr></thead>
                  <tbody>{[["0–25%","0 bps (no skew)"],["25–50%","-1.0 bps (paid to make)"],["50–75%","-2.0 bps"],["75–100%","-3.0 bps"]].map(([s,r],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a"}}>
                      <td style={{padding:"8px",color:"#ccc"}}>{s}</td>
                      <td style={{padding:"8px",textAlign:"right",color:T,fontWeight:600}}>{r}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
            <Card>
              <Label>ADDITIONAL INCENTIVES</Label>
              {[{t:"Inventory Offset Bonus",d:"0.01%/day on positions that offset vault inventory. Active only when skew >40%. Turns off when balanced."},{t:"Priority Settlement",d:"Contrarian LPs get funds distributed first at game end."},{t:"Virtuous Cycle",d:"Skew triggers incentives → LPs provide offset → risk decreases → incentives decrease → equilibrium."}].map(it=>(
                <div key={it.t} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{it.t}</span><span style={{fontSize:12,color:"#888"}}> — {it.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* SETTLEMENT */}
          <S id="settlement">
            <H>Settlement</H>
            <P>On-chain via smart contracts on Base. 30-minute delay post-game for stat corrections.</P>
            <Card>
              <Label>SETTLEMENT FLOW</Label>
              {["Game clock hits zero","30-minute settlement delay","Oracle confirms final result on-chain","Settlement contract executes","Winners → $1.00, losers → $0.00","Funds distributed to wallets"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>EDGE CASES</Label>
              {[{t:"Overtime",d:"Market continues. Oracle updates. Settlement after final result."},{t:"Postponed",d:"Trading halted, positions frozen. Rescheduled within 48h → reopens. Otherwise closes at last price."},{t:"Disputed",d:"Settlement extends up to 72 hours. Governance committee determines outcome."}].map(e=>(
                <div key={e.t} style={{padding:"8px 14px",background:"#0a0a0a",borderRadius:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{e.t}</span><span style={{fontSize:13,color:"#888"}}> — {e.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* SELF-CUSTODY */}
          <S id="custody">
            <H>Self-Custody</H>
            <P>Your funds, your keys. Embedded wallets via Privy — real Ethereum wallets on Base. Export anytime.</P>
            <Card>
              <Row items={[
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Crypto Users</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Connect existing wallet or use embedded wallet. Deposit USDC directly to vault on Base.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Fiat Users</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Deposit USD via card/bank. Converted to USDC on Base automatically. You custody the funds.</div></>}
              ]}/>
            </Card>
          </S>

          {/* COMPETITIVE */}
          <S id="competitive">
            <H>Competitive Landscape</H>
            <Card>
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"10px",color:"#666"}}>Platform</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Leverage</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Live Trading</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Settlement</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Self-Custody</th>
                  </tr></thead>
                  <tbody>{[["Perpdictions","Up to 10x","Yes (in-game)","On-chain","Yes",true],["Polymarket","None (1x)","Limited","On-chain","Yes",false],["Kalshi","None (1x)","Limited","Centralized","No",false],["Sportsbooks","None","Pre-game only","Centralized","No",false]].map(([p,lev,live,set,cust,hl],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a",background:hl?T+"08":"transparent"}}>
                      <td style={{padding:"10px",color:hl?T:"#fff",fontWeight:700}}>{p}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{lev}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{live}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{set}</td>
                      <td style={{padding:"10px",textAlign:"center",color:cust==="Yes"?"#22c55e":"#ef4444"}}>{cust}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          </S>

          {/* FAQ */}
          <S id="faq">
            <H>FAQ</H>
            {[{q:"What happens in overtime?",a:"Markets continue. Oracle updates. Settlement after final result."},{q:"Game postponed or cancelled?",a:"Postponed + rescheduled within 48h → reopens. Cancelled → closes at last oracle price."},{q:"Can a single play liquidate me?",a:"Mark price smoothing prevents flash liquidations. Only sustained moves trigger liquidation."},{q:"How fast are withdrawals?",a:"10-minute delay from vault, then USDC in your wallet instantly."},{q:"What sports are supported?",a:"Launch: NFL, NBA, MLB. Expanding to NHL, soccer, MMA based on oracle availability."},{q:"Where are my funds?",a:"Smart contracts on Base (Coinbase L2). You custody via embedded wallet. Perpdictions never holds your keys."}].map((item,i)=>(
              <Card key={i}><div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:8}}>{item.q}</div><div style={{fontSize:14,color:"#888",lineHeight:1.7}}>{item.a}</div></Card>
            ))}
          </S>

          <div style={{textAlign:"center",padding:"40px 0 80px"}}>
            <button onClick={onLaunch} style={{padding:"16px 48px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:16,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:12}}>Try the Demo →</button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   GAME SELECTOR
   ═══════════════════════════════════════════════════════════ */
function GameSelector({ onSelect, onBack }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 50); }, []);
  const a = (d) => ({ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)", transition:`all 0.5s cubic-bezier(0.16,1,0.3,1) ${d}s` });

  return (
    <div style={{background:B.bg,minHeight:"100vh",fontFamily:fb,color:B.white}}>
      <div style={{position:"fixed",inset:0,backgroundImage:`linear-gradient(${B.border} 1px, transparent 1px), linear-gradient(90deg, ${B.border} 1px, transparent 1px)`,backgroundSize:"60px 60px",opacity:.2,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1}}>
        <nav style={{...a(0),padding:"20px 48px",display:"flex",alignItems:"center",gap:16,borderBottom:"1px solid "+B.border}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:B.dim,display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,fontFamily:fm,padding:0,letterSpacing:"0.06em"}}>
            <ChevronRight size={14} style={{transform:"rotate(180deg)"}}/> HOME
          </button>
          <div style={{width:1,height:16,background:B.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <img src={LOGO_NAV} style={{height:24,width:"auto"}} alt="Perpdictions"/>
            <span style={{fontFamily:fd,fontWeight:800,fontSize:16}}>perp<span style={{color:B.primary}}>dictions</span></span>
          </div>
        </nav>

        <div style={{maxWidth:1000,margin:"0 auto",padding:"80px 48px"}}>
          <div style={a(0.05)}>
            <span style={{fontFamily:fm,fontSize:12,color:B.primary,letterSpacing:"0.15em",fontWeight:700}}>SELECT MARKET</span>
            <h1 style={{fontFamily:fd,fontSize:48,fontWeight:800,letterSpacing:"-0.04em",marginTop:12,marginBottom:48}}>Choose a game.</h1>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,background:B.border}}>
            {PROC_GAMES.map((game, i) => (
              <button key={game.id} onClick={() => onSelect(game)} style={{
                ...a(0.1+i*0.06), background:B.bg, border:"none", padding:"36px 28px",
                cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:16, color:B.white,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
                  <span style={{fontSize:36}}>{game.emoji}</span>
                  <span style={{fontFamily:fm,fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.1em"}}>{game.sport}</span>
                </div>
                <div>
                  <h3 style={{fontFamily:fd,fontSize:20,fontWeight:800,letterSpacing:"-0.02em",marginBottom:6}}>{game.label}</h3>
                  <p style={{fontSize:12,color:B.mute,fontWeight:600,fontFamily:fm}}>{game.subtitle}</p>
                </div>
                <div style={{background:B.surface,border:"1px solid "+B.border,padding:"12px 14px",width:"100%"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700}}>{game.home.logo} {game.home.name}</span>
                    <span style={{fontSize:11,color:B.dim}}>vs</span>
                    <span style={{fontSize:13,fontWeight:700}}>{game.away.logo} {game.away.name}</span>
                  </div>
                </div>
                <p style={{fontSize:12,color:B.dim,fontWeight:500,lineHeight:1.5}}>{game.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED ESPN FETCH HOOK
   ═══════════════════════════════════════════════════════════ */
function useESPN(url) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGames(data.events || []);
      setLoading(false);
    } catch { setError(true); setLoading(false); }
  }, [url]);
  useEffect(() => { fetch_(); const iv = setInterval(fetch_, 30000); return () => clearInterval(iv); }, [fetch_]);
  return { games, loading, error };
}

/* helper — parse a standard ESPN event into a simple shape */
function parseESPNEvent(ev) {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === "home");
  const away = comp?.competitors?.find(c => c.homeAway === "away");
  const stype = ev.status?.type?.name || "";
  const isLive = stype === "STATUS_IN_PROGRESS" || stype === "STATUS_FIRST_HALF" || stype === "STATUS_SECOND_HALF" || stype === "STATUS_EXTRA_TIME" || stype === "STATUS_OVERTIME";
  const isFinal = stype.includes("FINAL") || stype === "STATUS_FULL_TIME";
  const isHalf = stype === "STATUS_HALFTIME";
  const isDelayed = stype.includes("DELAY") || stype.includes("POSTPONE");
  return {
    id: ev.id, name: ev.name,
    date: ev.date || comp?.date || null,
    isLive: isLive || isHalf, isHalf, isFinal, isDelayed,
    isScheduled: !isLive && !isHalf && !isFinal && !isDelayed,
    detail: ev.status?.type?.detail || ev.status?.type?.shortDetail || "",
    home: { name: home?.team?.displayName||"", abbr: home?.team?.abbreviation||"", logo: home?.team?.logo||"", score: home?.score??null, record: home?.records?.[0]?.summary||"" },
    away: { name: away?.team?.displayName||"", abbr: away?.team?.abbreviation||"", logo: away?.team?.logo||"", score: away?.score??null, record: away?.records?.[0]?.summary||"" },
  };
}

/* Returns true if a game's scheduled start was within the last N hours */
const isRecent = (dateStr, hours=6) => {
  if(!dateStr) return true; // no date = show it
  return (Date.now() - new Date(dateStr).getTime()) < hours * 60 * 60 * 1000;
};
/* Sort upcoming games soonest first */
const byDate = (a,b) => new Date(a.date||0) - new Date(b.date||0);

/* shared card used by Soccer and Hockey */
function MatchCard({ g, emoji, showRecord }) {
  const homeScore = parseFloat(g.home.score) || 0;
  const awayScore = parseFloat(g.away.score) || 0;
  const homeWinning = homeScore > awayScore;
  const tied = homeScore === awayScore;
  const statusColor = g.isLive ? B.green : g.isHalf ? "#ff9f1c" : g.isDelayed ? "#ff9f1c" : "#555";
  const statusLabel = g.isLive && !g.isHalf ? "LIVE" : g.isHalf ? "HALF" : g.isFinal ? "FINAL" : g.isDelayed ? "DELAYED" : "UPCOMING";
  return (
    <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {g.isLive&&!g.isHalf&&<span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite",flexShrink:0}}/>}
          <span style={{fontSize:11,fontWeight:700,color:statusColor,fontFamily:fm,letterSpacing:"0.08em"}}>{statusLabel}</span>
          {g.detail&&<span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.detail}</span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{t:g.home,w:homeWinning&&!tied},{t:g.away,w:!homeWinning&&!tied}].map(({t,w},i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {t.logo?<img src={t.logo} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt=""/>
                :<div style={{width:28,height:28,borderRadius:6,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{emoji}</div>}
              <div>
                <div style={{fontSize:14,fontWeight:700,color:(g.isLive||g.isFinal)&&w?"#fff":"#aaa"}}>{t.name}</div>
                {showRecord&&t.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{t.record}</div>}
              </div>
            </div>
            <span style={{fontSize:28,fontWeight:800,fontFamily:fm,color:(g.isLive||g.isFinal)&&w?"#fff":g.isScheduled?"#444":"#777",minWidth:44,textAlign:"right"}}>
              {g.isScheduled?"–":t.score??0}
            </span>
          </div>
        ))}
      </div>
      {g.isScheduled&&g.detail&&<div style={{fontSize:11,color:"#555",fontFamily:fm,marginTop:10}}>{g.detail}</div>}
    </div>
  );
}

function SportPageShell({ title, subtitle, emoji, liveCount, loading, error, noGamesMsg, children }) {
  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>{subtitle}</div>
          {liveCount>0&&<span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>{liveCount} LIVE</span>}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>{title}</h2>
        {loading&&<p style={{fontSize:13,color:"#666"}}>Loading…</p>}
        {error&&<p style={{fontSize:13,color:"#ef4444"}}>Could not reach ESPN — try again shortly.</p>}
      </div>
      {loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:12}}>{emoji}</div><div style={{fontSize:13,color:"#555"}}>Loading…</div></div>}
      {!loading&&!error&&children}
    </div>
  );
}

function SectionHeader({ label, color }) {
  return <div style={{fontSize:11,fontWeight:700,color:color||"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>{label}</div>;
}

function Grid({ children }) {
  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12,marginBottom:32}}>{children}</div>;
}

/* ─── NFL PAGE ─── */
function NFLPage() {
  const { games: raw, loading, error } = useESPN("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard");
  const games = raw.map(parseESPNEvent);
  const live  = games.filter(g => g.isLive);
  const final = games.filter(g => g.isFinal && isRecent(g.date));
  const sched = games.filter(g => g.isScheduled).sort(byDate);
  return (
    <SportPageShell title="NFL" subtitle="FOOTBALL" emoji="🏈" liveCount={live.length} loading={loading} error={error}>
      {!loading&&!error&&games.length===0&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:12}}>🏈</div><div style={{fontSize:14,color:"#555"}}>No NFL games scheduled today.</div></div>}
      {live.length>0&&<><SectionHeader label="● LIVE NOW" color={B.green}/><Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord/>)}</Grid></>}
      {sched.length>0&&<><SectionHeader label="UPCOMING"/><Grid>{sched.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord/>)}</Grid></>}
      {final.length>0&&<><SectionHeader label="FINAL"/><Grid>{final.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord/>)}</Grid></>}
    </SportPageShell>
  );
}

/* ─── TRENDING PAGE — all live games across every sport ─── */
const TRENDING_SOURCES = [
  { key:"nfl",   url:"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",        emoji:"🏈", label:"NFL"  },
  { key:"mlb",   url:"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",        emoji:"⚾", label:"MLB"  },
  { key:"nhl",   url:"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",          emoji:"🏒", label:"NHL"  },
  { key:"ucl",   url:"https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",emoji:"⚽", label:"UCL"  },
];

function TrendingPage({ liveGames }) {
  const [allGames, setAllGames] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled(
      TRENDING_SOURCES.map(s =>
        fetch(s.url).then(r => r.json()).then(d => ({ key: s.key, emoji: s.emoji, label: s.label, events: (d.events||[]).map(parseESPNEvent) }))
      )
    );
    const merged = {};
    results.forEach(r => { if(r.status==="fulfilled") merged[r.value.key] = r.value; });
    setAllGames(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 20000); return () => clearInterval(iv); }, [fetchAll]);

  // Normalise backend basketball games into MatchCard-compatible shape
  const basketballLive = liveGames
    .filter(g => g.status==="live" || g.status==="halftime")
    .map(g => ({
      id: g.id,
      isLive: true, isFinal: false, isScheduled: false, isHalf: g.status==="halftime", isDelayed: false,
      detail: g.clock && g.period ? `${g.clock} · Q${g.period}` : "",
      home: { name: g.home.name||"", abbr: g.home.abbreviation||"", logo: g.home.logo||"", score: g.home.score??null },
      away: { name: g.away.name||"", abbr: g.away.abbreviation||"", logo: g.away.logo||"", score: g.away.score??null },
    }));

  // Collect all live games from ESPN sources
  const espnLive = Object.values(allGames).flatMap(src =>
    src.events.filter(g => g.isLive).map(g => ({ ...g, _emoji: src.emoji, _label: src.label }))
  );

  const totalLive = espnLive.length + basketballLive.length;

  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>TRENDING</div>
          {totalLive>0&&<span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>{totalLive} LIVE</span>}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>Live Right Now</h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>
          {loading?"Fetching live games…":`All live action across NFL, NBA, MLB, NHL, and Champions League`}
        </p>
      </div>

      {loading&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:12}}>📡</div><div style={{fontSize:13,color:"#555"}}>Loading live games…</div></div>}

      {!loading&&totalLive===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:36,marginBottom:12}}>📡</div>
          <div style={{fontSize:15,color:"#888",fontWeight:600,marginBottom:8}}>Nothing live right now</div>
          <div style={{fontSize:13,color:"#555"}}>Check individual sport tabs for upcoming schedules.</div>
        </div>
      )}

      {/* Basketball live (from backend) */}
      {basketballLive.length>0&&(
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>🏀</span>
            <SectionHeader label="BASKETBALL" color={B.green}/>
          </div>
          <Grid>{basketballLive.map(g=><MatchCard key={g.id} g={g} emoji="🏀"/>)}</Grid>
        </div>
      )}

      {/* ESPN live games by sport */}
      {Object.values(allGames).map(src => {
        const live = src.events.filter(g => g.isLive);
        if(live.length===0) return null;
        return (
          <div key={src.key} style={{marginBottom:32}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>{src.emoji}</span>
              <SectionHeader label={src.label} color={B.green}/>
            </div>
            <Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji={src.emoji}/>)}</Grid>
          </div>
        );
      })}
    </div>
  );
}

/* ─── SOCCER PAGE ─── */
function SoccerPage() {
  const { games: raw, loading, error } = useESPN("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard");
  const games = raw.map(parseESPNEvent);
  const live = games.filter(g=>g.isLive);
  const final = games.filter(g=>g.isFinal && isRecent(g.date));
  const sched = games.filter(g=>g.isScheduled).sort(byDate);
  return (
    <SportPageShell title="UEFA Champions League" subtitle="SOCCER" emoji="⚽" liveCount={live.length} loading={loading} error={error}>
      {!loading&&!error&&games.length===0&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:12}}>⚽</div><div style={{fontSize:14,color:"#555"}}>No Champions League fixtures today.</div></div>}
      {live.length>0&&<><SectionHeader label="● LIVE NOW" color={B.green}/><Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji="⚽"/>)}</Grid></>}
      {sched.length>0&&<><SectionHeader label="UPCOMING"/><Grid>{sched.map(g=><MatchCard key={g.id} g={g} emoji="⚽"/>)}</Grid></>}
      {final.length>0&&<><SectionHeader label="FINAL"/><Grid>{final.map(g=><MatchCard key={g.id} g={g} emoji="⚽"/>)}</Grid></>}
    </SportPageShell>
  );
}

/* ─── HOCKEY PAGE ─── */
function HockeyPage() {
  const { games: raw, loading, error } = useESPN("https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard");
  const games = raw.map(parseESPNEvent);
  const live = games.filter(g=>g.isLive);
  const final = games.filter(g=>g.isFinal && isRecent(g.date));
  const sched = games.filter(g=>g.isScheduled).sort(byDate);
  return (
    <SportPageShell title="NHL" subtitle="HOCKEY" emoji="🏒" liveCount={live.length} loading={loading} error={error}>
      {!loading&&!error&&games.length===0&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:12}}>🏒</div><div style={{fontSize:14,color:"#555"}}>No NHL games scheduled today.</div></div>}
      {live.length>0&&<><SectionHeader label="● LIVE NOW" color={B.green}/><Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord/>)}</Grid></>}
      {sched.length>0&&<><SectionHeader label="UPCOMING"/><Grid>{sched.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord/>)}</Grid></>}
      {final.length>0&&<><SectionHeader label="FINAL"/><Grid>{final.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord/>)}</Grid></>}
    </SportPageShell>
  );
}

/* ─── MMA PAGE ─── */
function MMAPage() {
  const { games: raw, loading, error } = useESPN("https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard");
  // UFC events: each "event" is a fight card; competitors are fighters
  const events = raw.map(ev => {
    const stype = ev.status?.type?.name || "";
    const isLive = stype === "STATUS_IN_PROGRESS";
    const isFinal = stype.includes("FINAL");
    const isScheduled = !isLive && !isFinal;
    const bouts = (ev.competitions || []).map(bout => {
      const f1 = bout.competitors?.[0];
      const f2 = bout.competitors?.[1];
      const bStatus = bout.status?.type?.name || "";
      return {
        id: bout.id,
        isMain: bout.type?.text === "Main Event" || bout.order === 0,
        isFinal: bStatus.includes("FINAL"),
        isLive: bStatus === "STATUS_IN_PROGRESS",
        detail: bout.status?.type?.detail || "",
        weightclass: bout.type?.text || "",
        f1: { name: f1?.athlete?.displayName || f1?.team?.displayName || "TBD", logo: f1?.athlete?.headshot?.href || f1?.team?.logo || "", record: f1?.records?.[0]?.summary || f1?.athlete?.record || "", winner: f1?.winner },
        f2: { name: f2?.athlete?.displayName || f2?.team?.displayName || "TBD", logo: f2?.athlete?.headshot?.href || f2?.team?.logo || "", record: f2?.records?.[0]?.summary || f2?.athlete?.record || "", winner: f2?.winner },
        result: bout.status?.type?.description || "",
      };
    });
    return { id: ev.id, name: ev.name, date: ev.date, isLive, isFinal, isScheduled, bouts };
  });

  const liveCount = events.filter(e=>e.isLive).length;

  return (
    <SportPageShell title="UFC" subtitle="MMA" emoji="🥊" liveCount={liveCount} loading={loading} error={error}>
      {!loading&&!error&&events.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:36,marginBottom:12}}>🥊</div>
          <div style={{fontSize:14,color:"#555"}}>No UFC events scheduled.</div>
        </div>
      )}
      {events.map(ev=>(
        <div key={ev.id} style={{marginBottom:40}}>
          {/* Event header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",fontFamily:fd,letterSpacing:"-0.02em"}}>{ev.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                {ev.isLive&&<span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite"}}/>}
                <span style={{fontSize:11,fontWeight:700,color:ev.isLive?B.green:ev.isFinal?"#555":"#666",fontFamily:fm,letterSpacing:"0.08em"}}>
                  {ev.isLive?"LIVE":ev.isFinal?"FINAL":"UPCOMING"}
                </span>
              </div>
            </div>
          </div>
          {/* Bouts */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ev.bouts.length===0&&(
              <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"24px",textAlign:"center",color:"#444",fontSize:13}}>
                Fight card details not yet available
              </div>
            )}
            {ev.bouts.map((bout,bi)=>(
              <div key={bout.id||bi} style={{background:bout.isMain?"#1a1a0a":"#111",border:"1px solid "+(bout.isMain?B.primary+"30":"#1f1f1f"),borderRadius:16,padding:"18px 24px"}}>
                {bout.weightclass&&<div style={{fontSize:10,fontWeight:700,color:bout.isMain?B.primary:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:10}}>{bout.weightclass}{bout.isMain?" · MAIN EVENT":""}</div>}
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* Fighter 1 */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    {bout.f1.logo?<img src={bout.f1.logo} style={{width:48,height:48,borderRadius:8,objectFit:"cover"}} alt=""/>
                      :<div style={{width:48,height:48,borderRadius:8,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥊</div>}
                    <div style={{fontSize:13,fontWeight:700,color:bout.f1.winner?"#fff":"#aaa",textAlign:"center"}}>{bout.f1.name}</div>
                    {bout.f1.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{bout.f1.record}</div>}
                    {bout.f1.winner&&<div style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>WIN</div>}
                  </div>
                  {/* VS */}
                  <div style={{flexShrink:0,textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:800,color:"#444",fontFamily:fm}}>VS</div>
                    {bout.detail&&<div style={{fontSize:10,color:"#555",fontFamily:fm,marginTop:4}}>{bout.detail}</div>}
                    {bout.result&&bout.isFinal&&<div style={{fontSize:10,color:"#666",fontFamily:fm,marginTop:2}}>{bout.result}</div>}
                  </div>
                  {/* Fighter 2 */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    {bout.f2.logo?<img src={bout.f2.logo} style={{width:48,height:48,borderRadius:8,objectFit:"cover"}} alt=""/>
                      :<div style={{width:48,height:48,borderRadius:8,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥊</div>}
                    <div style={{fontSize:13,fontWeight:700,color:bout.f2.winner?"#fff":"#aaa",textAlign:"center"}}>{bout.f2.name}</div>
                    {bout.f2.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{bout.f2.record}</div>}
                    {bout.f2.winner&&<div style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>WIN</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SportPageShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   BASEBALL PAGE — live/upcoming MLB games via ESPN public API
   ═══════════════════════════════════════════════════════════ */
function BaseballPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard");
      if (!res.ok) throw new Error("ESPN API error");
      const data = await res.json();
      const parsed = (data.events || []).map(ev => {
        const comp = ev.competitions?.[0];
        const home = comp?.competitors?.find(c => c.homeAway === "home");
        const away = comp?.competitors?.find(c => c.homeAway === "away");
        const status = ev.status?.type;
        const detail = ev.status?.type?.detail || "";
        const isLive = status?.name === "STATUS_IN_PROGRESS";
        const isFinal = status?.name === "STATUS_FINAL";
        const isDelayed = status?.name === "STATUS_DELAYED" || status?.name === "STATUS_RAIN_DELAY";
        const isScheduled = !isLive && !isFinal && !isDelayed;
        return {
          id: ev.id,
          name: ev.name,
          date: ev.date || comp?.date || null,
          isLive, isFinal, isDelayed, isScheduled,
          detail,
          home: {
            name: home?.team?.displayName || "",
            abbr: home?.team?.abbreviation || "",
            logo: home?.team?.logo || "",
            score: home?.score ?? null,
          },
          away: {
            name: away?.team?.displayName || "",
            abbr: away?.team?.abbreviation || "",
            logo: away?.team?.logo || "",
            score: away?.score ?? null,
          },
        };
      });
      setGames(parsed);
      setLoading(false);
    } catch(e) {
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const iv = setInterval(fetchGames, 30000);
    return () => clearInterval(iv);
  }, [fetchGames]);

  const live    = games.filter(g => g.isLive);
  const final   = games.filter(g => g.isFinal && isRecent(g.date));
  const sched   = games.filter(g => g.isScheduled).sort(byDate);
  const delayed = games.filter(g => g.isDelayed);

  const GameCard = ({ g }) => {
    const homeScore = parseInt(g.home.score) || 0;
    const awayScore = parseInt(g.away.score) || 0;
    const homeWinning = homeScore > awayScore;
    const tied = homeScore === awayScore;
    const statusColor = g.isLive ? B.green : g.isDelayed ? "#ff9f1c" : g.isFinal ? "#555" : "#555";
    const statusLabel = g.isLive ? "LIVE" : g.isDelayed ? "DELAYED" : g.isFinal ? "FINAL" : "UPCOMING";

    return (
      <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px",transition:"all .15s"}}>
        {/* Status */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {g.isLive && <span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite",flexShrink:0}}/>}
            <span style={{fontSize:11,fontWeight:700,color:statusColor,fontFamily:fm,letterSpacing:"0.08em"}}>{statusLabel}</span>
            {g.detail && <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.detail}</span>}
          </div>
          <span style={{fontSize:11,color:"#444",fontFamily:fm}}>MLB</span>
        </div>

        {/* Teams + scores */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:g.isLive||g.isFinal?8:0}}>
          {/* Away (batting order: away first in baseball) */}
          {[{team:g.away,winning:!homeWinning&&!tied},{team:g.home,winning:homeWinning&&!tied}].map(({team,winning},i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {team.logo
                  ? <img src={team.logo} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt=""/>
                  : <div style={{width:28,height:28,borderRadius:6,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚾</div>
                }
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:(g.isLive||g.isFinal)&&winning?"#fff":"#aaa"}}>{team.name}</div>
                  <div style={{fontSize:10,color:"#555",fontFamily:fm}}>{team.abbr}</div>
                </div>
              </div>
              <span style={{fontSize:28,fontWeight:800,fontFamily:fm,
                color:(g.isLive||g.isFinal)&&winning?"#fff":g.isScheduled?"#444":"#777",
                minWidth:44,textAlign:"right"}}>
                {g.isScheduled?"–":team.score ?? "0"}
              </span>
            </div>
          ))}
        </div>

        {/* Scheduled time */}
        {g.isScheduled && g.detail && (
          <div style={{fontSize:11,color:"#555",fontFamily:fm,marginTop:4}}>{g.detail}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>BASEBALL</div>
          {live.length > 0 && (
            <span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>
              {live.length} LIVE
            </span>
          )}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>
          MLB
        </h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>
          {loading ? "Loading games…" : error ? "Could not reach ESPN — try again shortly." : `${games.length} game${games.length!==1?"s":""} today · live data from ESPN`}
        </p>
      </div>

      {loading && (
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:32,marginBottom:16}}>⚾</div>
          <div style={{fontSize:13,color:"#555"}}>Loading MLB schedule…</div>
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 0",color:"#444"}}>
          <div style={{fontSize:32,marginBottom:16}}>⚾</div>
          <div style={{fontSize:14,color:"#555"}}>No MLB games scheduled today.</div>
        </div>
      )}

      {/* Live */}
      {live.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:B.green,letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>● LIVE NOW</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {live.map(g=><GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Delayed */}
      {delayed.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#ff9f1c",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>DELAYED</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {delayed.map(g=><GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {sched.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>UPCOMING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {sched.map(g=><GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Final */}
      {final.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>FINAL</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {final.map(g=><GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BASKETBALL PAGE — live NBA/NCAAM games from backend
   ═══════════════════════════════════════════════════════════ */
function BasketballPage({ liveGames }) {
  const live    = liveGames.filter(g => g.status === "live" || g.status === "halftime");
  const final   = liveGames.filter(g => (g.status === "final" || g.status === "completed") && isRecent(g.date || g.startTime));
  const sched   = liveGames.filter(g => g.status === "scheduled").sort((a,b) => new Date(a.date||a.startTime||0) - new Date(b.date||b.startTime||0));
  const hasGames = live.length > 0 || sched.length > 0 || final.length > 0;

  const GameCard = ({ g }) => {
    const isLive = g.status === "live";
    const isHalf = g.status === "halftime";
    const isFinal = g.status === "final" || g.status === "completed";
    const statusColor = isLive ? B.green : isHalf ? "#ff9f1c" : isFinal ? "#666" : "#555";
    const statusLabel = isLive ? "LIVE" : isHalf ? "HALF" : isFinal ? "FINAL" : g.statusDetail || "UPCOMING";
    const homeWinning = (g.home.score || 0) > (g.away.score || 0);
    const winProb = g.oracle?.indexPrice ? (g.oracle.indexPrice * 100).toFixed(1) : null;

    return (
      <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px",transition:"all .15s"}}>
        {/* Status row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isLive && <span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite",flexShrink:0}}/>}
            <span style={{fontSize:11,fontWeight:700,color:statusColor,fontFamily:fm,letterSpacing:"0.08em"}}>{statusLabel}</span>
            {(isLive || isHalf) && g.clock && g.period && (
              <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.clock} · Q{g.period}</span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.leagueDisplay || g.league?.toUpperCase()}</span>
          </div>
        </div>

        {/* Teams + scores */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {/* Home */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {g.home.logo
                ? <img src={g.home.logo} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt=""/>
                : <div style={{width:28,height:28,borderRadius:6,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏀</div>
              }
              <div>
                <div style={{fontSize:14,fontWeight:700,color:homeWinning&&!isFinal?"#fff":isFinal&&homeWinning?"#fff":"#aaa"}}>{g.home.name}</div>
                {g.home.abbreviation && g.home.abbreviation!==g.home.name && (
                  <div style={{fontSize:10,color:"#555",fontFamily:fm}}>{g.home.abbreviation}</div>
                )}
              </div>
            </div>
            <span style={{fontSize:28,fontWeight:800,fontFamily:fm,color:homeWinning&&!isFinal?"#fff":isFinal&&homeWinning?"#fff":"#777",minWidth:44,textAlign:"right"}}>
              {g.status==="scheduled"?"–":g.home.score ?? "–"}
            </span>
          </div>
          {/* Away */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {g.away.logo
                ? <img src={g.away.logo} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt=""/>
                : <div style={{width:28,height:28,borderRadius:6,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏀</div>
              }
              <div>
                <div style={{fontSize:14,fontWeight:700,color:!homeWinning&&!isFinal?"#fff":isFinal&&!homeWinning?"#fff":"#aaa"}}>
                  {g.away.name}
                </div>
                {g.away.abbreviation && g.away.abbreviation!==g.away.name && (
                  <div style={{fontSize:10,color:"#555",fontFamily:fm}}>{g.away.abbreviation}</div>
                )}
              </div>
            </div>
            <span style={{fontSize:28,fontWeight:800,fontFamily:fm,color:!homeWinning&&!isFinal?"#fff":isFinal&&!homeWinning?"#fff":"#777",minWidth:44,textAlign:"right"}}>
              {g.status==="scheduled"?"–":g.away.score ?? "–"}
            </span>
          </div>
        </div>

        {/* Oracle win prob bar */}
        {winProb && (isLive || isHalf) && (
          <div style={{marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:10,color:B.primary,fontWeight:700,fontFamily:fm}}>{winProb}% {g.home.abbreviation||g.home.name}</span>
              <span style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:fm}}>{(100-parseFloat(winProb)).toFixed(1)}% {g.away.abbreviation||g.away.name}</span>
            </div>
            <div style={{height:4,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:winProb+"%",background:`linear-gradient(90deg, ${B.primary}, ${B.primaryLight})`,borderRadius:4,transition:"width .5s ease"}}/>
            </div>
          </div>
        )}

        {/* Scheduled time */}
        {g.status==="scheduled" && g.statusDetail && (
          <div style={{fontSize:11,color:"#555",fontFamily:fm,marginTop:4}}>{g.statusDetail}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>BASKETBALL</div>
          {live.length > 0 && (
            <span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>
              {live.length} LIVE
            </span>
          )}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>
          NBA &amp; College Basketball
        </h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>
          {hasGames
            ? `${live.length + sched.length + final.length} game${live.length + sched.length + final.length !== 1 ? "s" : ""} — live data from ESPN via Perpdictions backend`
            : "Connecting to backend…"}
        </p>
      </div>

      {!hasGames && (
        <div style={{textAlign:"center",padding:"60px 0",color:"#444"}}>
          <div style={{fontSize:32,marginBottom:16}}>🏀</div>
          <div style={{fontSize:14,color:"#555"}}>No games found. The backend may be starting up or there are no games scheduled right now.</div>
        </div>
      )}

      {/* Live / halftime */}
      {live.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:B.green,letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>● LIVE NOW</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {live.map(g => <GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {sched.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>UPCOMING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {sched.map(g => <GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Final — only shown within 6 hours of game start */}
      {final.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>FINAL</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {final.map(g => <GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEMOS PAGE — shown when "Demos" tab is clicked in terminal nav
   ═══════════════════════════════════════════════════════════ */
function DemosPage({ onSelectGame, currentGameId }) {
  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm,marginBottom:8}}>DEMO GAMES</div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>
          Championship Replays
        </h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6,maxWidth:480}}>
          Replay real championship moments with the full trading engine. Live win probability, leverage, liquidations — all simulated.
        </p>
      </div>

      {/* Game cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {PROC_GAMES.map((g) => {
          const isCurrent = g.id === currentGameId;
          const finalPlay = g.raw[g.raw.length - 1];
          const homeScore = finalPlay[2];
          const awayScore = finalPlay[3];
          const homeWon = homeScore > awayScore;

          return (
            <div
              key={g.id}
              onClick={() => onSelectGame(g)}
              style={{
                background: isCurrent ? B.primary+"10" : "#111",
                border: "1px solid " + (isCurrent ? B.primary+"40" : "#1f1f1f"),
                borderRadius: 16,
                padding: "24px 28px",
                cursor: "pointer",
                transition: "all .15s",
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Sport emoji */}
              <div style={{fontSize:40,flexShrink:0,width:56,textAlign:"center"}}>{g.emoji}</div>

              {/* Game info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:B.primary,fontFamily:fm,letterSpacing:"0.08em"}}>{g.sport}</span>
                  <span style={{fontSize:11,color:"#555",fontFamily:fm}}>·</span>
                  <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.subtitle}</span>
                  {isCurrent && (
                    <span style={{fontSize:10,fontWeight:700,color:B.primary,fontFamily:fm,padding:"2px 8px",background:B.primary+"15",borderRadius:6,letterSpacing:"0.06em"}}>
                      VIEWING NOW
                    </span>
                  )}
                </div>
                <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:4,fontFamily:fd}}>
                  {g.label}
                </div>
                <div style={{fontSize:12,color:"#666",lineHeight:1.5}}>{g.tagline}</div>
              </div>

              {/* Score */}
              <div style={{flexShrink:0,textAlign:"right"}}>
                {/* Home team */}
                <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:homeWon?"#fff":"#777"}}>{g.home.logo} {g.home.name}</span>
                  <span style={{fontSize:22,fontWeight:800,fontFamily:fm,color:homeWon?"#fff":"#666",minWidth:36,textAlign:"right"}}>{homeScore}</span>
                </div>
                {/* Away team */}
                <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
                  <span style={{fontSize:13,fontWeight:600,color:!homeWon?"#fff":"#777"}}>{g.away.logo} {g.away.name}</span>
                  <span style={{fontSize:22,fontWeight:800,fontFamily:fm,color:!homeWon?"#fff":"#666",minWidth:36,textAlign:"right"}}>{awayScore}</span>
                </div>
                <div style={{marginTop:6,fontSize:10,color:"#555",fontFamily:fm}}>FINAL</div>
              </div>

              {/* Arrow */}
              <div style={{flexShrink:0,color:isCurrent?B.primary:"#333",fontSize:18}}>›</div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{marginTop:32,padding:"16px 20px",background:"#111",borderRadius:12,border:"1px solid #1a1a1a"}}>
        <div style={{fontSize:12,color:"#555",lineHeight:1.7}}>
          <span style={{color:"#888",fontWeight:600}}>How demos work: </span>
          Each game replays at adjustable speed (1×–50×). Win probability updates in real time from a simulated multi-oracle engine. You can open leveraged positions, get liquidated, and settle at the final result — all with $10,000 in virtual funds.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRADING APP
   ═══════════════════════════════════════════════════════════ */
function TradingApp({ game, onBack, onChangeGame, onSwitchGame, liveGames = [] }) {
  const G=game,HOME=G.home,AWAY=G.away,PLAYS=G.plays,SCORING_PLAYS=G.scoringPlays,initProb=PLAYS[0].p;
  const [gameTime,setGameTime]=useState(0);const [playing,setPlaying]=useState(false);const [speed,setSpeed]=useState(10);
  const [sportTab,setSportTab]=useState("Live");
  const [terminalPage,setTerminalPage]=useState("game"); // "game" | "demos"
  const [chartData,setChartData]=useState([{t:0,ph:initProb,pa:1-initProb,floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)}]);
  const [oracle,setOracle]=useState({price:initProb,sources:makeSources(initProb),floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)});
  const [book,setBook]=useState(makeBook(initProb));const [gs,setGs]=useState(PLAYS[0]);const [settled,setSettled]=useState(false);
  const [positions,setPositions]=useState([]);const [closedPos,setClosedPos]=useState([]);const [balance,setBalance]=useState(10000);
  const [closedPnL,setClosedPnL]=useState(0);const [orderSide,setOrderSide]=useState("home");const [orderMargin,setOrderMargin]=useState(500);
  const [orderLev,setOrderLev]=useState(5);const [notifs,setNotifs]=useState([]);const [markers,setMarkers]=useState([]);const [visScoring,setVisScoring]=useState([]);
  const [bottomTab,setBottomTab]=useState("gamecast");
  const lastCT=useRef(0);const lastEv=useRef("");const posR=useRef([]);posR.current=positions;
  const oR=useRef(oracle);oR.current=oracle;const gtR=useRef(0);gtR.current=gameTime;
  const notify=useCallback((msg,type)=>{const id=Date.now()+Math.random();setNotifs(p=>[...p.slice(-3),{id,msg,type:type||"info"}]);setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==id)),5000);},[]);
  const addMark=useCallback((t,p,mt,line)=>{setMarkers(prev=>[...prev,{t:+t.toFixed(2),p,markerType:mt,line:line||"home"}]);},[]);
  const liqLines=useMemo(()=>positions.map(pos=>({id:pos.id,side:pos.side,liq:pos.liq,liqOnChart:pos.side==="home"?pos.liq:1-pos.liq})),[positions]);
  const merged=useMemo(()=>{
    const data=chartData.map(d=>({...d,mh_val:null,mh_marker:null,ma_val:null,ma_marker:null}));
    for(const m of markers){let best=0;for(let i=1;i<data.length;i++){if(Math.abs(data[i].t-m.t)<Math.abs(data[best].t-m.t))best=i;}
    if(Math.abs(data[best].t-m.t)<0.5){if(m.line==="away"){data[best].ma_val=1-m.p;data[best].ma_marker=m.markerType;}else{data[best].mh_val=m.p;data[best].mh_marker=m.markerType;}}
    else{const idx=data.findIndex(d=>d.t>m.t);const refI=Math.max(0,(idx===-1?data.length:idx)-1);const ref=data[refI];
    const pt={t:m.t,ph:m.p,pa:1-m.p,floor:ref.floor,ceil:ref.ceil,mh_val:null,mh_marker:null,ma_val:null,ma_marker:null};
    if(m.line==="away"){pt.ma_val=1-m.p;pt.ma_marker=m.markerType;}else{pt.mh_val=m.p;pt.mh_marker=m.markerType;}
    if(idx===-1)data.push(pt);else data.splice(idx,0,pt);}} return data;
  },[chartData,markers]);

  useEffect(()=>{if(!playing||settled)return;const iv=setInterval(()=>{setGameTime(prev=>{
    const dt=(0.1*speed)/60,next=Math.min(prev+dt,60),gst=getGameState(next,PLAYS),sources=makeSources(gst.prob);
    const op=clamp(weightedMedian(sources),.01,.99),fl=clamp(op-.2,.01,.99),cl=clamp(op+.2,.01,.99);
    setOracle({price:op,sources,floor:fl,ceil:cl});setBook(makeBook(op));setGs(gst);
    if(next-lastCT.current>0.12){setChartData(cd=>[...cd,{t:+next.toFixed(2),ph:+op.toFixed(4),pa:+(1-op).toFixed(4),floor:+fl.toFixed(4),ceil:+cl.toFixed(4)}]);lastCT.current=next;}
    SCORING_PLAYS.forEach(sp=>{if(next>=sp.t&&prev<sp.t)setVisScoring(vs=>vs.find(v=>v.t===sp.t)?vs:[sp,...vs]);});
    if(gst.e!==lastEv.current&&gst.e.includes("⚡")){notify(gst.e.replace(/⚡/g,"").trim(),gst.e.includes(HOME.short)?"green":"red");lastEv.current=gst.e;}
    const cp=posR.current;if(cp.length>0){let changed=false;const upd=cp.filter(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,op);
    if(pnl<=-pos.margin*0.95){changed=true;addMark(next,op,"liquidated",pos.side);setClosedPos(pr=>[{...pos,closedAt:op,pnl:-pos.margin,closeType:"LIQ",closeTime:next},...pr]);
    notify("☠ LIQUIDATED","red");setClosedPnL(p=>p-pos.margin);return false;}return true;});if(changed)setPositions(upd);}
    if(next>=60){setSettled(true);setPlaying(false);addMark(60,1.0,"settle","home");const fp=posR.current;let sp2=0;const nc=[];
    fp.forEach(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,1.0);sp2+=pnl;nc.push({...pos,closedAt:1.0,pnl,closeType:"SETTLED",closeTime:60});});
    if(fp.length>0){setClosedPos(pr=>[...nc,...pr]);setBalance(b=>b+fp.reduce((s,p)=>s+p.margin,0)+sp2);setClosedPnL(p=>p+sp2);setPositions([]);notify("🏆 SETTLED — "+HOME.name+" win! "+fmtUsd(sp2),"green");}
    else notify("🏆 "+HOME.name+" win!","green");} return next;});},100);return()=>clearInterval(iv);},[playing,speed,settled,notify,addMark,PLAYS,SCORING_PLAYS,HOME,AWAY]);

  const placeOrder=useCallback(()=>{if(settled)return;const o=oR.current,gt=gtR.current,ml2=maxLev(o.price),lev=Math.min(orderLev,ml2),margin=Math.min(orderMargin,balance);
  if(margin<10){notify("Insufficient margin","red");return;}const exposure=margin*lev,entry=o.price,liq=liqPrice(orderSide,entry,lev);
  setPositions(p=>[...p,{id:Date.now(),side:orderSide,margin,leverage:lev,exposure,entry,liq,openTime:gt}]);setBalance(b=>b-margin);addMark(gt,entry,"entry",orderSide);
  const tn=orderSide==="home"?HOME:AWAY;notify(tn.logo+" "+tn.name+" "+lev+"x @ "+fmt3(entry),orderSide==="home"?"green":"red");},[oracle.price,orderSide,orderMargin,orderLev,balance,settled,gameTime,notify,addMark,HOME,AWAY]);

  const closePosition=useCallback((id)=>{setPositions(prev=>{const pos=prev.find(p=>p.id===id);if(!pos)return prev;const o=oR.current,gt=gtR.current;
  const pnl=calcPnL(pos.side,pos.exposure,pos.entry,o.price);setBalance(b=>b+pos.margin+pnl);setClosedPnL(p=>p+pnl);
  addMark(gt,o.price,pnl>=0?"exit-win":"exit-loss",pos.side);setClosedPos(pr=>[{...pos,closedAt:o.price,pnl,closeType:"CLOSED",closeTime:gt},...pr]);
  notify("Closed "+(pos.side==="home"?HOME:AWAY).name+" — "+fmtUsd(pnl),pnl>=0?"green":"red");return prev.filter(p=>p.id!==id);});},[notify,addMark,HOME,AWAY]);

  const resetAll=useCallback(()=>{setGameTime(0);setPlaying(false);setSettled(false);
  setChartData([{t:0,ph:initProb,pa:1-initProb,floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)}]);
  setOracle({price:initProb,sources:makeSources(initProb),floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)});
  setBook(makeBook(initProb));setGs(PLAYS[0]);setPositions([]);setClosedPos([]);setBalance(10000);setClosedPnL(0);
  setMarkers([]);setVisScoring([]);lastCT.current=0;lastEv.current="";setNotifs([]);},[initProb,PLAYS]);

  const totalUPnL=positions.reduce((s,p)=>s+calcPnL(p.side,p.exposure,p.entry,oracle.price),0);
  const totalEq=balance+positions.reduce((s,p)=>s+p.margin,0)+totalUPnL;
  const ml=maxLev(oracle.price),eL=Math.min(orderLev,ml),eM=Math.min(orderMargin,balance);
  const team=orderSide==="home"?HOME:AWAY,expo=eM*eL,liqP=liqPrice(orderSide,oracle.price,eL);
  const awayProb=1-oracle.price,prevProb=merged.length>40?merged[merged.length-40].ph:merged[0].ph,momentum=oracle.price-prevProb;





  return (
    <div style={{background:"#0a0a0a",fontFamily:fb,minHeight:"100vh",color:"#fff"}}>
      {/* Notifications */}
      <div style={{position:"fixed",top:16,right:16,zIndex:50,display:"flex",flexDirection:"column",gap:8,maxWidth:360}}>
        {notifs.map(n=>(<div key={n.id} style={{padding:"12px 18px",fontSize:13,fontWeight:600,borderRadius:12,
          background:n.type==="green"?"#12261a":n.type==="red"?"#261215":"#1a1a1a",
          border:"1px solid "+(n.type==="green"?"#22c55e30":n.type==="red"?"#ef444430":"#333"),
          color:n.type==="green"?"#4ade80":n.type==="red"?"#f87171":"#999",animation:"slideIn .3s ease-out"}}>{n.msg}</div>))}
      </div>

      {/* HEADER — Polymarket style, larger */}
      <div style={{padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #1a1a1a",background:"#0a0a0a"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={onChangeGame} style={{background:"none",border:"none",cursor:"pointer",color:"#666",display:"flex",alignItems:"center",gap:4,fontSize:13,fontWeight:600,fontFamily:fb,padding:0}}>
            <ChevronRight size={16} style={{transform:"rotate(180deg)"}}/> 
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={LOGO_NAV} style={{height:28,width:"auto"}} alt="pd"/>
            <span style={{fontFamily:fd,fontWeight:800,fontSize:18,color:"#fff"}}>Perpdictions</span>
          </div>
        </div>

        {/* Center — sport tabs */}
        <div style={{display:"flex",gap:4,background:"#111",borderRadius:10,padding:3}}>
          {["Demos","Live","Basketball","Football","Baseball","Soccer","Hockey","MMA"].map((sport)=>{
            const isActive = sport==="Demos"?terminalPage==="demos":sport==="Basketball"?terminalPage==="basketball":sport==="Baseball"?terminalPage==="baseball":sport==="Soccer"?terminalPage==="soccer":sport==="Hockey"?terminalPage==="hockey":sport==="MMA"?terminalPage==="mma":sport==="Football"?terminalPage==="nfl":sport==="Live"?terminalPage==="trending":terminalPage==="game"&&sportTab===sport;
            return (
            <button key={sport} onClick={()=>{
              if(sport==="Demos"){setTerminalPage("demos");}
              else if(sport==="Basketball"){setTerminalPage("basketball");}
              else if(sport==="Baseball"){setTerminalPage("baseball");}
              else if(sport==="Soccer"){setTerminalPage("soccer");}
              else if(sport==="Hockey"){setTerminalPage("hockey");}
              else if(sport==="MMA"){setTerminalPage("mma");}
              else if(sport==="Football"){setTerminalPage("nfl");}
              else if(sport==="Live"){setTerminalPage("trending");}
              else{setTerminalPage("game");setSportTab(sport);}
            }} style={{padding:"6px 14px",fontSize:12,fontWeight:isActive?600:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
              background:isActive?B.primary+"20":"transparent",color:isActive?"#fff":"#666"}}>
              {sport==="Live"
                ? <span style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1.5s infinite",flexShrink:0}}/>
                    Live
                  </span>
                : sport}{sport==="Basketball"&&liveGames.length>0?` (${liveGames.length})`:""}</button>
          );})}
        </div>

        {/* Right — deposit + profile */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button style={{padding:"8px 20px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:10,background:B.green,color:"#fff"}}>
            Deposit
          </button>
          <div style={{width:34,height:34,borderRadius:"50%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <span style={{fontSize:14,color:"#888"}}>👤</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",height:"calc(100vh - 56px)"}}>

        {terminalPage==="demos"?<DemosPage onSelectGame={(g)=>{onSwitchGame(g);setTerminalPage("game");}} currentGameId={G.id}/>
        :terminalPage==="basketball"?<BasketballPage liveGames={liveGames}/>
        :terminalPage==="baseball"?<BaseballPage/>
        :terminalPage==="soccer"?<SoccerPage/>
        :terminalPage==="hockey"?<HockeyPage/>
        :terminalPage==="mma"?<MMAPage/>
        :terminalPage==="nfl"?<NFLPage/>
        :terminalPage==="trending"?<TrendingPage liveGames={liveGames}/>
        :<>

        {/* LEFT SIDEBAR — other games */}
        <div style={{width:260,borderRight:"1px solid #1a1a1a",overflow:"auto",flexShrink:0,padding:"16px 0"}}>

          {/* Current game highlight */}
          <div style={{margin:"12px 16px",padding:"12px 14px",background:B.primary+"12",borderRadius:12,border:"1px solid "+B.primary+"25"}}>
            <div style={{fontSize:10,color:B.primary,fontWeight:700,marginBottom:6,fontFamily:fm}}>VIEWING NOW</div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{HOME.name} vs {AWAY.name}</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>{G.label}</div>
          </div>

          {/* Other Demo Games */}
          <div style={{padding:"16px 16px 0"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:10,fontFamily:fm,letterSpacing:"0.04em"}}>OTHER DEMO GAMES</div>
            {PROC_GAMES.filter(pg=>pg.id!==G.id).map(pg=>(
              <div key={pg.id} onClick={()=>onSwitchGame(pg)} style={{padding:"12px 14px",marginBottom:8,cursor:"pointer",background:"#111",borderRadius:12,border:"1px solid #1f1f1f",transition:"all .15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:16}}>{pg.emoji}</span>
                  <span style={{fontSize:11,color:"#888",fontWeight:600}}>{pg.sport}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{pg.home.logo}</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{pg.home.name}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#fff"}}>{pg.raw[pg.raw.length-1][2]}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{pg.away.logo}</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{pg.away.name}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#fff"}}>{pg.raw[pg.raw.length-1][3]}</span>
                </div>
                <div style={{fontSize:10,color:"#666"}}>{pg.tagline}</div>
              </div>
            ))}
          </div>

          {/* LIVE BASKETBALL — from backend */}
          {liveGames.length > 0 && (
            <div style={{padding:"16px 16px 0"}}>
              <div style={{fontSize:11,fontWeight:700,color:B.primary,marginBottom:10,fontFamily:fm,letterSpacing:"0.04em"}}>
                🏀 LIVE BASKETBALL ({liveGames.length})
              </div>
              {liveGames.map(lg=>(
                <div key={lg.id} style={{padding:"12px 14px",marginBottom:8,background:"#111",borderRadius:12,border:"1px solid #1f1f1f",transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {lg.status==="live"&&<span style={{width:6,height:6,borderRadius:"50%",background:B.green,flexShrink:0}}/>}
                      <span style={{fontSize:11,color:lg.status==="live"?B.green:lg.status==="final"?"#888":"#666",fontWeight:600,fontFamily:fm}}>
                        {lg.status==="live"?"LIVE":lg.status==="halftime"?"HALF":lg.status==="final"?"FINAL":lg.leagueDisplay}
                      </span>
                    </div>
                    {lg.status!=="scheduled"&&<span style={{fontSize:10,color:"#555",fontFamily:fm}}>{lg.clock&&lg.period?`${lg.clock} · Q${lg.period}`:""}</span>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {lg.home.logo&&<img src={lg.home.logo} style={{width:16,height:16,borderRadius:4}} alt=""/>}
                      <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{lg.home.abbreviation || lg.home.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#fff"}}>{lg.home.score}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {lg.away.logo&&<img src={lg.away.logo} style={{width:16,height:16,borderRadius:4}} alt=""/>}
                      <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{lg.away.abbreviation || lg.away.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#fff"}}>{lg.away.score}</span>
                  </div>
                  {lg.oracle?.indexPrice&&<div style={{marginTop:4,fontSize:10,color:B.primary,fontWeight:600,fontFamily:fm}}>{(lg.oracle.indexPrice*100).toFixed(1)}% win prob</div>}
                  {lg.status==="scheduled"&&<div style={{marginTop:4,fontSize:10,color:"#555"}}>{lg.statusDetail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,minWidth:0,overflow:"auto"}}>

          {/* SCOREBOARD — floating card style */}
          <div style={{padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:32,padding:"20px 40px",background:"#111",borderRadius:16,border:"1px solid #1f1f1f"}}>
              {/* Home */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:32}}>{HOME.logo}</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{HOME.name}</div>
                  <div style={{fontSize:11,color:"#666",fontFamily:fm}}>{HOME.short}</div>
                </div>
              </div>

              {/* Score */}
              <div style={{textAlign:"center",minWidth:140}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
                  <span style={{fontSize:44,fontWeight:900,color:"#fff",fontFamily:fm,lineHeight:1}}>{gs.hs}</span>
                  <span style={{fontSize:20,color:"#333"}}>—</span>
                  <span style={{fontSize:44,fontWeight:900,color:"#fff",fontFamily:fm,lineHeight:1}}>{gs.as}</span>
                </div>
                <div style={{marginTop:8}}>
                  <span style={{fontSize:12,fontWeight:600,padding:"4px 16px",borderRadius:20,background:settled?"#22c55e18":"#222",color:settled?"#4ade80":"#888"}}>
                    {settled?"Final":gs.q===0?"Halftime":G.periodLabel(gs.q)+" · "+gs.c}
                  </span>
                </div>
                <div style={{fontSize:11,color:"#555",marginTop:6}}>{G.label}</div>
              </div>

              {/* Away */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{AWAY.name}</div>
                  <div style={{fontSize:11,color:"#666",fontFamily:fm}}>{AWAY.short}</div>
                </div>
                <span style={{fontSize:32}}>{AWAY.logo}</span>
              </div>
            </div>
          </div>

          {/* CHART — floating card */}
          <div style={{margin:"0 24px",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #1f1f1f"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#888"}}>Win Probability</span>
              <div style={{display:"flex",gap:16}}>
                <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:HOME.light,display:"inline-block"}}/>
                  <span style={{color:HOME.light,fontWeight:700,fontFamily:fm}}>{(oracle.price*100).toFixed(1)}%</span>
                  <span style={{color:"#666"}}>{HOME.short}</span>
                </span>
                <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:AWAY.light,display:"inline-block"}}/>
                  <span style={{color:AWAY.light,fontWeight:700,fontFamily:fm}}>{(awayProb*100).toFixed(1)}%</span>
                  <span style={{color:"#666"}}>{AWAY.short}</span>
                </span>
              </div>
            </div>
            <div style={{height:220,padding:"4px 8px 0"}}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={merged} margin={{top:8,right:8,bottom:4,left:8}}>
                  <defs>
                    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={HOME.light} stopOpacity={0.12}/><stop offset="100%" stopColor={HOME.light} stopOpacity={0.01}/></linearGradient>
                    <linearGradient id="ag" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={AWAY.light} stopOpacity={0.08}/><stop offset="100%" stopColor={AWAY.light} stopOpacity={0.01}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="#ffffff04" vertical={false}/>
                  <XAxis dataKey="t" tick={{fill:"#555",fontSize:10}} tickFormatter={G.xTick} axisLine={{stroke:"#1f1f1f"}} tickLine={false}/>
                  <YAxis domain={[0,1]} tick={{fill:"#555",fontSize:10}} tickFormatter={v=>(v*100)+"%"} axisLine={false} tickLine={false} width={32} orientation="right"/>
                  <Tooltip content={<ChartTip/>} cursor={{stroke:"#ffffff06"}}/>
                  <ReferenceLine y={0.5} stroke="#ffffff06" strokeDasharray="4 4"/>
                  {liqLines.map(ll=>(<ReferenceLine key={ll.id} y={ll.liqOnChart} stroke={B.red} strokeWidth={1} strokeDasharray="3 3"/>))}
                  <Area type="natural" dataKey="ph" stroke={HOME.light} strokeWidth={2} fill="url(#hg)" dot={false} animationDuration={0} baseValue={0}/>
                  <Area type="natural" dataKey="pa" stroke={AWAY.light} strokeWidth={1.5} fill="url(#ag)" dot={false} animationDuration={0} baseValue={0}/>
                  <Scatter dataKey="mh_val" shape={<HomeMarkerDot/>} isAnimationActive={false}/>
                  <Scatter dataKey="ma_val" shape={<AwayMarkerDot/>} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Oracle strip */}
            <div style={{display:"flex",gap:8,padding:"6px 16px 10px",alignItems:"center"}}>
              <span style={{fontSize:10,color:"#444",fontWeight:600}}>Oracle</span>
              {oracle.sources.map(s=>(<span key={s.name} style={{fontSize:10,color:"#666",display:"flex",alignItems:"center",gap:3}}>
                <span style={{width:4,height:4,borderRadius:2,background:s.color,display:"inline-block"}}/>{s.name} <span style={{color:s.color,fontWeight:700}}>{(s.v*100).toFixed(1)}%</span>
              </span>))}
            </div>
          </div>

          {/* POSITIONS — own section */}
          <div style={{margin:"16px 24px 0",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",overflow:"hidden"}}>
            <div style={{padding:"10px 20px",borderBottom:"1px solid #1f1f1f",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>Positions {(positions.length+closedPos.length)>0&&<span style={{color:B.primary,marginLeft:4,fontSize:11}}>{positions.length+closedPos.length}</span>}</span>
              {closedPnL!==0&&<span style={{fontSize:12,fontFamily:fm,color:pctClr(closedPnL),fontWeight:700}}>Net: {fmtUsd(closedPnL)}</span>}
            </div>
            <div style={{padding:"10px 16px"}}>
              {positions.length===0&&closedPos.length===0?(
                <div style={{textAlign:"center",fontSize:13,color:"#555",padding:"20px 0"}}>{settled?"All positions settled":"No open positions yet"}</div>
              ):(
                <div>
                  {positions.length>0&&(
                    <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                      <thead><tr style={{color:"#555",fontSize:11}}>
                        <th style={{textAlign:"left",padding:"6px 8px"}}>Side</th><th style={{textAlign:"right",padding:"6px 8px"}}>Size</th><th style={{textAlign:"right",padding:"6px 8px"}}>Entry</th>
                        <th style={{textAlign:"right",padding:"6px 8px"}}>Mark</th><th style={{textAlign:"right",padding:"6px 8px"}}>Liq</th><th style={{textAlign:"right",padding:"6px 8px"}}>PnL</th><th></th>
                      </tr></thead>
                      <tbody>{positions.map(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,oracle.price);const tm=pos.side==="home"?HOME:AWAY;return(
                        <tr key={pos.id} style={{borderTop:"1px solid #1f1f1f"}}>
                          <td style={{padding:"8px",color:pos.side==="home"?HOME.light:AWAY.light,fontWeight:700}}>{tm.logo} {tm.short} {pos.leverage}x</td>
                          <td style={{padding:"8px",textAlign:"right"}}>{fmtUsd(pos.exposure)}</td>
                          <td style={{padding:"8px",textAlign:"right"}}>{(pos.entry*100).toFixed(1)}%</td>
                          <td style={{padding:"8px",textAlign:"right",color:"#60a5fa"}}>{(oracle.price*100).toFixed(1)}%</td>
                          <td style={{padding:"8px",textAlign:"right",color:B.red}}>{(pos.liq*100).toFixed(1)}%</td>
                          <td style={{padding:"8px",textAlign:"right",color:pctClr(pnl),fontWeight:700}}>{fmtUsd(pnl)}</td>
                          <td style={{padding:"8px"}}><button onClick={()=>closePosition(pos.id)} style={{background:"#ef4444",border:"none",padding:"5px 14px",borderRadius:8,cursor:"pointer",color:"#fff",fontWeight:700,fontSize:11}}>Close</button></td>
                        </tr>)})}</tbody>
                    </table>
                  )}
                  {closedPos.length>0&&(
                    <div style={{marginTop:positions.length>0?8:0}}>
                      {positions.length>0&&<div style={{fontSize:11,color:"#555",fontWeight:600,padding:"8px 0 4px"}}>Closed</div>}
                      {closedPos.map((cp,i)=>{const tm=cp.side==="home"?HOME:AWAY;return(
                        <div key={cp.id+"-"+i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",borderTop:"1px solid #1a1a1a",opacity:0.5,fontFamily:fm,fontSize:11}}>
                          <span style={{color:cp.side==="home"?HOME.light:AWAY.light,fontWeight:700}}>{tm.logo} {tm.short} {cp.leverage}x</span>
                          <span style={{color:"#666"}}>{(cp.entry*100).toFixed(1)}→{(cp.closedAt*100).toFixed(1)}%</span>
                          <span style={{color:pctClr(cp.pnl),fontWeight:700}}>{fmtUsd(cp.pnl)}</span>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:cp.closeType==="LIQ"?"#ef444420":cp.pnl>=0?"#22c55e15":"#1a1a1a",color:cp.closeType==="LIQ"?"#f87171":cp.pnl>=0?"#4ade80":"#666"}}>{cp.closeType}</span>
                        </div>)})}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GAMECAST / BOX SCORE — separate section */}
          <div style={{margin:"12px 24px 0",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",display:"flex",flexDirection:"column",minHeight:400,overflow:"hidden"}}>
            <div style={{display:"flex",gap:0,borderBottom:"1px solid #1f1f1f",flexShrink:0}}>
              {[["gamecast","Gamecast",PLAYS.filter(p=>p.t<=gameTime).length],["boxscore","Box Score",0]].map(([id,label,count])=>(
                <button key={id} onClick={()=>setBottomTab(id)} style={{padding:"10px 20px",fontSize:13,fontWeight:600,border:"none",cursor:"pointer",fontFamily:fb,
                  background:"transparent",color:bottomTab===id?"#fff":"#666",borderBottom:bottomTab===id?"2px solid "+B.primary:"2px solid transparent"}}>
                  {label} {count>0&&<span style={{color:B.primary,marginLeft:4,fontSize:11}}>{count}</span>}
                </button>
              ))}
            </div>
            <div style={{minHeight:300,padding:"10px 16px"}}>
              {/* Gamecast */}
              {bottomTab==="gamecast"&&(gameTime<0.5?(
                <div style={{textAlign:"center",fontSize:13,color:"#555",padding:"28px 0"}}>{G.emoji} Press play to start</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {PLAYS.filter(p=>p.t<=gameTime).reverse().map((play,i)=>{
                    const isScoring=play.scoring&&play.e.includes("⚡");const isHome=play.e.includes(HOME.short);
                    const isMom=play.e.includes("INT")||play.e.includes("fumble")||play.e.includes("blocked")||play.e.includes("sacked");
                    return(
                      <div key={play.t+"-"+i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:10,
                        background:isScoring?(isHome?HOME.light+"0a":AWAY.light+"0a"):"transparent",animation:i===0?"slideIn .3s":"none"}}>
                        <div style={{flexShrink:0,width:50,textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#555",fontWeight:600}}>{play.q===0?"HALF":G.periodLabel(play.q)}</div>
                          <div style={{fontSize:11,color:"#777",fontFamily:fm}}>{play.c}</div>
                        </div>
                        <div style={{flexShrink:0,width:44,textAlign:"center",fontFamily:fm,fontSize:12,fontWeight:700}}>
                          <span style={{color:HOME.light}}>{play.hs}</span><span style={{color:"#333"}}>-</span><span style={{color:AWAY.light}}>{play.as}</span>
                        </div>
                        <div style={{flex:1,fontSize:13,fontWeight:isScoring?700:400,color:isScoring?(isHome?HOME.light:AWAY.light):isMom?"#ccc":"#777"}}>
                          {isScoring?"🔥 ":isMom?"📢 ":""}{play.e.replace(/⚡/g,"").trim()}
                        </div>
                        <div style={{flexShrink:0,fontFamily:fm,fontSize:11,color:"#60a5fa",fontWeight:700}}>{(play.p*100).toFixed(0)}%</div>
                      </div>);})}
                </div>
              ))}

              {/* Box Score */}
              {bottomTab==="boxscore"&&(()=>{const bx=BOX[G.id]||{qtr:[],team:[],pass:{h:[],a:[]},rush:{h:[],a:[]},rec:{h:[],a:[]},def:{h:[],a:[]},passH:[],rushH:[],recH:[],defH:[]};
                const tblStyle={width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:11};
                const thS={textAlign:"right",padding:"5px 6px",color:"#555",fontWeight:600,fontSize:10};
                const tdS={textAlign:"right",padding:"5px 6px",borderTop:"1px solid #1a1a1a"};
                const renderTable=(title,headers,homeRows,awayRows)=>{
                  if(!headers||headers.length===0||(!homeRows.length&&!awayRows.length))return null;
                  return(<div style={{marginTop:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#888",marginBottom:6}}>{title}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      {[[HOME,homeRows],[AWAY,awayRows]].map(([t,rows])=>(
                        <div key={t.short} style={{background:"#0a0a0a",borderRadius:10,padding:12,overflow:"auto"}}>
                          <div style={{fontSize:11,fontWeight:700,color:t.light,marginBottom:6}}>{t.logo} {t.name}</div>
                          {rows.length>0?(
                            <table style={tblStyle}>
                              <thead><tr>{headers.map((h,i)=>(<th key={h} style={{...thS,textAlign:i===0?"left":"right"}}>{h}</th>))}</tr></thead>
                              <tbody>{rows.map((r,ri)=>(<tr key={ri}>{r.map((c,ci)=>(<td key={ci} style={{...tdS,textAlign:ci===0?"left":"right",color:ci===0?"#ccc":"#999",fontWeight:ci===0?600:400}}>{c}</td>))}</tr>))}</tbody>
                            </table>
                          ):(<div style={{fontSize:11,color:"#444",padding:"8px 0"}}>—</div>)}
                        </div>
                      ))}
                    </div>
                  </div>);
                };
                return(<div>
                  {/* Linescore */}
                  <div style={{background:"#0a0a0a",borderRadius:10,padding:12,overflow:"auto"}}>
                    <table style={{...tblStyle,fontSize:12}}>
                      <thead><tr>
                        <th style={{textAlign:"left",padding:"5px 8px",color:"#555",fontWeight:600,fontSize:10,minWidth:80}}>Team</th>
                        {bx.qtr.map(q=>(<th key={q.q} style={{textAlign:"center",padding:"5px 6px",color:"#555",fontWeight:600,fontSize:10,minWidth:28}}>{q.q}</th>))}
                        <th style={{textAlign:"center",padding:"5px 8px",color:"#fff",fontWeight:700,fontSize:10}}>T</th>
                      </tr></thead>
                      <tbody>
                        <tr style={{borderTop:"1px solid #1a1a1a"}}>
                          <td style={{padding:"6px 8px",color:HOME.light,fontWeight:700}}>{HOME.logo} {HOME.short}</td>
                          {bx.qtr.map(q=>(<td key={q.q} style={{textAlign:"center",padding:"6px 6px",color:q.h>0?"#fff":"#555"}}>{q.h}</td>))}
                          <td style={{textAlign:"center",padding:"6px 8px",color:HOME.light,fontWeight:800}}>{bx.qtr.reduce((s,q)=>s+q.h,0)}</td>
                        </tr>
                        <tr style={{borderTop:"1px solid #1a1a1a"}}>
                          <td style={{padding:"6px 8px",color:AWAY.light,fontWeight:700}}>{AWAY.logo} {AWAY.short}</td>
                          {bx.qtr.map(q=>(<td key={q.q} style={{textAlign:"center",padding:"6px 6px",color:q.a>0?"#fff":"#555"}}>{q.a}</td>))}
                          <td style={{textAlign:"center",padding:"6px 8px",color:AWAY.light,fontWeight:800}}>{bx.qtr.reduce((s,q)=>s+q.a,0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Team Stats */}
                  {bx.team.length>0&&(
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#888",marginBottom:6}}>Team Stats</div>
                      <div style={{background:"#0a0a0a",borderRadius:10,padding:12}}>
                        <table style={tblStyle}>
                          <thead><tr>
                            <th style={{textAlign:"center",padding:"4px 6px",color:HOME.light,fontWeight:700,fontSize:10}}>{HOME.short}</th>
                            <th style={{textAlign:"center",padding:"4px 6px",color:"#555",fontWeight:600,fontSize:10}}>Stat</th>
                            <th style={{textAlign:"center",padding:"4px 6px",color:AWAY.light,fontWeight:700,fontSize:10}}>{AWAY.short}</th>
                          </tr></thead>
                          <tbody>{bx.team.map(([stat,h,a])=>(<tr key={stat} style={{borderTop:"1px solid #1a1a1a"}}>
                            <td style={{textAlign:"center",padding:"5px 6px",color:"#ccc",fontWeight:600}}>{h}</td>
                            <td style={{textAlign:"center",padding:"5px 6px",color:"#666",fontSize:10}}>{stat}</td>
                            <td style={{textAlign:"center",padding:"5px 6px",color:"#ccc",fontWeight:600}}>{a}</td>
                          </tr>))}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Player stats tables */}
                  {renderTable(G.sport==="NBA"?"Players":G.sport==="MLB"?"Pitching":"Passing",bx.passH,bx.pass.h,bx.pass.a)}
                  {renderTable(G.sport==="MLB"?"Batting":"Rushing",bx.rushH,bx.rush.h,bx.rush.a)}
                  {renderTable("Receiving",bx.recH,bx.rec.h,bx.rec.a)}
                  {renderTable("Defense",bx.defH,bx.def.h,bx.def.a)}
                </div>);
              })()}
            </div>
          </div>

          {/* Playback — sticky at bottom */}
          <div style={{position:"sticky",bottom:0,margin:"16px 24px 0",padding:"10px 16px",background:"#111e",backdropFilter:"blur(12px)",borderRadius:"12px 12px 0 0",border:"1px solid #1f1f1f",borderBottom:"none",display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>{if(settled)resetAll();else setPlaying(p=>!p);}} style={{width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",
              background:playing?"#ef4444":B.primary}}>
              {playing?<Pause size={16}/>:<Play size={16}/>}
            </button>
            <button onClick={resetAll} style={{width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",background:"#1a1a1a"}}>
              <RotateCcw size={14}/>
            </button>
            <div style={{display:"flex",gap:4,marginLeft:4}}>
              {[5,10,25,50].map(s=>(<button key={s} onClick={()=>setSpeed(s)} style={{padding:"6px 12px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fm,borderRadius:8,
                background:speed===s?B.primary+"20":"#1a1a1a",color:speed===s?B.primaryLight:"#666"}}>{s}x</button>))}
            </div>
            <div style={{flex:1,margin:"0 8px"}}>
              <div style={{height:4,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,width:(gameTime/60)*100+"%",background:`linear-gradient(90deg,${B.warm},${B.primary},${B.cyan})`}}/></div>
            </div>
            <span style={{fontFamily:fm,fontSize:11,color:"#555"}}>{gameTime.toFixed(1)}/60</span>
          </div>
        </div>

        {/* RIGHT SIDEBAR — bet box */}
        <div style={{width:340,overflow:"auto",flexShrink:0,padding:16}}>
          <div style={{background:"#111",borderRadius:16,border:"1px solid #1f1f1f",padding:20}}>

            {/* Outcome selector */}
            <div style={{display:"flex",gap:0,marginBottom:20,background:"#1a1a1a",borderRadius:12,padding:3}}>
              <button onClick={()=>setOrderSide("home")} style={{flex:1,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,
                background:orderSide==="home"?HOME.light:"transparent",color:orderSide==="home"?"#000":"#666",
                border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s"}}>
                {HOME.logo} {HOME.name}
                <span style={{fontSize:12,opacity:0.6}}>{(oracle.price*100).toFixed(0)}¢</span>
              </button>
              <button onClick={()=>setOrderSide("away")} style={{flex:1,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,
                background:orderSide==="away"?AWAY.light:"transparent",color:orderSide==="away"?"#000":"#666",
                border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s"}}>
                {AWAY.logo} {AWAY.name}
                <span style={{fontSize:12,opacity:0.6}}>{(awayProb*100).toFixed(0)}¢</span>
              </button>
            </div>

            {/* Amount */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,color:"#888",marginBottom:8,fontWeight:600}}>Amount</div>
              <div style={{display:"flex",alignItems:"center",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,overflow:"hidden"}}>
                <span style={{paddingLeft:16,color:"#666",fontSize:16,fontWeight:600}}>$</span>
                <input type="number" value={orderMargin} onChange={e=>setOrderMargin(Math.max(0,+e.target.value))} style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:18,padding:"14px 8px",fontWeight:600,fontFamily:fb,width:"100%",minWidth:0}}/>
              </div>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                {[100,250,500,1000,2500].map(v=>(<button key={v} onClick={()=>setOrderMargin(v)} style={{flex:1,padding:"7px 0",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
                  background:orderMargin===v?"#2a2a2a":"#1a1a1a",color:orderMargin===v?"#fff":"#666"}}>{v>=1000?"$"+(v/1000)+"k":"$"+v}</button>))}
              </div>
            </div>

            {/* Leverage */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,color:"#888",marginBottom:8,fontWeight:600,display:"flex",justifyContent:"space-between"}}>
                <span>Leverage</span><span style={{color:B.primary,fontSize:12}}>{ml}x max</span>
              </div>
              <div style={{display:"flex",gap:4,background:"#1a1a1a",borderRadius:12,padding:3}}>
                {[1,2,3,5,10].map(l=>(<button key={l} onClick={()=>setOrderLev(l)} disabled={l>ml} style={{flex:1,padding:"9px 0",fontSize:14,fontWeight:700,border:"none",cursor:l>ml?"not-allowed":"pointer",fontFamily:fm,borderRadius:9,
                  background:l>ml?"transparent":orderLev===l?B.primary+"25":"transparent",color:l>ml?"#2a2a2a":orderLev===l?B.primaryLight:"#666"}}>{l}x</button>))}
              </div>
            </div>

            {/* Summary */}
            <div style={{background:"#0a0a0a",borderRadius:12,padding:14,marginBottom:16}}>
              {[["Exposure",fmtUsd(expo),"#fff"],["Liquidation",(liqP*100).toFixed(1)+"%",B.red]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}>
                  <span style={{color:"#666"}}>{l}</span><span style={{color:c,fontWeight:600}}>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:"#1a1a1a",margin:"8px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}>
                <span style={{color:"#888",fontWeight:600}}>Potential return</span>
                <span style={{color:B.green,fontWeight:800}}>+{fmtUsd(orderSide==="home"?expo*(1-oracle.price)/oracle.price:expo*oracle.price/(1-oracle.price))}</span>
              </div>
            </div>

            {/* Bet button */}
            <button onClick={placeOrder} disabled={settled||eM<10} style={{width:"100%",padding:"16px 0",fontWeight:700,fontSize:16,border:"none",cursor:settled?"not-allowed":"pointer",fontFamily:fb,borderRadius:12,
              background:settled?"#222":B.green,color:settled?"#666":"#fff",opacity:settled||eM<10?0.3:1}}>
              {settled?"Market Settled":"Bet "+team.name+" — "+fmtUsd(eM)}
            </button>

            {/* Account summary */}
            <div style={{marginTop:16,padding:"12px 0",borderTop:"1px solid #1f1f1f"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555",marginBottom:4}}>
                <span>Balance</span><span style={{color:"#fff",fontWeight:600,fontFamily:fm}}>{fmtUsd(balance)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#555"}}>
                <span>Portfolio</span><span style={{color:pctClr(totalEq-10000),fontWeight:600,fontFamily:fm}}>{fmtUsd(totalEq)} ({fmtPct((totalEq-10000)/100)})</span>
              </div>
            </div>
          </div>

          {/* ORDER BOOK */}
          <div style={{marginTop:12,background:"#111",borderRadius:16,border:"1px solid #1f1f1f",padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:"#888",marginBottom:10}}>Order Book</div>

            {/* Asks (sell side) */}
            <div style={{marginBottom:4}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"0 6px 4px",fontSize:10,fontWeight:700}}>
                <span style={{color:AWAY.light}}>{AWAY.logo} {AWAY.name}</span>
                <span style={{color:"#444"}}>Size</span>
              </div>
              {book.asks.slice(-6).map((a,i)=>{const mx=Math.max(...book.asks.map(x=>x.size));return(
                <div key={"a"+i} style={{display:"flex",justifyContent:"space-between",fontSize:12,height:26,alignItems:"center",position:"relative",fontFamily:fm,padding:"0 6px",borderRadius:4}}>
                  <div style={{position:"absolute",right:0,top:0,bottom:0,borderRadius:4,background:AWAY.light+"10",width:(a.size/mx)*100+"%"}}/>
                  <span style={{color:AWAY.light,position:"relative",zIndex:1,fontWeight:600}}>{(a.price*100).toFixed(1)}¢</span>
                  <span style={{color:"#555",position:"relative",zIndex:1,fontSize:11}}>{a.size}</span>
                </div>);})}
            </div>

            {/* Spread */}
            <div style={{padding:"6px",borderTop:"1px solid #1f1f1f",borderBottom:"1px solid #1f1f1f",marginBottom:4,display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#666"}}>Spread</span>
              <span style={{color:"#fff",fontWeight:700,fontFamily:fm}}>{((book.asks[book.asks.length-1].price-book.bids[0].price)*100).toFixed(1)}¢</span>
            </div>

            {/* Bids (buy side) */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"0 6px 4px",fontSize:10,fontWeight:700}}>
                <span style={{color:HOME.light}}>{HOME.logo} {HOME.name}</span>
                <span style={{color:"#444"}}>Size</span>
              </div>
              {book.bids.slice(0,6).map((b,i)=>{const mx=Math.max(...book.bids.map(x=>x.size));return(
                <div key={"b"+i} style={{display:"flex",justifyContent:"space-between",fontSize:12,height:26,alignItems:"center",position:"relative",fontFamily:fm,padding:"0 6px",borderRadius:4}}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,borderRadius:4,background:HOME.light+"10",width:(b.size/mx)*100+"%"}}/>
                  <span style={{color:HOME.light,position:"relative",zIndex:1,fontWeight:600}}>{(b.price*100).toFixed(1)}¢</span>
                  <span style={{color:"#555",position:"relative",zIndex:1,fontSize:11}}>{b.size}</span>
                </div>);})}
            </div>
          </div>
        </div>
      </>}
      </div>

      {/* Settlement overlay */}
      {settled&&(
        <div style={{position:"fixed",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.85)",backdropFilter:"blur(20px)"}}>
          <div style={{textAlign:"center",padding:"48px 56px",maxWidth:440,background:"#111",borderRadius:24,border:"1px solid #2a2a2a"}}>
            <div style={{fontSize:56,marginBottom:16}}>{HOME.logo}</div>
            <div style={{fontSize:28,fontWeight:800,color:HOME.light,marginBottom:6}}>{HOME.name} Win</div>
            <div style={{fontSize:18,color:"#888",fontFamily:fm,marginBottom:4}}>{gs.hs} – {gs.as}</div>
            <div style={{fontSize:13,color:"#555",marginBottom:24}}>{G.label}</div>
            <div style={{fontSize:40,fontWeight:800,color:totalEq>=10000?B.green:"#ef4444",fontFamily:fm,marginBottom:4}}>{fmtUsd(totalEq)}</div>
            <div style={{fontSize:15,marginBottom:36}}>
              <span style={{color:"#666"}}>Return </span><span style={{fontWeight:700,color:pctClr(totalEq-10000)}}>{fmtPct((totalEq-10000)/100)}</span>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={resetAll} style={{padding:"14px 32px",fontWeight:700,fontSize:15,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:12,background:"linear-gradient(135deg, #ff5028, #14b8a6)",color:"#fff"}}>Replay</button>
              <button onClick={onChangeGame} style={{padding:"14px 32px",fontWeight:700,fontSize:15,border:"1px solid #2a2a2a",cursor:"pointer",fontFamily:fb,borderRadius:12,background:"transparent",color:"#888"}}>Other Games</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("landing");
  const [sel, setSel] = useState(PROC_GAMES[0]);
  const [liveGames, setLiveGames] = useState([]);
  const pick = (g) => { setSel(g); setPage("trading"); };

  // Fetch basketball games from backend
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch(`${API_URL}/games`);
        if (!res.ok) return;
        const data = await res.json();
        setLiveGames(data.games || []);
      } catch (err) {
        console.log("[API] Backend not available, using demo games only");
      }
    };
    fetchGames();
    const iv = setInterval(fetchGames, 15000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div>
      <style>{`
        @import url('${FONT_URL}');
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes scroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#333;}
        button:hover:not(:disabled){filter:brightness(1.15);}button:active:not(:disabled){transform:scale(0.98);}
        *{box-sizing:border-box;margin:0;padding:0;}
      `}</style>
      {page==="landing"?<LandingPage onLaunch={()=>setPage("trading")} onDocs={()=>setPage("docs")}/>
      :page==="docs"?<DocsPage onBack={()=>setPage("landing")} onLaunch={()=>setPage("trading")}/>
      :sel?<TradingApp game={sel} onBack={()=>setPage("landing")} onChangeGame={()=>setPage("landing")} onSwitchGame={pick} liveGames={liveGames}/>:null}
    </div>
  );
}
