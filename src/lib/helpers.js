import { B } from "./theme.js";

/* ═══════════════════════════════════════════════════════════
   GENERIC HELPERS
   ═══════════════════════════════════════════════════════════ */
export const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
export const noise = r => (Math.random()-.5)*2*r;
export const fmt3 = n => n.toFixed(3);
export const fmtUsd = n => (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});
export const fmtPct = n => (n>=0?"+":"")+n.toFixed(1)+"%";
export const fmtShares = n => n>9999 ? "9,999+" : n.toLocaleString("en-US");
export const pctClr = n => n>0?B.green:n<0?B.pink:"#7a8599";

export function weightedMedian(items) {
  const s=[...items].sort((a,b)=>a.v-b.v); const tot=s.reduce((x,i)=>x+i.w,0); let c=0;
  for(const i of s){c+=i.w;if(c>=tot/2)return i.v;} return s[s.length-1].v;
}
export function catmullRom(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);}

export function getGameState(t,plays){
  if(t>=plays[plays.length-1].t)return{...plays[plays.length-1]};
  for(let i=0;i<plays.length-1;i++){if(t>=plays[i].t&&t<plays[i+1].t){
    const f=(t-plays[i].t)/(plays[i+1].t-plays[i].t),i0=Math.max(0,i-1),i3=Math.min(plays.length-1,i+2);
    const sp=clamp(catmullRom(plays[i0].p,plays[i].p,plays[i+1].p,plays[i3].p,f),.01,.99);
    return{prob:sp,hs:plays[i].hs,as:plays[i].as,q:plays[i].q,c:plays[i].c,e:plays[i].e};
  }} return{...plays[0]};
}

export function makeSources(p){return[
  {name:"Polymarket",v:clamp(p+noise(.012),.01,.99),w:.30,color:"#818cf8"},
  {name:"Kalshi",v:clamp(p+noise(.008),.01,.99),w:.25,color:"#fbbf24"},
  {name:"Books",v:clamp(p+noise(.006),.01,.99),w:.25,color:"#fbbf24"},
  {name:"ESPN",v:clamp(p+noise(.018),.01,.99),w:.10,color:B.pink},
  {name:"Model",v:clamp(p+noise(.010),.01,.99),w:.10,color:B.cyan},
];}

export function makeBook(mid){
  const sp=.004,asks=[],bids=[];
  for(let i=0;i<8;i++){
    asks.push({price:+(mid+sp/2+i*.003).toFixed(3),size:Math.max(10,Math.round((160-i*14)*(.7+Math.random()*.6)))});
    bids.push({price:+(mid-sp/2-i*.003).toFixed(3),size:Math.max(10,Math.round((160-i*14)*(.7+Math.random()*.6)))});
  }
  asks.sort((a,b)=>a.price-b.price);
  bids.sort((a,b)=>b.price-a.price);
  let cumA=0,cumB=0;
  asks.forEach(a=>{cumA+=a.size;a.cum=cumA;});
  bids.forEach(b=>{cumB+=b.size;b.cum=cumB;});
  return{asks,bids};
}

export function maxLev(p){const d=Math.min(p,1-p);if(d>=.2)return 10;if(d>=.1)return 5;if(d>=.05)return 3;return 2;}
/* Liquidation price in HOME-scale (matches backend getLiqPrice: liq = entry ∓ entryCost/lev).
   home: entry - entry/lev = entry*(1-1/lev);  away: entry + (1-entry)/lev. */
export function liqPrice(side,entry,lev){return side==="home"?entry*(1-1/lev):entry+(1-entry)/lev;}
export function calcPnL(side,exposure,entry,mark){return side==="home"?exposure*(mark-entry)/entry:exposure*(entry-mark)/entry;}

/* Sport-appropriate period label */
export function periodLabel(league, period, clock, statusDetail){
  const lg=(league||"").toLowerCase();
  if(lg==="mlb"||lg.includes("baseball")){
    if(statusDetail){
      const cleaned=statusDetail.split(",")[0].trim();
      if(/^(top|bottom|bot|mid|middle|end)\s+\d/i.test(cleaned)){
        return cleaned.replace(/^Bottom/i,"Bot").replace(/^Middle/i,"Mid");
      }
    }
    if(period){
      const ord=period==1?"st":period==2?"nd":period==3?"rd":"th";
      return "Inn "+period+ord;
    }
    return statusDetail||clock||"";
  }
  if(period==null||period==="")return clock||statusDetail||"";
  if(lg==="nhl"||lg.includes("hockey")){
    const ord=period==1?"st":period==2?"nd":period==3?"rd":period==4?"OT":"th";
    return period>=4?"OT"+(period>4?period-3:"")+(clock?" "+clock:""):period+ord+" P"+(clock?" "+clock:"");
  }
  if(lg==="mls"||lg==="wcup"||lg.includes("soccer")){
    return clock||(period==1?"1H":"2H");
  }
  return "Q"+period+(clock?" "+clock:"");
}

/* Format a game start time as "Today 7:30 PM" / "Tomorrow 1:05 PM" / "Sat · 4:10 PM" */
export function fmtGameTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return "Today · " + time;
  if (sameDay(d, tomorrow)) return "Tomorrow · " + time;
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return day + " · " + time;
}

/* Returns true if a game's scheduled start was within the last N hours */
export const isRecent = (dateStr, hours=6) => {
  if(!dateStr) return true;
  return (Date.now() - new Date(dateStr).getTime()) < hours * 60 * 60 * 1000;
};

/* Sort upcoming games soonest first */
export const byDate = (a,b) => new Date(a.date||0) - new Date(b.date||0);
