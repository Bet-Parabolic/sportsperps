import { useState, useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { B, fb, fm } from "../lib/theme.js";
import { API_URL, ESPN_SOURCES, LIVE_STATUS } from "../lib/constants.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { track } from "../lib/track.js";
import { ProfilePage } from "../components/ProfilePage.jsx";
import { LeaderboardPage } from "../components/LeaderboardPage.jsx";
import { BasketballPage } from "../components/sports/BasketballPage.jsx";
import { BaseballPage } from "../components/sports/BaseballPage.jsx";
import { NFLPage } from "../components/sports/NFLPage.jsx";
import { HockeyPage } from "../components/sports/HockeyPage.jsx";
import { SoccerPage } from "../components/sports/SoccerPage.jsx";
import { MMAPage } from "../components/sports/MMAPage.jsx";
import { HomePage } from "../components/sports/HomePage.jsx";
import { AvatarCircle } from "../components/onboarding/MemberCard.jsx";
import { loadCard } from "../lib/onboarding.js";

/**
 * Home terminal shell — sport tabs, home page, leaderboard, profile. All TRADING happens in
 * LiveTradingApp (every Trade Live / Trade Pre-Game button routes there via onTrade). The old
 * local-state demo terminal (3 replay games + DemosPage) was removed July 2026 — live games
 * are the demo now.
 */
export function TradingApp({ onBack, onChangeGame, liveGames = [], onTrade, initialTab }) {
  const [terminalPage, setTerminalPage] = useState(initialTab || "home");
  const [showProfile, setShowProfile] = useState(false);
  // Account pfp mirrors the member-card avatar (re-read when the profile closes — onboarding/
  // card edits may have just changed it).
  const [cardAvatar, setCardAvatar] = useState(() => loadCard().avatar);
  useEffect(() => { if (!showProfile) setCardAvatar(loadCard().avatar); }, [showProfile]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('perpdictions_userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('perpdictions_userId', id); }
    return id;
  });
  // Register user with backend
  useEffect(() => {
    fetch(`${API_URL}/users`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId}) }).catch(()=>{});
  }, [userId]);
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
    return {
      live: liveGames.filter(g => g.status==="live"||g.status==="halftime").length,
      nba: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && (!g.league || g.league==="nba" || g.league==="ncaam")).length,
      nfl: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="nfl").length || countLive(espnData.nfl?.events),
      mlb: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="mlb").length || countLive(espnData.mlb?.events),
      nhl: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && g.league==="nhl").length || countLive(espnData.nhl?.events),
      soccer: liveGames.filter(g => (g.status==="live"||g.status==="halftime") && (g.league==="mls"||g.league==="wcup")).length || countLive(espnData.wcup?.events),
      ufc: countLive(espnData.ufc?.events),
    };
  }, [espnData, liveGames]);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);

  return (
    <div style={{background:"#0a0a0a",fontFamily:fb,minHeight:"100vh",color:"#fff"}}>
      {/* HEADER — left corner: back+logo, center: tabs, right corner: deposit+profile */}
      <div style={{padding:isMobile?"0 12px":"0 24px",height:56,display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",borderBottom:"1px solid #1a1a1a",background:"#0a0a0a",position:"sticky",top:0,zIndex:30}}>
        {/* LEFT — back arrow + pd emblem + wordmark */}
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

        {/* CENTER — sport tabs (natural width, centered) */}
        <div className="mob-nav" style={{display:"flex",gap:isMobile?2:4,background:"#111",borderRadius:10,padding:3,overflowX:"auto",justifySelf:"center",maxWidth:"100%",minWidth:0,marginLeft:isMobile?8:24,marginRight:isMobile?8:24}}>
          {["Home","Basketball","Football","Baseball","Soccer","Hockey","MMA","Leaderboard"].map((sport)=>{
            const pageOf = {Home:"home",Basketball:"basketball",Football:"nfl",Baseball:"baseball",Soccer:"soccer",Hockey:"hockey",MMA:"mma",Leaderboard:"leaderboard"};
            const isActive = terminalPage===pageOf[sport];
            return (
            <button key={sport} onClick={()=>setTerminalPage(pageOf[sport])} style={{padding:isMobile?"4px 8px":"6px 14px",fontSize:isMobile?10:12,fontWeight:isActive?600:400,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:8,
              background:isActive?B.primary+"20":"transparent",color:isActive?"#fff":"#666"}}>
              {sport==="Home"
                ? <span style={{display:"flex",alignItems:"center",gap:5}}>
                    {sportCounts.live>0&&<span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"pulse 1.5s infinite",flexShrink:0}}/>}
                    Home
                  </span>
                : sport}{(() => {
                  const c = sport==="Home"?sportCounts.live:sport==="Basketball"?sportCounts.nba:sport==="Football"?sportCounts.nfl:sport==="Baseball"?sportCounts.mlb:sport==="Hockey"?sportCounts.nhl:sport==="Soccer"?sportCounts.soccer:sport==="MMA"?sportCounts.ufc:null;
                  return c>0?<span style={{marginLeft:4,fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>({c})</span>:null;
                })()}</button>
          );})}
        </div>

        {/* RIGHT — deposit + profile */}
        <div style={{display:"flex",alignItems:"center",gap:10,justifySelf:"end"}}>
          <button style={{padding:"8px 20px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:fb,borderRadius:10,background:B.green,color:"#fff"}}>
            Deposit
          </button>
          <div onClick={()=>setShowProfile(true)} style={{width:34,height:34,borderRadius:"50%",background:"#222",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden"}}>
            {cardAvatar ? <AvatarCircle avatar={cardAvatar} size={34}/> : <span style={{fontSize:14,color:"#888"}}>👤</span>}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"flex",height:isMobile?"auto":"calc(100vh - 56px)",flexDirection:isMobile?"column":"row",minHeight:isMobile?"calc(100vh - 56px)":"auto"}}>
        {terminalPage==="basketball"?<BasketballPage liveGames={liveGames} onTrade={onTrade}/>
        :terminalPage==="baseball"?<BaseballPage data={espnData.mlb} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="soccer"?<SoccerPage data={espnData.wcup} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="hockey"?<HockeyPage data={espnData.nhl} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="mma"?<MMAPage data={espnData.ufc}/>
        :terminalPage==="nfl"?<NFLPage data={espnData.nfl} onTrade={onTrade} liveGames={liveGames}/>
        :terminalPage==="leaderboard"?<LeaderboardPage userId={userId}/>
        :<HomePage liveGames={liveGames} onTrade={onTrade}/>}
      </div>

      {showProfile && <ProfilePage onClose={()=>setShowProfile(false)} onLoggedOut={()=>setShowProfile(false)}/>}
    </div>
  );
}
