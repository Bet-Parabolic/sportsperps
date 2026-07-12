import { B, fb, fd, fm } from "../../lib/theme.js";
import { byDate, fmtGameTime, isRecent } from "../../lib/helpers.js";
import { findBackendGame, parseESPNEvent } from "../../lib/espn.js";
import { EmptyState, SkeletonCard } from "../../components/shared/SportPageShell.jsx";

export function BaseballPage({ data={events:[],loading:true,error:false}, onTrade, liveGames=[] }) {
  const games  = data.events.map(parseESPNEvent);
  const live    = games.filter(g => g.isLive);
  const final   = games.filter(g => g.isFinal && isRecent(g.date));
  const sched   = games.filter(g => g.isScheduled).sort(byDate);
  const delayed = games.filter(g => g.isDelayed);
  const isPreGame = (g) => !!findBackendGame(liveGames, g, 'mlb')?.pregame;
  const pregame  = sched.filter(isPreGame);
  const upcoming = sched.filter(g => !isPreGame(g));

  const GameCard = ({ g }) => {
    const homeScore = parseInt(g.home.score) || 0;
    const awayScore = parseInt(g.away.score) || 0;
    const homeWinning = homeScore > awayScore;
    const tied = homeScore === awayScore;
    const bg = findBackendGame(liveGames, g, 'mlb');
    const isPre = g.isScheduled && !!bg?.pregame;
    const statusColor = g.isLive ? B.green : isPre ? B.primaryLight : g.isDelayed ? "#ff9f1c" : g.isFinal ? "#555" : "#555";
    const statusLabel = g.isLive ? "LIVE" : isPre ? "PREGAME" : g.isDelayed ? "DELAYED" : g.isFinal ? "FINAL" : "UPCOMING";

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
        {g.isScheduled && (()=>{const when=fmtGameTime(g.date);return(when||g.detail)?(
          <div style={{fontSize:11,color:"#888",fontFamily:fm,marginTop:8,letterSpacing:"0.04em"}}>{when}{when&&g.detail?" · ":""}{g.detail||""}</div>
        ):null;})()}
        {(g.isLive||isPre)&&(()=>{const wp=bg?.oracle?.indexPrice?(bg.oracle.indexPrice*100).toFixed(1):null;return(<>
          {wp&&<div style={{marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:10,color:B.primary,fontWeight:700,fontFamily:fm}}>{wp}% {g.home.name}</span>
              <span style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:fm}}>{(100-parseFloat(wp)).toFixed(1)}% {g.away.name}</span>
            </div>
            <div style={{height:4,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:wp+"%",background:`linear-gradient(90deg, ${B.primary}, ${B.primaryLight})`,borderRadius:4,transition:"width .5s ease"}}/>
            </div>
          </div>}
          {onTrade&&bg&&<button onClick={()=>onTrade(bg)} style={{width:"100%",marginTop:10,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:13,
            background:isPre?"linear-gradient(135deg,"+B.red+",#ff7a6e)":"linear-gradient(135deg,"+B.green+","+B.greenLight+")",color:isPre?"#fff":"#000",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {!isPre&&<span style={{width:6,height:6,borderRadius:"50%",background:"#000",opacity:0.5,animation:"pulse 1.5s infinite"}}/>}
            {isPre?"Trade Pre-Game":"Trade Live"}
          </button>}
        </>);})()}
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
          {data.loading ? "Loading games…" : data.error ? "Could not reach ESPN - try again shortly." : `${games.length} game${games.length!==1?"s":""} today · live data from ESPN`}
        </p>
      </div>

      {data.loading && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
          {[0,1,2,3].map(i=><SkeletonCard key={i}/>)}
        </div>
      )}

      {!data.loading && !data.error && games.length === 0 && <EmptyState emoji="⚾" sport="MLB" scheduledGames={sched}/>}

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

      {/* Pregame - open for wagering */}
      {pregame.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primaryLight,letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>◷ PREGAME - OPEN FOR WAGERING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {pregame.map(g=><GameCard key={g.id} g={g}/>)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>UPCOMING</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
            {upcoming.map(g=><GameCard key={g.id} g={g}/>)}
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
