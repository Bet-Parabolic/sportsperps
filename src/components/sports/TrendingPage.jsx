import { B, fd, fm } from "../../lib/theme.js";
import { ESPN_SOURCES } from "../../lib/constants.js";
import { periodLabel } from "../../lib/helpers.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { Grid, SectionHeader, SkeletonCard } from "../../components/shared/SportPageShell.jsx";

export function TrendingPage({ liveGames, espnData={}, onTrade }) {
  // The Live tab renders backend games only (they carry real odds + are tradeable).
  const backendLive = liveGames.filter(g => g.status==="live" || g.status==="halftime");
  // Only show skeletons before we have any backend games AND ESPN is still loading.
  const loading = backendLive.length===0 && ESPN_SOURCES.some(s => espnData[s.key]?.loading !== false);

  // Group backend live games by sport
  const backendBySport = {};
  const sportEmoji = {nba:"🏀",ncaam:"🏀",mlb:"⚾",nfl:"🏈",nhl:"🏒",mls:"⚽",wcup:"🏆"};
  const sportLabel = {nba:"BASKETBALL",ncaam:"BASKETBALL",mlb:"BASEBALL",nfl:"FOOTBALL",nhl:"HOCKEY",mls:"SOCCER",wcup:"WORLD CUP"};
  backendLive.forEach(g => {
    const key = g.league || "nba";
    if (!backendBySport[key]) backendBySport[key] = [];
    backendBySport[key].push({
      id: g.id, isLive: true, isFinal: false, isScheduled: false, isHalf: g.status==="halftime", isDelayed: false,
      detail: periodLabel(g.league, g.period, g.clock, g.statusDetail),
      home: { name: g.home.name||"", abbr: g.home.abbreviation||"", logo: g.home.logo||"", score: g.home.score??null },
      away: { name: g.away.name||"", abbr: g.away.abbreviation||"", logo: g.away.logo||"", score: g.away.score??null },
      _backendGame: g,
    });
  });

  const totalLive = backendLive.length;

  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>LIVE</div>
          {totalLive>0&&<span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>{totalLive} LIVE</span>}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>Live Right Now</h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>
          {loading?"Fetching live games…":`All live action across the NFL, NBA, MLB, NHL, MLS, and World Cup`}
        </p>
      </div>

      {loading&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>{[0,1,2,3].map(i=><SkeletonCard key={i}/>)}</div>}

      {!loading&&totalLive===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:36,marginBottom:12}}>📡</div>
          <div style={{fontSize:15,color:"#888",fontWeight:600,marginBottom:8}}>Nothing live right now</div>
          <div style={{fontSize:13,color:"#555"}}>Check individual sport tabs for upcoming schedules.</div>
        </div>
      )}

      {/* Backend live games grouped by sport */}
      {Object.entries(backendBySport).map(([key, games]) => (
        <div key={key} style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>{sportEmoji[key]||"🏀"}</span>
            <SectionHeader label={sportLabel[key]||key.toUpperCase()} color={B.green}/>
          </div>
          <Grid>{games.map(g=><MatchCard key={g.id} g={{...g,_raw:g._backendGame}} emoji={sportEmoji[key]||"🏀"} onTrade={onTrade?()=>onTrade(g._backendGame):null} _espnKey={key} liveGames={liveGames}/>)}</Grid>
        </div>
      ))}

      {/* ESPN-only games removed — all live games come from backend with real odds */}
    </div>
  );
}
