import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Gift } from "lucide-react";
import { BellButton } from "../components/BellButton.jsx";
import { B, fb, fm } from "../lib/theme.js";
import { API_URL, ESPN_SOURCES, LIVE_STATUS } from "../lib/constants.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { track } from "../lib/track.js";
import { ProfilePage } from "../components/ProfilePage.jsx";
import { LeaderboardPage } from "../components/LeaderboardPage.jsx";
import { HomePage } from "../components/sports/HomePage.jsx";
import { AvatarCircle } from "../components/onboarding/MemberCard.jsx";
import { loadCard, reconcileAvatarWithAccount } from "../lib/onboarding.js";
import { DepositModal } from "../components/DepositModal.jsx";
import { currentUserId, authToken } from "../lib/auth.js";
import { NavRail } from "../components/NavRail.jsx";
import { ActiveBetsPage } from "../components/ActiveBetsPage.jsx";
import { NewsPage } from "../components/NewsPage.jsx";
import { BookmarksPage } from "../components/BookmarksPage.jsx";

/**
 * Home terminal shell — sport tabs, home page, leaderboard, profile. All TRADING happens in
 * LiveTradingApp (every Trade Live / Trade Pre-Game button routes there via onTrade). The old
 * local-state demo terminal (3 replay games + DemosPage) was removed July 2026 — live games
 * are the demo now.
 */
export function TradingApp({ onBack, onChangeGame, liveGames = [], onTrade, initialTab }) {
  const [terminalPage, setTerminalPage] = useState(initialTab || "home");
  const [showProfile, setShowProfile] = useState(false);
  // Rail live-bubble → home with the Live filter preselected (July 21 redesign).
  const [homeCat, setHomeCat] = useState(null);
  // Account pfp mirrors the member-card avatar (re-read when the profile closes — onboarding/
  // card edits may have just changed it).
  const [cardAvatar, setCardAvatar] = useState(() => loadCard().avatar);
  useEffect(() => { if (!showProfile) setCardAvatar(loadCard().avatar); }, [showProfile]);
  useEffect(() => {
    reconcileAvatarWithAccount({ apiUrl: API_URL, userId: currentUserId(), token: authToken() })
      .then(() => setCardAvatar(loadCard().avatar));
  }, []);
  // Header balance (every account starts with $10,000 paper funds). Refreshes every 30s and
  // when the profile closes (a trade/settlement elsewhere may have moved it).
  const [balance, setBalance] = useState(null);
  const [showDeposit, setShowDeposit] = useState(false);
  useEffect(() => {
    let live = true;
    const fetchBal = () => fetch(`${API_URL}/balance/${currentUserId()}`).then(r => r.ok ? r.json() : null).then(b => { if (live && b && typeof b.balance === "number") setBalance(b.balance); }).catch(() => {});
    fetchBal();
    const iv = setInterval(fetchBal, 30000);
    return () => { live = false; clearInterval(iv); };
  }, [showProfile]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('perpdictions_userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('perpdictions_userId', id); }
    return id;
  });
  // (Guest elimination: no POST /users mint — accounts exist only via registration. This
  //  terminal is reached only by logged-in users; App gates everyone else to the WC page.)
  // Analytics: a page_view per terminal tab change.
  useEffect(() => { track("page_view", { page: terminalPage }); }, [terminalPage]);

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
    // "Active" = tradeable now: live/halftime OR a pre-game market inside the wager window.
    const active = g => g.status==="live" || g.status==="halftime" || (g.status==="scheduled" && (g.pregame || g.tradeable));
    return {
      live: liveGames.filter(active).length,
      nba: liveGames.filter(g => active(g) && (!g.league || g.league==="nba" || g.league==="ncaam")).length,
      nfl: liveGames.filter(g => active(g) && g.league==="nfl").length || countLive(espnData.nfl?.events),
      mlb: liveGames.filter(g => active(g) && g.league==="mlb").length || countLive(espnData.mlb?.events),
      nhl: liveGames.filter(g => active(g) && g.league==="nhl").length || countLive(espnData.nhl?.events),
      soccer: liveGames.filter(g => active(g) && (g.league==="mls"||g.league==="wcup")).length || countLive(espnData.wcup?.events),
      wcup: liveGames.filter(g => active(g) && g.league==="wcup").length || countLive(espnData.wcup?.events),
      ufc: countLive(espnData.ufc?.events),
    };
  }, [espnData, liveGames]);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  return (
    <div style={{background:"#0a0a0a",fontFamily:fb,minHeight:"100vh",color:"#fff"}}>
      {/* HEADER - left corner: back+logo, center: tabs, right corner: deposit+profile */}
      <div style={{padding:isMobile?"0 12px":"0 24px",height:56,display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",borderBottom:"1px solid #1a1a1a",background:"#0a0a0a",position:"sticky",top:0,zIndex:30}}>
        {/* LEFT - back arrow + pd emblem + wordmark */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:16,justifySelf:"start"}}>
          <button onClick={onChangeGame} style={{background:"none",border:"none",cursor:"pointer",color:"#666",display:"flex",alignItems:"center",gap:4,fontSize:13,fontWeight:600,fontFamily:fb,padding:0}}>
            <ChevronRight size={16} style={{transform:"rotate(180deg)"}}/>
          </button>
          <div style={{display:"flex",alignItems:"center"}}>
            {isMobile
              ? <img src={LOGO_NAV} style={{height:28,width:"auto"}} alt="Parabolic"/>
              : <img src={LOGO_WORDMARK} style={{height:30,width:"auto"}} alt="Parabolic"/>}
          </div>
        </div>

        {/* CENTER — desktop: page label only (sport tabs retired July 21 — the home page's
            category browser owns game discovery now). Mobile: no rail, so the four destinations
            fold into a compact tab bar. */}
        {isMobile ? (
          <div className="mob-nav" style={{display:"flex",gap:2,background:"#111",borderRadius:10,padding:3,overflowX:"auto",justifySelf:"center",maxWidth:"100%",minWidth:0,marginLeft:8,marginRight:8}}>
            {["Home","Bets","News","Leaderboard"].map((label)=>{
              const pageOf = {Home:"home",Bets:"bets",News:"news",Leaderboard:"leaderboard"};
              const isActive = terminalPage===pageOf[label];
              return (
                <button key={label} onClick={()=>setTerminalPage(pageOf[label])} style={{padding:"5px 12px",fontSize:11,fontWeight:isActive?700:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
                  background:isActive?B.primary+"20":"transparent",color:isActive?"#fff":"#666",display:"flex",alignItems:"center",gap:5}}>
                  {label==="Home"&&sportCounts.live>0&&<span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1.5s infinite",flexShrink:0}}/>}
                  {label}
                </button>
              );})}
          </div>
        ) : (
          <div style={{justifySelf:"start",marginLeft:20,fontSize:13.5,fontWeight:700,color:"#e6e9ee",fontFamily:fb}}>
            {terminalPage==="home"?"Overview":terminalPage==="bets"?"Active Bets":terminalPage==="news"?"News":terminalPage==="bookmarks"?"Bookmarks":terminalPage==="leaderboard"?"Leaderboard":""}
          </div>
        )}

        {/* RIGHT — balance pill + notifications + rewards + profile avatar (July 21 redesign:
            the Deposit button moved into the home hero; these three icons moved up from the
            Figma rail's bottom-left). */}
        <div style={{display:"flex",alignItems:"center",gap:isMobile?8:10,justifySelf:"end"}}>
          {balance != null && (
            <div style={{padding:isMobile?"6px 10px":"7px 14px",borderRadius:999,background:"#111",border:"1px solid #1f1f1f",textAlign:"right"}}>
              {!isMobile && <div style={{fontSize:8.5,color:"#555",fontWeight:700,letterSpacing:"0.08em",fontFamily:fm,lineHeight:1.2}}>BALANCE</div>}
              <div style={{fontSize:isMobile?12:13,fontWeight:800,color:"#fff",fontFamily:fm,lineHeight:1.2}}>${balance.toLocaleString(undefined,{minimumFractionDigits:isMobile?0:2,maximumFractionDigits:isMobile?0:2})}</div>
            </div>
          )}
          <BellButton userId={userId}/>
          <a data-ungated="1" href="https://app.parabolic.gg/rewards" target="_blank" rel="noopener noreferrer" title="Rewards" aria-label="Rewards"
            style={{width:34,height:34,borderRadius:"50%",border:"1px solid #2b2413",background:"#171307",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Gift size={16} color="#eab308"/>
          </a>
          <div onClick={()=>setShowProfile(true)} title="Profile" style={{width:34,height:34,borderRadius:"50%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden"}}>
            {cardAvatar ? <AvatarCircle avatar={cardAvatar} size={34}/> : <span style={{fontSize:14,color:"#888"}}>👤</span>}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",height:isMobile?"auto":"calc(100vh - 56px)",flexDirection:isMobile?"column":"row",minHeight:isMobile?"calc(100vh - 56px)":"auto"}}>
        {!isMobile && <NavRail active={terminalPage} onNav={setTerminalPage} liveGames={liveGames}
          onLiveClick={()=>{ setHomeCat("live"); setTerminalPage("home"); }} onGameClick={onTrade}/>}
        {terminalPage==="bets"?<ActiveBetsPage liveGames={liveGames} onTrade={onTrade}/>
        :terminalPage==="news"?<NewsPage/>
        :terminalPage==="bookmarks"?<BookmarksPage liveGames={liveGames} onTrade={onTrade}/>
        :terminalPage==="leaderboard"?<LeaderboardPage userId={userId}/>
        :<HomePage liveGames={liveGames} onTrade={onTrade} initialCategory={homeCat} onOpenDeposit={()=>setShowDeposit(true)}/>}
      </div>

      {showDeposit && <DepositModal balance={balance} onClose={()=>setShowDeposit(false)}/>}
      {showProfile && <ProfilePage onClose={()=>setShowProfile(false)} onLoggedOut={()=>setShowProfile(false)}/>}
    </div>
  );
}
