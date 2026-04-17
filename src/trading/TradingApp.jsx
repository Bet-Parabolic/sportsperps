import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, Scatter } from "recharts";
import { Play, Pause, RotateCcw, ChevronRight } from "lucide-react";
import { B, brighten, fb, fm } from "../lib/theme.js";
import { API_URL, ESPN_SOURCES, LIVE_STATUS } from "../lib/constants.js";
import { calcPnL, clamp, fmt3, fmtPct, fmtUsd, getGameState, liqPrice, makeBook, makeSources, maxLev, pctClr, periodLabel, weightedMedian } from "../lib/helpers.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { BOX } from "../lib/games.js";
import { AwayMarkerDot, HomeMarkerDot } from "../lib/markers.jsx";
import { ProfileModal } from "../components/ProfileModal.jsx";
import { LeaderboardPage } from "../components/LeaderboardPage.jsx";
import { BasketballPage } from "../components/sports/BasketballPage.jsx";
import { BaseballPage } from "../components/sports/BaseballPage.jsx";
import { NFLPage } from "../components/sports/NFLPage.jsx";
import { HockeyPage } from "../components/sports/HockeyPage.jsx";
import { SoccerPage } from "../components/sports/SoccerPage.jsx";
import { MMAPage } from "../components/sports/MMAPage.jsx";
import { TrendingPage } from "../components/sports/TrendingPage.jsx";
import { DemosPage } from "../components/sports/DemosPage.jsx";

export function TradingApp({ game, onBack, onChangeGame, onSwitchGame, liveGames = [], onTrade, initialTab }) {
  const G=game,HOME=G.home,AWAY=G.away,PLAYS=G.plays,SCORING_PLAYS=G.scoringPlays,initProb=PLAYS[0].p;
  const [gameTime,setGameTime]=useState(0);const [playing,setPlaying]=useState(false);const [speed,setSpeed]=useState(10);
  const [sportTab,setSportTab]=useState("Live");
  const [terminalPage,setTerminalPage]=useState(initialTab||"game");
  const [showProfile, setShowProfile] = useState(false);
  const [userId] = useState(() => {
    let id = localStorage.getItem('perpdictions_userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('perpdictions_userId', id); }
    return id;
  });
  // Register user with backend
  useEffect(() => {
    fetch(`${API_URL}/users`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId}) }).catch(()=>{});
  }, [userId]);
  // Single ESPN fetch — all sport data, one 30s interval, shared across all pages
  const [espnData, setEspnData] = useState(() =>
    Object.fromEntries(ESPN_SOURCES.map(s => [s.key, {events:[], loading:true, error:false}]))
  );
  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        ESPN_SOURCES.map(s => fetch(s.url).then(r=>r.json()).then(d=>({key:s.key, events:d.events||[], error:false})))
      );
      setEspnData(prev => {
        const next = {...prev};
        results.forEach(r => {
          if(r.status==="fulfilled") next[r.value.key] = {events:r.value.events, loading:false, error:false};
          else if(r.reason?._key) next[r.reason._key] = {...prev[r.reason._key], loading:false, error:true};
        });
        return next;
      });
    };
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  // sportCounts derived from espnData — zero extra fetches

  const sportCounts = useMemo(() => {
    const countLive = evts => (evts||[]).filter(ev => LIVE_STATUS.includes(ev.status?.type?.name)).length;
    return {
      nba: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && (!g.league || g.league==="nba" || g.league==="ncaam")).length,
      nfl: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="nfl").length || countLive(espnData.nfl?.events),
      mlb: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="mlb").length || countLive(espnData.mlb?.events),
      nhl: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="nhl").length || countLive(espnData.nhl?.events),
      ucl: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="mls").length || countLive(espnData.ucl?.events),
      ufc: countLive(espnData.ufc?.events),
    };
  }, [espnData, liveGames]);
  const [chartData,setChartData]=useState([{t:0,ph:initProb,pa:1-initProb,floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)}]);
  const [oracle,setOracle]=useState({price:initProb,sources:makeSources(initProb),floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)});
  const [book,setBook]=useState(makeBook(initProb));const [gs,setGs]=useState(PLAYS[0]);const [settled,setSettled]=useState(false);
  const [positions,setPositions]=useState([]);const [closedPos,setClosedPos]=useState([]);const [balance,setBalance]=useState(10000);
  const [closedPnL,setClosedPnL]=useState(0);const [orderSide,setOrderSide]=useState("home");const [orderMargin,setOrderMargin]=useState(500);
  const [orderLev,setOrderLev]=useState(5);const [notifs,setNotifs]=useState([]);const [markers,setMarkers]=useState([]);const [visScoring,setVisScoring]=useState([]);
  const [bottomTab,setBottomTab]=useState("gamecast");
  const [orderType,setOrderType]=useState("market"); // "market"|"limit"
  const [limitCents,setLimitCents]=useState(58);     // limit price in cents (1-99)
  const [tpCents,setTpCents]=useState("");            // take profit cents, ""=off
  const [slCents,setSlCents]=useState("");            // stop loss cents, ""=off
  const [limitOrders,setLimitOrders]=useState([]);   // pending limit orders
  const [rightTab,setRightTab]=useState("order");    // "order"|"book"
  const [reduceOnly,setReduceOnly]=useState(false);  // reduce-only toggle
  const [fundingClock,setFundingClock]=useState(0);  // countdown seconds to next funding
  const [showWager,setShowWager]=useState(false);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<768);
  useEffect(()=>{const fn=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);},[]);
  const lastCT=useRef(0);const lastEv=useRef("");const posR=useRef([]);posR.current=positions;
  const oR=useRef(oracle);oR.current=oracle;const gtR=useRef(0);gtR.current=gameTime;
  const limR=useRef([]);limR.current=limitOrders;
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
    // Limit order fills
    const lo=limR.current;if(lo.length>0){let filled=false;const remLO=lo.filter(lim=>{
      const fills=lim.side==="home"?op<=lim.limitPrice:op>=(1-lim.limitPrice);
      if(fills){filled=true;const fillEntry=lim.side==="home"?op:1-op;const liq2=liqPrice(lim.side,op,lim.leverage);
      setPositions(prev=>[...prev,{id:lim.id+1,side:lim.side,margin:lim.margin,leverage:lim.leverage,exposure:lim.exposure,entry:op,liq:liq2,openTime:next,tp:lim.tp,sl:lim.sl}]);
      addMark(next,op,"entry",lim.side);
      const loTeam=lim.side==="home"?HOME:AWAY;notify("✅ FILLED: "+loTeam.logo+" "+loTeam.short+" @ "+(fillEntry*100).toFixed(1)+"¢","green");return false;}return true;});
      if(filled)setLimitOrders(remLO);}
    // TP/SL auto-close
    const cp2=posR.current;if(cp2.some(p=>p.tp||p.sl)){let triggered=false;const rem2=cp2.filter(pos=>{
      const tpHit=pos.tp&&(pos.side==="home"?op>=pos.tp:op<=pos.tp);
      const slHit=pos.sl&&(pos.side==="home"?op<=pos.sl:op>=pos.sl);
      if(tpHit||slHit){triggered=true;const pnl2=calcPnL(pos.side,pos.exposure,pos.entry,op);
      setBalance(b=>b+pos.margin+pnl2);setClosedPnL(p=>p+pnl2);
      const closeType=tpHit?"TP":"SL";addMark(next,op,tpHit?"exit-win":"exit-loss",pos.side);
      setClosedPos(pr=>[{...pos,closedAt:op,pnl:pnl2,closeType,closeTime:next},...pr]);
      const tn2=pos.side==="home"?HOME:AWAY;
      notify((tpHit?"🎯 TP HIT":"🛑 SL HIT")+" "+tn2.name+" "+fmtUsd(pnl2),tpHit?"green":"red");return false;}return true;});
      if(triggered)setPositions(rem2);}
    if(next>=60){setSettled(true);setPlaying(false);addMark(60,1.0,"settle","home");const fp=posR.current;let sp2=0;const nc=[];
    fp.forEach(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,1.0);sp2+=pnl;nc.push({...pos,closedAt:1.0,pnl,closeType:"SETTLED",closeTime:60});});
    if(fp.length>0){setClosedPos(pr=>[...nc,...pr]);setBalance(b=>b+fp.reduce((s,p)=>s+p.margin,0)+sp2);setClosedPnL(p=>p+sp2);setPositions([]);notify("🏆 SETTLED — "+HOME.name+" win! "+fmtUsd(sp2),"green");}
    else notify("🏆 "+HOME.name+" win!","green");} return next;});},100);return()=>clearInterval(iv);},[playing,speed,settled,notify,addMark,PLAYS,SCORING_PLAYS,HOME,AWAY]);

  // Funding countdown — resets every quarter change (15 min game time = ~15s at 10x speed)
  useEffect(()=>{
    const iv=setInterval(()=>{
      setFundingClock(prev=>{
        if(prev<=0){
          // Calculate seconds to next quarter boundary in real time
          const secPerQuarter=15*60/speed; // game minutes per quarter / speed
          return Math.round(secPerQuarter);
        }
        return prev-1;
      });
    },1000);
    return()=>clearInterval(iv);
  },[speed]);

  // Reset funding clock on quarter change
  useEffect(()=>{
    setFundingClock(Math.round((15*60)/speed));
  },[gs.q,speed]);

  const placeOrder=useCallback(()=>{
    if(settled)return;const o=oR.current,gt=gtR.current,ml2=maxLev(o.price),lev=Math.min(orderLev,ml2),margin=Math.min(orderMargin,balance);
    if(margin<10){notify("Insufficient margin","red");return;}
    // Reduce-only: block if no existing position on this side
    if(reduceOnly&&!posR.current.some(p=>p.side===orderSide)){notify("No position to reduce","red");return;}
    const exposure=margin*lev;
    // Parse TP/SL — stored as oracle.price (home prob) thresholds
    const tp=tpCents!==""&&+tpCents>0?(orderSide==="home"?+tpCents/100:1-+tpCents/100):null;
    const sl=slCents!==""&&+slCents>0?(orderSide==="home"?+slCents/100:1-+slCents/100):null;
    if(orderType==="limit"){
      const lp=limitCents/100; // limit price as side's probability
      setLimitOrders(p=>[...p,{id:Date.now(),side:orderSide,margin,leverage:lev,exposure,limitPrice:lp,tp,sl,openTime:gt}]);
      setBalance(b=>b-margin);
      const tn=orderSide==="home"?HOME:AWAY;
      notify(tn.logo+" "+tn.name+" limit @ "+limitCents+"¢","info");
    } else {
      const entry=o.price,liq=liqPrice(orderSide,entry,lev);
      setPositions(p=>[...p,{id:Date.now(),side:orderSide,margin,leverage:lev,exposure,entry,liq,openTime:gt,tp,sl}]);
      setBalance(b=>b-margin);addMark(gt,entry,"entry",orderSide);setBottomTab("positions");
      const tn=orderSide==="home"?HOME:AWAY;notify(tn.logo+" "+tn.name+" "+lev+"x @ "+fmt3(entry),orderSide==="home"?"green":"red");
    }
  },[oracle.price,orderSide,orderMargin,orderLev,balance,settled,gameTime,notify,addMark,HOME,AWAY,orderType,limitCents,tpCents,slCents]);

  const closePosition=useCallback((id)=>{setPositions(prev=>{const pos=prev.find(p=>p.id===id);if(!pos)return prev;const o=oR.current,gt=gtR.current;
  const pnl=calcPnL(pos.side,pos.exposure,pos.entry,o.price);setBalance(b=>b+pos.margin+pnl);setClosedPnL(p=>p+pnl);
  addMark(gt,o.price,pnl>=0?"exit-win":"exit-loss",pos.side);setClosedPos(pr=>[{...pos,closedAt:o.price,pnl,closeType:"CLOSED",closeTime:gt},...pr]);
  notify("Closed "+(pos.side==="home"?HOME:AWAY).name+" — "+fmtUsd(pnl),pnl>=0?"green":"red");return prev.filter(p=>p.id!==id);});},[notify,addMark,HOME,AWAY]);

  const resetAll=useCallback(()=>{setGameTime(0);setPlaying(false);setSettled(false);
  setChartData([{t:0,ph:initProb,pa:1-initProb,floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)}]);
  setOracle({price:initProb,sources:makeSources(initProb),floor:clamp(initProb-.2,.01,.99),ceil:clamp(initProb+.2,.01,.99)});
  setBook(makeBook(initProb));setGs(PLAYS[0]);setPositions([]);setClosedPos([]);setBalance(10000);setClosedPnL(0);
  setMarkers([]);setVisScoring([]);setLimitOrders([]);lastCT.current=0;lastEv.current="";setNotifs([]);},[initProb,PLAYS]);

  const totalUPnL=positions.reduce((s,p)=>s+calcPnL(p.side,p.exposure,p.entry,oracle.price),0);
  const totalEq=balance+positions.reduce((s,p)=>s+p.margin,0)+totalUPnL;
  const ml=maxLev(oracle.price),eL=Math.min(orderLev,ml),eM=Math.min(orderMargin,balance);
  const team=orderSide==="home"?HOME:AWAY,expo=eM*eL,liqP=liqPrice(orderSide,oracle.price,eL);
  const entryP=orderSide==="home"?oracle.price:(1-oracle.price);
  const shareCount=Math.max(1,Math.round((eM*eL)/entryP));
  // Simulated market stats — grow with game time and positions
  const simVol=useMemo(()=>{const base=8400+Math.floor(gameTime*520);const fromPos=positions.reduce((s,p)=>s+p.exposure,0)+closedPos.reduce((s,p)=>s+p.exposure,0);return base+fromPos;},[gameTime,positions,closedPos]);
  const simOI=useMemo(()=>positions.reduce((s,p)=>s+p.exposure,0)+Math.floor(gameTime*180),[gameTime,positions]);
  // Funding rate: slightly positive when home favored, negative when away favored
  const fundingRate=((oracle.price-0.5)*0.08).toFixed(3);
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

      {/* HEADER */}
      <div style={{padding:isMobile?"0 12px":"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #1a1a1a",background:"#0a0a0a",position:"sticky",top:0,zIndex:30}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",maxWidth:1400}}>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:16}}>
          <button onClick={onChangeGame} style={{background:"none",border:"none",cursor:"pointer",color:"#666",display:"flex",alignItems:"center",gap:4,fontSize:13,fontWeight:600,fontFamily:fb,padding:0}}>
            <ChevronRight size={16} style={{transform:"rotate(180deg)"}}/>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:isMobile?3:5}}>
            <img src={LOGO_NAV} style={{height:isMobile?110:140,width:"auto",margin:"-30px 0",marginRight:isMobile?-8:-10}} alt="pd"/>
            {!isMobile&&<img src={LOGO_WORDMARK} style={{height:28,width:"auto"}} alt="Perpdictions"/>}
          </div>
        </div>

        {/* Center — sport tabs */}
        <div className="mob-nav" style={{display:"flex",gap:isMobile?2:4,background:"#111",borderRadius:10,padding:3,overflowX:"auto",flex:1,marginLeft:isMobile?8:16,marginRight:isMobile?8:16,minWidth:0}}>
          {["Demos","Live","Basketball","Football","Baseball","Soccer","Hockey","MMA","Leaderboard"].map((sport)=>{
            const isActive = sport==="Demos"?terminalPage==="demos":sport==="Basketball"?terminalPage==="basketball":sport==="Baseball"?terminalPage==="baseball":sport==="Soccer"?terminalPage==="soccer":sport==="Hockey"?terminalPage==="hockey":sport==="MMA"?terminalPage==="mma":sport==="Football"?terminalPage==="nfl":sport==="Live"?terminalPage==="trending":sport==="Leaderboard"?terminalPage==="leaderboard":terminalPage==="game"&&sportTab===sport;
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
              else if(sport==="Leaderboard"){setTerminalPage("leaderboard");}
              else{setTerminalPage("game");setSportTab(sport);}
            }} style={{padding:isMobile?"4px 8px":"6px 14px",fontSize:isMobile?10:12,fontWeight:isActive?600:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
              background:isActive?B.primary+"20":"transparent",color:isActive?"#fff":"#666"}}>
              {sport==="Live"
                ? <span style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1.5s infinite",flexShrink:0}}/>
                    Live
                  </span>
                : sport}{(() => {
                  const c = sport==="Live"?(sportCounts.nba+sportCounts.nfl+sportCounts.mlb+sportCounts.nhl+sportCounts.ucl+(sportCounts.ufc||0)):sport==="Basketball"?sportCounts.nba:sport==="Football"?sportCounts.nfl:sport==="Baseball"?sportCounts.mlb:sport==="Hockey"?sportCounts.nhl:sport==="Soccer"?sportCounts.ucl:sport==="MMA"?sportCounts.ufc:null;
                  return c>0?<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>({c})</span>:null;
                })()}</button>
          );})}
        </div>

        {/* Right — deposit + profile */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button style={{padding:"8px 20px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:10,background:B.green,color:"#fff"}}>
            Deposit
          </button>
          <div onClick={()=>setShowProfile(true)} style={{width:34,height:34,borderRadius:"50%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <span style={{fontSize:14,color:"#888"}}>👤</span>
          </div>
        </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",height:isMobile?"auto":"calc(100vh - 56px)",flexDirection:isMobile?"column":"row",minHeight:isMobile?"calc(100vh - 56px)":"auto"}}>

        {terminalPage==="demos"?<DemosPage onSelectGame={(g)=>{onSwitchGame(g);setTerminalPage("game");}} currentGameId={G.id}/>
        :terminalPage==="basketball"?<BasketballPage liveGames={liveGames} onTrade={onTrade}/>
        :terminalPage==="baseball"?<BaseballPage data={espnData.mlb} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="soccer"?<SoccerPage data={espnData.ucl} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="hockey"?<HockeyPage data={espnData.nhl} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="mma"?<MMAPage data={espnData.ufc}/>
        :terminalPage==="nfl"?<NFLPage data={espnData.nfl} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="trending"?<TrendingPage liveGames={liveGames} espnData={espnData} onTrade={onTrade}/>
        :terminalPage==="leaderboard"?<LeaderboardPage userId={userId}/>
        :<>

        {/* LEFT SIDEBAR — other games */}
        {!isMobile&&<div style={{width:260,borderRight:"1px solid #1a1a1a",overflow:"auto",flexShrink:0,padding:"16px 0"}}>

          {/* Current game highlight */}
          <div style={{margin:"12px 16px",padding:"12px 14px",background:B.primary+"12",borderRadius:12,border:"1px solid "+B.primary+"25"}}>
            <div style={{fontSize:10,color:B.primary,fontWeight:700,marginBottom:6,fontFamily:fm}}>VIEWING NOW</div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{HOME.name} vs {AWAY.name}</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>{G.label}</div>
          </div>

          {/* ACTIVE POSITIONS */}
          {positions.length > 0 && (
            <div style={{padding:"0 16px 12px"}}>
              <div style={{fontSize:10,fontWeight:700,color:B.primary,marginBottom:8,fontFamily:fm,letterSpacing:"0.08em",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>ACTIVE POSITIONS</span>
                <span style={{color:pctClr(totalUPnL),fontFamily:fm,fontWeight:700}}>{fmtUsd(totalUPnL)}</span>
              </div>
              {positions.map(pos=>{
                const pnl=calcPnL(pos.side,pos.exposure,pos.entry,oracle.price);
                const tm=pos.side==="home"?HOME:AWAY;
                const posEntryP=pos.side==="home"?pos.entry:1-pos.entry;
                return(
                  <div key={pos.id} style={{padding:"8px 10px",marginBottom:4,background:"#0a0a0a",borderRadius:8,border:"1px solid #1f1f1f",borderLeft:"2px solid "+(pos.side==="home"?HOME.light:AWAY.light)}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                      <span style={{fontSize:11,fontWeight:700,color:pos.side==="home"?HOME.light:AWAY.light}}>{tm.name}</span>
                      <span style={{fontSize:11,fontWeight:800,color:pctClr(pnl),fontFamily:fm}}>{fmtUsd(pnl)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#555",fontFamily:fm}}>
                      <span>{pos.leverage}x · {(posEntryP*100)|0}¢ entry</span>
                      <span>{fmtUsd(pos.exposure)} exp</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

                    {/* LIVE NOW — all live backend games, clickable */}
          {liveGames.filter(g=>g.status==="live"||g.status==="halftime").length > 0 && (
            <div style={{padding:"12px 16px 0"}}>
              <div style={{fontSize:10,fontWeight:700,color:B.green,marginBottom:10,fontFamily:fm,letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 1.5s infinite"}}/>
                LIVE NOW ({liveGames.filter(g=>g.status==="live"||g.status==="halftime").length})
              </div>
              {liveGames.filter(g=>g.status==="live"||g.status==="halftime").map(lg=>(
                <div key={lg.id} onClick={()=>onTrade&&onTrade(lg)}
                  style={{padding:"10px 12px",marginBottom:6,cursor:onTrade?"pointer":"default",background:"#111",borderRadius:10,border:"1px solid #1f1f1f",transition:"all .15s",
                  ...(onTrade?{':hover':{background:"#1a1a1a"}}:{})}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:B.green,animation:"pulse 1.5s infinite",flexShrink:0}}/>
                      <span style={{fontSize:9,color:B.green,fontWeight:700,fontFamily:fm,letterSpacing:"0.06em"}}>
                        {lg.status==="halftime"?"HALF":"LIVE"}
                      </span>
                      <span style={{fontSize:9,color:"#444",fontFamily:fm}}>{lg.leagueDisplay||"NBA"}</span>
                    </div>
                    <span style={{fontSize:9,color:"#555",fontFamily:fm}}>{periodLabel(lg.league||lg._sport, lg.period, lg.clock, lg.statusDetail)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {lg.home.logo&&<img src={lg.home.logo} style={{width:14,height:14,objectFit:"contain"}} alt=""/>}
                      <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>{lg.home.abbreviation||lg.home.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#fff"}}>{lg.home.score}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {lg.away.logo&&<img src={lg.away.logo} style={{width:14,height:14,objectFit:"contain"}} alt=""/>}
                      <span style={{fontSize:11,fontWeight:600,color:"#888"}}>{lg.away.abbreviation||lg.away.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,fontFamily:fm,color:"#888"}}>{lg.away.score}</span>
                  </div>
                  {lg.oracle?.indexPrice&&(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:9,color:B.primary,fontWeight:700,fontFamily:fm}}>{(lg.oracle.indexPrice*100).toFixed(1)}% {lg.home.abbreviation}</span>
                      {onTrade&&<span style={{fontSize:9,color:"#333",fontFamily:fm}}>Trade →</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* MAIN CONTENT */}
        <div style={{flex:1,minWidth:0,overflow:isMobile?"visible":"auto"}}>

                    {/* SCOREBOARD */}
          <div data-mob="score" style={{padding:isMobile?"10px 12px":"20px 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isMobile ? (
              <div style={{width:"100%",background:"#111",borderRadius:14,border:"1px solid #1f1f1f",padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                    <span style={{fontSize:20,flexShrink:0}}>{HOME.logo}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#fff",fontFamily:fm}}>{HOME.short}</div>
                      <div style={{fontSize:9,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{HOME.name}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"center",padding:"0 10px",flexShrink:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:30,fontWeight:900,color:"#fff",fontFamily:fm,lineHeight:1}}>{gs.hs}</span>
                      <span style={{fontSize:12,color:"#444"}}>–</span>
                      <span style={{fontSize:30,fontWeight:900,color:"#fff",fontFamily:fm,lineHeight:1}}>{gs.as}</span>
                    </div>
                    <div style={{fontSize:10,fontWeight:600,color:settled?"#4ade80":"#888",marginTop:3}}>
                      {settled?"Final":gs.q===0?"Halftime":G.periodLabel(gs.q)+" · "+gs.c}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flex:1,justifyContent:"flex-end",minWidth:0}}>
                    <div style={{textAlign:"right",minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#fff",fontFamily:fm}}>{AWAY.short}</div>
                      <div style={{fontSize:9,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{AWAY.name}</div>
                    </div>
                    <span style={{fontSize:20,flexShrink:0}}>{AWAY.logo}</span>
                  </div>
                </div>
                <div style={{marginTop:10,height:3,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:(oracle.price*100)+"%",background:"linear-gradient(90deg,"+HOME.light+","+HOME.light+"99)",transition:"width .5s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:9,color:HOME.light,fontWeight:700,fontFamily:fm}}>{(oracle.price*100).toFixed(0)}% {HOME.short}</span>
                  <span style={{fontSize:9,color:AWAY.light,fontWeight:700,fontFamily:fm}}>{((1-oracle.price)*100).toFixed(0)}% {AWAY.short}</span>
                </div>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:32,padding:"20px 40px",background:"#111",borderRadius:16,border:"1px solid #1f1f1f"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:32}}>{HOME.logo}</span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{HOME.name}</div>
                    <div style={{fontSize:11,color:"#666",fontFamily:fm}}>{HOME.short}</div>
                  </div>
                </div>
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
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{AWAY.name}</div>
                    <div style={{fontSize:11,color:"#666",fontFamily:fm}}>{AWAY.short}</div>
                  </div>
                  <span style={{fontSize:32}}>{AWAY.logo}</span>
                </div>
              </div>
            )}
          </div>
          {!isMobile&&<>
          {/* MARKET STATS BAR */}
          <div style={{margin:"0 24px 0",padding:"8px 20px",background:"#0a0a0a",borderRadius:12,border:"1px solid #1a1a1a",display:"flex",alignItems:"center",gap:0}}>
            {[
              {label:"Volume",value:"$"+simVol.toLocaleString(),color:"#fff"},
              {label:"Open Interest",value:"$"+simOI.toLocaleString(),color:"#fff"},
              {label:"Funding",value:(+fundingRate>=0?"+":"")+fundingRate+"%/hr",color:+fundingRate>=0?B.green:B.red},
              {label:"Mark",value:(oracle.price*100).toFixed(1)+"¢",color:B.primaryLight},
              {label:"Momentum",value:(momentum>=0?"+":"")+((momentum)*100).toFixed(1)+"%",color:momentum>0.005?B.green:momentum<-0.005?B.red:"#666"},
            ].map(({label,value,color},i)=>(
              <div key={label} style={{flex:1,textAlign:"center",padding:"4px 0",borderRight:i<4?"1px solid #1a1a1a":"none"}}>
                <div style={{fontSize:10,color:"#444",fontWeight:600,marginBottom:2}}>{label}</div>
                <div style={{fontSize:12,fontWeight:700,color,fontFamily:fm}}>{value}</div>
              </div>
            ))}
          </div>
          </>}

          {/* CHART — floating card */}
          <div style={{margin:isMobile?"8px 12px 0":"0 24px",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",overflow:"hidden"}}>
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
                  <ReferenceLine y={0.5} stroke="#ffffff06" strokeDasharray="4 4"/>
                  {liqLines.map(ll=>(<ReferenceLine key={ll.id} y={ll.liqOnChart} stroke={B.red} strokeWidth={1.5} strokeDasharray="4 4" label={(props)=>{const {viewBox}=props;const x=viewBox.x+8;const y=viewBox.y;const text=`LIQ ${ll.liqPriceCents}¢`;const w=text.length*5.5+10;return(<g><rect x={x} y={y-7} width={w} height={14} rx={3} fill="#000" stroke={B.red} strokeWidth={1}/><text x={x+w/2} y={y+3} textAnchor="middle" fill={B.red} fontSize={9} fontWeight="900" fontFamily="ui-monospace,monospace">{text}</text></g>);}}/>))}
                  {limitOrders.map(lo=>{const ly=lo.side==="home"?lo.limitPrice:1-lo.limitPrice;const lc=lo.side==="home"?HOME.light:AWAY.light;return(<ReferenceLine key={"lo-"+lo.id} y={ly} stroke={lc} strokeWidth={1.5} strokeDasharray="8 4" label={{value:(lo.limitPrice*100).toFixed(0)+"¢ LIMIT",position:"insideTopLeft",fontSize:9,fill:lc,fontFamily:fm}}/>);})}
                  <Area type="natural" dataKey="ph" stroke={HOME.light} strokeWidth={2} fill="url(#hg)" dot={false} animationDuration={0} baseValue={0}/>
                  <Area type="natural" dataKey="pa" stroke={AWAY.light} strokeWidth={1.5} fill="url(#ag)" dot={false} animationDuration={0} baseValue={0}/>
                  <Scatter dataKey="mh_val" shape={<HomeMarkerDot/>} isAnimationActive={false}/>
                  <Scatter dataKey="ma_val" shape={<AwayMarkerDot/>} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* Stats bar — Mark, Oracle sources, Volume, OI, Funding, Countdown */}
            <div style={{borderTop:"1px solid #1a1a1a"}}>
              {/* Top row: main stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",padding:"8px 16px 6px",gap:0}}>
                {[
                  {label:"Mark",value:(oracle.price*100).toFixed(1)+"¢",color:B.primaryLight},
                  {label:"Volume",value:"$"+simVol.toLocaleString(),color:"#fff"},
                  {label:"Open Interest",value:"$"+simOI.toLocaleString(),color:"#fff"},
                  {label:"Funding/hr",value:(+fundingRate>=0?"+":"")+fundingRate+"%",color:+fundingRate>=0?B.green:B.red},
                  {label:"Next Funding",value:(()=>{const m=Math.floor(fundingClock/60);const s=fundingClock%60;return m+"m "+String(s).padStart(2,"0")+"s";})(),color:"#888"},
                ].map(({label,value,color},i)=>(
                  <div key={label} style={{textAlign:"center",borderRight:i<4?"1px solid #1a1a1a":"none",padding:"2px 0"}}>
                    <div style={{fontSize:9,color:"#444",fontWeight:600,marginBottom:2,letterSpacing:"0.04em"}}>{label}</div>
                    <div style={{fontSize:11,fontWeight:700,color,fontFamily:fm}}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Bottom row: oracle sources */}
              <div style={{display:"flex",gap:8,padding:"4px 16px 8px",alignItems:"center"}}>
                <span style={{fontSize:9,color:"#333",fontWeight:600}}>Oracle</span>
                {oracle.sources.map(s=>(<span key={s.name} style={{fontSize:9,color:"#555",display:"flex",alignItems:"center",gap:3}}>
                  <span style={{width:3,height:3,borderRadius:2,background:s.color,display:"inline-block"}}/>{s.name} <span style={{color:s.color,fontWeight:700}}>{(s.v*100).toFixed(1)}%</span>
                </span>))}
              </div>
            </div>
          </div>

          {/* POSITIONS — standalone section */}
          <div data-mob="positions" style={{margin:isMobile?"8px 12px 0":"12px 24px 0",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",overflow:"hidden"}}>
            <div style={{padding:"10px 20px",borderBottom:"1px solid #1f1f1f",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>Positions</span>
                {positions.length>0&&<span style={{background:B.primary+"20",color:B.primary,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6}}>{positions.length} OPEN</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {totalUPnL!==0&&<span style={{fontSize:12,fontFamily:fm,color:pctClr(totalUPnL),fontWeight:700}}>uPnL {fmtUsd(totalUPnL)}</span>}
                {closedPnL!==0&&<span style={{fontSize:12,fontFamily:fm,color:pctClr(closedPnL),fontWeight:700}}>Realized {fmtUsd(closedPnL)}</span>}
              </div>
            </div>
            <div style={{padding:"10px 16px"}}>
              {positions.length===0&&closedPos.length===0?(
                <div style={{textAlign:"center",fontSize:13,color:"#555",padding:"20px 0"}}>{settled?"All positions settled":"No open positions yet"}</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {positions.map(pos=>{
                    const pnl=calcPnL(pos.side,pos.exposure,pos.entry,oracle.price);
                    const pnlPct=(pnl/pos.margin)*100;
                    const tm=pos.side==="home"?HOME:AWAY;
                    const markP=pos.side==="home"?oracle.price:1-oracle.price;
                    const posShares=Math.round(pos.exposure/pos.entry);
                    const posEntryP=pos.side==="home"?pos.entry:1-pos.entry;
                    return(
                      <div key={pos.id} style={{borderRadius:12,border:"1px solid #1f1f1f",overflow:"hidden",background:"#0a0a0a"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderLeft:"3px solid "+(pos.side==="home"?HOME.light:AWAY.light)}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:13,fontWeight:800,color:pos.side==="home"?HOME.light:AWAY.light}}>{tm.logo} {tm.short}</span>
                            <span style={{fontSize:10,fontWeight:700,color:B.primary,background:B.primary+"15",padding:"2px 6px",borderRadius:5,fontFamily:fm}}>{pos.leverage}x</span>
                            {pos.tp&&<span style={{fontSize:10,color:B.green,fontFamily:fm,background:B.green+"10",padding:"2px 5px",borderRadius:4}}>TP {(pos.side==="home"?pos.tp:1-pos.tp)*100|0}¢</span>}
                            {pos.sl&&<span style={{fontSize:10,color:B.red,fontFamily:fm,background:B.red+"10",padding:"2px 5px",borderRadius:4}}>SL {(pos.side==="home"?pos.sl:1-pos.sl)*100|0}¢</span>}
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:16,fontWeight:800,color:pctClr(pnl),fontFamily:fm}}>{fmtUsd(pnl)}</div>
                            <div style={{fontSize:11,color:pctClr(pnl),fontFamily:fm}}>{fmtPct(pnlPct)}</div>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",padding:"8px 14px",borderTop:"1px solid #1a1a1a"}}>
                          {[["Entry",(posEntryP*100).toFixed(1)+"¢","#888"],["Mark",(markP*100).toFixed(1)+"¢",B.primaryLight],["Liq",(pos.side==="home"?pos.liq:1-pos.liq)*100|0+"¢",B.red],["Size",fmtUsd(pos.exposure),"#888"]].map(([label,value,color])=>(
                            <div key={label} style={{textAlign:"center"}}>
                              <div style={{fontSize:10,color:"#444",marginBottom:2}}>{label}</div>
                              <div style={{fontSize:12,fontWeight:700,fontFamily:fm,color}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{padding:"8px 14px",borderTop:"1px solid #1a1a1a",display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:11,color:"#555",flex:1,fontFamily:fm}}>{posShares.toLocaleString()} shares · margin {fmtUsd(pos.margin)}</span>
                          <button onClick={()=>closePosition(pos.id)} style={{padding:"5px 14px",background:"#ef444415",border:"1px solid #ef444430",borderRadius:8,cursor:"pointer",color:"#ef4444",fontWeight:700,fontSize:11,fontFamily:fb}}>Close</button>
                        </div>
                      </div>
                    );
                  })}
                  {closedPos.length>0&&(
                    <div style={{marginTop:positions.length>0?4:0}}>
                      {positions.length>0&&<div style={{fontSize:11,color:"#555",fontWeight:600,padding:"4px 0 6px"}}>Closed</div>}
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {closedPos.map((cp,i)=>{
                          const cptm=cp.side==="home"?HOME:AWAY;
                          const typeC=cp.closeType==="LIQ"?"#f87171":cp.closeType==="TP"?"#4ade80":cp.closeType==="SL"?"#ef4444":"#666";
                          return(
                            <div key={cp.id+"-"+i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#0a0a0a",borderRadius:8,fontFamily:fm,fontSize:11,borderLeft:"2px solid "+(cp.side==="home"?HOME.light+"40":AWAY.light+"40")}}>
                              <span style={{color:cp.side==="home"?HOME.light:AWAY.light,fontWeight:700,minWidth:56}}>{cptm.logo} {cptm.short} {cp.leverage}x</span>
                              <span style={{color:"#555",flex:1}}>{((cp.side==="home"?cp.entry:1-cp.entry)*100).toFixed(1)}¢ → {((cp.side==="home"?cp.closedAt:1-cp.closedAt)*100).toFixed(1)}¢</span>
                              <span style={{color:pctClr(cp.pnl),fontWeight:700}}>{fmtUsd(cp.pnl)}</span>
                              <span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:typeC+"15",color:typeC,fontWeight:700}}>{cp.closeType}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GAMECAST / BOX SCORE — separate section */}
          <div data-mob="gamecast" style={{margin:isMobile?"8px 12px 0":"12px 24px 0",background:"#111",borderRadius:16,border:"1px solid #1f1f1f",display:"flex",flexDirection:"column",minHeight:isMobile?200:400,overflow:"hidden"}}>
            <div style={{display:"flex",gap:0,borderBottom:"1px solid #1f1f1f",flexShrink:0}}>
              {[["gamecast","Gamecast",PLAYS.filter(p=>p.t<=gameTime).length],["boxscore","Box Score",0]].map(([id,label,count])=>(
                <button key={id} onClick={()=>setBottomTab(id)} style={{padding:"10px 20px",fontSize:13,fontWeight:600,border:"none",cursor:"pointer",fontFamily:fb,
                  background:"transparent",color:bottomTab===id?"#fff":"#666",borderBottom:bottomTab===id?"2px solid "+B.primary:"2px solid transparent"}}>
                  {label}{id==="gamecast"&&count>0&&<span style={{color:B.primary,marginLeft:4,fontSize:11}}>{count}</span>}
                </button>
              ))}
            </div>
            <div style={{minHeight:300,padding:"10px 16px"}}>
              {/* Gamecast */}
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

          {/* Playback */}
          {!isMobile&&<div style={{position:"sticky",bottom:0,margin:"16px 24px 0",padding:"10px 16px",background:"#111e",backdropFilter:"blur(12px)",borderRadius:"12px 12px 0 0",border:"1px solid #1f1f1f",borderBottom:"none",display:"flex",alignItems:"center",gap:8}}>
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
          </div>}
        </div>

        {/* RIGHT SIDEBAR — unified trading panel (desktop) */}
        {!isMobile&&<div style={{width:360,overflow:"auto",flexShrink:0,padding:"12px 10px",display:"flex",flexDirection:"column",gap:8}}>

          {/* Tab strip */}
          <div style={{display:"flex",background:"#111",borderRadius:12,border:"1px solid #1f1f1f",padding:3,gap:2}}>
            {[["order","Wager"],["book","Order Book"]].map(([id,label])=>(
              <button key={id} onClick={()=>setRightTab(id)} style={{flex:1,padding:"7px 0",fontSize:12,fontWeight:rightTab===id?700:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:9,
                background:rightTab===id?B.primary+"20":"transparent",color:rightTab===id?"#fff":"#666"}}>
                {label}{id==="order"&&limitOrders.length>0&&<span style={{color:B.primary,marginLeft:4,fontSize:10,fontWeight:700}}>({limitOrders.length})</span>}
              </button>
            ))}
          </div>

          {rightTab==="order"&&(<div style={{background:"#111",borderRadius:16,border:"1px solid #1f1f1f",padding:18}}>

            {/* Team selector */}
            <div style={{display:"flex",gap:0,marginBottom:14,background:"#1a1a1a",borderRadius:12,padding:3}}>
              <button onClick={()=>{setOrderSide("home");if(orderType==="limit")setLimitCents(Math.round(oracle.price*100));}} style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .15s",
                background:orderSide==="home"?HOME.light:"transparent",color:orderSide==="home"?"#000":"#666"}}>
                {HOME.logo} {HOME.name} <span style={{fontSize:11,fontWeight:600,opacity:0.7}}>{(oracle.price*100).toFixed(0)}¢</span>
              </button>
              <button onClick={()=>{setOrderSide("away");if(orderType==="limit")setLimitCents(Math.round((1-oracle.price)*100));}} style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .15s",
                background:orderSide==="away"?AWAY.light:"transparent",color:orderSide==="away"?"#000":"#666"}}>
                {AWAY.logo} {AWAY.name} <span style={{fontSize:11,fontWeight:600,opacity:0.7}}>{((1-oracle.price)*100).toFixed(0)}¢</span>
              </button>
            </div>

            {/* Order type */}
            <div style={{display:"flex",gap:3,marginBottom:14,background:"#1a1a1a",borderRadius:10,padding:3}}>
              {[["market","Market"],["limit","Limit"]].map(([t,l])=>(
                <button key={t} onClick={()=>{setOrderType(t);if(t==="limit")setLimitCents(Math.round(entryP*100));}} style={{flex:1,padding:"7px 0",fontSize:12,fontWeight:orderType===t?700:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
                  background:orderType===t?"#2a2a2a":"transparent",color:orderType===t?"#fff":"#666"}}>{l}</button>
              ))}
            </div>

            {/* Unified shares ⇄ margin input */}
            <div style={{marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"end",marginBottom:6}}>
                <div>
                  <div style={{fontSize:10,color:"#555",fontWeight:600,marginBottom:4}}>Shares</div>
                  <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,padding:"9px 10px"}}>
                    <input type="number" value={shareCount} min={0}
                      onChange={e=>{const s=Math.max(0,+e.target.value);setOrderMargin(Math.min(Math.max(0,(s*entryP)/eL),balance));}}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:15,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
                <div style={{color:"#333",fontSize:14,fontWeight:700,paddingBottom:11,textAlign:"center"}}>⇄</div>
                <div>
                  <div style={{fontSize:10,color:"#555",fontWeight:600,marginBottom:4}}>Margin</div>
                  <div style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,padding:"9px 10px",display:"flex",alignItems:"center",gap:3}}>
                    <span style={{color:"#555",fontSize:12,fontWeight:600}}>$</span>
                    <input type="number" value={Math.round(eM)} min={0}
                      onChange={e=>setOrderMargin(Math.min(Math.max(0,+e.target.value),balance))}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:15,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:"#555",textAlign:"center",marginBottom:12}}>@ {(entryP*100).toFixed(1)}¢ per share</div>

              {/* Leverage slider */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:10,color:"#555",fontWeight:600}}>Leverage</span>
                  <div style={{display:"flex",gap:3}}>
                    {[2,5,10].filter(l=>l<=ml).map(l=>(
                      <button key={l} onClick={()=>setOrderLev(l)} style={{padding:"2px 8px",fontSize:10,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fm,borderRadius:6,
                        background:eL===l?B.primary+"30":"#1a1a1a",color:eL===l?B.primaryLight:"#555"}}>{l}x</button>
                    ))}
                    <span style={{fontSize:10,fontWeight:800,color:B.primaryLight,fontFamily:fm,padding:"2px 8px"}}>{eL}x</span>
                  </div>
                  <span style={{fontSize:10,color:"#444"}}>{ml}x max</span>
                </div>
                <input type="range" min={1} max={ml} step={1} value={eL} onChange={e=>setOrderLev(+e.target.value)}
                  style={{width:"100%",accentColor:B.primary,cursor:"pointer",height:4}}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                  <span style={{fontSize:9,color:"#333",fontFamily:fm}}>1x</span>
                  <span style={{fontSize:9,color:"#333",fontFamily:fm}}>{ml}x</span>
                </div>
              </div>
            </div>

            {/* Limit price */}
            {orderType==="limit"&&(
              <div style={{marginBottom:12,padding:"10px 12px",background:"#0a0a0a",borderRadius:10,border:"1px solid #2a2a2a"}}>
                <div style={{fontSize:10,color:"#555",fontWeight:600,marginBottom:6}}>Limit Price</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="number" min={1} max={99} value={limitCents} onChange={e=>setLimitCents(Math.min(99,Math.max(1,+e.target.value)))}
                    style={{flex:1,background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:8,padding:"7px 10px",color:B.primaryLight,fontSize:15,fontWeight:700,fontFamily:fm,outline:"none"}}/>
                  <span style={{fontSize:13,color:"#555",fontWeight:600}}>¢</span>
                </div>
                <div style={{fontSize:10,color:"#555",marginTop:4}}>
                  {orderSide==="home"?"Fills when "+HOME.name+" ≤ "+limitCents+"¢":"Fills when "+AWAY.name+" ≤ "+limitCents+"¢"}
                </div>
              </div>
            )}

            {/* TP / SL */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#555",fontWeight:600,marginBottom:6}}>Risk Tools <span style={{color:"#383838"}}>optional</span></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <div>
                  <div style={{fontSize:10,color:B.green,fontWeight:600,marginBottom:4}}>Take Profit ¢</div>
                  <input type="number" min={1} max={99} value={tpCents} onChange={e=>setTpCents(e.target.value)} placeholder="—"
                    style={{width:"100%",background:"#1a1a1a",border:"1px solid "+B.green+"22",borderRadius:8,padding:"7px 10px",color:B.green,fontSize:13,fontWeight:700,fontFamily:fm,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:B.red,fontWeight:600,marginBottom:4}}>Stop Loss ¢</div>
                  <input type="number" min={1} max={99} value={slCents} onChange={e=>setSlCents(e.target.value)} placeholder="—"
                    style={{width:"100%",background:"#1a1a1a",border:"1px solid "+B.red+"22",borderRadius:8,padding:"7px 10px",color:B.red,fontSize:13,fontWeight:700,fontFamily:fm,outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{background:"#0a0a0a",borderRadius:12,padding:"10px 12px",marginBottom:14,fontSize:12}}>
              {[["Entry",(entryP*100).toFixed(1)+"¢","#fff"],["Exposure",fmtUsd(expo),"#fff"],["Liquidation",(liqP*100).toFixed(1)+"¢",B.red]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                  <span style={{color:"#555"}}>{l}</span><span style={{color:c,fontWeight:600,fontFamily:fm}}>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:"#1f1f1f",margin:"7px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{color:"#555"}}>If {team.name} wins</span>
                <span style={{color:B.green,fontWeight:800,fontFamily:fm}}>+{fmtUsd(orderSide==="home"?expo*(1-oracle.price)/oracle.price:expo*oracle.price/(1-oracle.price))}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}>
                <span style={{color:"#555"}}>Max loss</span>
                <span style={{color:B.red,fontWeight:700,fontFamily:fm}}>-{fmtUsd(eM)}</span>
              </div>
            </div>

            {/* Reduce Only toggle */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 10px",background:reduceOnly?"#fe420210":"#0a0a0a",borderRadius:10,border:"1px solid "+(reduceOnly?B.primary+"30":"#1a1a1a"),cursor:"pointer"}} onClick={()=>setReduceOnly(r=>!r)}>
              <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(reduceOnly?B.primary:"#333"),background:reduceOnly?B.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                {reduceOnly&&<span style={{fontSize:10,color:"#000",fontWeight:900,lineHeight:1}}>✓</span>}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:reduceOnly?B.primaryLight:"#888"}}>Reduce Only</div>
                <div style={{fontSize:10,color:"#444"}}>Order can only reduce an existing position</div>
              </div>
            </div>

            {/* Submit */}
            <button onClick={placeOrder} disabled={settled||eM<10} style={{width:"100%",padding:"14px 0",fontWeight:700,fontSize:14,border:"none",
              cursor:settled||eM<10?"not-allowed":"pointer",fontFamily:fb,borderRadius:12,transition:"all .15s",
              background:settled?"#222":orderSide==="home"?HOME.light:AWAY.light,
              color:settled?"#666":"#fff",opacity:settled||eM<10?0.4:1}}>
              {settled?"Market Settled":orderType==="limit"?`Limit ${team.name} @ ${limitCents}¢ · ${shareCount} shares`:`Buy ${team.name} · ${shareCount} shares`}
            </button>

            {/* Account */}
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1f1f1f",display:"flex",justifyContent:"space-between",fontSize:11}}>
              <div><div style={{color:"#444",marginBottom:2}}>Balance</div><div style={{color:"#fff",fontWeight:700,fontFamily:fm}}>{fmtUsd(balance)}</div></div>
              <div style={{textAlign:"right"}}><div style={{color:"#444",marginBottom:2}}>Portfolio</div><div style={{color:pctClr(totalEq-10000),fontWeight:700,fontFamily:fm}}>{fmtUsd(totalEq)} <span style={{fontSize:10}}>({fmtPct((totalEq-10000)/100)})</span></div></div>
            </div>

            {/* Pending limit orders */}
            {limitOrders.length>0&&(
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1f1f1f"}}>
                <div style={{fontSize:10,color:"#555",fontWeight:600,marginBottom:6}}>Pending ({limitOrders.length})</div>
                {limitOrders.map(lo=>{const loTm=lo.side==="home"?HOME:AWAY;return(
                  <div key={lo.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#1a1a1a",borderRadius:8,marginBottom:4,fontSize:11}}>
                    <span style={{color:lo.side==="home"?HOME.light:AWAY.light,fontWeight:700}}>{loTm.logo} {loTm.short} {lo.leverage}x</span>
                    <span style={{color:B.primary,fontFamily:fm}}>@ {(lo.limitPrice*100).toFixed(0)}¢</span>
                    <span style={{color:"#888"}}>{fmtUsd(lo.margin)}</span>
                    <button onClick={()=>{setLimitOrders(p=>p.filter(l=>l.id!==lo.id));setBalance(b=>b+lo.margin);notify("Order cancelled","info");}}
                      style={{background:"#ef444420",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#ef4444",fontSize:11,fontWeight:700}}>✕</button>
                  </div>
                );})}
              </div>
            )}

          </div>)}

          {rightTab==="book"&&(()=>{
            const spread=((book.asks[0].price-book.bids[0].price)*100).toFixed(1);
            const maxCum=Math.max(book.asks[book.asks.length-1].cum,book.bids[book.bids.length-1].cum);
            const displayAsks=[...book.asks].reverse().slice(0,6); // show 6 asks, closest to mid at bottom
            const displayBids=book.bids.slice(0,6);                // show 6 bids, closest to mid at top
            return(
            <div style={{background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:"14px 12px"}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Order Book</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#888"}}>Spread <span style={{color:"#fff",fontWeight:700,fontFamily:fm}}>{spread}¢</span></span>
                </div>
              </div>

              {/* Column headers */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"0 4px 6px",fontSize:9,fontWeight:700,color:"#666",letterSpacing:"0.06em"}}>
                <span>PRICE ({HOME.short}%)</span>
                <span style={{textAlign:"center"}}>{AWAY.short} equiv</span>
                <span style={{textAlign:"right"}}>SIZE</span>
              </div>

              {/* Asks — Sell Home / Buy Away — away color */}
              {(()=>{const homeBright=brighten(HOME.light);const awayBright=brighten(AWAY.light);return(<>
              <div style={{marginBottom:2}}>
                <div style={{fontSize:9,fontWeight:700,color:awayBright,letterSpacing:"0.08em",padding:"2px 4px 4px"}}>
                  SELL {HOME.short.toUpperCase()} · BUY {AWAY.short.toUpperCase()}
                </div>
                {displayAsks.map((a,i)=>{
                  const depthPct=(a.cum/maxCum)*100;
                  const chiefsEquiv=((1-a.price)*100).toFixed(1);
                  return(
                    <div key={"a"+i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",fontSize:11,height:24,alignItems:"center",position:"relative",fontFamily:fm,padding:"0 4px",borderRadius:3,cursor:"pointer"}}
                      onClick={()=>{setOrderSide("away");setLimitCents(Math.round((1-a.price)*100));setOrderType("limit");setRightTab("order");}}>
                      <div style={{position:"absolute",right:0,top:0,bottom:0,borderRadius:3,background:awayBright+"25",width:depthPct+"%",transition:"width .3s"}}/>
                      <span style={{color:awayBright,position:"relative",zIndex:1,fontWeight:800}}>{(a.price*100).toFixed(1)}¢</span>
                      <span style={{color:"#888",position:"relative",zIndex:1,textAlign:"center",fontSize:10}}>{chiefsEquiv}¢</span>
                      <span style={{color:"#aaa",position:"relative",zIndex:1,textAlign:"right",fontSize:10}}>{a.size}</span>
                    </div>
                  );
                })}
              </div>

              {/* Mid / spread row */}
              <div style={{margin:"6px 0",padding:"6px 4px",borderTop:"1px solid #2a2a2a",borderBottom:"1px solid #2a2a2a",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:800,color:"#fff",fontFamily:fm}}>{(oracle.price*100).toFixed(1)}¢</span>
                <span style={{fontSize:10,color:"#888",textAlign:"center"}}>mid · {spread}¢ spread</span>
                <span style={{fontSize:10,color:"#888",textAlign:"right"}}>{((1-oracle.price)*100).toFixed(1)}¢</span>
              </div>

              {/* Bids — Buy Home / Sell Away — home color */}
              <div style={{marginTop:2}}>
                {displayBids.map((b,i)=>{
                  const depthPct=(b.cum/maxCum)*100;
                  const chiefsEquiv=((1-b.price)*100).toFixed(1);
                  return(
                    <div key={"b"+i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",fontSize:11,height:24,alignItems:"center",position:"relative",fontFamily:fm,padding:"0 4px",borderRadius:3,cursor:"pointer"}}
                      onClick={()=>{setOrderSide("home");setLimitCents(Math.round(b.price*100));setOrderType("limit");setRightTab("order");}}>
                      <div style={{position:"absolute",left:0,top:0,bottom:0,borderRadius:3,background:homeBright+"25",width:depthPct+"%",transition:"width .3s"}}/>
                      <span style={{color:homeBright,position:"relative",zIndex:1,fontWeight:800}}>{(b.price*100).toFixed(1)}¢</span>
                      <span style={{color:"#888",position:"relative",zIndex:1,textAlign:"center",fontSize:10}}>{chiefsEquiv}¢</span>
                      <span style={{color:"#aaa",position:"relative",zIndex:1,textAlign:"right",fontSize:10}}>{b.size}</span>
                    </div>
                  );
                })}
                <div style={{fontSize:9,fontWeight:700,color:homeBright,letterSpacing:"0.08em",padding:"4px 4px 0"}}>
                  BUY {HOME.short.toUpperCase()} · SELL {AWAY.short.toUpperCase()}
                </div>
              </div>

              {/* Footer legend */}
              <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #1f1f1f",fontSize:10,color:"#666",lineHeight:1.6}}>
                <div>A <span style={{color:homeBright}}>Buy {HOME.short}</span> order at <span style={{fontFamily:fm}}>P¢</span> matches a <span style={{color:awayBright}}>Buy {AWAY.short}</span> order at <span style={{fontFamily:fm}}>(100−P)¢</span></div>
                <div style={{marginTop:2,color:"#555"}}>Click any level to set a limit order</div>
              </div>
              </>);})()}
            </div>
          );})()}

        </div>}

        {/* MOBILE — Floating Trade button + bottom sheet */}
        {isMobile&&(
          <>
            {/* Live Now strip */}
            {liveGames.filter(g=>g.status==="live"||g.status==="halftime").length>0&&(
              <div className="mob-nav" style={{display:"flex",gap:8,padding:"8px 12px",overflowX:"auto",background:"#0a0a0a",borderBottom:"1px solid #1a1a1a"}}>
                {liveGames.filter(g=>g.status==="live"||g.status==="halftime").map(lg=>(
                  <div key={lg.id} onClick={()=>onTrade&&onTrade(lg)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#111",borderRadius:20,border:"1px solid #1f1f1f",cursor:"pointer"}}>
                    {lg.home.logo&&<img src={lg.home.logo} style={{width:14,height:14,objectFit:"contain"}} alt=""/>}
                    <span style={{fontSize:10,fontWeight:700,color:"#fff",fontFamily:fm}}>{lg.home.abbreviation}</span>
                    <span style={{fontSize:10,color:B.green,fontWeight:700,fontFamily:fm}}>{lg.home.score}-{lg.away.score}</span>
                    {lg.away.logo&&<img src={lg.away.logo} style={{width:14,height:14,objectFit:"contain"}} alt=""/>}
                    <span style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:fm}}>{lg.away.abbreviation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile bottom tab bar */}
            <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:40,background:"#0a0a0a",borderTop:"1px solid #1a1a1a",display:"flex",height:56,paddingBottom:"env(safe-area-inset-bottom)"}}>
              {[["chart","📊","Chart"],["trade","⚡","Trade"],["positions","💼","Bets"],["gamecast","🎙","Plays"]].map(([id,icon,label])=>(
                <button key={id} onClick={()=>{
                  if(id==="trade"){setShowWager(w=>!w);}
                  else{setShowWager(false);setBottomTab(id==="chart"?"gamecast":id);
                    const el=document.querySelector('[data-mob="'+id+'"');
                    if(el)el.scrollIntoView({behavior:"smooth"});}
                }} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,border:"none",background:"transparent",cursor:"pointer",color:id==="trade"?B.primary:"#666",fontFamily:fb}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <span style={{fontSize:9,fontWeight:600}}>{label}</span>
                  {id==="positions"&&positions.length>0&&<span style={{position:"absolute",top:8,fontSize:8,background:B.primary,color:"#000",borderRadius:8,padding:"1px 4px",fontWeight:700}}>{positions.length}</span>}
                </button>
              ))}
            </div>

            {/* Mobile wager bottom sheet */}
            {showWager&&(
              <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget)setShowWager(false);}}>
                <div style={{background:"rgba(0,0,0,0.5)",position:"absolute",inset:0}}/>
                <div style={{position:"relative",background:"#0a0a0a",borderRadius:"20px 20px 0 0",border:"1px solid #1f1f1f",maxHeight:"88vh",overflow:"auto",animation:"slideUp .25s ease",paddingBottom:"env(safe-area-inset-bottom)"}}>
                  <div style={{display:"flex",justifyContent:"center",padding:"10px 0 0"}}>
                    <div style={{width:36,height:4,borderRadius:2,background:"#333"}}/>
                  </div>
                  <div style={{padding:"0 16px 16px"}}>
                    {/* Team selector */}
                    <div style={{display:"flex",gap:0,margin:"12px 0",background:"#1a1a1a",borderRadius:12,padding:3}}>
                      <button onClick={()=>setOrderSide("home")} style={{flex:1,padding:"11px 0",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s",
                        background:orderSide==="home"?HOME.light:"transparent",color:orderSide==="home"?"#000":"#666"}}>
                        {HOME.logo} {HOME.short} <span style={{fontSize:12,opacity:0.7}}>{(oracle.price*100).toFixed(0)}¢</span>
                      </button>
                      <button onClick={()=>setOrderSide("away")} style={{flex:1,padding:"11px 0",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:fb,borderRadius:10,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s",
                        background:orderSide==="away"?AWAY.light:"transparent",color:orderSide==="away"?"#000":"#666"}}>
                        {AWAY.logo} {AWAY.short} <span style={{fontSize:12,opacity:0.7}}>{(awayProb*100).toFixed(0)}¢</span>
                      </button>
                    </div>
                    {/* Amount chips */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,color:"#555",fontWeight:600,marginBottom:8}}>Margin</div>
                      <div style={{display:"flex",gap:6}}>
                        {[100,250,500,1000].map(v=>(
                          <button key={v} onClick={()=>setOrderMargin(v)} style={{flex:1,padding:"11px 0",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fm,borderRadius:10,
                            background:Math.round(eM)===v?"#2a2a2a":"#1a1a1a",color:Math.round(eM)===v?"#fff":"#666"}}>{v>=1000?"$"+(v/1000)+"k":"$"+v}</button>
                        ))}
                      </div>
                    </div>
                    {/* Leverage */}
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:11,color:"#555",fontWeight:600}}>Leverage</span>
                        <span style={{fontSize:14,fontWeight:800,color:B.primaryLight,fontFamily:fm}}>{eL}x</span>
                      </div>
                      <input type="range" min={1} max={ml} step={1} value={eL} onChange={e=>setOrderLev(+e.target.value)} style={{width:"100%",accentColor:B.primary,height:4}}/>
                    </div>
                    {/* Summary */}
                    <div style={{background:"#111",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:"#666"}}>Entry</span><span style={{color:"#fff",fontFamily:fm,fontWeight:600}}>{(entryP*100).toFixed(1)}¢</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:"#666"}}>Exposure</span><span style={{color:"#fff",fontFamily:fm,fontWeight:600}}>{fmtUsd(expo)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:"#666"}}>Liquidation</span><span style={{color:B.red,fontFamily:fm,fontWeight:600}}>{(liqP*100).toFixed(1)}¢</span>
                      </div>
                      <div style={{height:1,background:"#1a1a1a",margin:"8px 0"}}/>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#666"}}>If {team.name} wins</span>
                        <span style={{color:B.green,fontWeight:800,fontFamily:fm}}>+{fmtUsd(orderSide==="home"?expo*(1-oracle.price)/oracle.price:expo*oracle.price/(1-oracle.price))}</span>
                      </div>
                    </div>
                    {/* Submit */}
                    <button onClick={()=>{placeOrder();setShowWager(false);}} disabled={settled||eM<10} style={{width:"100%",padding:"16px 0",fontWeight:700,fontSize:16,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:14,
                      background:settled?"#222":orderSide==="home"?HOME.light:AWAY.light,color:settled?"#666":"#000",opacity:settled||eM<10?0.4:1}}>
                      {settled?"Settled":`Buy ${team.name} · ${shareCount} shares`}
                    </button>
                    <div style={{marginTop:12,display:"flex",justifyContent:"space-between",fontSize:12,color:"#555"}}>
                      <span>Balance <span style={{color:"#fff",fontFamily:fm}}>{fmtUsd(balance)}</span></span>
                      <span>Portfolio <span style={{color:pctClr(totalEq-10000),fontFamily:fm}}>{fmtUsd(totalEq)}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile spacer for bottom bar */}
            <div style={{height:56}}/>
          </>
        )}
      </>}
      </div>

      {/* Settlement overlay */}
      {settled&&(
        <div style={{position:"fixed",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.85)",backdropFilter:"blur(20px)"}}>
          <div style={{textAlign:"center",padding:"48px 56px",maxWidth:440,background:"#111",borderRadius:24,border:"1px solid #2a2a2a"}}>
            {(()=>{const wT=gs.hs>=gs.as?HOME:AWAY;const lT=gs.hs>=gs.as?AWAY:HOME;return(<>
            <div style={{fontSize:56,marginBottom:16}}>{wT.logo}</div>
            <div style={{fontSize:28,fontWeight:800,color:wT.light,marginBottom:6}}>{wT.name} defeat {lT.name}</div>
            <div style={{fontSize:18,color:"#888",fontFamily:fm,marginBottom:4}}>{gs.hs} – {gs.as}</div></>);})()}
            <div style={{fontSize:13,color:"#555",marginBottom:24}}>{G.label}</div>
            <div style={{fontSize:40,fontWeight:800,color:totalEq>=10000?B.green:"#ef4444",fontFamily:fm,marginBottom:4}}>{fmtUsd(totalEq)}</div>
            <div style={{fontSize:15,marginBottom:36}}>
              <span style={{color:"#666"}}>Return </span><span style={{fontWeight:700,color:pctClr(totalEq-10000)}}>{fmtPct((totalEq-10000)/100)}</span>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={resetAll} style={{padding:"14px 32px",fontWeight:700,fontSize:15,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:12,background:"linear-gradient(135deg, #fe4202, #fe4202)",color:"#fff"}}>Replay</button>
              <button onClick={onChangeGame} style={{padding:"14px 32px",fontWeight:700,fontSize:15,border:"1px solid #2a2a2a",cursor:"pointer",fontFamily:fb,borderRadius:12,background:"transparent",color:"#888"}}>Other Games</button>
            </div>
          </div>
        </div>
      )}
      {showProfile && <ProfileModal userId={userId} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}
