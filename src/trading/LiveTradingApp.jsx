import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { B, brighten, fb, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { calcPnL, clamp, fmtPct, fmtShares, fmtUsd, liqPrice, makeBook, maxLev, pctClr, periodLabel } from "../lib/helpers.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { normalizeEspnToLive } from "../lib/espn.js";
import { subscribeLive, setLiveUser } from "../lib/liveSocket.js";
import { fetchEventMeta, isEventEligible } from "../lib/event.js";
import { VerifyModal } from "../components/VerifyModal.jsx";
import { TvChart } from "../components/TvChart.jsx";
import { ProfilePage } from "../components/ProfilePage.jsx";
import { AuthModal } from "../components/AuthModal.jsx";
import { ChatPanel } from "../components/ChatPanel.jsx";
import { TradeCard } from "../components/TradeCard.jsx";
import { getAuth, currentUserId, authToken, isLoggedIn, handleUnauthorized, setSessionExpiredHandler } from "../lib/auth.js";
import { track } from "../lib/track.js";
import { AvatarCircle } from "../components/onboarding/MemberCard.jsx";
import { parseAvatar } from "../lib/onboarding.js";
import { loadCard } from "../lib/onboarding.js";
import { DepositModal } from "../components/DepositModal.jsx";
import { NavRail } from "../components/NavRail.jsx";
import { FloatingChat } from "../components/FloatingChat.jsx";
import { isBookmarked, syncBookmarks, toggleBookmark as toggleBookmarkStore } from "../lib/bookmarks.js";
import { MessageCircle, Bookmark, Share2, BarChart3, Zap, Briefcase, Mic, Home, Ticket, Newspaper, Trophy } from "lucide-react";
import { webNotify } from "../lib/webNotify.js";

// Accurate, user-facing labels for the backend oracle source names.
//   ESPN Model  → ESPN's live win-probability model (NBA/NFL/MLB/NHL)
//   Sportsbooks → live market consensus: The Odds API in-play odds, with ESPN-embedded
//                 book odds as a fallback when the Odds API has no line
const SOURCE_LABEL = { 'ESPN Model': 'ESPN', 'Sportsbooks': 'Sportsbooks', 'Bookmakers': 'Sportsbooks' };

// Minutes since kickoff for a chart point — makes the X axis reflect game time
// (not wall-clock since the oracle started, which is skewed by pregame seeding).
// Returns null if startTime is unknown so callers can fall back.
function gameMinSince(startTime, wallMs) {
  const k = new Date(startTime).getTime();
  return (!isNaN(k) && k) ? +((wallMs - k) / 60000).toFixed(2) : null;
}

// "Pregame · starts in 42m" countdown for a scheduled game's status badge.
function startsInLabel(startTime) {
  const ms = new Date(startTime).getTime() - Date.now();
  if (isNaN(ms)) return "Pregame";
  if (ms <= 0) return "Starting…";
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
  return h > 0 ? `Pregame · ${h}h ${m % 60}m` : `Pregame · ${m}m`;
}

/**
 * Leverage control (mobile-design port): big "Nx" readout, − / + steppers flanking ten pill
 * segments (white fill → chosen leverage; dark → available; near-black → locked beyond the live
 * gap-aware cap), 1x/10x rail labels, and a liquidation card ("Liquidation at ~X% · Only Y pts
 * away"). Pills are clickable; everything clamps to the per-side max.
 */
// Plain-language copy for backend order-rejection reason codes. Anything unmapped falls back to
// "Order rejected — <code>" so a new backend reason is never silently ugly (A7 finding #3).
const REJECT_COPY = {
  perpMarginRejected: 'Not enough balance for this wager',
  reduceOnlyRejected: 'No position to reduce',
  positionLimit: 'Position size limit reached for this game',
  tooManyOrders: 'Too many open orders on this game',
  tickRejected: 'Price must be in 0.1¢ increments',
  invalidInput: 'Invalid order — check your inputs',
  userNotFound: 'Account not found — try refreshing the page',
  badAloPxRejected: 'Post-only order would cross the market',
  joinRequired: 'Join the championship to trade this match',
};

function LevSlider({ eL, ml, onChange, compact = false, liq = null, cap = null }) {
  const ABS_MAX = 10;
  const [showWhy, setShowWhy] = useState(false);
  const set = (v) => onChange(Math.min(Math.max(1, v), ml));
  const ptsClose = liq && liq.pts < 5;
  // Which rule is binding right now? The cap the backend enforces is min(price tier, one-play rule);
  // if the price tier alone already equals the cap, that's the binding rule — else it's the game clock.
  const priceCap = cap?.px != null ? maxLev(cap.px) : null;
  const favPct = cap?.px != null ? Math.round(Math.max(cap.px, 1 - cap.px) * 100) : null;
  const priceBinds = priceCap != null && priceCap <= ml;
  return (
    <div>
      {/* readout */}
      <div style={{textAlign:'center',marginBottom:2}}>
        <div style={{fontSize:compact?30:34,fontWeight:800,color:'#fff',fontFamily:fd,lineHeight:1.1,letterSpacing:'-0.02em'}}>{eL}x</div>
        <div style={{fontSize:compact?13:12,color:'#8a8f98',marginTop:2}}>Leverage</div>
      </div>
      {/* − pills + */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12}}>
        <button onClick={()=>set(eL-1)} disabled={eL<=1} style={{width:38,height:38,borderRadius:'50%',border:'none',background:'#1a1d22',color:eL<=1?'#3a3d43':'#fff',fontSize:18,fontWeight:700,cursor:eL<=1?'default':'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:fb}}>−</button>
        <div style={{flex:1,display:'flex',gap:5}}>
          {Array.from({length:ABS_MAX},(_,i)=>{
            const v=i+1, filled=v<=eL, locked=v>ml;
            return <div key={v} onClick={()=>!locked&&set(v)} style={{flex:1,height:15,borderRadius:999,cursor:locked?'default':'pointer',
              background: filled?'#fff':locked?'#101216':'#1e2126', transition:'background .12s'}}/>;
          })}
        </div>
        <button onClick={()=>set(eL+1)} disabled={eL>=ml} style={{width:38,height:38,borderRadius:'50%',border:'none',background:'#1a1d22',color:eL>=ml?'#3a3d43':'#fff',fontSize:18,fontWeight:700,cursor:eL>=ml?'default':'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:fb}}>+</button>
      </div>
      {/* rail labels */}
      <div style={{display:'flex',justifyContent:'space-between',padding:'6px 52px 0'}}>
        <span style={{fontSize:12,color:'#6a6f77'}}>1x</span>
        {ml<ABS_MAX && <span style={{fontSize:12,fontWeight:700,color:B.red}}>{ml}x max</span>}
        <span style={{fontSize:12,color:'#6a6f77'}}>{ABS_MAX}x</span>
      </div>
      {ml<ABS_MAX && (
        <div style={{fontSize:11,color:'#8a8f98',marginTop:5,textAlign:'center'}}>
          Leverage is capped at {ml}x on this market right now.
          <span onClick={()=>setShowWhy(v=>!v)} style={{color:'#fff',fontWeight:700,cursor:'pointer',marginLeft:6,textDecoration:'underline'}}>{showWhy?'Hide':'Why?'}</span>
        </div>
      )}
      {ml<ABS_MAX && showWhy && (
        <div style={{marginTop:8,background:'#101216',border:'1px solid #1c1f24',borderRadius:14,padding:'13px 15px',fontSize:12,color:'#9aa0a8',lineHeight:1.6,textAlign:'left'}}>
          <div style={{marginBottom:9}}>
            Two safety rules set the ceiling — whichever is <span style={{color:'#fff'}}>lower</span> wins:
          </div>
          <div style={{marginBottom:9}}>
            <span style={{color:priceBinds?B.primary:'#fff',fontWeight:700}}>1 · The price cap{priceBinds?' — binding now':''}.</span>{' '}
            The closer a price is to 0% or 100%, the less distance there is to liquidation, so the ceiling
            steps down with the favorite's odds: up to 60% → 10x · 75% → 5x · 85% → 3x · 95% → 2x · beyond → 1x.
            {favPct != null && <> This market's favorite trades at <span style={{color:'#fff'}}>{favPct}%</span>, so the price cap is <span style={{color:'#fff'}}>{priceCap}x</span>.</>}
          </div>
          <div style={{marginBottom:9}}>
            <span style={{color:!priceBinds?B.primary:'#fff',fontWeight:700}}>2 · The one-play rule{!priceBinds?' — binding now':''}.</span>{' '}
            Your liquidation buffer must survive one decisive play — a goal, a touchdown, a home run — without
            gapping straight past your bankruptcy price. The possible swing from one play grows sharply toward the
            end of a close game (a late goal can move win probability 10+ points), so leverage tightens as the
            clock runs down while the score stays tight. Early-game and lopsided situations are barely restricted.
          </div>
          <div style={{color:'#6a6f77'}}>
            Backing the favorite keeps a bigger buffer than the underdog, so it's often allowed more leverage at the
            same price. Caps apply only to opening or adding — <span style={{color:'#9aa0a8'}}>closing is never capped; you can always exit.</span>
          </div>
        </div>
      )}
      {/* liquidation card */}
      {liq && Number.isFinite(liq.pct) && (
        <div style={{marginTop:10,background:'#101216',border:'1px solid #1c1f24',borderRadius:14,padding:'13px 16px'}}>
          <div style={{fontSize:15,fontWeight:800,color:'#fff',fontFamily:fd,letterSpacing:'-0.01em'}}>Liquidation at ~{Math.round(liq.pct)}%</div>
          <div style={{fontSize:12.5,color:ptsClose?B.red:'#8a8f98',marginTop:3,fontWeight:ptsClose?700:400}}>Only {liq.pts.toFixed(1)} pts away</div>
        </div>
      )}
    </div>
  );
}

export function LiveTradingApp({ game: initGame, onBack, liveGames = [], onNavTo, onTrade, onOnboard, worldcup = false }) {
  // ── normalise team colors from backend ──────────────────────────────────
  const nc = c => c ? (c.startsWith('#') ? c : '#'+c) : null;

  // ── auth/userId: guest UUID until the user signs up; auth session adds username/token ──
  const [auth, setAuth] = useState(getAuth);          // { userId, username, token } | null
  const userId = auth?.userId || currentUserId();     // trade as the authed account, else guest
  const [showAuth, setShowAuth] = useState(false);    // login/signup modal
  const [sessionExpired, setSessionExpired] = useState(false); // opened by a 401 (dead/rotated token)

  // Register user with backend on mount (idempotent; guests get a paper balance)
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
  const [marketMaxLev, setMarketMaxLev] = useState(null); // authoritative cap from backend (incl. scoring throttle)
  const [marketMaxLevBySide, setMarketMaxLevBySide] = useState(null); // gap-aware cap per side {home,away}
  const [orderType,  setOrderType]  = useState('market');
  const [limitCents, setLimitCents] = useState(Math.round((initGame.oracle?.indexPrice??0.5)*100));
  const [tpCents,    setTpCents]    = useState('');
  const [slCents,    setSlCents]    = useState('');
  const [tpslEdit,   setTpslEdit]   = useState(null);   // { id, tp, sl } — inline TP/SL editor on a position
  const [limitOrders,setLimitOrders]= useState([]);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [rightTab,   setRightTab]   = useState('order');
  const [bottomTab,  setBottomTab]  = useState('gamecast');
  // Wager Activity: THIS GAME's public wager tape — every public profile's opens, cash-outs,
  // TP/SL fires, liquidations and settlements in this match, server-persisted so refreshes
  // and late-joiners see the full scrollable history. Toasts stay the in-the-moment channel.
  const [activity, setActivity] = useState([]);
  // Local notif tray persists per account too (feeds the floating toasts).
  const notifsKey = `parabolic_activity_${userId}`;
  const [notifs,     setNotifs]     = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(notifsKey) || "[]"); return Array.isArray(s) ? s.slice(0, 40) : []; }
    catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(notifsKey, JSON.stringify(notifs.slice(0, 40))); } catch { /* storage blocked */ }
  }, [notifs, notifsKey]);
  const [markers,    setMarkers]    = useState([]);
  const [showWager,  setShowWager]  = useState(false);
  const sheetDragY = useRef(null); // touch-start Y of the wager-sheet handle (swipe-down dismiss)
  const [showProfile, setShowProfile] = useState(false);
  // Account pfp mirrors the member-card avatar (re-read when the profile closes).
  const [cardAvatar, setCardAvatar] = useState(() => loadCard().avatar);
  useEffect(() => { if (!showProfile) setCardAvatar(loadCard().avatar); }, [showProfile]);
  const [showDeposit, setShowDeposit] = useState(false); // deposit/withdrawal coming-soon modal
  // Chat popout (draggable window) + unread dot; bookmark is device-local like the mobile app.
  const [showChatPop, setShowChatPop] = useState(false);
  const showChatPopRef = useRef(false); showChatPopRef.current = showChatPop;
  const [chatUnread, setChatUnread] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(initGame.id));
  useEffect(() => { let live = true; syncBookmarks().then((ids) => { if (live) setBookmarked(ids.includes(initGame.id)); }); return () => { live = false; }; }, [initGame.id]);
  const toggleBookmark = () => setBookmarked((was) => { toggleBookmarkStore(initGame.id, !was); return !was; });
  const shareMarket = async () => {
    const url = "https://app.parabolic.gg";
    const text = `Trading ${initGame.home?.name ?? "Home"} vs ${initGame.away?.name ?? "Away"} live on Parabolic — ${url}`;
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(text); notify("Link copied to clipboard", "green"); } catch { /* ignore */ }
  };
  const [tradeCard, setTradeCard] = useState(null);
  const [isMobile,   setIsMobile]   = useState(()=>window.innerWidth<768);
  useEffect(()=>{const fn=()=>setIsMobile(window.innerWidth<768);window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn);},[]);
  // Analytics: a page_view per live-terminal tab change (covers every setter site by watching state).
  useEffect(() => { track("page_view", { page: "live", tab: bottomTab }); }, [bottomTab]);

  // refs for closures
  const oR   = useRef(oPrice);   oR.current   = oPrice;
  const mR   = useRef(oMark);    mR.current   = oMark;
  const mlR  = useRef(10);       // effective (side-aware) max leverage — mirrors `ml` each render so
                                 // placeOrder submits the SAME cap the slider shows (A7 finding #1)

  // ── World Cup Cash event (plan 010) — fully inert until the backend flips EVENT_ENABLED ──
  // Eligible games trade on the segregated EVENT ledger: balance/positions come from /event/*,
  // the header shows World Cup Cash, and non-participants get a Join button instead of Buy.
  const [evMeta, setEvMeta] = useState(null);     // GET /api/event — { live, league, grant, ... }
  const [showVerify, setShowVerify] = useState(false); // identity gate (A3) — opened by a verify-403 on join
  const [wcJoined, setWcJoined] = useState(null); // null=unknown · false=not a participant · true=in
  const [wcBalance, setWcBalance] = useState(null);
  const isEventGame = isEventEligible(evMeta, g);
  const evGameR = useRef(false);  evGameR.current = isEventGame;
  const wcJoinedR = useRef(null); wcJoinedR.current = wcJoined;
  const wcBalR = useRef(null);    wcBalR.current = wcBalance;
  useEffect(() => {
    let on = true;
    const tick = () => fetchEventMeta().then((m) => { if (on) setEvMeta(m); });
    tick();
    const iv = setInterval(tick, 60_000);
    return () => { on = false; clearInterval(iv); };
  }, []);
  const posR = useRef(positions); posR.current = positions;
  const limR = useRef(limitOrders); limR.current = limitOrders;
  const pollRef = useRef(null);  // latest poll() — lets WS events trigger reconciliation early
  const lastScoreIdRef = useRef(null);          // dedupe scoring plays across polls
  const prevScoreRef = useRef({ h: 0, a: 0 });  // detect which team just scored
  const closedIdsRef = useRef(new Set());       // position ids already moved to history (dedupe)

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
  const [toasts, setToasts] = useState([]);      // stacked transient notifications (mobile surface)
  const toastTimersRef = useRef({});
  useEffect(() => () => Object.values(toastTimersRef.current).forEach(clearTimeout), []);
  const dismissToast = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id));
    clearTimeout(toastTimersRef.current[id]);
    delete toastTimersRef.current[id];
  }, []);
  const notify = useCallback((msg, type) => {
    const id = Date.now() + Math.random();
    // Persist in the activity tray (newest first), capped — they don't auto-dismiss.
    setNotifs(p => [{id, msg, type: type||'info', t: Date.now()}, ...p].slice(0, 40));
    // Tabbed-away users get the important ones as a browser notification (opt-in; no-op when
    // the tab is visible — the tray/toast below already covers in-tab).
    if (type === 'red' || type === 'yellow' || type === 'green') webNotify('Parabolic', msg);
    // Mobile: the tray lives in the desktop wager panel, so on a phone a rejection was a silent
    // no-op (A7 finding #2). Surface every notification as a floating toast too — a stacked
    // queue (max 3), NOT one slot, so a burst (fill → points, liquidation → settlement) can't
    // overwrite a message before it's read. Critical types (red/yellow) linger 8s vs 4s.
    setToasts(p => [...p.slice(-2), { id, msg, type: type || 'info' }]);
    toastTimersRef.current[id] = setTimeout(() => dismissToast(id), type === 'red' || type === 'yellow' ? 8000 : 4000);
  }, [dismissToast]);
  const clearNotifs = useCallback(() => setNotifs([]), []);

  const addMark = useCallback((chartT, p, mt, side) => {
    setMarkers(prev => [...prev, {t: +chartT.toFixed(2), p, markerType: mt, line: side||'home'}]);
  }, []);

  // Sidebar games: single source = backend liveGames (no more ESPN-direct duplication).
  // Split into Pregame (markets about to open) and Live, each excluding the current game.
  const sidebarLive = useMemo(() => (
    liveGames.filter(lg => lg.id !== initGame.id && (lg.status === 'live' || lg.status === 'halftime'))
  ), [liveGames, initGame.id]);
  const sidebarPregame = useMemo(() => (
    liveGames.filter(lg => lg.id !== initGame.id && lg.pregame && lg.status !== 'live' && lg.status !== 'halftime')
              .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
  ), [liveGames, initGame.id]);

  // Sport counts for nav tabs — backend covers all 7 leagues (NBA, NCAAM, MLB, NFL, NHL, MLS, WCUP)
  const sportCounts = useMemo(() => {
    const live = liveGames.filter(g => g.status === 'live' || g.status === 'halftime');
    return {
      live: live.length,
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
    // limit=2000 = the oracle's full retained history (it records ~1pt/5s, so the 500
    // default only covers ~40min — not enough for a full game). 2000 covers a whole match.
    fetch(`${API_URL}/oracle/${initGame.id}/history?limit=2000`)
      .then(r => r.json())
      .then(data => {
        if (!data.history?.length) return;
        const t0 = data.history[0].t;
        setChartT0(t0);
        setChartData(data.history.map(h => ({
          t:    gameMinSince(initGame.startTime, h.t) ?? +((h.t - t0) / 60000).toFixed(2),
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
            const t = gameMinSince(initGame.startTime, Date.now()) ?? +((Date.now() - ref) / 60000).toFixed(2);
            setChartData(cd => [...cd, {t,ph:op,pa:1-op,mp,floor:clamp(op-0.2,0.01,0.99),ceil:clamp(op+0.2,0.01,0.99),mh_val:null,mh_marker:null,ma_val:null,ma_marker:null}]);
            return prev||ref;
          });
          if (Array.isArray(norm.plays) && norm.plays.length) {
            setPlayLog(prev=>{const seen=new Set(prev.map(p=>p.id));const fresh=norm.plays.filter(p=>!seen.has(p.id)).reverse();return fresh.length?[...fresh,...prev].slice(0,500):prev;});
          } else if (norm.latestPlay) setPlayLog(prev=>{if(!prev.length||prev[0].id!==norm.latestPlay.id)return[norm.latestPlay,...prev].slice(0,500);return prev;});
          // Check positions
          const cpE = posR.current;
          if (cpE.length) {
            let ch=false;
            // Only this game's positions are priced by this game's mark — never evaluate
            // another game's position against the wrong price.
            const upd=cpE.filter(pos=>{if(pos.gameId!==norm.id)return true;const pnl=calcPnL(pos.side,pos.exposure,pos.entry,mp);if(pnl<=-pos.margin*0.95){ch=true;setClosedPos(pr=>[{...pos,closedAt:op,exitPx:op,pnl:-pos.margin,closeType:'LIQ'},...pr]);setClosedPnL(p=>p-pos.margin);notify('☠ LIQUIDATED','red');return false;}return true;});
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

        // Gamecast: merge the full play history (deduped by id) so the ENTIRE game shows
        // on open, then new plays append live. Backend plays are oldest→newest; playLog is
        // newest-first. Falls back to latestPlay if the full list isn't present.
        if (Array.isArray(upd.plays) && upd.plays.length) {
          setPlayLog(prev => {
            const seen = new Set(prev.map(p => p.id));
            const fresh = upd.plays.filter(p => !seen.has(p.id)).reverse();
            return fresh.length ? [...fresh, ...prev].slice(0, 500) : prev;
          });
        } else if (upd.latestPlay) {
          setPlayLog(prev => (!prev.length || prev[0].id !== upd.latestPlay.id) ? [upd.latestPlay, ...prev].slice(0, 500) : prev);
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
            const t = gameMinSince(initGame.startTime, Date.now()) ?? +((Date.now() - tRef) / 60000).toFixed(2);
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
            // Authoritative max leverage (gap-aware: extremity + single-event swing, per side)
            if (typeof mktData.maxLeverage === 'number') setMarketMaxLev(mktData.maxLeverage);
            if (mktData.maxLeverageBySide) setMarketMaxLevBySide(mktData.maxLeverageBySide);
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
            // Event game → balance/realized shown in this terminal come from the EVENT ledger
            // below; writing the MAIN ledger's numbers here would flash unrelated totals.
            if (!evGameR.current) {
              setBalance(balData.balance);
              setClosedPnL(balData.closedPnl);
            }
          }
          if (posRes.ok) {
            const posData = await posRes.json();
            // Guard: only update if we got a valid array (a malformed/empty error
            // response must NOT wipe local positions).
            if (Array.isArray(posData.positions)) {
              const mapped = posData.positions.map(p => ({
                id: p.id, gameId: p.gameId, side: p.side, size: p.size, margin: p.margin,
                leverage: p.leverage, exposure: p.size * p.entryPx, entry: p.entryPx,
                liq: p.liqPrice, tp: p.tp, sl: p.sl, pnl: p.pnl, roe: p.roe, openedAt: p.openedAt,
              }));
              // Positions that vanished server-side (liquidation / TP-SL / settlement) and
              // weren't closed by us → record them in history so nothing silently disappears.
              // Event game: THIS game's positions live on the event ledger, so the main ledger
              // legitimately never has them — diffing here fabricated a ghost "CLOSED @ 0.0¢"
              // row and wiped the real position every poll (the visual flicker). Skip; the
              // event branch below owns this game's diff.
              const liveIds = new Set(mapped.map(p => p.id));
              const vanished = evGameR.current ? [] : posR.current.filter(
                p => p.gameId === g.id && !liveIds.has(p.id) && !closedIdsRef.current.has(p.id)
              );
              if (vanished.length) {
                setClosedPos(pr => [
                  ...vanished.map(p => {
                    closedIdsRef.current.add(p.id);
                    const realized = p.pnl ?? 0;
                    const ct = realized <= -(p.margin * 0.9) ? 'LIQ'
                             : (upd.status === 'final' || upd.status === 'completed') ? 'SETTLED' : 'CLOSED';
                    return { ...p, closedAt: 0, pnl: realized, pnlPct: p.margin>0?realized/p.margin*100:0, closeType: ct };
                  }),
                  ...pr,
                ]);
                if (vanished.some(p => (p.pnl ?? 0) <= -(p.margin * 0.9))) notify('☠ Position liquidated', 'red');
              }
              // Event game: keep this game's (event-ledger) positions; main poll only owns the rest.
              setPositions(prev => evGameR.current ? [...prev.filter(p => p.gameId === g.id), ...mapped] : mapped);
            }
          }
        } catch(e) { /* backend unavailable, keep local state */ }

        // World Cup Cash: an eligible game trades on the EVENT ledger, so this game's balance and
        // positions come from /event/* (the main poll above legitimately sees nothing for it).
        // 404 on /event/balance = not a participant yet → the Buy button becomes Join.
        if (evGameR.current) {
          try {
            const [ebRes, epRes] = await Promise.all([
              fetch(`${API_URL}/event/balance/${userId}`),
              fetch(`${API_URL}/event/positions/${userId}`),
            ]);
            if (ebRes.status === 404) { setWcJoined(false); setWcBalance(null); }
            else if (ebRes.ok) {
              const eb = await ebRes.json();
              setWcJoined(true);
              setWcBalance(eb.balance);
              // The terminal's Balance/Realized readouts must reflect THIS game's ledger.
              setBalance(eb.balance);
              if (eb.closedPnl != null) setClosedPnL(eb.closedPnl);
            }
            if (epRes.ok) {
              const ep = await epRes.json();
              if (Array.isArray(ep.positions)) {
                const mappedE = ep.positions.filter(p => p.gameId === g.id).map(p => ({
                  id: p.id, gameId: p.gameId, side: p.side, size: p.size, margin: p.margin,
                  leverage: p.leverage, exposure: p.size * p.entryPx, entry: p.entryPx,
                  liq: p.liqPrice, tp: p.tp, sl: p.sl, pnl: p.pnl, roe: p.roe, openedAt: p.openedAt,
                  event: true, // rendered with the World Cup Cash context
                }));
                // Vanished-diff against the EVENT ledger (this is the ledger that owns this game):
                // a WC position that disappeared server-side (liq / TP-SL / settlement) goes to
                // the Closed history instead of silently vanishing.
                const liveIdsE = new Set(mappedE.map(p => p.id));
                const vanishedE = posR.current.filter(
                  p => p.gameId === g.id && !liveIdsE.has(p.id) && !closedIdsRef.current.has(p.id)
                );
                if (vanishedE.length) {
                  setClosedPos(pr => [
                    ...vanishedE.map(p => {
                      closedIdsRef.current.add(p.id);
                      const realized = p.pnl ?? 0;
                      const ct = realized <= -(p.margin * 0.9) ? 'LIQ'
                               : (g.status === 'final' || g.status === 'completed') ? 'SETTLED' : 'CLOSED';
                      return { ...p, closedAt: 0, pnl: realized, pnlPct: p.margin>0?realized/p.margin*100:0, closeType: ct };
                    }),
                    ...pr,
                  ]);
                  if (vanishedE.some(p => (p.pnl ?? 0) <= -(p.margin * 0.9))) notify('☠ Position liquidated', 'red');
                }
                setPositions(prev => [...prev.filter(p => p.gameId !== g.id), ...mappedE]);
              }
            }
          } catch (e) { /* event endpoints unavailable — keep local state */ }
        }

        // THIS game's wager tape (all public traders) — powers the Wager Activity tab.
        try {
          const actRes = await fetch(`${API_URL}/activity/game/${g.id}?limit=100`);
          if (actRes.ok) { const ad = await actRes.json(); if (Array.isArray(ad.events)) setActivity(ad.events); }
        } catch (e) { /* keep last known history */ }

        // Reconcile resting limit orders with the backend — a filled or cancelled order drops
        // off here, which clears its green dotted line on the chart + its Pending entry.
        try {
          const ordRes = await fetch(`${API_URL}/orders/${userId}`);
          if (ordRes.ok) {
            const ordData = await ordRes.json();
            if (Array.isArray(ordData.orders)) {
              setLimitOrders(ordData.orders.map(o => {
                // Backend price is home-terms; store the side's own price for display/chart.
                const sidePrice = o.side === 'home' ? o.price : 1 - o.price;
                const cost = o.side === 'home' ? o.price : 1 - o.price; // contract cost = side's price
                return {
                  id: o.oid, gameId: o.gameId, side: o.side, limitPrice: sidePrice,
                  leverage: o.leverage, size: o.size,
                  margin: o.leverage ? +(((o.size * cost) / o.leverage)).toFixed(2) : 0,
                };
              }));
            }
          }
        } catch(e) { /* keep local limit orders if the fetch fails */ }

        // Settlement detection (handles draws → push)
        if ((upd.status==='final'||upd.status==='completed') && !settled) {
          setSettled(true);
          const hs=upd.home.score||0, as=upd.away.score||0;
          if (hs===as) { setSettledWinner('Draw'); notify('Game Final — '+HOME.short+' '+hs+'–'+as+' '+AWAY.short+' (draw, push)', 'info'); }
          else { const homeWins=hs>as; setSettledWinner(homeWins?HOME.name:AWAY.name); notify('Game Final — '+(homeWins?HOME.name:AWAY.name)+' wins', 'green'); }
        }
      } catch(e) {}
    };

    pollRef.current = poll;
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [initGame.id, settled, userId]);

  // Foreground refetch: iOS throttles/pauses timers in background tabs, so on return the odds can
  // be up to a full interval stale (and a dead socket may not have fired onclose yet). Poll
  // immediately when the tab becomes visible again — liveSocket.js handles its own reconnect.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') pollRef.current?.(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // ── session-expired handling: a 401 on any authed call (or a WS subscribe_error) routes here ──
  // Clear the stale session in local state and open the sign-in modal with a clear notice, instead
  // of the request failing silently. handleUnauthorized() (auth.js) has already cleared storage.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAuth(null);
      setSessionExpired(true);
      setShowAuth(true);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  // ── real-time push: instant liquidation + settlement via shared WS ────────
  // Backend broadcasts these from its 5s block loop; without this they'd only
  // surface on the next local poll (up to 5s late, and liquidations were silent).
  useEffect(() => {
    if (initGame._espnKey) return; // ESPN-only games aren't backed by the CLOB
    setLiveUser(userId); // subscribe our id so the backend routes our private liquidations to us
    const unsub = subscribeLive((msg) => {
      // Chat rides with gameId nested in the message; light a dot on the chat icon while the
      // popout is closed (and it's not our own message).
      if (msg.type === 'chat' && msg.message?.gameId === g.id) {
        if (!showChatPopRef.current && msg.message?.userId !== userId) setChatUnread(true);
        return;
      }
      if (msg.gameId !== g.id) return;
      if (msg.type === 'liquidation' && msg.userId === userId) {
        notify('☠ LIQUIDATED — ' + fmtUsd(msg.pnl ?? 0), 'red');
        pollRef.current?.(); // reconcile positions/balance immediately
      } else if (msg.type === 'deleverage' && msg.userId === userId) {
        // House trimmed the position to keep its buffer ≥ the growing late-game swing — the user
        // keeps their margin + realized PnL on the slice. MUST be surfaced (never silent).
        notify(`⚠ POSITION REDUCED — sold ${Math.round(msg.trim)} of ${Math.round(msg.fromSize)} @ ${(msg.execPx * 100).toFixed(1)}¢ to guard against a late-game swing (${fmtUsd(msg.pnl ?? 0)} realized)`, 'yellow');
        pollRef.current?.(); // reconcile size/leverage/balance immediately
      } else if (msg.type === 'settlement') {
        pollRef.current?.(); // poll() detects final state + settles
      }
    });
    return unsub;
  }, [g.id, userId, initGame._espnKey, notify]);

  // ── World Cup Cash: join the championship (idempotent $10k grant on the event ledger) ──
  const joinEvent = useCallback(async () => {
    if (!isLoggedIn()) { onOnboard ? onOnboard() : setShowAuth(true); return; }
    try {
      const res = await fetch(`${API_URL}/event/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: authToken() }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      const d = await res.json();
      if (res.ok && d.joined) {
        setWcJoined(true);
        setWcBalance(d.worldCupCash);
        notify(`🏆 You're in — $${Math.round(d.worldCupCash || 10000).toLocaleString()} World Cup Cash granted`, 'green');
        pollRef.current?.();
      } else {
        // Identity gate (A3): a verification 403 opens the verify flow instead of a dead-end toast.
        if (res.status === 403 && /verify/i.test(d.error || '')) { setShowVerify(true); return; }
        notify(d.error || 'Could not join the championship', 'red');
      }
    } catch (e) { notify('Join failed: ' + e.message, 'red'); }
  }, [userId, notify, onOnboard]);

  // ── placeOrder (backend CLOB) ────────────────────────────────────────────
  const placeOrder = useCallback(async () => {
    if (!isLoggedIn()) { onOnboard ? onOnboard() : setShowAuth(true); return; }  // gate: signup runs the full onboarding flow (falls back to the bare modal)
    if (settled) return;
    // World Cup Cash: eligible games are event-only — the first click joins (grant), then trades.
    if (evGameR.current && wcJoinedR.current === false) { await joinEvent(); return; }
    const op = oR.current;
    // Clamp to BOTH the price-tier cap and the live side-aware cap the slider shows (mlR) — the
    // backend enforces the tighter gap-aware cap, so submitting above it just guarantees a reject.
    const ml2 = maxLev(op), lev = Math.max(1, Math.min(orderLev, ml2, mlR.current || ml2));
    // Margin is capped by the ledger that will actually fund the order: World Cup Cash on an
    // eligible game, the main paper balance everywhere else.
    const margin = Math.min(orderMargin, evGameR.current ? (wcBalR.current ?? 0) : balance);
    if (margin < 10) { notify('Insufficient margin', 'red'); return; }
    if (reduceOnly && !posR.current.some(p => p.gameId===g.id && p.side===orderSide)) { notify('No position to reduce', 'red'); return; }
    const tp = tpCents!==''&&+tpCents>0 ? +tpCents/100 : null;
    const sl = slCents!==''&&+slCents>0 ? +slCents/100 : null;
    const chartNow = chartData.length ? chartData[chartData.length-1].t : 0;

    // Calculate size from margin + leverage: shares = (margin * leverage) / cost-per-share.
    // Cost per share is in the ORDER'S OWN side terms — home pays the home price, away pays
    // (1 − home price). For market that's the oracle price; for limit it's the entered price
    // (limitCents is already in side terms). Using the home price for an away market order
    // under-sized the fill (e.g. away at 38% only committed ~0.61× the intended margin).
    const price = orderType==='limit' ? limitCents/100 : (orderSide==='home' ? op : 1 - op);
    const size = Math.max(1, Math.round((margin * lev) / Math.max(price, 0.01)));

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          userId,
          token: authToken(),
          gameId: g.id,
          side: orderSide,
          // Backend prices are HOME-terms for both sides (home pays limitPx, away pays 1−limitPx),
          // and the oracle-distance check is in home terms — so convert an away limit to home.
          price: orderType==='limit' ? (orderSide==='home' ? limitCents/100 : 1 - limitCents/100) : undefined,
          size,
          // Treat the input margin as the MAX total spend — the backend sizes the fill so
          // margin + spread + fee ≤ this budget (fee comes out of the wager, not extra).
          budget: reduceOnly ? undefined : margin,
          type: orderType,
          leverage: lev,
          tif: orderType==='limit' ? 'GTC' : undefined,
          reduceOnly,
          tp, sl,
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; } // dead/rotated token → prompt re-login
      const result = await res.json();
      if (result.status === 'rejected') {
        if (result.reason === 'leverageRejected') {
          if (typeof result.maxLeverage === 'number') {
            setMarketMaxLev(result.maxLeverage);
            // the rejection's cap is for THIS side — update the per-side cap so the slider corrects
            setMarketMaxLevBySide(b => ({ ...(b || {}), [orderSide]: result.maxLeverage }));
          }
          notify('Max '+(result.maxLeverage||'')+'x leverage at these odds', 'red');
        } else if (result.reason === 'oracleRejected') {
          // Backend rejects limits >25¢ from the oracle (clob.js MAX_ORACLE_DISTANCE).
          const mkt = Math.round((orderSide==='home'?op:1-op)*100);
          notify(`Limit too far from market — must be within 25¢ of ${mkt}¢ (${Math.max(1,mkt-25)}–${Math.min(99,mkt+25)}¢)`, 'red');
        } else {
          notify(REJECT_COPY[result.reason] || 'Order rejected — '+(result.reason||'unknown'), 'red');
        }
        return;
      }
      const tn = orderSide==='home' ? HOME : AWAY;
      if (result.fills?.length > 0) {
        const avgPx = result.fills.reduce((s,f)=>s+f.px*f.size,0) / result.fills.reduce((s,f)=>s+f.size,0);
        // Same-side bet on a game you already hold → it merges into one net position.
        const addingToPos = posR.current.some(p => p.gameId===g.id && p.side===orderSide);
        addMark(chartNow, avgPx, 'entry', orderSide);
        // Jump to Positions after a fill — but stay on Chat if the user is watching it (so the
        // bettors feed stays put and their own bet message just streams in).
        setBottomTab(t => t === 'chat' ? 'chat' : 'positions');
        notify(addingToPos
          ? 'Added to '+tn.name+' — positions merged, liq updated'
          : tn.name+' '+lev+'x @ '+(avgPx*100).toFixed(1)+'¢', orderSide==='home'?'green':'red');
        // Confirm the risk levels that were attached — users setting TP/SL from the mobile sheet
        // otherwise have no feedback that they took.
        if (tp || sl) notify('Risk set: '+[tp&&('TP '+(tp*100).toFixed(0)+'¢'), sl&&('SL '+(sl*100).toFixed(0)+'¢')].filter(Boolean).join(' · '), 'info');
        if (result.points?.total > 0) notify('⚡ +'+result.points.total+' points'+(result.points.streak>0?' · 🔥 '+result.points.streakCount+'-day streak':''), 'info');
        // WC surface: a fresh position pops the shareable card — the competition's viral loop.
        // Merges/reduces skip it (repeat traders would see it constantly).
        if (worldcup && !reduceOnly && !addingToPos) {
          setTradeCard({ type:'open', side:orderSide, teamName:tn.name, teamLogo:orderSide==='home'?HOME.logoUrl:AWAY.logoUrl,
            teamColor:orderSide==='home'?HOME.light:AWAY.light, entryPx:avgPx, leverage:lev,
            gameInfo:HOME.short+' vs '+AWAY.short, gameStatus:periodLabel(g.league, g.period, g.clock, g.statusDetail) });
        }
        pollRef.current?.(); // reconcile immediately so the new position shows now, not in ≤5s
      } else if (result.status === 'resting') {
        // Track it immediately (green dotted line on the chart + Pending entry); the poll
        // reconciles against the backend and removes it once it fills or is cancelled.
        if (result.oid != null) setLimitOrders(p => [...p.filter(l => l.id !== result.oid), { id: result.oid, gameId: g.id, side: orderSide, limitPrice: limitCents/100, leverage: lev, margin, size }]);
        notify('Limit '+tn.name+' @ '+limitCents+'¢ — resting', 'info');
      }
    } catch(e) {
      notify('Order failed: '+e.message, 'red');
    }
  }, [oPrice, orderSide, orderMargin, orderLev, balance, settled, orderType, limitCents, tpCents, slCents, reduceOnly, chartData, HOME, AWAY, notify, addMark, userId, g.id, joinEvent]);

  // Cancel a resting limit order on the backend (DELETE), then drop it locally so its green
  // dotted chart line + Pending entry clear immediately (the poll reconcile confirms it).
  const cancelLimitOrder = useCallback(async (lo) => {
    setLimitOrders(p => p.filter(l => l.id !== lo.id));   // optimistic
    try {
      const res = await fetch(`${API_URL}/orders/${lo.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      notify(res.ok ? 'Order cancelled' : 'Cancel failed — will retry on next sync', res.ok ? 'info' : 'red');
    } catch (e) {
      notify('Cancel failed: ' + e.message, 'red');
    }
    pollRef.current?.();
  }, [userId, notify]);

  // Set / update / clear TP & SL on an existing position. tpC/slC are the side's price in cents
  // ('' or 0 → clear that one). Optimistically updates local state, then persists to the backend.
  const setPositionTriggers = useCallback(async (pos, tpC, slC) => {
    const tp = tpC !== '' && +tpC > 0 ? +tpC / 100 : null;
    const sl = slC !== '' && +slC > 0 ? +slC / 100 : null;
    setPositions(ps => ps.map(p => p.id === pos.id ? { ...p, tp, sl } : p));
    setTpslEdit(null);
    try {
      const res = await fetch(`${API_URL}/positions/triggers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, gameId: pos.gameId, tp, sl }),
      });
      const tm = pos.side === 'home' ? HOME : AWAY;
      if (res.ok) notify(`TP/SL updated for ${tm.short}${tp?` · TP ${Math.round(tp*100)}¢`:''}${sl?` · SL ${Math.round(sl*100)}¢`:''}${!tp&&!sl?' · cleared':''}`, 'info');
      else notify('Could not update TP/SL', 'red');
    } catch (e) { notify('TP/SL update failed: ' + e.message, 'red'); }
    pollRef.current?.();
  }, [userId, notify, HOME, AWAY]);

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
          token: authToken(),          // required now that orders are auth-gated for logged-in accounts
          gameId: pos.gameId || g.id,
          side: closeSide,
          size: pos.size,
          type: 'market',
          leverage: pos.leverage,
          reduceOnly: true,            // market reduce-only: closes immediately, overriding any TP/SL
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
        if (pos.id) closedIdsRef.current.add(pos.id); // dedupe vs poll-diff history
        setClosedPos(pr => [{...pos, closedAt: chartNow, exitPx: avgPx, pnl, pnlPct, closeType: 'CLOSED'}, ...pr]);
        setClosedPnL(p => p + pnl);
        setTradeCard({ type:'close', side:pos.side, teamName:tn.name, teamLogo:pos.side==='home'?HOME.logoUrl:AWAY.logoUrl, teamColor:pos.side==='home'?HOME.light:AWAY.light, entryPx, exitPx:avgPx, leverage:pos.leverage, pnl, pnlPct, gameInfo:HOME.short+' vs '+AWAY.short, gameStatus:periodLabel(g.league, g.period, g.clock, g.statusDetail) });
      } else if (result.status === 'rejected') {
        notify('Close rejected: '+(result.reason||''), 'red');
      } else if (result.error) {
        notify('Close failed: '+result.error, 'red');
      }
    } catch(e) {
      notify('Close failed: '+e.message, 'red');
    }
  }, [chartData, HOME, AWAY, notify, addMark, userId, g.id]);

  // ── derived ─────────────────────────────────────────────────────────────
  // Positions for THE CURRENT GAME only — the terminal shows one game at a time, so the
  // chart/panel/liq-lines must be scoped to g.id. (Account totals below stay global.)
  const gamePositions = useMemo(() => positions.filter(p => p.gameId === g.id), [positions, g.id]);
  const gameClosed = useMemo(() => closedPos.filter(c => c.gameId === g.id), [closedPos, g.id]);
  // Account-wide unrealized PnL: trust each position's server pnl; only the current game
  // can be re-priced live with oPrice — other games without a server pnl contribute 0.
  const totalUPnL = positions.reduce((s,p) => s + (p.pnl != null ? p.pnl : (p.gameId===g.id ? calcPnL(p.side,p.exposure||0,p.entry,oPrice) : 0)), 0);
  const totalEq   = balance + positions.reduce((s,p)=>s+p.margin,0) + totalUPnL;
  // Side-aware gap cap: a favorite keeps more leverage than the underdog in the same game.
  const sideCap = marketMaxLevBySide ? marketMaxLevBySide[orderSide] : marketMaxLev;
  const ml  = sideCap != null ? Math.min(maxLev(oPrice), sideCap) : maxLev(oPrice);
  mlR.current = ml; // keep the submit path on the same cap the slider displays
  // The funding ledger for THIS game: World Cup Cash on an eligible event game, else main balance.
  const ledgerBal = isEventGame ? (wcBalance ?? 0) : balance;
  // On an eligible game before joining, the Buy button IS the Join CTA — it must stay clickable
  // even though the (not-yet-granted) WC balance is 0.
  const joinNeeded = isEventGame && wcJoined === false;
  const eL = Math.min(orderLev,ml), eM = Math.min(orderMargin,ledgerBal);
  // If the cap drops below the chosen leverage (late-game tightening, side switch), pull the REAL
  // state down too — otherwise the stepper reads the clamped display (e.g. "1x", − disabled) while
  // the stale higher value keeps getting submitted and rejected, hard-sticking the user.
  useEffect(() => { if (orderLev > ml) setOrderLev(ml); }, [ml, orderLev]);
  const team = orderSide==='home' ? HOME : AWAY;
  // Event (WC) games run MM=0 — the estimated liq is the BANKRUPTCY price (full buffer), not
  // the main ledger's half-margin maintenance trigger.
  const expo = eM*eL, liqP = liqPrice(orderSide, oPrice, eL, isEventGame ? 0 : undefined);
  // Liquidation info for the leverage control's card, in the ORDER'S OWN side scale.
  const liqSideShown = orderSide==='home' ? liqP : 1-liqP;
  const liqPtsAway = Math.abs((orderSide==='home' ? oPrice : 1-oPrice) - liqSideShown) * 100;
  const levLiq = { pct: liqSideShown*100, pts: liqPtsAway };
  const entryP = orderSide==='home' ? oPrice : 1-oPrice;
  const shareCount = Math.max(1, Math.round(expo/entryP));
  const awayProb = 1 - oPrice;
  const momentum = chartData.length>20 ? oPrice - chartData[chartData.length-20].ph : 0;
  // Real market stats from backend (updated in poll loop via marketStats state)
  const [marketStats, setMarketStats] = useState({volume:0,oi:0,funding:0,trades:0});
  const simVol = marketStats.volume || Math.floor(9200 + chartData.length*60 + positions.reduce((s,p)=>s+(p.exposure||0),0));
  const simOI  = marketStats.oi || positions.reduce((s,p)=>s+(p.exposure||0),0) + Math.floor(chartData.length*40);
  const fundingRate = marketStats.funding ? marketStats.funding.toFixed(3) : ((oPrice-0.5)*0.08).toFixed(3);

  // X axis reflects game time, formatted per sport (soccer minutes, baseball innings).
  const isSoccer = g.league === 'mls' || g.league === 'wcup';
  const isBaseball = g.league === 'mlb';
  const curInning = Math.max(1, g.period || 1);

  // merged chart data with markers
  const merged = useMemo(() => {
    let data = chartData.filter(d => d.t != null).map(d => ({...d}));
    // Once the game has started, hide pregame-seed points (t<0 = before kickoff) so the
    // chart is pure game time. Pregame (not-yet-started) games keep their pre-kickoff line.
    const started = data.some(d => d.t >= 0);
    if (started) data = data.filter(d => d.t >= 0);
    // Resample onto a UNIFORM time grid so the x-axis is perfectly even. lightweight-charts
    // spaces points by index, so without this the dense live tail (~1pt/5s) and the sparse
    // seeded early game produce uneven spacing. We emit one point per equal time step across
    // [t0, tN], linearly interpolating the win prob — so point index ∝ game time exactly.
    if (data.length > 2 && data[data.length-1].t > data[0].t) {
      const t0 = data[0].t, tN = data[data.length-1].t;
      const n = Math.min(600, Math.max(8, Math.round((tN - t0) / 0.5))); // ~1 step / 30s, capped
      const grid = []; let j = 0;
      for (let i = 0; i <= n; i++) {
        const bt = t0 + (tN - t0) * (i / n);
        while (j + 1 < data.length && data[j + 1].t <= bt) j++;
        let ph = data[j].ph;
        if (j + 1 < data.length && data[j + 1].t > data[j].t) {
          const fr = Math.max(0, Math.min(1, (bt - data[j].t) / (data[j + 1].t - data[j].t)));
          ph = data[j].ph + fr * (data[j + 1].ph - data[j].ph);
        }
        grid.push({ t: +bt.toFixed(4), ph, pa: 1 - ph, mp: ph, mh_val: null, mh_marker: null, ma_val: null, ma_marker: null });
      }
      data = grid;
    }
    for (const m of markers) {
      let best = 0;
      for (let i=1; i<data.length; i++) if (Math.abs(data[i].t-m.t)<Math.abs(data[best].t-m.t)) best=i;
      if (data[best]) {
        if (m.line==='away') { data[best].ma_val=1-m.p; data[best].ma_marker=m.markerType; }
        else                 { data[best].mh_val=m.p;   data[best].mh_marker=m.markerType; }
      }
    }
    // Baseball: remap X into inning units (1 → current inning) so the chart always runs
    // from the 1st inning, regardless of when the oracle's history actually begins.
    if (isBaseball && started && data.length > 1) {
      const f = data[0].t, span = Math.max(0.0001, data[data.length-1].t - f);
      const range = Math.max(1, curInning - 1); // map first→1st, last→current inning
      data = data.map(d => ({ ...d, t: +(1 + ((d.t - f) / span) * range).toFixed(3) }));
    }
    // Aesthetic: open at 50/50 (just before the first tick) and diverge to the live odds.
    if (data.length) {
      const f = data[0];
      data.unshift({ t:+(f.t-0.5).toFixed(3), ph:0.5, pa:0.5, mp:0.5, floor:0.3, ceil:0.7,
        mh_val:null, mh_marker:null, ma_val:null, ma_marker:null });
    }
    return data;
  }, [chartData, markers, isBaseball, curInning]);

  // TradingView chart (lightweight-charts) handle + quick-window selection. Pan/zoom is
  // native in the chart; these just drive the preset buttons.
  const tvRef = useRef(null);
  const [chartWin, setChartWin] = useState(null);   // null = All (fit full game)
  // Per-sport X label: soccer minutes, baseball innings, else minutes.
  const ordinal = n => n + (n===1?'st':n===2?'nd':n===3?'rd':'th');
  const xFmt = useCallback((v) => {
    if (isBaseball) return v < 0.5 ? '' : ordinal(Math.round(v));   // v is inning number
    if (v < -0.01) return '';
    if (isSoccer) return Math.max(0, Math.round(v)) + "'";
    return Math.max(0, Math.round(v)) + 'm';
  }, [isSoccer, isBaseball]);

  // Evenly-spaced x-axis ticks (one per inning / per nice minute step) — rendered by TvChart
  // as our own axis so labels never repeat or skew. `t` values match `merged`'s scale.
  const xTicks = useMemo(() => {
    if (!merged.length) return [];
    let lo = Infinity, hi = -Infinity;
    for (const d of merged) { if (d.t < lo) lo = d.t; if (d.t > hi) hi = d.t; }
    const out = [];
    if (isBaseball) {
      const maxInn = Math.max(1, Math.round(hi));      // merged remaps last point → current inning
      const step = maxInn > 9 ? 2 : 1;
      for (let n = 1; n <= maxInn; n += step) out.push({ t: n, label: ordinal(n) });
    } else {
      const span = Math.max(1, hi - Math.max(0, lo));
      const rawStep = span / 5;
      const nice = [2, 5, 10, 15, 20, 30, 45, 60].find(s => s >= rawStep) || 60;
      const start = Math.max(nice, Math.ceil(Math.max(0, lo) / nice) * nice);
      for (let m = start; m <= hi + 0.001; m += nice) out.push({ t: m, label: isSoccer ? Math.round(m) + "'" : Math.round(m) + "m" });
    }
    return out;
  }, [merged, isBaseball, isSoccer]);

  const liqLines = useMemo(() => gamePositions.map(pos => ({
    id:pos.id, side:pos.side, liqOnChart: pos.side==='home' ? pos.liq : 1-pos.liq,
    liqPriceCents: (pos.liq*100).toFixed(1),
  })), [gamePositions]);

  // Open-position entry → green dotted "Entry Price" line on the chart (home-prob axis).
  const entryLines = useMemo(() => gamePositions.filter(p=>p.entry!=null).map(pos => ({
    id:pos.id, entryOnChart: pos.side==='home' ? pos.entry : 1-pos.entry,
  })), [gamePositions]);

  // TP/SL levels → dotted lines (TP blue, SL yellow). tp/sl are stored in the position's own
  // side scale, so convert away-side levels to home-prob terms (same as liq/entry).
  const tpLines = useMemo(() => gamePositions.filter(p=>p.tp!=null).map(pos => ({
    id:pos.id, priceOnChart: pos.side==='home' ? pos.tp : 1-pos.tp,
  })), [gamePositions]);
  const slLines = useMemo(() => gamePositions.filter(p=>p.sl!=null).map(pos => ({
    id:pos.id, priceOnChart: pos.side==='home' ? pos.sl : 1-pos.sl,
  })), [gamePositions]);

  // Raw scoring plays from the play log, with the scoring side + raw game-time. Side comes
  // from the play's teamId (the team that scored) — robust regardless of play-log ordering —
  // with a score-delta fallback when teamId is missing.
  const homeId = initGame.home?.id, awayId = initGame.away?.id;
  const rawScoringPlays = useMemo(() => {
    const ordered = [...playLog].reverse(); // playLog is newest-first; replay oldest→newest
    let prevH = 0, prevA = 0;
    const out = [];
    for (const p of ordered) {
      const hs = p.homeScore || 0, as = p.awayScore || 0;
      if (p.scoringPlay) {
        let side = null;
        if (p.teamId != null && homeId != null && String(p.teamId) === String(homeId)) side = 'home';
        else if (p.teamId != null && awayId != null && String(p.teamId) === String(awayId)) side = 'away';
        else side = hs > prevH ? 'home' : as > prevA ? 'away' : 'home';
        const wc = p.wallclock ? Date.parse(p.wallclock) : null;
        const t = wc != null ? gameMinSince(initGame.startTime, wc) : null;
        if (t != null) out.push({ id: p.id, t, side, label: p.scoreValue > 0 ? '+' + p.scoreValue : '●' });
      }
      prevH = hs; prevA = as;
    }
    return out;
  }, [playLog, initGame.startTime, homeId, awayId]);

  // Position each scoring play on the chart: anchor Y to the scoring team's line (nearest
  // raw point's probability) and remap X through the SAME baseball-inning transform `merged`
  // applies, so a Parabolic-logo dot lands on the right spot for every sport. Its own list
  // (not one-per-point) so simultaneous/adjacent scores never overwrite each other.
  const scoreMarks = useMemo(() => {
    let data = chartData.filter(d => d.t != null);
    const started = data.some(d => d.t >= 0);
    if (started) data = data.filter(d => d.t >= 0);
    if (!data.length) return [];
    let remap = (t) => t;
    if (isBaseball && started && data.length > 1) {
      const f = data[0].t, span = Math.max(0.0001, data[data.length - 1].t - f), range = Math.max(1, curInning - 1);
      remap = (t) => +(1 + ((t - f) / span) * range).toFixed(3);
    }
    const out = rawScoringPlays.map(sp => {
      let bp = null, bd = Infinity;
      for (const d of data) { const dd = Math.abs(d.t - sp.t); if (dd < bd) { bd = dd; bp = d; } }
      if (!bp) return null;
      const price = sp.side === 'away' ? (bp.pa != null ? bp.pa : 1 - bp.ph) : bp.ph;
      return { t: remap(sp.t), price, side: sp.side, label: sp.label };
    }).filter(Boolean);
    return out;
  }, [rawScoringPlays, chartData, isBaseball, curInning]);

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{background:'#0a0a0a', fontFamily:fb, minHeight:'100vh', color:'#fff'}}>

      {/* Trading-action notifications now live in a persistent tray at the bottom of the wager panel (see NotifTray). */}

      {/* HEADER — left corner: back+logo, center: tabs, right corner: live+deposit+profile */}
      <div style={{padding:isMobile?'0 10px':'0 24px',height:56,display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',borderBottom:'1px solid #1a1a1a',background:'#0a0a0a',position:'sticky',top:0,zIndex:20}}>
        {/* LEFT — back arrow + pd emblem + wordmark */}
        <div style={{display:'flex',alignItems:'center',gap:isMobile?8:16,justifySelf:'start'}}>
          <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'#666',display:'flex',alignItems:'center',gap:4,fontSize:13,fontWeight:600,fontFamily:fb,padding:0}}>
            <span style={{fontSize:18,lineHeight:1}}>‹</span>
          </button>
          <button aria-label="Home" onClick={()=>onNavTo?onNavTo('home'):onBack&&onBack()} style={{display:'flex',alignItems:'center',background:'none',border:'none',cursor:'pointer',padding:0}}>
            {isMobile
              ? <img src={LOGO_NAV} style={{height:28,width:'auto'}} alt="Parabolic"/>
              : <img src={LOGO_WORDMARK} style={{height:30,width:'auto'}} alt="Parabolic"/>}
          </button>
        </div>
        {/* CENTER — sport tabs (hidden on the World Cup surface: single-sport event) */}
        {worldcup ? <div /> : <div className="mob-nav" style={{display:'flex',gap:isMobile?2:4,background:'#111',borderRadius:10,padding:3,overflowX:'auto',justifySelf:'center',maxWidth:'100%',minWidth:0,marginLeft:isMobile?8:24,marginRight:isMobile?8:24}}>
          {[['home','Home',sportCounts.live],['basketball','Basketball',sportCounts.nba],['nfl','Football',sportCounts.nfl],['baseball','Baseball',sportCounts.mlb],['soccer','Soccer',sportCounts.soccer],['hockey','Hockey',sportCounts.nhl],['mma','MMA',null],['leaderboard','Leaderboard',null]].map(([tab,label,cnt])=>(
            <button key={tab} onClick={()=>onNavTo?onNavTo(tab):onBack&&onBack()} style={{padding:'6px 14px',fontSize:12,fontWeight:400,border:'none',cursor:'pointer',fontFamily:fb,borderRadius:8,background:'transparent',color:'#666'}}>
              {tab==='home'
                ? <span style={{display:'flex',alignItems:'center',gap:5}}>
                    {sportCounts.live>0&&<span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',display:'inline-block',animation:'pulse 1.5s infinite',flexShrink:0}}/>}
                    Home
                  </span>
                : label}
              {cnt>0&&<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>({cnt})</span>}
            </button>
          ))}
        </div>}
        {/* RIGHT — market actions (chat/bookmark/share) + live indicator + balance + deposit + profile */}
        <div style={{display:'flex',alignItems:'center',gap:10,justifySelf:'end'}}>
          {!isMobile && <div style={{display:'flex',alignItems:'center',gap:4,marginRight:2}}>
            <button onClick={()=>{ setShowChatPop(v=>!v); setChatUnread(false); }} title="Live chat" style={{position:'relative',width:34,height:34,borderRadius:'50%',border:'none',background:showChatPop?'#22252b':'#17191d',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MessageCircle size={17} color={showChatPop?'#fff':'#9aa0a8'}/>
              {chatUnread && <span style={{position:'absolute',top:5,right:5,width:8,height:8,borderRadius:'50%',background:'#ff5b3a',border:'1.5px solid #0a0a0a'}}/>}
            </button>
            {!worldcup && <button onClick={toggleBookmark} title={bookmarked?'Remove bookmark':'Bookmark this market'} style={{width:34,height:34,borderRadius:'50%',border:'none',background:'#17191d',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bookmark size={17} color={bookmarked?B.primary:'#9aa0a8'} fill={bookmarked?B.primary:'none'}/>
            </button>}
            {!worldcup && <button onClick={shareMarket} title="Share this market" style={{width:34,height:34,borderRadius:'50%',border:'none',background:'#17191d',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Share2 size={16} color='#9aa0a8'/>
            </button>}
          </div>}
          {!isMobile&&<span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,color:B.green,padding:'4px 10px',background:B.green+'12',borderRadius:8,fontFamily:fm,letterSpacing:'0.06em'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:B.green,animation:'pulse 1.5s infinite'}}/>
            LIVE
          </span>}
          <div style={{padding:isMobile?'6px 10px':'6px 14px',borderRadius:10,background:isEventGame?B.primary+'14':'#111',border:`1px solid ${isEventGame?B.primary+'44':'#1f1f1f'}`,textAlign:'right'}}>
            {!isMobile && <div style={{fontSize:8.5,color:isEventGame?B.primary:'#555',fontWeight:700,letterSpacing:'0.08em',fontFamily:fm,lineHeight:1.2}}>{isEventGame?'🏆 WORLD CUP CASH':'BALANCE'}</div>}
            <div style={{fontSize:isMobile?12:13,fontWeight:800,color:'#fff',fontFamily:fm,lineHeight:1.2}}>
              {isEventGame
                ? (wcJoined ? '$'+(wcBalance ?? 0).toLocaleString(undefined,{minimumFractionDigits:isMobile?0:2,maximumFractionDigits:isMobile?0:2}) : (isMobile?'🏆 Join':'Join to get $10,000'))
                : '$'+balance.toLocaleString(undefined,{minimumFractionDigits:isMobile?0:2,maximumFractionDigits:isMobile?0:2})}
            </div>
          </div>
          <button onClick={()=>setShowDeposit(true)} style={{padding:'8px 20px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#1fd182,#1fd182)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:fb}}>Deposit</button>
          <div onClick={()=>setShowProfile(true)} style={{width:32,height:32,borderRadius:'50%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,overflow:'hidden'}}>
            {cardAvatar ? <AvatarCircle avatar={cardAvatar} size={32}/> : '👤'}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:'flex',height:isMobile?'auto':'calc(100vh - 56px)',flexDirection:isMobile?'column':'row',minHeight:isMobile?'calc(100vh - 56px)':'auto'}}>
        {!isMobile && <NavRail active={null} onNav={(tab)=>onNavTo?.(tab)} liveGames={liveGames} onTrade={onTrade} hide={worldcup ? ["bookmarks"] : []}/>}

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

          {/* Other markets — split into Pregame + Live */}
          {(sidebarPregame.length > 0 || sidebarLive.length > 0) && (
            <div style={{padding:'0 16px'}}>
              {[
                { label: 'LIVE', games: sidebarLive, color: B.green, pre: false },
                { label: 'PREGAME', games: sidebarPregame, color: B.primaryLight, pre: true },
              ].filter(s => s.games.length > 0).map(section => (
                <div key={section.label} style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:'#555',fontWeight:700,letterSpacing:'0.08em',fontFamily:fm,marginBottom:8}}>{section.label} ({section.games.length})</div>
                  {section.games.map(lg=>(
                    <div key={lg.id} onClick={()=>onTrade&&onTrade(lg)}
                      style={{padding:'10px 12px',marginBottom:6,background:'#111',borderRadius:10,border:'1px solid #1f1f1f',fontSize:11,fontFamily:fm,cursor:onTrade?'pointer':'default'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{color:'#fff',fontWeight:600}}>{lg._emoji?lg._emoji+' ':''}{lg.home.abbreviation||lg.home.name?.slice(0,3).toUpperCase()||'HOME'} <span style={{color:'#555'}}>vs</span> {lg.away.abbreviation||lg.away.name?.slice(0,3).toUpperCase()||'AWAY'}</span>
                        <span style={{color:section.color,fontSize:10}}>{section.pre?(startsInLabel(lg.startTime)||'PREGAME'):(periodLabel(lg.league||lg._sport, lg.period, lg.clock, lg.statusDetail)||'LIVE')}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{color:'#888'}}>{section.pre?'':((lg.home.score??0)+' – '+(lg.away.score??0))}</span>
                        {lg.oracle?.indexPrice && <span style={{color:B.primary,fontWeight:700}}>{(lg.oracle.indexPrice*100).toFixed(0)}%</span>}
                      </div>
                      {onTrade&&<div style={{marginTop:3,fontSize:9,color:'#444',textAlign:'right'}}>{section.pre?'Trade Pre-Game →':'Trade →'}</div>}
                    </div>
                  ))}
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
                      color:g.status==='final'?'#4ade80':g.status==='halftime'?'#ff9f1c':g.status==='scheduled'?B.primaryLight:B.green}}>
                      {g.status==='final'?'Final':g.status==='halftime'?'Half':g.status==='scheduled'?startsInLabel(g.startTime):g.period?periodLabel(g.league, g.period, g.clock, g.statusDetail):g.statusDetail||'Live'}
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
                      background:g.status==='final'?'#22c55e18':g.status==='halftime'?'#ff9f1c18':g.status==='scheduled'?B.primary+'18':'#1a1a1a',
                      color:g.status==='final'?'#4ade80':g.status==='halftime'?'#ff9f1c':g.status==='scheduled'?B.primaryLight:B.green}}>
                      {g.status==='final'?'Final':g.status==='halftime'?'Halftime':g.status==='scheduled'?startsInLabel(g.startTime):g.period?periodLabel(g.league, g.period, g.clock, g.statusDetail):g.statusDetail||'Live'}
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

          {/* Knockout settlement rule — the #1 soccer-rules question: what happens at full time? */}
          {worldcup&&g.status!=='final'&&(
            <div style={{margin:isMobile?'0 12px 8px':'0 24px 8px',textAlign:'center',fontSize:isMobile?10.5:11.5,color:'#556',fontFamily:fb,lineHeight:1.5}}>
              Knockout market: settles when the tie is decided — extra time and penalties count.
              The team that advances settles at 100%.
            </div>
          )}

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
            <div style={{padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #1f1f1f',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:13,fontWeight:600,color:'#888'}}>Win Probability</span>
                <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:B.green,display:'inline-block'}}/>
                  <span style={{color:B.green,fontWeight:700,fontFamily:fm}}>{(oPrice*100).toFixed(1)}%</span>
                  <span style={{color:'#666'}}>{HOME.short}</span>
                </span>
                <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}>
                  <span style={{width:12,height:3,borderRadius:2,background:B.red,display:'inline-block'}}/>
                  <span style={{color:B.red,fontWeight:700,fontFamily:fm}}>{(awayProb*100).toFixed(1)}%</span>
                  <span style={{color:'#666'}}>{AWAY.short}</span>
                </span>
              </div>
              {/* Zoom controls — quick windows; scroll-wheel + drag zoom natively (TradingView) */}
              <div style={{display:'flex',gap:2,background:'#0a0a0a',borderRadius:8,padding:2,border:'1px solid #1a1a1a'}}>
                {[['5m',5],['15m',15],['1H',60],['All',null]].map(([label,val])=>{
                  const active = chartWin===val;
                  return (
                  <button key={label} onClick={()=>{setChartWin(val); if(val==null)tvRef.current?.fitContent(); else tvRef.current?.setWindow(val);}} style={{padding:'3px 10px',fontSize:11,fontWeight:active?700:500,border:'none',cursor:'pointer',borderRadius:6,fontFamily:fm,
                    background:active?B.primary+'22':'transparent',color:active?B.primaryLight:'#666'}}>{label}</button>
                  );
                })}
              </div>
            </div>
            <div style={{height:240,padding:'4px 8px 0'}}>
              {merged.length > 1 ? (
                <TvChart key={g.id} ref={tvRef} data={merged} oPrice={oPrice} liqLines={liqLines} limitOrders={limitOrders.filter(l=>l.gameId===g.id)} entryLines={entryLines} tpLines={tpLines} slLines={slLines} scoringPlays={scoreMarks} xTicks={xTicks} homeLabel={HOME.short} awayLabel={AWAY.short} xFmt={xFmt} height={236}/>
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
                {/* Blended composite index (what the market actually trades around) */}
                <span style={{fontSize:9,display:'flex',alignItems:'center',gap:3}}>
                  <span style={{color:B.green,fontWeight:800,fontFamily:fm}}>{HOME.short} {(oPrice*100).toFixed(1)}%</span>
                  <span style={{color:'#444'}}>·</span>
                  <span style={{color:B.red,fontWeight:800,fontFamily:fm}}>{AWAY.short} {((1-oPrice)*100).toFixed(1)}%</span>
                </span>
                {oSrcs.length>0 && <span style={{fontSize:9,color:'#2a2a2a'}}>|</span>}
                {oSrcs.map(s=>{const hp=(s.price??s.v??0);return(
                  <span key={s.name} style={{fontSize:9,color:'#666',display:'flex',alignItems:'center',gap:3}}>
                    <span style={{width:3,height:3,borderRadius:2,background:B.primary,display:'inline-block'}}/>
                    {SOURCE_LABEL[s.name]||s.name}{' '}
                    <span style={{color:B.green,fontWeight:700}}>{HOME.short} {(hp*100).toFixed(0)}%</span>
                    <span style={{color:'#444'}}>·</span>
                    <span style={{color:B.red,fontWeight:700}}>{AWAY.short} {((1-hp)*100).toFixed(0)}%</span>
                  </span>
                );})}
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
              {positions.length===0&&gameClosed.length===0 ? (
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{fontSize:13,color:'#555'}}>{settled?'Game settled':'No open positions yet'}</div>
                  {isMobile&&!settled&&(
                    <button onClick={()=>setShowWager(true)} style={{marginTop:14,padding:'13px 44px',borderRadius:12,border:'none',background:B.primary,color:'#000',fontFamily:fb,fontWeight:800,fontSize:14,cursor:'pointer'}}>
                      ⚡ Trade
                    </button>
                  )}
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {positions.map(pos=>{
                    // Resolve each position's own game so we can show all positions across all games.
                    const isCur=pos.gameId===g.id;
                    const pg=isCur?g:liveGames.find(lg=>lg.id===pos.gameId);
                    const ph=pg?.home, pa=pg?.away;
                    const homeName=ph?.name||(isCur?HOME.name:'Home');
                    const awayName=pa?.name||(isCur?AWAY.name:'Away');
                    const homeShort=ph?.abbreviation||homeName.slice(0,3).toUpperCase();
                    const awayShort=pa?.abbreviation||awayName.slice(0,3).toUpperCase();
                    const teamName=pos.side==='home'?homeName:awayName;
                    const sideColor=pos.side==='home'?B.green:B.red;      // accent by side (team colors can be invisible)
                    const gOracle=isCur?oPrice:(pg?.oracle?.indexPrice ?? pos.entry);
                    const pnl=pos.pnl!=null?pos.pnl:calcPnL(pos.side,pos.exposure||0,pos.entry,gOracle);
                    const pnlPct=pos.margin>0?(pnl/pos.margin)*100:0;
                    const markP=pos.side==='home'?gOracle:1-gOracle;
                    const posEntryP=pos.side==='home'?pos.entry:1-pos.entry;
                    const posShares=pos.size||Math.round((pos.exposure||0)/Math.max(pos.entry,0.01));
                    const canSwitch=!isCur&&!!pg&&!!onTrade;
                    return (
                      <div key={pos.id} onClick={canSwitch?()=>onTrade(pg):undefined}
                        title={canSwitch?`View ${homeShort} vs ${awayShort}`:undefined}
                        style={{borderRadius:12,border:'1px solid '+(isCur?'#1f1f1f':'#262626'),overflow:'hidden',background:'#0a0a0a',cursor:canSwitch?'pointer':'default'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderLeft:'3px solid '+sideColor}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{teamName}</span>
                            <span style={{fontSize:10,fontWeight:700,color:B.primary,background:B.primary+'15',padding:'2px 6px',borderRadius:5,fontFamily:fm}}>{pos.leverage}x</span>
                            {pos.tp&&<span style={{fontSize:10,color:B.green,fontFamily:fm,background:B.green+'10',padding:'2px 5px',borderRadius:4}}>TP {Math.round(pos.tp*100)}¢</span>}
                            {pos.sl&&<span style={{fontSize:10,color:B.red,fontFamily:fm,background:B.red+'10',padding:'2px 5px',borderRadius:4}}>SL {Math.round(pos.sl*100)}¢</span>}
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:16,fontWeight:800,color:pctClr(pnl),fontFamily:fm}}>{fmtUsd(pnl)}</div>
                            <div style={{fontSize:11,color:pctClr(pnl),fontFamily:fm}}>{fmtPct(pnlPct)}</div>
                          </div>
                        </div>
                        {/* game label — which matchup this position belongs to (click to pull it up) */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px 6px'}}>
                          <span style={{fontSize:10,color:'#666',fontFamily:fm}}>{homeShort} <span style={{color:'#444'}}>vs</span> {awayShort}{isCur&&<span style={{color:B.primary,marginLeft:6}}>• viewing</span>}</span>
                          {canSwitch&&<span style={{fontSize:10,color:B.primary,fontWeight:700}}>View →</span>}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'8px 14px',borderTop:'1px solid #1a1a1a'}}>
                          {[['Avg entry',(posEntryP*100).toFixed(1)+'¢','#888'],['Mark',(markP*100).toFixed(1)+'¢',B.primaryLight],['Liq',(pos.liq!=null?(pos.side==='home'?pos.liq:1-pos.liq)*100|0:'-')+'¢',B.red],['Size',pos.size?pos.size+' shr':fmtUsd(pos.exposure||0),'#888']].map(([label,value,color])=>(
                            <div key={label} style={{textAlign:'center'}}>
                              <div style={{fontSize:10,color:'#444',marginBottom:2}}>{label}</div>
                              <div style={{fontSize:12,fontWeight:700,fontFamily:fm,color}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{padding:'8px 14px',borderTop:'1px solid #1a1a1a',display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:11,color:'#555',flex:1,fontFamily:fm}}>{posShares.toLocaleString()} shares · margin {fmtUsd(pos.margin)}</span>
                          <button onClick={(e)=>{e.stopPropagation();setTpslEdit(cur=>cur&&cur.id===pos.id?null:{id:pos.id,tp:pos.tp?String(Math.round(pos.tp*100)):'',sl:pos.sl?String(Math.round(pos.sl*100)):''});}}
                            style={{padding:'5px 12px',background:tpslEdit?.id===pos.id?B.primary+'25':'#1a1a1a',border:'1px solid '+(tpslEdit?.id===pos.id?B.primary+'50':'#2a2a2a'),borderRadius:8,cursor:'pointer',color:tpslEdit?.id===pos.id?B.primaryLight:'#aaa',fontWeight:700,fontSize:11,fontFamily:fb}}>TP/SL</button>
                          <button onClick={(e)=>{e.stopPropagation();closePosition(pos);}} style={{padding:'5px 14px',background:'#ef444415',border:'1px solid #ef444430',borderRadius:8,cursor:'pointer',color:'#ef4444',fontWeight:700,fontSize:11,fontFamily:fb}}>Close</button>
                        </div>
                        {/* Inline TP/SL editor — set/clear take-profit & stop-loss on this position (side-scale ¢) */}
                        {tpslEdit?.id===pos.id&&(
                          <div onClick={(e)=>e.stopPropagation()} style={{padding:'10px 14px',borderTop:'1px solid #1a1a1a',background:'#0c0c0c'}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                              <div>
                                <div style={{fontSize:9,color:B.green,fontWeight:600,marginBottom:3}}>Take Profit ¢</div>
                                <input type="number" inputMode="decimal" min={1} max={99} value={tpslEdit.tp} placeholder="—" onChange={e=>setTpslEdit(c=>({...c,tp:e.target.value}))}
                                  style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.green+'22',borderRadius:7,padding:'6px 8px',color:B.green,fontSize:isMobile?16:12,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                              </div>
                              <div>
                                <div style={{fontSize:9,color:B.red,fontWeight:600,marginBottom:3}}>Stop Loss ¢</div>
                                <input type="number" inputMode="decimal" min={1} max={99} value={tpslEdit.sl} placeholder="—" onChange={e=>setTpslEdit(c=>({...c,sl:e.target.value}))}
                                  style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.red+'22',borderRadius:7,padding:'6px 8px',color:B.red,fontSize:isMobile?16:12,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                              </div>
                            </div>
                            <div style={{fontSize:9,color:'#555',marginBottom:8}}>Triggers when {teamName} reaches the price (TP above, SL below). Entry {(posEntryP*100).toFixed(0)}¢.</div>
                            <div style={{display:'flex',gap:6}}>
                              <button onClick={()=>setPositionTriggers(pos,tpslEdit.tp,tpslEdit.sl)} style={{flex:1,padding:'7px 0',background:B.primary,border:'none',borderRadius:8,cursor:'pointer',color:'#000',fontWeight:700,fontSize:11,fontFamily:fb}}>Save</button>
                              {(pos.tp||pos.sl)&&<button onClick={()=>setPositionTriggers(pos,'','')} style={{padding:'7px 12px',background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,cursor:'pointer',color:'#888',fontWeight:700,fontSize:11,fontFamily:fb}}>Clear</button>}
                              <button onClick={()=>setTpslEdit(null)} style={{padding:'7px 12px',background:'transparent',border:'1px solid #2a2a2a',borderRadius:8,cursor:'pointer',color:'#666',fontWeight:700,fontSize:11,fontFamily:fb}}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {gameClosed.length>0&&(
                    <div style={{marginTop:4}}>
                      {gamePositions.length>0&&<div style={{fontSize:11,color:'#555',fontWeight:600,padding:'4px 0 6px'}}>Closed</div>}
                      {gameClosed.map((cp,i)=>{
                        const cptm=cp.side==='home'?HOME:AWAY;
                        const typeC=cp.closeType==='LIQ'?'#f87171':cp.closeType==='TP'?'#4ade80':cp.closeType==='SL'?'#ef4444':'#666';
                        return(
                          <div key={cp.id+'-'+i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#0a0a0a',borderRadius:8,fontFamily:fm,fontSize:11,borderLeft:'2px solid '+(cp.side==='home'?HOME.light+'40':AWAY.light+'40'),marginBottom:2}}>
                            <span style={{color:cp.side==='home'?HOME.light:AWAY.light,fontWeight:700,minWidth:60}}>{cptm.short} {cp.leverage}x</span>
                            <span style={{color:'#555',flex:1}}>{((cp.side==='home'?cp.entry:1-cp.entry)*100).toFixed(1)}¢ → {(() => {
                              // exitPx is the home-terms exit when known; closedAt was a MIXED field
                              // (price / chart-time / 0) and printed nonsense like "→ 0.0¢".
                              const ex = cp.exitPx ?? (cp.closeType === 'LIQ' ? cp.liq : null);
                              return ex != null ? ((cp.side==='home'?ex:1-ex)*100).toFixed(1)+'¢' : '—';
                            })()}</span>
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

          {/* (Mobile activity card removed — wager activity lives in the "Wager Activity" tab
              of the gamecast box below, same as desktop. Toasts still cover immediacy.) */}

          {/* GAMECAST */}
          <div data-mob="gamecast" style={{margin:isMobile?'8px 12px 0':'12px 24px 0',background:'#111',borderRadius:16,border:'1px solid #1f1f1f',overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'1px solid #1f1f1f'}}>
              {[['activity','Wager Activity',activity.length],['gamecast','Gamecast',playLog.length],['boxscore','Box Score',0],['chat','Chat',0]].map(([id,label,count])=>(
                <button key={id} onClick={()=>setBottomTab(id)} style={{padding:'10px 20px',fontSize:13,fontWeight:600,border:'none',cursor:'pointer',fontFamily:fb,
                  background:'transparent',color:bottomTab===id?'#fff':'#666',borderBottom:bottomTab===id?'2px solid '+B.primary:'2px solid transparent'}}>
                  {label}{(id==='gamecast'||id==='activity')&&count>0&&<span style={{color:B.primary,marginLeft:4,fontSize:11}}>{count}</span>}
                </button>
              ))}
            </div>
            <div style={{minHeight:200,padding:'10px 16px',maxHeight:320,overflow:'auto'}}>
              {bottomTab==='activity' && (
                activity.length===0?(
                  <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>No wagers yet — every bet, cash-out, TP/SL and liquidation lands here</div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {activity.map((e,i)=>{
                      const A={open:['BET',B.primary],close:['CASH OUT','#8ab8ff'],tp:['TP HIT',B.primary],sl:['SL HIT','#ff9f1c'],liquidation:['☠ LIQ',B.red],settlement:['SETTLED','#8a93a6']}[e.type]||[e.type?.toUpperCase?.()||'?','#8a93a6'];
                      const margin=e.notional&&e.leverage?e.notional/e.leverage:null;
                      const agoS=Math.max(1,Math.round((Date.now()-e.at)/1000));
                      const agoTxt=agoS<60?agoS+'s':agoS<3600?Math.round(agoS/60)+'m':agoS<86400?Math.round(agoS/3600)+'h':Math.round(agoS/86400)+'d';
                      const av=parseAvatar(e.avatar);
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'8px 10px',borderRadius:9,background:'#0c0e12',border:'1px solid #15171c'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                            <div style={{width:24,height:24,borderRadius:'50%',overflow:'hidden',background:'#1d2026',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {av?<AvatarCircle avatar={av} size={24}/>:<span style={{fontWeight:800,fontSize:11,color:'#cfd4dc',fontFamily:fb}}>{(e.username||'?').charAt(0).toUpperCase()}</span>}
                            </div>
                            <span style={{fontSize:9.5,fontWeight:700,fontFamily:fm,padding:'2px 7px',borderRadius:5,background:A[1]+'22',color:A[1],flexShrink:0,whiteSpace:'nowrap'}}>{A[0]}</span>
                            <div style={{minWidth:0}}>
                              <div style={{fontSize:12.5,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                <span style={{color:e.userId===userId?B.primary:'#fff'}}>{e.username||'trader'}{e.userId===userId?' (you)':''}</span>
                                <span style={{color:'#8a93a6',fontWeight:600}}> · {e.teamName||e.side||'—'}{e.leverage?` · ${e.leverage}x`:''}</span>
                              </div>
                              <div style={{fontSize:10.5,color:'#666',fontFamily:fm,marginTop:1}}>
                                {[margin!=null&&('margin '+fmtUsd(margin)),e.notional!=null&&('notional '+fmtUsd(e.notional))].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            {e.pnl!=null&&e.type!=='open'&&(
                              <div style={{fontFamily:fm,fontWeight:800,fontSize:12.5,color:e.pnl>=0?B.green:B.red}}>{e.pnl>=0?'+':''}{fmtUsd(e.pnl)}</div>
                            )}
                            <div style={{fontSize:9.5,color:'#555',fontFamily:fm}}>{agoTxt} ago</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              {bottomTab==='gamecast' && (playLog.length===0 ? (
                <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>🏀 Waiting for plays…</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  {playLog.map((play,i)=>(
                    <div key={(play.id??'p')+'-'+i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:10,
                      background:play.scoringPlay?HOME.light+'0a':'transparent',animation:i===0?'slideIn .3s':'none'}}>
                      <div style={{flexShrink:0,width:50,textAlign:'center'}}>
                        <div style={{fontSize:10,color:'#fff',fontWeight:600}}>{play.periodDisplay||('Q'+(play.period||''))}</div>
                        <div style={{fontSize:11,color:'#ccc',fontFamily:fm}}>{play.clock}</div>
                      </div>
                      <div style={{flexShrink:0,width:44,textAlign:'center',fontFamily:fm,fontSize:12,fontWeight:700}}>
                        <span style={{color:'#fff'}}>{play.homeScore}</span>
                        <span style={{color:'#555'}}>-</span>
                        <span style={{color:'#fff'}}>{play.awayScore}</span>
                      </div>
                      <div style={{flex:1,fontSize:13,fontWeight:play.scoringPlay?700:400,color:'#fff'}}>
                        {play.scoringPlay?'🔥 ':''}{play.text}
                      </div>
                      {play.homeWinPct&&<div style={{flexShrink:0,fontFamily:fm,fontSize:11,color:B.primary,fontWeight:700}}>{(play.homeWinPct*100).toFixed(0)}%</div>}
                    </div>
                  ))}
                </div>
              ))}
              {bottomTab==='boxscore'&&(()=>{
                const teams = g.boxscore?.teams || [];
                if (teams.length < 2) return (
                  <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>
                    {settled ? 'Box score unavailable for this game.' : 'Box score updates as the game progresses…'}
                  </div>
                );
                const homeT = teams.find(t=>t.team===HOME.name) || teams[0];
                const awayT = teams.find(t=>t.team===AWAY.name) || teams[1];
                const awayByName = Object.fromEntries((awayT.stats||[]).map(s=>[s.name, s.value]));
                const rows = (homeT.stats||[]).filter(s=>awayByName[s.name]!==undefined);
                if (!rows.length) return (
                  <div style={{textAlign:'center',fontSize:13,color:'#555',padding:'28px 0'}}>Box score updates as the game progresses…</div>
                );
                return (
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2px 8px 10px'}}>
                      <span style={{fontSize:12,fontWeight:800,color:HOME.light,fontFamily:fm}}>{HOME.short}</span>
                      {!settled&&<span style={{display:'flex',alignItems:'center',gap:5,fontSize:9,fontWeight:700,color:B.green,fontFamily:fm,letterSpacing:'0.06em'}}>
                        <span style={{width:5,height:5,borderRadius:'50%',background:B.green,animation:'pulse 1.5s infinite'}}/>LIVE
                      </span>}
                      <span style={{fontSize:12,fontWeight:800,color:AWAY.light,fontFamily:fm}}>{AWAY.short}</span>
                    </div>
                    {rows.map((s,i)=>(
                      <div key={s.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 8px',background:i%2===0?'#0a0a0a':'transparent',borderRadius:8}}>
                        <span style={{flex:'0 0 72px',fontSize:13,fontWeight:700,color:'#fff',fontFamily:fm,textAlign:'left'}}>{s.value}</span>
                        <span style={{flex:1,fontSize:11,color:'#888',textAlign:'center'}}>{s.displayName||s.name}</span>
                        <span style={{flex:'0 0 72px',fontSize:13,fontWeight:700,color:'#fff',fontFamily:fm,textAlign:'right'}}>{awayByName[s.name]}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {bottomTab==='chat' && <ChatPanel gameId={g.id} userId={userId} homeShort={HOME.short} awayShort={AWAY.short} onRequireAuth={()=>setShowAuth(true)}/>}
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
                    <input type="number" inputMode="decimal" value={shareCount} min={0} onChange={e=>{const s=Math.max(0,+e.target.value);setOrderMargin(Math.min(Math.max(0,(s*entryP)/eL),balance));}}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:16,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
                <div style={{color:'#333',fontSize:14,fontWeight:700,paddingBottom:11,textAlign:'center'}}>⇄</div>
                <div>
                  <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:4}}>Margin</div>
                  <div style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:10,padding:'9px 10px',display:'flex',alignItems:'center',gap:3}}>
                    <span style={{color:'#555',fontSize:12,fontWeight:600}}>$</span>
                    <input type="number" inputMode="decimal" value={Math.round(eM)} min={0} onChange={e=>setOrderMargin(Math.min(Math.max(0,+e.target.value),balance))}
                      style={{width:'100%',background:'transparent',border:'none',outline:'none',color:'#fff',fontSize:16,fontWeight:700,fontFamily:fm}}/>
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:'#555',textAlign:'center',marginBottom:12}}>@ {(entryP*100).toFixed(1)}¢ per share</div>
              {/* Leverage slider — progress-bar track, cap-aware (see LevSlider) */}
              <LevSlider eL={eL} ml={ml} onChange={setOrderLev} liq={levLiq} cap={{ px: oPrice }}/>
            </div>
            {/* Limit price */}
            {orderType==='limit'&&(
              <div style={{marginBottom:12,padding:'10px 12px',background:'#0a0a0a',borderRadius:10,border:'1px solid #2a2a2a'}}>
                <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:6}}>Limit Price</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="number" inputMode="decimal" min={1} max={99} value={limitCents} onChange={e=>setLimitCents(Math.min(99,Math.max(1,+e.target.value)))}
                    style={{flex:1,background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'7px 10px',color:B.primaryLight,fontSize:16,fontWeight:700,fontFamily:fm,outline:'none'}}/>
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
                  <input type="number" inputMode="decimal" min={1} max={99} value={tpCents} onChange={e=>setTpCents(e.target.value)} placeholder="—"
                    style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.green+'22',borderRadius:8,padding:'7px 10px',color:B.green,fontSize:16,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:B.red,fontWeight:600,marginBottom:4}}>Stop Loss ¢</div>
                  <input type="number" inputMode="decimal" min={1} max={99} value={slCents} onChange={e=>setSlCents(e.target.value)} placeholder="—"
                    style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.red+'22',borderRadius:8,padding:'7px 10px',color:B.red,fontSize:16,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
            </div>
            {/* Summary */}
            {(()=>{const estFee=expo*0.015;const liqShown=orderSide==='home'?liqP:1-liqP;const curBet=orderSide==='home'?oPrice:1-oPrice;const liqDist=curBet>0?Math.abs(curBet-liqShown)/curBet*100:0;const liqCol=liqDist>15?B.green:liqDist>5?'#ff9f1c':B.red;const balPct=balance>0?eM/balance*100:0;const oppPos=!reduceOnly&&positions.find(p=>p.gameId===g.id&&p.side!==orderSide);return(<>
            <div style={{background:'#0a0a0a',borderRadius:12,padding:'10px 12px',marginBottom:10,fontSize:12}}>
              {[['Entry',(entryP*100).toFixed(1)+'¢','#fff'],['Exposure',fmtUsd(expo),'#fff'],['Est. Fee (1.5%)',fmtUsd(estFee),'#888']].map(([l,v,c])=>(
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
            {/* (Liquidation now lives on the leverage control's card - see LevSlider.) */}

            {/* Net-position notice: betting the other side nets against the existing one */}
            {oppPos&&<div style={{fontSize:11,color:'#ff9f1c',marginBottom:8,padding:'7px 10px',background:'#ff9f1c10',borderRadius:8,border:'1px solid #ff9f1c22',lineHeight:1.5}}>
              You already hold <b>{oppPos.side==='home'?HOME.short:AWAY.short}</b> on this game. Buying {team.short} is the opposite side — it will <b>reduce or close</b> that position, not open a second one.
            </div>}
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
                <div style={{fontSize:10,color:'#444',lineHeight:1.5}}>Only closes or shrinks a position you already hold — never opens a new one or adds to it. Use it to lock in an exit without accidentally flipping sides.</div>
              </div>
            </div>
            {/* Submit */}
            <button onClick={placeOrder} disabled={settled||(joinNeeded?false:eM<10)} style={{width:'100%',padding:'14px 0',fontWeight:700,fontSize:14,
              border:settled?'2px solid #333':'2px solid '+B.green,
              cursor:settled||eM<10?'not-allowed':'pointer',fontFamily:fb,borderRadius:12,transition:'all .15s',
              background:settled?'#222':orderSide==='home'?HOME.light:AWAY.light,
              color:'#fff',opacity:settled||eM<10?0.4:1}}>
              {settled?'Game Settled':isEventGame&&wcJoined===false?'🏆 Join the World Cup Championship — get $10,000':orderType==='limit'?`Limit ${team.name} @ ${limitCents}¢ · ${fmtShares(shareCount)} shares`:`Buy ${team.name} · ${fmtShares(shareCount)} shares`}
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
                    <button onClick={()=>cancelLimitOrder(lo)}
                      style={{background:'#ef444420',border:'none',borderRadius:6,padding:'3px 8px',cursor:'pointer',color:'#ef4444',fontSize:11,fontWeight:700}}>✕</button>
                  </div>
                );})}
              </div>
            )}
            {/* (Activity tray moved to the "Wager Activity" tab in the gamecast box — the wager
                panel stays focused on placing the next bet.) */}
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

            {/* Floating trade button — the WC nav below navigates away, so this is the wager-sheet entry point */}
            {worldcup&&onNavTo&&!showWager&&(
              <button aria-label="Trade" onClick={()=>setShowWager(true)} style={{position:'fixed',right:16,bottom:'calc(72px + env(safe-area-inset-bottom))',zIndex:41,width:52,height:52,borderRadius:26,border:'none',background:B.primary,color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 20px rgba(31,209,130,0.35)'}}>
                <Zap size={22} color="#000" fill="#000"/>
              </button>
            )}

            {/* Sticky bottom tab bar — WC mode: the exact WC home nav (Home/Bets/News/Leaderboard) */}
            <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:40,background:'#050505',borderTop:'1px solid #131313',display:'flex',height:56,paddingBottom:'env(safe-area-inset-bottom)'}}>
              {worldcup&&onNavTo
                ? [['home',Home],['bets',Ticket],['news',Newspaper],['leaderboard',Trophy]].map(([key,Icon])=>(
                    <button key={key} aria-label={key} onClick={()=>onNavTo(key)} style={{flex:1,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon size={20} color="#5a6170" />
                    </button>
                  ))
                : [['score',BarChart3,'Score'],['trade',Zap,'Trade'],['positions',Briefcase,'Positions'],['gamecast',Mic,'Plays']].map(([id,Icon,label])=>(
                    <button key={id} aria-label={label} onClick={()=>{
                      if(id==='trade'){setShowWager(w=>!w);}
                      else{setShowWager(false);
                        const el=document.querySelector('[data-mob="'+id+'"]');
                        if(el)el.scrollIntoView({behavior:'smooth'});}
                    }} style={{flex:1,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                      <Icon size={20} color={id==='trade'&&showWager?'#fff':'#5a6170'} />
                      {id==='positions'&&gamePositions.length>0&&<span style={{position:'absolute',top:8,right:'26%',fontSize:8,background:B.primary,color:'#000',borderRadius:8,padding:'1px 4px',fontWeight:700,fontFamily:fm}}>{gamePositions.length}</span>}
                    </button>
                  ))}
            </div>

            {/* Mobile wager sheet */}
            {showWager&&(
              <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',flexDirection:'column',justifyContent:'flex-end'}} onClick={e=>{if(e.target===e.currentTarget)setShowWager(false);}}>
                <div style={{background:'rgba(0,0,0,0.6)',position:'absolute',inset:0}}/>
                <div style={{position:'relative',background:'#0a0a0a',borderRadius:'20px 20px 0 0',border:'1px solid #1f1f1f',maxHeight:'90vh',overflow:'auto',animation:'slideUp .25s ease',paddingBottom:'env(safe-area-inset-bottom)'}}>
                  <div onClick={()=>setShowWager(false)}
                    onTouchStart={e=>{sheetDragY.current=e.touches[0].clientY;}}
                    onTouchEnd={e=>{if(sheetDragY.current!=null&&e.changedTouches[0].clientY-sheetDragY.current>40)setShowWager(false);sheetDragY.current=null;}}
                    style={{display:'flex',justifyContent:'center',padding:'12px 0 8px',cursor:'pointer',touchAction:'none'}}>
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
                    <div style={{display:'flex',alignItems:'center',gap:8,background:'#1a1a1a',borderRadius:10,padding:'0 14px',marginBottom:6}}>
                      <span style={{color:'#555',fontFamily:fm,fontWeight:700,fontSize:14}}>$</span>
                      <input type="number" inputMode="decimal" min={0} value={Math.round(eM)||''} placeholder="Wager amount"
                        onChange={e=>setOrderMargin(Math.min(Math.max(0,+e.target.value||0),ledgerBal))}
                        style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#fff',fontFamily:fm,fontWeight:700,fontSize:16,padding:'12px 0'}}/>
                      <span style={{color:'#444',fontSize:11,fontFamily:fm}}>max {fmtUsd(ledgerBal)}</span>
                    </div>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      {[100,250,500,1000].map(v=>(
                        <button key={v} onClick={()=>setOrderMargin(v)} style={{flex:1,padding:'11px 0',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',fontFamily:fm,borderRadius:10,
                          background:Math.round(eM)===v?'#2a2a2a':'#1a1a1a',color:Math.round(eM)===v?'#fff':'#666'}}>{v>=1000?'$'+(v/1000)+'k':'$'+v}</button>
                      ))}
                    </div>
                    <div style={{marginBottom:12}}>
                      <LevSlider eL={eL} ml={ml} onChange={setOrderLev} compact liq={levLiq} cap={{ px: oPrice }}/>
                    </div>
                    {/* Risk tools — TP/SL in the order's own side scale (same states the desktop panel binds) */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:'#555',fontWeight:600,marginBottom:6}}>Risk Tools <span style={{color:'#383838'}}>optional</span></div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                        <div>
                          <div style={{fontSize:10,color:B.green,fontWeight:600,marginBottom:4}}>Take Profit ¢</div>
                          <input type="number" inputMode="decimal" min={1} max={99} value={tpCents} onChange={e=>setTpCents(e.target.value)} placeholder="—"
                            style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.green+'22',borderRadius:8,padding:'9px 10px',color:B.green,fontSize:16,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,color:B.red,fontWeight:600,marginBottom:4}}>Stop Loss ¢</div>
                          <input type="number" inputMode="decimal" min={1} max={99} value={slCents} onChange={e=>setSlCents(e.target.value)} placeholder="—"
                            style={{width:'100%',background:'#1a1a1a',border:'1px solid '+B.red+'22',borderRadius:8,padding:'9px 10px',color:B.red,fontSize:16,fontWeight:700,fontFamily:fm,outline:'none',boxSizing:'border-box'}}/>
                        </div>
                      </div>
                    </div>
                    {/* Reduce Only */}
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'9px 12px',background:reduceOnly?B.primary+'10':'#111',borderRadius:10,border:'1px solid '+(reduceOnly?B.primary+'30':'#1a1a1a'),cursor:'pointer'}} onClick={()=>setReduceOnly(r=>!r)}>
                      <div style={{width:16,height:16,borderRadius:4,border:'1.5px solid '+(reduceOnly?B.primary:'#333'),background:reduceOnly?B.primary:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                        {reduceOnly&&<span style={{fontSize:10,color:'#000',fontWeight:900,lineHeight:1}}>✓</span>}
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:reduceOnly?B.primaryLight:'#888'}}>Reduce Only</div>
                        <div style={{fontSize:10,color:'#555',lineHeight:1.5}}>Only closes or shrinks a position you already hold — it can never open a new one or add to it. Use it to lock in an exit without accidentally flipping sides.</div>
                      </div>
                    </div>
                    <div style={{background:'#111',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12}}>
                      {[['Entry',(entryP*100).toFixed(1)+'¢','#fff'],['Exposure',fmtUsd(expo),'#fff'],['If '+team.name+' wins','+'+fmtUsd(orderSide==='home'?expo*(1-oPrice)/oPrice:expo*oPrice/(1-oPrice)),B.green],['Max loss','-'+fmtUsd(eM),B.red]].map(([l,v,c],i)=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderTop:i>0?'1px solid #1a1a1a':'none'}}>
                          <span style={{color:'#555'}}>{l}</span><span style={{color:c,fontWeight:600,fontFamily:fm}}>{v}</span>
                        </div>
                      ))}
                      {/* Estimated liquidation for THIS order (entry at the current price, chosen leverage) */}
                      {!reduceOnly&&eL>1&&(()=>{const liqCol=liqPtsAway>15?B.green:liqPtsAway>5?'#ff9f1c':B.red;return(
                        <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderTop:'1px solid #1a1a1a'}}>
                          <span style={{color:'#555'}}>Est. liquidation</span>
                          <span style={{color:liqCol,fontWeight:700,fontFamily:fm}}>{(liqSideShown*100).toFixed(1)}¢ · {liqPtsAway.toFixed(1)} pts away</span>
                        </div>
                      );})()}
                    </div>
                    <button onClick={()=>{placeOrder();setShowWager(false);}} disabled={settled||(joinNeeded?false:eM<10)} style={{width:'100%',padding:'16px 0',fontWeight:700,fontSize:16,
                      border:settled?'2px solid #333':'2px solid '+B.green,cursor:'pointer',fontFamily:fb,borderRadius:14,
                      background:settled?'#222':orderSide==='home'?HOME.light:AWAY.light,color:'#fff',opacity:settled||eM<10?0.4:1}}>
                      {settled?'Game Settled':isEventGame&&wcJoined===false?'🏆 Join the Championship — get $10,000':`Buy ${team.name} · ${fmtShares(shareCount)} shares`}
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
      {showProfile && (
        <ProfilePage
          userId={userId}
          onClose={()=>setShowProfile(false)}
          onLoggedOut={()=>{ setAuth(null); setShowProfile(false); }}
        />
      )}
      {showChatPop && !isMobile && (
        <FloatingChat gameId={g.id} userId={userId} homeShort={HOME.short} awayShort={AWAY.short}
          onRequireAuth={()=>setShowAuth(true)} onClose={()=>setShowChatPop(false)}/>
      )}
      {showDeposit && <DepositModal balance={balance} onClose={()=>setShowDeposit(false)}/>}
      {showVerify && (
        <VerifyModal
          userId={userId}
          onClose={() => setShowVerify(false)}
          onVerified={() => { setShowVerify(false); joinEvent(); }}
        />
      )}
      {showAuth && (
        <AuthModal
          reason={sessionExpired ? "Your session expired — please sign in again." : "Sign in or create an account to place a wager."}
          defaultMode={sessionExpired ? "login" : "signup"}
          onClose={()=>{ setShowAuth(false); setSessionExpired(false); }}
          onAuth={(data)=>{ setAuth(data); setShowAuth(false); setSessionExpired(false); pollRef.current?.(); }}
        />
      )}
      {tradeCard && <TradeCard card={tradeCard} onClose={()=>setTradeCard(null)}/>}
      {/* Mobile floating toasts — the activity tray lives in the desktop wager panel, so phones need
          their own surface or rejections are invisible (A7 finding #2). Stacked queue (max 3) so
          bursts don't overwrite each other; zIndex 1200 keeps them visible above the auth/verify
          modals (1000) and the profile page (900); tap any to dismiss early. */}
      {isMobile && toasts.length > 0 && (
        <div style={{position:'fixed',left:12,right:12,bottom:'calc(68px + env(safe-area-inset-bottom))',zIndex:1200,
          display:'flex',flexDirection:'column',gap:8}}>
          {toasts.map(t => (
            <div key={t.id} onClick={()=>dismissToast(t.id)} style={{
              padding:'12px 14px',borderRadius:12,fontWeight:600,fontSize:13,lineHeight:1.35,fontFamily:fb,cursor:'pointer',
              background:t.type==='green'?'#0d2a1d':t.type==='red'?'#2a0f0d':'#15181d',
              border:`1px solid ${t.type==='green'?B.green+'55':t.type==='red'?B.red+'55':'#2a2e35'}`,
              color:t.type==='green'?B.green:t.type==='red'?B.red:'#d5d9e0',
              boxShadow:'0 8px 28px rgba(0,0,0,.55)',animation:'slideUp .2s ease'}}>
              {t.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
