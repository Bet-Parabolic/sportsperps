import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, Scatter } from "recharts";
import { B, brighten, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { calcPnL, clamp, fmtPct, fmtShares, fmtUsd, liqPrice, makeBook, maxLev, pctClr, periodLabel } from "../lib/helpers.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { normalizeEspnToLive } from "../lib/espn.js";
import { subscribeLive } from "../lib/liveSocket.js";
import { AwayMarkerDot, HomeMarkerDot, ScoreMarkerDot } from "../lib/markers.jsx";
import { ProfileModal } from "../components/ProfileModal.jsx";
import { TradeCard } from "../components/TradeCard.jsx";

export function LiveTradingApp({ game: initGame, onBack, liveGames = [], onNavTo, onTrade }) {
  // ── normalise team colors from backend ──────────────────────────────────
  const nc = c => c ? (c.startsWith('#') ? c : '#'+c) : null;

  // ── userId: persist in localStorage, register with backend ──────────────
  const [userId] = useState(() => {
    let id = localStorage.getItem('perpdictions_userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('perpdictions_userId', id); }
    return id;
  });

  // Register user with backend on mount
  useEffect(() => {
    fetch(`${API_URL}/users`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId}) }).catch(()=>{});
  }, [userId]);

  // ── state ───────────────────────────────────────────────────────────────
  const [g, setG]           = useState(initGame);
  const [oPrice, setOPrice] = useState(initGame.oracle?.indexPrice ?? 0.5);
  const [oMark,  setOMark]  = useState(initGame.oracle?.markPrice  ?? 0.5);
  const [oSrcs,  setOSrcs]  = useState(initGame.oracle?.sources    ?? []);
  const [oConf,  setOConf]  = useState(initGame.oracle?.confidence ?? 0.5);
  const [chartData, setChartData]   = useState([]);
  const [chartT0,   setChartT0]     = useState(null);
  const [book, setBook]             = useState(makeBook(initGame.oracle?.indexPrice ?? 0.5));
  const [playLog,   setPlayLog]     = useState([]);

  const [positions,  setPositions]  = useState([]);
  const [closedPos,  setClosedPos]  = useState([]);
  const [balance,    setBalance]    = useState(10000);
  const [closedPnL,  setClosedPnL]  = useState(0);
  const [settled,    setSettled]    = useState(false);
  const [settledWinner, setSettledWinner] = useState(null);

  const [orderSide,  setOrderSide]  = useState('home');
  const [orderMargin,setOrderMargin]= useState(500);
  const [orderLev,   setOrderLev]   = useState(3);
  const [orderType,  setOrderType]  = useState('market');
  const [limitCents, setLimitCents] = useState(Math.round((initGame.oracle?.indexPrice??0.5)*100));
  const [tpCents,    setTpCents]    = useState('');
  const [slCents,    setSlCents]    = useState('');
  const [limitOrders,setLimitOrders]= useState([]);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [rightTab,   setRightTab]   = useState('order');
  const [bottomTab,  setBottomTab]  = useState('gamecast');
  const [notifs,     setNotifs]     = useState([]);
  const [markers,    setMarkers]    = useState([]);
  const [showWager,  setShowWager]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [tradeCard, setTradeCard] = useState(null);
  const [isMobile,   setIsMobile]   = useState(()=>window.innerWidth<768);
  useEffect(()=>{const fn=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);},[]);

  // refs for closures
  const oR   = useRef(oPrice);   oR.current   = oPrice;
  const mR   = useRef(oMark);    mR.current   = oMark;
  const posR = useRef(positions); posR.current = positions;
  const limR = useRef(limitOrders); limR.current = limitOrders;
  const pollRef = useRef(null);  // latest poll() — lets WS events trigger reconciliation early
  const lastScoreIdRef = useRef(null);          // dedupe scoring plays across polls
  const prevScoreRef = useRef({ h: 0, a: 0 });  // detect which team just scored

  // ── derived team objects ────────────────────────────────────────────────
  const HOME = useMemo(() => ({
    name:    g.home.name,
    short:   g.home.abbreviation,
    logoUrl: g.home.logo,
    light:   nc(g.home.color) || B.primary,
  }), [g.home]);
  const AWAY = useMemo(() => ({
    name:    g.away.name,
    short:   g.away.abbreviation,
    logoUrl: g.away.logo,
    light:   nc(g.away.altColor || g.away.color) || '#ef4444',
  }), [g.away]);

  // ── helpers ─────────────────────────────────────────────────────────────
  const notify = useCallback((msg, type) => {
    const id = Date.now() + Math.random();
    setNotifs(p => [...p.slice(-3), {id, msg, type: type||'info'}]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 5000);
  }, []);

  const addMark = useCallback((chartT, p, mt, side) => {
    setMarkers(prev => [...prev, {t: +chartT.toFixed(2), p, markerType: mt, line: side||'home'}]);
  }, []);

  // Sidebar games: single source = backend liveGames (no more ESPN-direct duplication)
  const allSidebarGames = useMemo(() => (
    liveGames.filter(lg => lg.id !== initGame.id && (lg.status === 'live' || lg.status === 'halftime'))
  ), [liveGames, initGame.id]);

  // Sport counts for nav tabs — backend covers all 7 leagues (NBA, NCAAM, MLB, NFL, NHL, MLS, WCUP)
  const sportCounts = useMemo(() => {
    const live = liveGames.filter(g => g.status === 'live' || g.status === 'halftime');
    return {
      nba: live.filter(g => !g.league || g.league === 'nba' || g.league === 'ncaam').length,
      nfl: live.filter(g => g.league === 'nfl').length,
      mlb: live.filter(g => g.league === 'mlb').length,
      nhl: live.filter(g => g.league === 'nhl').length,
      soccer: live.filter(g => g.league === 'mls' || g.league === 'wcup').length,
    };
  }, [liveGames]);

  // ── fetch oracle history on mount (backend only) ────────────────────────
  useEffect(() => {
    if (initGame._espnKey) {
      // ESPN game — no oracle history, seed chart with current price
      const p = initGame.oracle?.indexPrice || 0.5;
      setChartT0(Date.now());
      setChartData([{t:0,ph:p,pa:1-p,mp:p,floor:clamp(p-0.2,0.01,0.99),ceil:clamp(p+0.2,0.01,0.99),mh_val:null,mh_marker:null,ma_val:null,ma_marker:null}]);
      return;
    }
    fetch(`${API_URL}/oracle/${initGame.id}/history`)
      .then(r => r.json())
      .then(data => {
        if (!data.history?.length) return;
        const t0 = data.history[0].t;
        setChartT0(t0);
        setChartData(data.history.map(h => ({
          t:    +((h.t - t0) / 60000).toFixed(2),
          ph:   h.ip,
          pa:   1 - h.ip,
          mp:   h.mp,
          floor: clamp(h.ip - 0.2, 0.01, 0.99),
          ceil:  clamp(h.ip + 0.2, 0.01, 0.99),
          mh_val: null, mh_marker: null, ma_val: null, ma_marker: null,
        })));
      }).catch(() => {});
  }, [initGame.id]);

  // When game changes (sidebar switch), reset chart/oracle but keep positions + balance
  const prevGameIdRef = useRef(initGame.id);
  useEffect(() => {
    if (prevGameIdRef.current === initGame.id) return;
    prevGameIdRef.current = initGame.id;
    setG(initGame);
    setOPrice(initGame.oracle?.indexPrice ?? 0.5);
    setOMark(initGame.oracle?.markPrice ?? 0.5);
    setOSrcs(initGame.oracle?.sources ?? []);
    setOConf(initGame.oracle?.confidence ?? 0.5);
    setChartData([]);
    setChartT0(null);
    setPlayLog([]);
    setMarkers([]);
    setSettled(false);
    setSettledWinner(null);
    setLimitOrders([]);
    lastScoreIdRef.current = null;
    prevScoreRef.current = { h: 0, a: 0 };
    // positions, balance, closedPos, closedPnL preserved intentionally
  }, [initGame.id, initGame]);

  // ── poll game + oracle every 5s ─────────────────────────────────────────
  useEffect(() => {
    let t0Local = null;

    const poll = async () => {
      try {
        // ESPN game: poll ESPN scoreboard directly
        if (initGame._espnKey) {
          const espnUrls = {nhl:'hockey/nhl',nfl:'football/nfl',mlb:'baseball/mlb',wcup:'soccer/fifa.world',mls:'soccer/usa.1',nba:'basketball/nba'};
          const path = espnUrls[initGame._espnKey];
          if (!path) return;
          const res2 = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`);
          if (!res2.ok) return;
          const d2 = await res2.json();
          const ev = (d2.events||[]).find(e=>e.id===initGame.espnId);
          if (!ev) return;
          const norm = normalizeEspnToLive(ev, initGame._espnKey);
          if (!norm) return;
          setG(norm);
          const op = norm.oracle.indexPrice;
          const mp = norm.oracle.markPrice;
          setOPrice(op); setOMark(mp);
          setOSrcs(norm.oracle.sources||[]);
          setBook(makeBook(op));
          setChartT0(prev => {
            const ref = prev || Date.now();
            const t = +((Date.now() - ref) / 60000).toFixed(2);
            setChartData(cd => [...cd, {t,ph:op,pa:1-op,mp,floor:clamp(op-0.2,0.01,0.99),ceil:clamp(op+0.2,0.01,0.99),mh_val:null,mh_marker:null,ma_val:null,ma_marker:null}]);
            return prev||ref;
          });
          if (norm.latestPlay) setPlayLog(prev=>{if(!prev.length||prev[0].id!==norm.latestPlay.id)return[norm.latestPlay,...prev].slice(0,80);return prev;});
          // Check positions
          const cpE = posR.current;
          if (cpE.length) {
            let ch=false;
            const upd=cpE.filter(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,mp);if(pnl<=-pos.margin*0.95){ch=true;setClosedPos(pr=>[{...pos,closedAt:op,pnl:-pos.margin,closeType:'LIQ'},...pr]);setClosedPnL(p=>p-pos.margin);notify('☠ LIQUIDATED','red');return false;}return true;});
            if(ch)setPositions(upd);
          }
          if((norm.status==='final'||norm.status==='completed')&&!settled){setSettled(true);const homeWins=(norm.home.score||0)>(norm.away.score||0);const finalP=homeWins?1.0:0.0;setSettledWinner(homeWins?HOME.name:AWAY.name);const fp=posR.current;if(fp.length){let sp=0;const nc2=fp.map(pos=>{const pnl=calcPnL(pos.side,pos.exposure,pos.entry,finalP);sp+=pnl;return{...pos,closedAt:finalP,pnl,closeType:'SETTLED'};});setClosedPos(pr=>[...nc2,...pr]);setBalance(b=>b+fp.reduce((s,p)=>s+p.margin,0)+sp);setClosedPnL(p=>p+sp);setPositions([]);notify('🏆 FINAL — '+fmtUsd(sp),'green');}}
          return;
        }

        const res = await fetch(`${API_URL}/games/${initGame.id}`);
        if (!res.ok) return;
        const raw = await res.json();
        const upd = raw.game || raw;
        setG(upd);

        // append latest play to log
        if (upd.latestPlay) {
          setPlayLog(prev => {
            if (!prev.length || prev[0].id !== upd.latestPlay.id)
              return [upd.latestPlay, ...prev].slice(0, 80);
            return prev;
          });
        }

        if (upd.oracle) {
          const op = upd.oracle.indexPrice;
          const mp = upd.oracle.markPrice || op;
          setOPrice(op); setOMark(mp);
          setOSrcs(upd.oracle.sources || []);
          setOConf(upd.oracle.confidence || 0.5);

          // detect a fresh scoring play to mark on the chart
          let scoreMarker = null;
          const lp = upd.latestPlay;
          if (lp?.scoringPlay && lp.id !== lastScoreIdRef.current) {
            lastScoreIdRef.current = lp.id;
            const team = (lp.homeScore||0) > prevScoreRef.current.h ? 'home'
                       : (lp.awayScore||0) > prevScoreRef.current.a ? 'away' : 'home';
            scoreMarker = { team, label: lp.scoreValue>0 ? '+'+lp.scoreValue : '●' };
          }
          if (lp) prevScoreRef.current = { h: lp.homeScore||0, a: lp.awayScore||0 };

          // append chart point
          setChartT0(prev => {
            const ref = prev || Date.now();
            if (!prev) { t0Local = ref; }
            const tRef = prev || t0Local || Date.now();
            const t = +((Date.now() - tRef) / 60000).toFixed(2);
            setChartData(cd => [...cd, {
              t, ph: op, pa: 1-op, mp,
              floor: clamp(op-0.2,0.01,0.99), ceil: clamp(op+0.2,0.01,0.99),
              mh_val:null, mh_marker:null, ma_val:null, ma_marker:null,
              score_val: scoreMarker ? (scoreMarker.team==='away' ? 1-op : op) : null, score_marker: scoreMarker,
            }]);
            return prev || ref;
          });
        }

        // Fetch real orderbook depth from backend
        try {
          const mktRes = await fetch(`${API_URL}/market/${initGame.id}`);
          if (mktRes.ok) {
            const mktData = await mktRes.json();
            if (mktData.depth?.bids?.length || mktData.depth?.asks?.length) {
              const bids = mktData.depth.bids.map(b => ({price:b.price,size:b.size}));
              const asks = mktData.depth.asks.map(a => ({price:a.price,size:a.size}));
              let cumA=0,cumB=0;
              asks.forEach(a=>{cumA+=a.size;a.cum=cumA;});
              bids.forEach(b=>{cumB+=b.size;b.cum=cumB;});
              setBook({asks, bids});
            } else {
              setBook(makeBook(upd.oracle?.indexPrice ?? 0.5));
            }
            // Update real market stats
            if (mktData.stats) {
              setMarketStats({
                volume: mktData.stats.volume24h || 0,
                oi: mktData.stats.totalOrders ? mktData.stats.volume24h * 0.3 : 0,
                funding: mktData.funding?.currentRate || 0,
                trades: mktData.stats.tradeCount || 0,
              });
            }
          }
        } catch(e) {
          setBook(makeBook(upd.oracle?.indexPrice ?? 0.5));
        }

        // Fetch positions + balance from backend (backend handles liq/TP/SL/settlement)
        try {
          const [balRes, posRes] = await Promise.all([
            fetch(`${API_URL}/balance/${userId}`),
            fetch(`${API_URL}/positions/${userId}`),
          ]);
          if (balRes.ok) {
            const balData = await balRes.json();
            setBalance(balData.balance);
            setClosedPnL(balData.closedPnl);
          }
          if (posRes.ok) {
            const posData = await posRes.json();
            setPositions(posData.positions.map(p => ({
              id: p.id,
              gameId: p.gameId,
              side: p.side,
              size: p.size,
              margin: p.margin,
              leverage: p.leverage,
              exposure: p.size * p.entryPx,
              entry: p.entryPx,
              liq: p.liqPrice,
              tp: p.tp,
              sl: p.sl,
              pnl: p.pnl,
              roe: p.roe,
              openedAt: p.openedAt,
            })));
          }
        } catch(e) { /* backend unavailable, keep local state */ }

        // Settlement detection
        if ((upd.status==='final'||upd.status==='completed') && !settled) {
          setSettled(true);
          const homeWins = (upd.home.score||0) > (upd.away.score||0);
          setSettledWinner(homeWins ? HOME.name : AWAY.name);
          notify('Game Final — '+(homeWins ? HOME.name : AWAY.name)+' wins', 'green');
        }
      } catch(e) {}
    };

    pollRef.current = poll;
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [initGame.id, settled, userId]);

  // ── real-time push: instant liquidation + settlement via shared WS ────────
  // Backend broadcasts these from its 5s block loop; without this they'd only
  // surface on the next local poll (up to 5s late, and liquidations were silent).
  useEffect(() => {
    if (initGame._espnKey) return; // ESPN-only games aren't backed by the CLOB
    const unsub = subscribeLive((msg) => {
      if (msg.gameId !== g.id) return;
      if (msg.type === 'liquidation' && msg.userId === userId) {
        notify('☠ LIQUIDATED — ' + fmtUsd(msg.pnl ?? 0), 'red');
        pollRef.current?.(); // reconcile positions/balance immediately
      } else if (msg.type === 'settlement') {
        pollRef.current?.(); // poll() detects final state + settles
      }
    });
    return unsub;
  }, [g.id, userId, initGame._espnKey, notify]);

  // ── placeOrder (backend CLOB) ────────────────────────────────────────────
  const placeOrder = useCallback(async () => {
    if (settled) return;
    const op = oR.current;
    const ml2 = maxLev(op), lev = Math.min(orderLev, ml2);
    const margin = Math.min(orderMargin, balance);
    if (margin < 10) { notify('Insufficient margin', 'red'); return; }
    if (reduceOnly && !posR.current.some(p => p.side===orderSide)) { notify('No position to reduce', 'red'); return; }
    const tp = tpCents!==''&&+tpCents>0 ? +tpCents/100 : null;
    const sl = slCents!==''&&+slCents>0 ? +slCents/100 : null;
    const chartNow = chartData.length ? chartData[chartData.length-1].t : 0;

    // Calculate size from margin + leverage: size = (margin * leverage) / price
    const price = orderType==='limit' ? limitCents/100 : op;
    const size = Math.max(1, Math.round((margin * lev) / Math.max(price, 0.01)));

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          userId,
          gameId: g.id,
          side: orderSide,
          price: orderType==='limit' ? limitCents/100 : undefined,
          size,
          type: orderType,
          leverage: lev,
          tif: orderType==='limit' ? 'GTC' : undefined,
          reduceOnly,
          tp, sl,
        }),
      });
      const result = await res.json();
      if (result.status === 'rejected') {
        notify('Rejected: '+(result.reason||'unknown'), 'red');
        return;
      }
      const tn = orderSide==='home' ? HOME : AWAY;
      if (result.fills?.length > 0) {
        const avgPx = result.fills.reduce((s,f)=>s+f.px*f.size,0) / result.fills.reduce((s,f)=>s+f.size,0);
        addMark(chartNow, avgPx, 'entry', orderSide);
        setBottomTab('positions');
        notify(tn.name+' '+lev+'x @ '+(avgPx*100).toFixed(1)+'¢', orderSide==='home'?'green':'red');
      } else if (result.status === 'resting') {
        notify('Limit '+tn.name+' @ '+limitCents+'¢', 'info');
      }
    } catch(e) {
      notify('Order failed: '+e.message, 'red');
    }
  }, [oPrice, orderSide, orderMargin, orderLev, balance, settled, orderType, limitCents, tpCents, slCents, reduceOnly, chartData, HOME, AWAY, notify, addMark, userId, g.id]);

  const closePosition = useCallback(async (posObj) => {
    // posObj is the full position object passed directly from the button
    const pos = typeof posObj === 'object' ? posObj : posR.current.find(p => p.id===posObj);
    if (!pos) return;
    const chartNow = chartData.length ? chartData[chartData.length-1].t : 0;

    try {
      const closeSide = pos.side === 'home' ? 'away' : 'home';
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          userId,
          gameId: pos.gameId || g.id,
          side: closeSide,
          size: pos.size,
          type: 'market',
          leverage: pos.leverage,
          reduceOnly: true,
        }),
      });
      const result = await res.json();
      if (result.fills?.length > 0) {
        const totalSize = result.fills.reduce((s,f)=>s+f.size,0);
        const avgPx = result.fills.reduce((s,f)=>s+f.px*f.size,0) / totalSize;
        const entryPx = pos.entry || pos.entryPx;
        const pnl = pos.side === 'home'
          ? (avgPx - entryPx) * totalSize
          : (entryPx - avgPx) * totalSize;
        const pnlPct = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
        addMark(chartNow, avgPx, pnl>=0?'exit-win':'exit-loss', pos.side);
        const tn = pos.side==='home' ? HOME : AWAY;
        notify('Closed '+tn.name+' — '+fmtUsd(pnl), pnl>=0?'green':'red');
        setClosedPos(pr => [{...pos, closedAt: chartNow, exitPx: avgPx, pnl, pnlPct, closeType: 'CLOSED'}, ...pr]);
        setClosedPnL(p => p + pnl);
        setTradeCard({ type:'close', side:pos.side, teamName:tn.name, teamLogo:pos.side==='home'?HOME.logoUrl:AWAY.logoUrl, teamColor:pos.side==='home'?HOME.light:AWAY.light, entryPx, exitPx:avgPx, leverage:pos.leverage, pnl, pnlPct, gameInfo:HOME.short+' vs '+AWAY.short, gameStatus:periodLabel(g.league, g.period, g.clock, g.statusDetail) });
      } else if (result.status === 'rejected') {
        notify('Close rejected: '+(result.reason||''), 'red');
      }
    } catch(e) {
      notify('Close failed: '+e.message, 'red');
    }
  }, [chartData, HOME, AWAY, notify, addMark, userId, g.id]);

  // ── derived ─────────────────────────────────────────────────────────────
  const totalUPnL = positions.reduce((s,p) => s + (p.pnl != null ? p.pnl : calcPnL(p.side,p.exposure||0,p.entry,oPrice)), 0);
  const totalEq   = balance + positions.reduce((s,p)=>s+p.margin,0) + totalUPnL;
  const ml  = maxLev(oPrice), eL = Math.min(orderLev,ml), eM = Math.min(orderMargin,balance);
  const team = orderSide==='home' ? HOME : AWAY;
  const expo = eM*eL, liqP = liqPrice(orderSide, oPrice, eL);
  const entryP = orderSide==='home' ? oPrice : 1-oPrice;
  const shareCount = Math.max(1, Math.round(expo/entryP));
  const awayProb = 1 - oPrice;
  const momentum = chartData.length>20 ? oPrice - chartData[chartData.length-20].ph : 0;
  // Real market stats from backend (updated in poll loop via marketStats state)
  const [marketStats, setMarketStats] = useState({volume:0,oi:0,funding:0,trades:0});
  const simVol = marketStats.volume || Math.floor(9200 + chartData.length*60 + positions.reduce((s,p)=>s+(p.exposure||0),0));
  const simOI  = marketStats.oi || positions.reduce((s,p)=>s+(p.exposure||0),0) + Math.floor(chartData.length*40);
  const fundingRate = marketStats.funding ? marketStats.funding.toFixed(3) : ((oPrice-0.5)*0.08).toFixed(3);

  // merged chart data with markers
  const merged = useMemo(() => {
    const data = chartData.map(d => ({...d}));
    for (const m of markers) {
      let best = 0;
      for (let i=1; i<data.length; i++) if (Math.abs(data[i].t-m.t)<Math.abs(data[best].t-m.t)) best=i;
      if (data[best]) {
        if (m.line==='away') { data[best].ma_val=1-m.p; data[best].ma_marker=m.markerType; }
        else                 { data[best].mh_val=m.p;   data[best].mh_marker=m.markerType; }
      }
    }
    return data;
  }, [chartData, markers]);

  const liqLines = useMemo(() => positions.map(pos => ({
    id:pos.id, side:pos.side, liqOnChart: pos.side==='home' ? pos.liq : 1-pos.liq,
    liqPriceCents: (pos.liq*100).toFixed(1),
  })), [positions]);

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{background:'#0a0a0a', fontFamily:fb, minHeight:'100vh', color:'#fff'}}>

      {/* Notifications */}
      <div style={{position:'fixed',top:16,right:16,zIndex:50,display:'flex',flexDirection:'column',gap:8,maxWidth:360}}>
        {notifs.map(n=>(
          <div key={n.id} style={{padding:'10px 16px',borderRadius:12,fontWeight:600,fontSize:13,animation:'slideIn .25s',
            background:n.type==='green'?B.green+'22':n.type==='red'?B.red+'22':'#1a1a1a',
            border:`1px solid ${n.type==='green'?B.green:n.type==='red'?B.red:'#2a2a2a'}33`,
            color:n.type==='green'?B.green:n.type==='red'?B.red:'#aaa'}}>
            {n.msg}
          </div>
        ))}
      </div>

      {/* HEADER — left corner: back+logo, center: tabs, right corner: live+deposit+profile */}
      <div style={{padding:isMobile?'0 10px':'0 24px',height:56,display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',borderBottom:'1px solid #1a1a1a',background:'#0a0a0a',position:'sticky',top:0,zIndex:20}}>
        {/* LEFT — back arrow + pd emblem + wordmark */}
        <div style={{display:'flex',alignItems:'center',gap:isMobile?8:16,justifySelf:'start'}}>
          <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'#666',display:'flex',alignItems:'center',gap:4,fontSize:13,fontWeight:600,fontFamily:fb,padding:0}}>
            <span style={{fontSize:18,lineHeight:1}}>‹</span>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:isMobile?3:5}}>
            <img src={LOGO_NAV} style={{height:isMobile?28:32,width:'auto'}} alt="Parabolic mark"/>
            {!isMobile&&<img src={LOGO_WORDMARK} style={{height:22,width:"auto",marginLeft:8}} alt="Parabolic"/>}
          </div>
        </div>
        {/* CENTER — sport tabs */}
        <div className="mob-nav" style={{display:'flex',gap:isMobile?2:4,background:'#111',borderRadius:10,padding:3,overflowX:'auto',justifySelf:'center',maxWidth:'100%',minWidth:0,marginLeft:isMobile?8:24,marginRight:isMobile?8:24}}>
          {[['demos','Demos',null],['trending','Live',sportCounts.nba+sportCounts.nfl+sportCounts.mlb+sportCounts.nhl+sportCounts.soccer],['basketball','Basketball',sportCounts.nba],['nfl','Football',sportCounts.nfl],['baseball','Baseball',sportCounts.mlb],['soccer','Soccer',sportCounts.soccer],['hockey','Hockey',sportCounts.nhl],['mma','MMA',null],['leaderboard','Leaderboard',null]].map(([tab,label,cnt])=>(
            <button key={tab} onClick={()=>onNavTo?onNavTo(tab):onBack&&onBack()} style={{padding:'6px 14px',fontSize:12,fontWeight:400,border:'none',cursor:'pointer',fontFamily:fb,borderRadius:8,background:'transparent',color:'#666'}}>
              {tab==='trending'
                ? <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',display:'inline-block',animation:'pulse 1.5s infinite',flexShrink:0}}/>
                    Live
                  </span>
                : label}
              {cnt>0&&<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>({cnt})</span>}
            </button>
          ))}
        </div>
        {/* RIGHT — live indicator + deposit + profile */}
        <div style={{display:'flex',alignItems:'center',gap:10,justifySelf:'end'}}>
          {!isMobile&&<span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,color:B.green,padding:'4px 10px',background:B.green+'12',borderRadius:8,fontFamily:fm,letterSpacing:'0.06em'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:B.green,animation:'pulse 1.5s infinite'}}/>
            LIVE
          </span>}
          <button style={{padding:'8px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1fd182,#1fd182)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:fb}}>Deposit</button>
          <div onClick={()=>setShowProfile(true)} style={{width:32,height:32,borderRadius:'50%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>👤</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:'flex',height:isMobile?'auto':'calc(100vh - 56px)',flexDirection:isMobile?'column':'row',minHeight:isMobile?'calc(100vh - 56px)':'auto'}}>

        {/* LEFT SIDEBAR */}
        {!isMobile&&<div style={{width:260,borderRight:'1px solid #1a1a1a',overflow:'auto',flexShrink:0,padding:'16px 0'}}>
          {/* Viewing Now */}
          <div style={{margin:'0 16px 16px',padding:'12px 14px',background:B.primary+'12',borderRadius:12,border:'1px solid '+B.primary+'25'}}>
            <div style={{fontSize:10,color:B.primary,fontWeight:700,marginBottom:6,fontFamily:fm,letterSpacing:'0.08em'}}>LIVE NOW</div>
            <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>{HOME.name}</div>
            <div style={{fontSize:11,color:'#666',marginBottom:8}}>vs {AWAY.name}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:22,fontWeight:900,fontFamily:fm,color:'#fff'}}>{g.home.score ?? '–'} <span style={{color:'#333',fontSize:14}}>–</span> {g.away.score ?? '–'}</span>
              <span style={{fontSize:10,color:B.green,fontWeight:700,fontFamily:fm}}>
                {g.status==='halftime'?'HALF':g.period?periodLabel(g.league, g.period, g.clock, g.statusDetail):g.statusDetail||''}
              </span>
            </div>
          </div>

          {/* Other live games — all sports */}
          {allSidebarGames.length > 0 && (
            <div style={{padding:'0 16px'}}>
              <div style={{fontSize:10,color:'#555',fontWeight:700,letterSpacing:'0.08em',fontFamily:fm,marginBottom:8}}>OTHER LIVE ({allSidebarGames.length})</div>
              {allSidebarGames.map(lg=>(
                <div key={lg.id} onClick={()=>onTrade&&onTrade(lg)}
                  style={{padding:'10px 12px',marginBottom:6,background:'#111',borderRadius:10,border:'1px solid #1f1f1f',fontSize:11,fontFamily:fm,cursor:onTrade?'pointer':'default'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{color:'#fff',fontWeight:600}}>{lg._emoji?lg._emoji+' ':''}{lg.home.abbreviation||lg.home.name?.slice(0,3).toUpperCase()||'HOME'} <span style={{color:'#555'}}>vs</span> {lg.away.abbreviation||lg.away.name?.slice(0,3).toUpperCase()||'AWAY'}</span>
                    <span style={{color:B.green,fontSize:10}}>{periodLabel(lg.league||lg._sport, lg.period, lg.clock, lg.statusDetail)||'LIVE'}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'#888'}}>{lg.home.score??0} – {lg.away.score??0}</span>
                    {lg.oracle?.indexPrice && <span style={{color:B.primary,fontWeight:700}}>{(lg.oracle.indexPrice*100).toFixed(0)}%</span>}
                  </div>
                  {onTrade&&<div style={{marginTop:3,fontSize:9,color:'#444',textAlign:'right'}}>Trade →</div>}
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* MAIN CONTENT */}
        <div style={{flex:1,minWidth:0,overflow:isMobile?'visible':'auto'}}>

          {/* LIVE SCOREBOARD */}
          <div data-mob="score" style={{padding:isMobile?'10px 12px':'20px 24px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {isMobile ? (
              <div style={{width:'100%',background:'#111',borderRadius:14,border:'1px solid #1f1f1f',padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                    {HOME.logoUrl?<img src={HOME.logoUrl} style={{width:28,height:28,objectFit:'contain',flexShrink:0}} alt=""/>:<span style={{fontSize:22,flexShrink:0}}>🏀</span>}
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#fff',fontFamily:fm}}>{HOME.short}</div>
                      <div style={{fontSize:9,color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{HOME.name}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'center',padding:'0 10px',flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:30,fontWeight:900,color:'#fff',fontFamily:fm,lineHeight:1}}>{g.home.score??'–'}</span>
                      <span style={{fontSize:12,color:'#444'}}>–</span>
                      <span style={{fontSize:30,fontWeight:900,color:'#fff',fontFamily:fm,lineHeight:1}}>{g.away.score??'–'}</span>
                    </div>
                    <div style={{fontSize:10,fontWeight:600,marginTop:3,
                      color:g.status==='final'?'#4ade80':g.status==='halftime'?'#ff9f1c':B.green}}>
                      {g.status==='final'?'Final':g.status==='halftime'?'Half':g.period?periodLabel(g.league, g.period, g.clock, g.statusDetail):g.statusDetail||'Live'}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flex:1,justifyContent:'flex-end',minWidth:0}}>
                    <div style={{textAlign:'right',minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#fff',fontFamily:fm}}>{AWAY.short}</div>
                      <div style={{fontSize:9,color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{AWAY.name}</div>
                    </div>
                    {AWAY.logoUrl?<img src={AWAY.logoUrl} style={{width:28,height:28,objectFit:'contain',flexShrink:0}} alt=""/>:<span style={{fontSize:22,flexShrink:0}}>🏀</span>}
                  </div>
                </div>
                <div style={{marginTop:8,height:3,background:'#1a1a1a',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:(oPrice*100)+'%',background:'linear-gradient(90deg,'+B.green+','+B.green+'99)',transition:'width .5s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                  <span style={{fontSize:9,color:B.green,fontWeight:700,fontFamily:fm}}>{(oPrice*100).toFixed(0)}% {HOME.short}</span>
                  <span style={{fontSize:9,color:B.red,fontWeight:700,fontFamily:fm}}>{((1-oPrice)*100).toFixed(0)}% {AWAY.short}</span>
                </div>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:32,padding:'20px 40px',background:'#111',borderRadius:16,border:'1px solid #1f1f1f'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  {HOME.logoUrl?<img src={HOME.logoUrl} style={{width:48,height:48,objectFit:'contain'}} alt=""/>:<span style={{fontSize:32}}>🏀</span>}
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>{HOME.name}</div>
                    <div style={{fontSize:11,color:'#666',fontFamily:fm}}>{HOME.short}</div>
                  </div>
                </div>
                <div style={{textAlign:'center',minWidth:160}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
                    <span style={{fontSize:48,fontWeight:900,fontFamily:fm,color:'#fff',lineHeight:1}}>{g.home.score??'–'}</span>
                    <span style={{fontSize:20,color:'#333'}}>—</span>
                    <span style={{fontSize:48,fontWeight:900,fontFamily:fm,color:'#fff',lineHeight:1}}>{g.away.score??'–'}</span>
                  </div>
                  <div style={{marginTop:8}}>
                    <span style={{fontSize:12,fontWeight:600,padding:'4px 16px',borderRadius:20,
                      background:g.status==='final'?'#22c55e18':g.status==='halftime'?'#ff9f1c18':'#1a1a1a',
                      color:g.status==='final'?'#4ade80':g.status==='halftime'?'#ff9f1c':B.green}}>
                      {g.status==='final'?'Final':g.status==='halftime'?'Halftime':g.period?periodLabel(g.league, g.period, g.clock, g.statusDetail):g.statusDetail||'Live'}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:'#555',marginTop:6}}>{g.shortName||g.name}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>{AWAY.name}</div>
                    <div style={{fontSize:11,color:'#666',fontFamily:fm}}>{AWAY.short}</div>
                  </div>
                  {AWAY.logoUrl?<img src={AWAY.logoUrl} style={{width:48,height:48,objectFit:'contain'}} alt=""/>:<span style={{fontSize:32}}>🏀</span>}
                </div>
              </div>
            )}
          </div>

          {/* STATS BAR — desktop only */}
          {!isMobile&&<div style={{margin:'0 24px 0',padding:'8px 20px',background:'#0a0a0a',borderRadius:12,border:'1px solid #1a1a1a',display:'grid',gridTemplateColumns:'repeat(5,1fr)'}}>
            {[
              {label:'Mark',  value:(oPrice*100).toFixed(1)+'¢', color:B.primaryLight},
              {label:'Volume',value:'$'+simVol.toLocaleString(), color:'#fff'},
              {label:'Open Interest',value:'$'+simOI.toLocaleString(), color:'#fff'},
              {label:'Funding/hr',value:(+fundingRate>=0?'+':'')+fundingRate+'%', color:+fundingRate>=0?B.green:B.red},
              {label:'Confidence',value:(oConf*100).toFixed(0)+'%', color:oConf>0.7?B.green:oConf>0.4?'#ff9f1c':'#888'},
            ].map(({label,value,color},i)=>(
              <div key={label} style={{textAlign:'center',borderRight:i<4?'1px solid #1a1a1a':'none',padding:'4px 0'}}>
                <div style={{fontSize:9,color:'#444',fontWeight:600,marginBottom:2,letterSpacing:'0.04em'}}>{label}</div>
                <div style={{fontSize:11,fontWeight:700,color,fontFamily:fm}}>{value}</div>
              </div>
            ))}
          </div>}

          {/* CHART */}
          <div style={{margin:isMobile?'8px 12px 0':'12px 24px 0',background:'#111',borderRadius:16,border:'1px solid #1f1f1f',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #1f1f1f'}}>
              <span style={{fontSize:13,fontWeight:600,color:'#888'}}>Win Probability</span>
              <div style={{display:'flex',gap:16}}>
                <span style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:B.green,display:'inline-block'}}/>
                  <span style={{color:B.green,fontWeight:700,fontFamily:fm}}>{(oPrice*100).toFixed(1)}%</span>
                  <span style={{color:'#666'}}>{HOME.short}</span>
                </span>
                <span style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:B.red,display:'inline-block'}}/>
                  <span style={{color:B.red,fontWeight:700,fontFamily:fm}}>{(awayProb*100).toFixed(1)}%</span>
                  <span style={{color:'#666'}}>{AWAY.short}</span>
                </span>
              </div>
            </div>
            <div style={{height:220,padding:'4px 8px 0'}}>
              {merged.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={merged} margin={{top:8,right:8,bottom:4,left:8}}>
                    <defs>
                      <linearGradient id="lhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={B.green} stopOpacity={0.18}/><stop offset="100%" stopColor={B.green} stopOpacity={0.01}/></linearGradient>
                      <linearGradient id="lag" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={B.red} stopOpacity={0.12}/><stop offset="100%" stopColor={B.red} stopOpacity={0.01}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" stroke="#ffffff04" vertical={false}/>
                    <XAxis dataKey="t" tick={{fill:'#555',fontSize:9}} axisLine={{stroke:'#1f1f1f'}} tickLine={false}
                      tickFormatter={v=>v+'m'}
                      ticks={(()=>{const mT=merged.length?Math.ceil(merged[merged.length-1].t):60;const s=mT>80?20:mT>40?10:mT>20?5:2;const ts=[];for(let t=0;t<=mT+s;t+=s)ts.push(t);return ts;})()}/>
                    <YAxis domain={[0,1]} tick={{fill:'#555',fontSize:10}} tickFormatter={v=>(v*100)+'%'} axisLine={false} tickLine={false} width={32} orientation="right"/>
                    <ReferenceLine y={0.5} stroke="#ffffff06" strokeDasharray="4 4"/>
                    {liqLines.map(ll=>(<ReferenceLine key={ll.id} y={ll.liqOnChart} stroke={B.red} strokeWidth={1.5} strokeDasharray="4 4" label={(props)=>{const {viewBox}=props;const x=viewBox.x+8;const y=viewBox.y;const text=`LIQ ${ll.liqPriceCents}¢`;const w=text.length*5.5+10;return(<g><rect x={x} y={y-7} width={w} height={14} rx={3} fill="#000" stroke={B.red} strokeWidth={1}/><text x={x+w/2} y={y+3} textAnchor="middle" fill={B.red} fontSize={9} fontWeight="900" fontFamily="ui-monospace,monospace">{text}</text></g>);}}/>))}
                    {limitOrders.map(lo=>{const ly=lo.side==='home'?lo.limitPrice:1-lo.limitPrice;const lc=lo.side==='home'?B.green:B.red;return(<ReferenceLine key={'lo-'+lo.id} y={ly} stroke={lc} strokeWidth={1.5} strokeDasharray="8 4" label={{value:(lo.limitPrice*100).toFixed(0)+'¢ LIMIT',position:'insideTopLeft',fontSize:9,fill:lc,fontFamily:fm}}/>);})}
                    <Area type="natural" dataKey="ph" stroke={B.green} strokeWidth={2.25} fill="url(#lhg)" dot={false} animationDuration={0} baseValue={0}/>
                    <Area type="natural" dataKey="pa" stroke={B.red} strokeWidth={1.75} fill="url(#lag)" dot={false} animationDuration={0} baseValue={0}/>
                    <Scatter dataKey="mh_val" shape={<HomeMarkerDot/>} isAnimationActive={false}/>
                    <Scatter dataKey="ma_val" shape={<AwayMarkerDot/>} isAnimationActive={false}/>
                    <Scatter dataKey="score_val" shape={<ScoreMarkerDot/>} isAnimationActive={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#444',fontSize:13}}>
                  Loading price history…
                </div>
              )}
            </div>
            {/* Oracle sources strip */}
            <div style={{borderTop:'1px solid #1a1a1a'}}>
              <div style={{display:'flex',gap:8,padding:'6px 16px 8px',alignItems:'center'}}>
                <span style={{fontSize:9,color:'#333',fontWeight:600}}>Oracle</span>
                {oSrcs.map(s=>(
                  <span key={s.name} style={{fontSize:9,color:'#555',display:'flex',alignItems:'center',gap:3}}>
                    <span style={{width:3,height:3,borderRadius:2,background:s.color||B.primary,display:'inline-block'}}/>
                    {s.name} <span style={{color:s.color||B.primary,fontWeight:700}}>{((s.price||s.v||0)*100).toFixed(1)}%</span>
                  </span>
                ))}
                {!oSrcs.length && <span style={{fontSize:9,color:'#333'}}>Awaiting sources…</span>}
              </div>
            </div>
          </div>

          {/* POSITIONS */}
          <div data-mob="positions" style={{margin:isMobile?'8px 12px 0':'12px 24px 0',background:'#111',borderRadius:16,border:'1px solid #1f1f1f',overflow:'hidden'}}>
            <div style={{padding:'10px 20px',borderBottom:'1px solid #1f1f1f',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>Positions</span>
                {positions.length>0&&<span style={{background:B.primary+'20',color:B.primary,fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:6}}>{positions.length} OPEN</span>}
              </div>
              <div style={{display:'flex',gap:12}}>
                {totalUPnL!==0&&<span style={{fontSize:12,fontFamily:fm,color:pctClr(totalUPnL),fontWeight:700}}>uPnL {fmtUsd(totalUPnL)}</span>}
                {closedPnL!==0&&<span style={{fontSize:12,fontFamily:fm,color:pctClr(closedPnL),fontWeight:700}}>Realized {fmtUsd(closedPnL)}</span>}
              </div>
            </div>
            <div style={{padding:'10px 16px'}}>
              {positions.length===0&&closedPos.length===0 ? (
                <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'20px 0'}}>{settled?'Game settled':'No open positions yet'}</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {positions.map(pos=>{
                    const pnl=pos.pnl!=null?pos.pnl:calcPnL(pos.side,pos.exposure||0,pos.entry,oPrice);
                    const pnlPct=pos.margin>0?(pnl/pos.margin)*100:0;
                    const tm=pos.side==='home'?HOME:AWAY;
                    const markP=pos.side==='home'?oPrice:1-oPrice;
                    const posEntryP=pos.side==='home'?pos.entry:1-pos.entry;
                    const posShares=pos.size||Math.round((pos.exposure||0)/Math.max(pos.entry,0.01));
                    return (
                      <div key={pos.id} style={{borderRadius:12,border:'1px solid #1f1f1f',overflow:'hidden',background:'#0a0a0a'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderLeft:'3px solid '+(pos.side==='home'?HOME.light:AWAY.light)}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            <span style={{fontSize:13,fontWeight:800,color:pos.side==='home'?HOME.light:AWAY.light}}>{tm.name}</span>
                            <span style={{fontSize:10,fontWeight:700,color:B.primary,background:B.primary+'15',padding:'2px 6px',borderRadius:5,fontFamily:fm}}>{pos.leverage}x</span>
                            {pos.tp&&<span style={{fontSize:10,color:B.green,fontFamily:fm,background:B.green+'10',padding:'2px 5px',borderRadius:4}}>TP {(pos.side==='home'?pos.tp:1-pos.tp)*100|0}¢</span>}
                            {pos.sl&&<span style={{fontSize:10,color:B.red,fontFamily:fm,background:B.red+'10',padding:'2px 5px',borderRadius:4}}>SL {(pos.side==='home'?pos.sl:1-pos.sl)*100|0}¢</span>}
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:16,fontWeight:800,color:pctClr(pnl),fontFamily:fm}}>{fmtUsd(pnl)}</div>
                            <div style={{fontSize:11,color:pctClr(pnl),fontFamily:fm}}>{fmtPct(pnlPct)}</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'8px 14px',borderTop:'1px solid #1a1a1a'}}>
                          {[['Entry',(posEntryP*100).toFixed(1)+'¢','#888'],['Mark',(markP*100).toFixed(1)+'¢',B.primaryLight],['Liq',(pos.liq!=null?(pos.side==='home'?pos.liq:1-pos.liq)*100|0:'-')+'¢',B.red],['Size',pos.size?pos.size+' shr':fmtUsd(pos.exposure||0),'#888']].map(([label,value,color])=>(
                            <div key={label} style={{textAlign:'center'}}>
                              <div style={{fontSize:10,color:'#444',marginBottom:2}}>{label}</div>
                              <div style={{fontSize:12,fontWeight:700,fontFamily:fm,color}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{padding:'8px 14px',borderTop:'1px solid #1a1a1a',display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:11,color:'#555',flex:1,fontFamily:fm}}>{posShares.toLocaleString()} shares · margin {fmtUsd(pos.margin)}</span>
                          <button onClick={()=>closePosition(pos)} style={{padding:'5px 14px',background:'#ef444415',border:'1px solid #ef444430',borderRadius:8,cursor:'pointer',color:'#ef4444',fontWeight:700,fontSize:11,fontFamily:fb}}>Close</button>
                        </div>
                      </div>
                    );
                  })}
                  {closedPos.length>0&&(
                    <div style={{marginTop:4}}>
                      {positions.length>0&&<div style={{fontSize:11,color:'#555',fontWeight:600,padding:'4px 0 6px'}}>Closed</div>}
                      {closedPos.map((cp,i)=>{
                        const cptm=cp.side==='home'?HOME:AWAY;
                        const typeC=cp.closeType==='LIQ'?'#f87171':cp.closeType==='TP'?'#4ade80':cp.closeType==='SL'?'#ef4444':'#666';
                        return(
                          <div key={cp.id+'-'+i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#0a0a0a',borderRadius:8,fontFamily:fm,fontSize:11,borderLeft:'2px solid '+(cp.side==='home'?HOME.light+'40':AWAY.light+'40'),marginBottom:2}}>
                            <span style={{color:cp.side==='home'?HOME.light:AWAY.light,fontWeight:700,minWidth:60}}>{cptm.short} {cp.leverage}x</span>
                            <span style={{color:'#555',flex:1}}>{((cp.side==='home'?cp.entry:1-cp.entry)*100).toFixed(1)}¢ → {((cp.side==='home'?cp.closedAt:1-cp.closedAt)*100).toFixed(1)}¢</span>
                            <span style={{color:pctClr(cp.pnl),fontWeight:700}}>{fmtUsd(cp.pnl)}</span>
                            <span style={{fontSize:10,padding:'2px 7px',borderRadius:5,background:typeC+'15',color:typeC,fontWeight:700}}>{cp.closeType}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GAMECAST */}
          <div data-mob="gamecast" style={{margin:isMobile?'8px 12px 0':'12px 24px 0',background:'#111',borderRadius:16,border:'1px solid #1f1f1f',overflow:'hidden',marginBottom:0}}>
            <div style={{display:'flex',borderBottom:'1px solid #1f1f1f'}}>
              {[['gamecast','Gamecast',playLog.length],['boxscore','Box Score',0]].map(([id,label,count])=>(
                <button key={id} onClick={()=>setBottomTab(id)} style={{padding:'10px 20px',fontSize:13,fontWeight:600,border:'none',cursor:'pointer',fontFamily:fb,
                  background:'transparent',color:bottomTab===id?'#fff':'#666',borderBottom:bottomTab===id?'2px solid '+B.primary:'2px solid transparent'}}>
                  {label}{id==='gamecast'&&count>0&&<span style={{color:B.primary,marginLeft:4,fontSize:11}}>{count}</span>}
                </button>
              ))}
            </div>
            <div style={{minHeight:200,padding:'10px 16px',maxHeight:320,overflow:'auto'}}>
              {bottomTab==='gamecast' && (playLog.length===0 ? (
                <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>🏀 Waiting for plays…</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  {playLog.map((play,i)=>(
                    <div key={play.id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:10,
                      background:play.scoringPlay?HOME.light+'0a':'transparent',animation:i===0?'slideIn .3s':'none'}}>
                      <div style={{flexShrink:0,width:50,textAlign:'center'}}>
                        <div style={{fontSize:10,color:'#555',fontWeight:600}}>{play.periodDisplay||('Q'+(play.period||''))}</div>
                        <div style={{fontSize:11,color:'#777',fontFamily:fm}}>{play.clock}</div>
                      </div>
                      <div style={{flexShrink:0,width:44,textAlign:'center',fontFamily:fm,fontSize:12,fontWeight:700}}>
                        <span style={{color:HOME.light}}>{play.homeScore}</span>
                        <span style={{color:'#333'}}>-</span>
                        <span style={{color:AWAY.light}}>{play.awayScore}</span>
                      </div>
                      <div style={{flex:1,fontSize:13,fontWeight:play.scoringPlay?700:400,color:play.scoringPlay?HOME.light:'#777'}}>
                        {play.scoringPlay?'🔥 ':''}{play.text}
                      </div>
                      {play.homeWinPct&&<div style={{flexShrink:0,fontFamily:fm,fontSize:11,color:B.primary,fontWeight:700}}>{(play.homeWinPct*100).toFixed(0)}%</div>}
                    </div>
                  ))}
                </div>
              ))}
              {bottomTab==='boxscore'&&(
                <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>Box score available after game ends</div>
              )}
            </div>
          </div>

          <div style={{height:24}}/>
        </div>

        {/* RIGHT SIDEBAR — Wager + Order Book (desktop only) */}
        {!isMobile&&<div style={{width:360,overflow:'auto',flexShrink:0,padding:'12px 10px',display:'flex',flexDirection:'column',gap:8}}>

          {/* Tab strip */}
          <div style={{display:'flex',background:'#111',borderRadius:12,border:'1px solid #1f1f1f',padding:3,gap:2}}>
            {[['order','Wager'],['book','Order Book']].map(([id,label])=>(
              <button key={id} onClick={()=>setRightTab(id)} style={{flex:1,padding:'7px 0',fontSize:12,fontWeight:rightTab===id?700:400,border:'none',cursor:'pointer',fontFamily:fb,borderRadius:9,
                background:rightTab===id?B.primary+'20':'transparent',color:rightTab===id?'#fff':'#666'}}>
                {label}{id==='order'&&limitOrders.length>0&&<span style={{color:B.primary,marginLeft:4,fontSize:10,fontWeight:700}}>({limitOrders.length})</span>}
              </button>
            ))}
          </div>

          {rightTab==='order'&&(<div style={{background:'#111',borderRadius:16,border:'1px solid #1f1f1f',padding:18}}>
            {/* Team selector */}
            <div style={{display:'flex',gap:0,marginBottom:14,background:'#1a1a1a',borderRadius:12,padding:3}}>
              <button onClick={()=>{setOrderSide('home');if(orderType==='limit')setLimitCents(Math.round(oPrice*100));}} style={{flex:1,padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:fb,borderRadius:10,border:orderSide==='home'?'2px solid '+HOME.light:'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .15s',
                background:orderSide==='home'?HOME.light+'22':'transparent',color:'#fff'}}>
                {HOME.logoUrl&&<img src={HOME.logoUrl} style={{width:18,height:18,objectFit:'contain',borderRadius:4}} alt=""/>}
                {HOME.short} <span style={{fontSize:11,fontWeight:600,opacity:0.7}}>{(oPrice*100).toFixed(0)}¢</span>
              </button>
              <button onClick={()=>{setOrderSide('away');if(orderType==='limit')setLimitCents(Math.round(awayProb*100));}} style={{flex:1,padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:fb,borderRadius:10,border:orderSide==='away'?'2px solid '+AWAY.light:'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .15s',
                background:orderSide==='away'?AWAY.light+'22':'transparent',color:'#fff'}}>
                {AWAY.logoUrl&&<img src={AWAY.logoUrl} style={{width:18,height:18,objectFit:'contain',borderRadius:4}} alt=""/>}
                {AWAY.short} <span style={{fontSize:11,fontWeight:600,opacity:0.7}}>{(awayProb*100).toFixed(0)}¢</span>
              </button>
            </div>
            {/* Order type */}
            <div style={{display:'flex',gap:3,marginBottom:14,background:'#1a1a1a',borderRadius:10,padding:3}}>
              {[['market','Market'],['limit','Limit']].map(([t,l])=>(
                <button key={t} onClick={()=>{setOrderType(t);if(t==='limit')setLimitCents(Math.round(entryP*100));}} style={{flex:1,padding:'7px 0',fontSize:12,fontWeight:orderType===t?700:400,border:'none',cursor:'pointer',fontFamily:fb,borderRadius:8,
                  background:orderType===t?'#2a2a2a':'transparent',color:orderType===t?'#fff':'#666'}}>{l}</button>
              ))}
            </div>
            {/* Shares ⇄ Margin */}
            <div style={{marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:6,alignItems:'end',marginBottom:6}}>
                <div>
                  <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:4}}>Shares</div>
                  <div style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:10,padding:'9px 10px'}}>
                    <input type="number" value={shareCount} min={0} onChange={e=>{const s=Math.max(0,+e.target.value);setOrderMargin(Math.min(Math.max(0,(s*entryP)/eL),balance));}}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:15,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
                <div style={{color:'#333',fontSize:14,fontWeight:700,paddingBottom:11,textAlign:'center'}}>⇄</div>
                <div>
                  <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:4}}>Margin</div>
                  <div style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:10,padding:'9px 10px',display:'flex',alignItems:'center',gap:3}}>
                    <span style={{color:'#555',fontSize:12,fontWeight:600}}>$</span>
                    <input type="number" value={Math.round(eM)} min={0} onChange={e=>setOrderMargin(Math.min(Math.max(0,+e.target.value),balance))}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:15,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:'#555',textAlign:'center',marginBottom:12}}>@ {(entryP*100).toFixed(1)}¢ per share</div>
              {/* Leverage slider */}
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:10,color:'#555',fontWeight:600}}>Leverage</span>
                  <div style={{display:'flex',gap:3}}>
                    {[2,3,5].filter(l=>l<=ml).map(l=>(
                      <button key={l} onClick={()=>setOrderLev(l)} style={{padding:'2px 8px',fontSize:10,fontWeight:700,border:'none',cursor:'pointer',fontFamily:fm,borderRadius:6,
                        background:eL===l?B.primary+'30':'#1a1a1a',color:eL===l?B.primaryLight:'#555'}}>{l}x</button>
                    ))}
                    <span style={{fontSize:10,fontWeight:800,color:B.primaryLight,fontFamily:fm,padding:'2px 8px'}}>{eL}x</span>
                  </div>
                  <span style={{fontSize:10,color:'#444'}}>{ml}x max</span>
                </div>
                <input type="range" min={1} max={ml} step={1} value={eL} onChange={e=>setOrderLev(+e.target.value)}
                  style={{width:'100%',accentColor:B.primary,cursor:'pointer',height:4}}/>
              </div>
            </div>
            {/* Limit price */}
            {orderType==='limit'&&(
              <div style={{marginBottom:12,padding:'10px 12px',background:'#0a0a0a',borderRadius:10,border:'1px solid #2a2a2a'}}>
                <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:6}}>Limit Price</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" min={1} max={99} value={limitCents} onChange={e=>setLimitCents(Math.min(99,Math.max(1,+e.target.value)))}
                    style={{flex:1,background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'7px 10px',color:B.primaryLight,fontSize:15,fontWeight:700,fontFamily:fm,outline:'none'}}/>
                  <span style={{fontSize:13,color:'#555',fontWeight:600}}>¢</span>
                </div>
              </div>
            )}
            {/* Risk tools */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:6}}>Risk Tools <span style={{color:'#383838'}}>optional</span></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                <div>
                  <div style={{fontSize:10,color:B.green,fontWeight:600,marginBottom:4}}>Take Profit ¢</div>
                  <input type="number" min={1} max={99} value={tpCents} onChange={e=>setTpCents(e.target.value)} placeholder="—"
                    style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.green+'22',borderRadius:8,padding:'7px 10px',color:B.green,fontSize:13,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:B.red,fontWeight:600,marginBottom:4}}>Stop Loss ¢</div>
                  <input type="number" min={1} max={99} value={slCents} onChange={e=>setSlCents(e.target.value)} placeholder="—"
                    style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.red+'22',borderRadius:8,padding:'7px 10px',color:B.red,fontSize:13,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
            </div>
            {/* Summary */}
            {(()=>{const estFee=expo*0.001;const liqDist=oPrice>0?Math.abs(oPrice-liqP)/oPrice*100:0;const liqCol=liqDist>15?B.green:liqDist>5?'#ff9f1c':B.red;const balPct=balance>0?eM/balance*100:0;return(<>
            <div style={{background:'#0a0a0a',borderRadius:12,padding:'10px 12px',marginBottom:10,fontSize:12}}>
              {[['Entry',(entryP*100).toFixed(1)+'¢','#fff'],['Exposure',fmtUsd(expo),'#fff'],['Est. Fee (10 bps)',fmtUsd(estFee),'#888']].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                  <span style={{color:'#555'}}>{l}</span><span style={{color:c,fontWeight:600,fontFamily:fm}}>{v}</span>
                </div>
              ))}
              <div style={{height:1,background:'#1f1f1f',margin:'7px 0'}}/>
              <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                <span style={{color:'#555'}}>If {team.name} wins</span>
                <span style={{color:B.green,fontWeight:800,fontFamily:fm}}>+{fmtUsd(orderSide==='home'?expo*(1-oPrice)/oPrice:expo*oPrice/(1-oPrice))}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                <span style={{color:'#555'}}>Max loss</span>
                <span style={{color:B.red,fontWeight:700,fontFamily:fm}}>-{fmtUsd(eM)}</span>
              </div>
            </div>
            {/* Liquidation callout */}
            <div style={{background:liqCol+'10',border:'1px solid '+liqCol+'30',borderRadius:10,padding:'10px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
              <div style={{fontSize:18,flexShrink:0}}>{liqDist>15?'🟢':liqDist>5?'🟡':'🔴'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:liqCol,fontFamily:fm}}>Liquidation @ {(liqP*100).toFixed(1)}¢</div>
                <div style={{fontSize:10,color:'#888',marginTop:2}}>{liqDist.toFixed(1)}% from current price</div>
              </div>
            </div>
            {/* Warnings */}
            {balPct>50&&<div style={{fontSize:11,color:'#ff9f1c',marginBottom:8,padding:'6px 10px',background:'#ff9f1c10',borderRadius:8,border:'1px solid #ff9f1c22'}}>
              Using {balPct.toFixed(0)}% of your balance
            </div>}
            {eL>=ml&&ml<10&&<div style={{fontSize:11,color:B.red,marginBottom:8,padding:'6px 10px',background:B.red+'10',borderRadius:8,border:'1px solid '+B.red+'22'}}>
              Maximum leverage — higher liquidation risk
            </div>}
            </>);})()}
            {/* Reduce Only */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 10px',background:reduceOnly?B.primary+'10':'#0a0a0a',borderRadius:10,border:'1px solid '+(reduceOnly?B.primary+'30':'#1a1a1a'),cursor:'pointer'}} onClick={()=>setReduceOnly(r=>!r)}>
              <div style={{width:16,height:16,borderRadius:4,border:'1.5px solid '+(reduceOnly?B.primary:'#333'),background:reduceOnly?B.primary:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                {reduceOnly&&<span style={{fontSize:10,color:'#000',fontWeight:900,lineHeight:1}}>✓</span>}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:reduceOnly?B.primaryLight:'#888'}}>Reduce Only</div>
                <div style={{fontSize:10,color:'#444'}}>Order can only reduce an existing position</div>
              </div>
            </div>
            {/* Submit */}
            <button onClick={placeOrder} disabled={settled||eM<10} style={{width:'100%',padding:'14px 0',fontWeight:700,fontSize:14,
              border:settled?'2px solid #333':'2px solid '+B.green,
              cursor:settled||eM<10?'not-allowed':'pointer',fontFamily:fb,borderRadius:12,transition:'all .15s',
              background:settled?'#222':orderSide==='home'?HOME.light:AWAY.light,
              color:'#fff',opacity:settled||eM<10?0.4:1}}>
              {settled?'Game Settled':orderType==='limit'?`Limit ${team.name} @ ${limitCents}¢ · ${fmtShares(shareCount)} shares`:`Buy ${team.name} · ${fmtShares(shareCount)} shares`}
            </button>
            {/* Account */}
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid #1f1f1f',display:'flex',justifyContent:'space-between',fontSize:11}}>
              <div><div style={{color:'#444',marginBottom:2}}>Balance</div><div style={{color:'#fff',fontWeight:700,fontFamily:fm}}>{fmtUsd(balance)}</div></div>
              <div style={{textAlign:'right'}}><div style={{color:'#444',marginBottom:2}}>Portfolio</div><div style={{color:pctClr(totalEq-10000),fontWeight:700,fontFamily:fm}}>{fmtUsd(totalEq)} <span style={{fontSize:10}}>({fmtPct((totalEq-10000)/100)})</span></div></div>
            </div>
            {/* Pending limits */}
            {limitOrders.length>0&&(
              <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #1f1f1f'}}>
                <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:6}}>Pending ({limitOrders.length})</div>
                {limitOrders.map(lo=>{const loTm=lo.side==='home'?HOME:AWAY;return(
                  <div key={lo.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 10px',background:'#1a1a1a',borderRadius:8,marginBottom:4,fontSize:11}}>
                    <span style={{color:lo.side==='home'?HOME.light:AWAY.light,fontWeight:700}}>{loTm.short} {lo.leverage}x</span>
                    <span style={{color:B.primary,fontFamily:fm}}>@ {(lo.limitPrice*100).toFixed(0)}¢</span>
                    <span style={{color:'#888'}}>{fmtUsd(lo.margin)}</span>
                    <button onClick={()=>{setLimitOrders(p=>p.filter(l=>l.id!==lo.id));setBalance(b=>b+lo.margin);notify('Order cancelled','info');}}
                      style={{background:'#ef444420',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer',color:'#ef4444',fontSize:11,fontWeight:700}}>✕</button>
                  </div>
                );})}
              </div>
            )}
          </div>)}

          {rightTab==='book'&&(()=>{
            const spread=((book.asks[0].price-book.bids[0].price)*100).toFixed(1);
            const maxCum=Math.max(book.asks[book.asks.length-1].cum,book.bids[book.bids.length-1].cum);
            const displayAsks=[...book.asks].reverse().slice(0,6);
            const displayBids=book.bids.slice(0,6);
            const homeBright=brighten(HOME.light);
            const awayBright=brighten(AWAY.light);
            return(
            <div style={{background:'#0a0a0a',borderRadius:16,border:'1px solid #1f1f1f',padding:'14px 12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>Order Book</span>
                <span style={{fontSize:10,color:'#888'}}>Spread <span style={{color:'#fff',fontWeight:700,fontFamily:fm}}>{spread}¢</span></span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',padding:'0 4px 6px',fontSize:9,fontWeight:700,color:'#666',letterSpacing:'0.06em'}}>
                <span>PRICE ({HOME.short}%)</span><span style={{textAlign:'center'}}>{AWAY.short} equiv</span><span style={{textAlign:'right'}}>SIZE</span>
              </div>
              <div style={{marginBottom:2}}>
                <div style={{fontSize:9,fontWeight:700,color:awayBright,letterSpacing:'0.08em',padding:'2px 4px 4px'}}>SELL {HOME.short.toUpperCase()} · BUY {AWAY.short.toUpperCase()}</div>
                {displayAsks.map((a,i)=>{const dp=(a.cum/maxCum)*100;const ce=((1-a.price)*100).toFixed(1);return(
                  <div key={'a'+i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',fontSize:11,height:24,alignItems:'center',position:'relative',fontFamily:fm,padding:'0 4px',borderRadius:3,cursor:'pointer'}}
                    onClick={()=>{setOrderSide('away');setLimitCents(Math.round((1-a.price)*100));setOrderType('limit');setRightTab('order');}}>
                    <div style={{position:'absolute',right:0,top:0,bottom:0,borderRadius:3,background:awayBright+'25',width:dp+'%',transition:'width .3s'}}/>
                    <span style={{color:awayBright,position:'relative',zIndex:1,fontWeight:800}}>{(a.price*100).toFixed(1)}¢</span>
                    <span style={{color:'#888',position:'relative',zIndex:1,textAlign:'center',fontSize:10}}>{ce}¢</span>
                    <span style={{color:'#aaa',position:'relative',zIndex:1,textAlign:'right',fontSize:10}}>{a.size}</span>
                  </div>);})}
              </div>
              <div style={{margin:'6px 0',padding:'6px 4px',borderTop:'1px solid #2a2a2a',borderBottom:'1px solid #2a2a2a',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:800,color:'#fff',fontFamily:fm}}>{(oPrice*100).toFixed(1)}¢</span>
                <span style={{fontSize:10,color:'#888',textAlign:'center'}}>mid · {spread}¢</span>
                <span style={{fontSize:10,color:'#888',textAlign:'right'}}>{((1-oPrice)*100).toFixed(1)}¢</span>
              </div>
              <div style={{marginTop:2}}>
                {displayBids.map((b,i)=>{const dp=(b.cum/maxCum)*100;const ce=((1-b.price)*100).toFixed(1);return(
                  <div key={'b'+i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',fontSize:11,height:24,alignItems:'center',position:'relative',fontFamily:fm,padding:'0 4px',borderRadius:3,cursor:'pointer'}}
                    onClick={()=>{setOrderSide('home');setLimitCents(Math.round(b.price*100));setOrderType('limit');setRightTab('order');}}>
                    <div style={{position:'absolute',left:0,top:0,bottom:0,borderRadius:3,background:homeBright+'25',width:dp+'%',transition:'width .3s'}}/>
                    <span style={{color:homeBright,position:'relative',zIndex:1,fontWeight:800}}>{(b.price*100).toFixed(1)}¢</span>
                    <span style={{color:'#888',position:'relative',zIndex:1,textAlign:'center',fontSize:10}}>{ce}¢</span>
                    <span style={{color:'#aaa',position:'relative',zIndex:1,textAlign:'right',fontSize:10}}>{b.size}</span>
                  </div>);})}
                <div style={{fontSize:9,fontWeight:700,color:homeBright,letterSpacing:'0.08em',padding:'4px 4px 0'}}>BUY {HOME.short.toUpperCase()} · SELL {AWAY.short.toUpperCase()}</div>
              </div>
              <div style={{marginTop:10,paddingTop:8,borderTop:'1px solid #1f1f1f',fontSize:10,color:'#666',lineHeight:1.6}}>
                Buy {HOME.short} at P¢ matches Sell {AWAY.short} at (100−P)¢
                <div style={{marginTop:2,color:'#555'}}>Click any level to set a limit order</div>
              </div>
            </div>
          );})()}

        </div>}

        {/* MOBILE bottom sheet + tab bar */}
        {isMobile&&(
          <>
            {/* Live scoreline pill strip */}
            {liveGames.filter(lg=>lg.id!==initGame.id&&(lg.status==='live'||lg.status==='halftime')).length>0&&(
              <div className="mob-nav" style={{display:'flex',gap:6,padding:'6px 12px',overflowX:'auto',background:'#0a0a0a',borderBottom:'1px solid #1a1a1a',flexShrink:0}}>
                {liveGames.filter(lg=>lg.id!==initGame.id&&(lg.status==='live'||lg.status==='halftime')).map(lg=>(
                  <div key={lg.id} onClick={()=>onTrade&&onTrade(lg)} style={{flexShrink:0,display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'#111',borderRadius:20,border:'1px solid #1f1f1f',cursor:'pointer'}}>
                    {lg.home.logo&&<img src={lg.home.logo} style={{width:13,height:13,objectFit:'contain'}} alt=""/>}
                    <span style={{fontSize:10,fontWeight:700,color:'#fff',fontFamily:fm}}>{lg.home.abbreviation}</span>
                    <span style={{fontSize:10,color:B.green,fontWeight:700,fontFamily:fm}}>{lg.home.score}-{lg.away.score}</span>
                    {lg.away.logo&&<img src={lg.away.logo} style={{width:13,height:13,objectFit:'contain'}} alt=""/>}
                    <span style={{fontSize:10,fontWeight:600,color:'#888',fontFamily:fm}}>{lg.away.abbreviation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sticky bottom tab bar */}
            <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:40,background:'#0a0a0a',borderTop:'1px solid #1a1a1a',display:'flex',height:56,paddingBottom:'env(safe-area-inset-bottom)'}}>
              {[['score','📊','Score'],['trade','⚡','Trade'],['positions','💼','Positions'],['gamecast','🎙','Plays']].map(([id,icon,label])=>(
                <button key={id} onClick={()=>{
                  if(id==='trade'){setShowWager(w=>!w);}
                  else{setShowWager(false);
                    const el=document.querySelector('[data-mob="'+id+'"]');
                    if(el)el.scrollIntoView({behavior:'smooth'});}
                }} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,border:'none',
                  background:id==='trade'&&showWager?B.primary+'20':'transparent',cursor:'pointer',
                  color:id==='trade'?B.primary:'#666',fontFamily:fb,position:'relative'}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <span style={{fontSize:9,fontWeight:600}}>{label}</span>
                  {id==='positions'&&positions.length>0&&<span style={{position:'absolute',top:6,right:'22%',fontSize:8,background:B.primary,color:'#000',borderRadius:8,padding:'1px 4px',fontWeight:700}}>{positions.length}</span>}
                </button>
              ))}
            </div>

            {/* Mobile wager sheet */}
            {showWager&&(
              <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',flexDirection:'column',justifyContent:'flex-end'}} onClick={e=>{if(e.target===e.currentTarget)setShowWager(false);}}>
                <div style={{background:'rgba(0,0,0,0.6)',position:'absolute',inset:0}}/>
                <div style={{position:'relative',background:'#0a0a0a',borderRadius:'20px 20px 0 0',border:'1px solid #1f1f1f',maxHeight:'90vh',overflow:'auto',animation:'slideUp .25s ease',paddingBottom:'env(safe-area-inset-bottom)'}}>
                  <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}>
                    <div style={{width:36,height:4,borderRadius:2,background:'#333'}}/>
                  </div>
                  <div style={{padding:'0 16px 16px'}}>
                    <div style={{display:'flex',gap:0,margin:'12px 0',background:'#1a1a1a',borderRadius:12,padding:3}}>
                      <button onClick={()=>setOrderSide('home')} style={{flex:1,padding:'11px 0',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:fb,borderRadius:10,border:orderSide==='home'?'2px solid '+HOME.light:'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .15s',
                        background:orderSide==='home'?HOME.light+'22':'transparent',color:'#fff'}}>
                        {HOME.logoUrl&&<img src={HOME.logoUrl} style={{width:16,height:16,objectFit:'contain',borderRadius:3}} alt=""/>}
                        {HOME.short} <span style={{fontSize:11,opacity:0.7}}>{(oPrice*100).toFixed(0)}¢</span>
                      </button>
                      <button onClick={()=>setOrderSide('away')} style={{flex:1,padding:'11px 0',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:fb,borderRadius:10,border:orderSide==='away'?'2px solid '+AWAY.light:'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .15s',
                        background:orderSide==='away'?AWAY.light+'22':'transparent',color:'#fff'}}>
                        {AWAY.logoUrl&&<img src={AWAY.logoUrl} style={{width:16,height:16,objectFit:'contain',borderRadius:3}} alt=""/>}
                        {AWAY.short} <span style={{fontSize:11,opacity:0.7}}>{(awayProb*100).toFixed(0)}¢</span>
                      </button>
                    </div>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      {[100,250,500,1000].map(v=>(
                        <button key={v} onClick={()=>setOrderMargin(v)} style={{flex:1,padding:'11px 0',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:fm,borderRadius:10,
                          background:Math.round(eM)===v?'#2a2a2a':'#1a1a1a',color:Math.round(eM)===v?'#fff':'#666'}}>{v>=1000?'$'+(v/1000)+'k':'$'+v}</button>
                      ))}
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:11,color:'#555',fontWeight:600}}>Leverage</span>
                        <span style={{fontSize:14,fontWeight:800,color:B.primaryLight,fontFamily:fm}}>{eL}x</span>
                      </div>
                      <input type="range" min={1} max={ml} step={1} value={eL} onChange={e=>setOrderLev(+e.target.value)} style={{width:'100%',accentColor:B.primary,height:4}}/>
                    </div>
                    <div style={{background:'#111',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12}}>
                      {[['Entry',(entryP*100).toFixed(1)+'¢','#fff'],['Exposure',fmtUsd(expo),'#fff'],['Liquidation',(liqP*100).toFixed(1)+'¢',B.red],['If '+team.name+' wins','+'+fmtUsd(orderSide==='home'?expo*(1-oPrice)/oPrice:expo*oPrice/(1-oPrice)),B.green]].map(([l,v,c],i)=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderTop:i>0?'1px solid #1a1a1a':'none'}}>
                          <span style={{color:'#555'}}>{l}</span><span style={{color:c,fontWeight:600,fontFamily:fm}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>{placeOrder();setShowWager(false);}} disabled={settled||eM<10} style={{width:'100%',padding:'16px 0',fontWeight:700,fontSize:16,
                      border:settled?'2px solid #333':'2px solid '+B.green,cursor:'pointer',fontFamily:fb,borderRadius:14,
                      background:settled?'#222':orderSide==='home'?HOME.light:AWAY.light,color:'#fff',opacity:settled||eM<10?0.4:1}}>
                      {settled?'Game Settled':`Buy ${team.name} · ${fmtShares(shareCount)} shares`}
                    </button>
                    <div style={{marginTop:12,display:'flex',justifyContent:'space-between',fontSize:12,color:'#555',paddingBottom:4}}>
                      <span>Balance <span style={{color:'#fff',fontFamily:fm,fontWeight:700}}>{fmtUsd(balance)}</span></span>
                      <span>Portfolio <span style={{color:pctClr(totalEq-10000),fontFamily:fm,fontWeight:700}}>{fmtUsd(totalEq)}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{height:56}}/>
          </>
        )}
      </div>

      {/* Settlement overlay */}
      {settled&&(
        <div style={{position:'fixed',inset:0,zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(20px)'}}>
          <div style={{textAlign:'center',padding:'48px 56px',maxWidth:440,background:'#111',borderRadius:24,border:'1px solid #2a2a2a'}}>
            <div style={{fontSize:56,marginBottom:16}}>🏆</div>
            <div style={{fontSize:28,fontWeight:800,color:(g.home.score||0)>=(g.away.score||0)?HOME.light:AWAY.light,marginBottom:6}}>{settledWinner||HOME.name} defeat {(g.home.score||0)>=(g.away.score||0)?AWAY.name:HOME.name}</div>
            <div style={{fontSize:18,color:'#888',fontFamily:fm,marginBottom:4}}>{g.home.score} – {g.away.score}</div>
            <div style={{fontSize:13,color:'#555',marginBottom:24}}>{g.shortName||g.name}</div>
            <div style={{fontSize:40,fontWeight:800,color:totalEq>=10000?B.green:'#ef4444',fontFamily:fm,marginBottom:4}}>{fmtUsd(totalEq)}</div>
            <div style={{fontSize:15,marginBottom:36}}>
              <span style={{color:'#666'}}>Return </span><span style={{fontWeight:700,color:pctClr(totalEq-10000)}}>{fmtPct((totalEq-10000)/100)}</span>
            </div>
            <button onClick={onBack} style={{padding:'14px 32px',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',fontFamily:fb,borderRadius:12,background:'linear-gradient(135deg,#1fd182,#1fd182)',color:'#fff'}}>Back to Games</button>
          </div>
        </div>
      )}
      {showProfile && <ProfileModal userId={userId} onClose={()=>setShowProfile(false)}/>}
      {tradeCard && <TradeCard card={tradeCard} onClose={()=>setTradeCard(null)}/>}
    </div>
  );
}
