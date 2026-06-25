import { B, fb, fd, fm } from "../../lib/theme.js";
import { fmtGameTime, isRecent, periodLabel } from "../../lib/helpers.js";
import { EmptyState } from "../../components/shared/SportPageShell.jsx";

export function BasketballPage({ liveGames, onTrade }) {
  const bballGames = liveGames.filter(g => !g.league || g.league === "nba" || g.league === "ncaam" || g.sport === "Basketball");
  const live    = bballGames.filter(g => g.status === "live" || g.status === "halftime");
  const final   = bballGames.filter(g => (g.status === "final" || g.status === "completed") && isRecent(g.date || g.startTime));
  const sched   = bballGames.filter(g => g.status === "scheduled").sort((a,b) => new Date(a.date||a.startTime||0) - new Date(b.date||b.startTime||0));
  const pregame  = sched.filter(g => g.pregame);
  const upcoming = sched.filter(g => !g.pregame);
  const hasGames = live.length > 0 || sched.length > 0 || final.length > 0;

  const GameCard = ({ g }) => {
    const isLive = g.status === "live";
    const isHalf = g.status === "halftime";
    const isFinal = g.status === "final" || g.status === "completed";
    const isPre = g.status === "scheduled" && g.pregame;
    const statusColor = isLive ? B.green : isHalf ? "#ff9f1c" : isPre ? B.primaryLight : isFinal ? "#666" : "#555";
    const statusLabel = isLive ? "LIVE" : isHalf ? "HALF" : isPre ? "PREGAME" : isFinal ? "FINAL" : g.statusDetail || "UPCOMING";
    const homeWinning = (g.home.score || 0) > (g.away.score || 0);
    const winProb = g.oracle?.indexPrice ? (g.oracle.indexPrice * 100).toFixed(1) : null;

    return (
      <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px",transition:"all .15s"}}>
        {/* Status row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isLive && <span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite",flexShrink:0}}/>}
            <span style={{fontSize:11,fontWeight:700,color:statusColor,fontFamily:fm,letterSpacing:"0.08em"}}>{statusLabel}</span>
            {(isLive || isHalf) && g.period && (
              <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{periodLabel(g.league, g.period, g.clock, g.statusDetail)}</span>
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

        {/* Oracle win prob bar (live, halftime, or pregame once the oracle is seeded) */}
        {winProb && (isLive || isHalf || isPre) && (
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

        {/* Live → green "Trade Live"; pregame → red "Trade Pre-Game" */}
        {onTrade && (isLive || isHalf || isPre) && (
          <button onClick={()=>onTrade(g)} style={{width:"100%",marginTop:8,padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:13,
            background:isPre?"linear-gradient(135deg,"+B.red+",#ff7a6e)":"linear-gradient(135deg, "+B.green+", "+B.greenLight+")",color:isPre?"#fff":"#000",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {!isPre&&<span style={{width:7,height:7,borderRadius:"50%",background:"#000",opacity:0.5,animation:"pulse 1.5s infinite"}}/>}
            {isPre?"Trade Pre-Game":"Trade Live"}
          </button>
        )}

        {/* Scheduled time */}
        {g.status==="scheduled" && (()=>{const when=fmtGameTime(g.startTime||g.date);return(when||g.statusDetail)?(
          <div style={{fontSize:11,color:"#888",fontFamily:fm,marginTop:8,letterSpacing:"0.04em"}}>{when}{when&&g.statusDetail?" · ":""}{g.statusDetail||""}</div>
        ):null;})()}
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
            ? `${live.length + sched.length + final.length} game${live.length + sched.length + final.length !== 1 ? "s" : ""} — live data from ESPN via Parabolic backend`
            : "Connecting to backend…"}
        </p>
      </div>

      {!hasGames && <EmptyState emoji="🏀" sport="basketball" scheduledGames={sched}/>}

      {/* Live / halftime */}
      {live.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:B.green,letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>● LIVE NOW</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {live.map(g => <GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Pregame — open for wagering */}
      {pregame.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primaryLight,letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>◷ PREGAME — OPEN FOR WAGERING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {pregame.map(g => <GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {upcoming.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>UPCOMING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {upcoming.map(g => <GameCard key={g.id} g={g}/>)}
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
