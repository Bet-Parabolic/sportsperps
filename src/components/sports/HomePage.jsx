import { B, fd, fm } from "../../lib/theme.js";
import { periodLabel } from "../../lib/helpers.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { Grid, SectionHeader, SkeletonCard } from "../../components/shared/SportPageShell.jsx";

const sportEmoji = { nba:"🏀", ncaam:"🏀", mlb:"⚾", nfl:"🏈", nhl:"🏒", mls:"⚽", wcup:"🏆" };
const sportLabel = { nba:"BASKETBALL", ncaam:"BASKETBALL", mlb:"BASEBALL", nfl:"FOOTBALL", nhl:"HOCKEY", mls:"SOCCER", wcup:"WORLD CUP" };

// Map a backend game object → the shape MatchCard expects
function toCard(g) {
  const isLive = g.status === "live" || g.status === "halftime";
  return {
    id: g.id,
    isLive, isHalf: g.status === "halftime", isScheduled: g.status === "scheduled", isFinal: g.status === "final", isDelayed: false,
    isPregame: g.pregame === true, tradeable: g.tradeable === true,
    date: g.startTime,
    detail: isLive ? periodLabel(g.league, g.period, g.clock, g.statusDetail) : "",
    home: { name: g.home.name||"", abbr: g.home.abbreviation||"", logo: g.home.logo||"", score: g.home.score??null },
    away: { name: g.away.name||"", abbr: g.away.abbreviation||"", logo: g.away.logo||"", score: g.away.score??null },
    _backendGame: g, _league: g.league,
  };
}

export function HomePage({ liveGames = [], onTrade }) {
  const live = liveGames.filter(g => g.status === "live" || g.status === "halftime");
  const namedScheduled = liveGames
    .filter(g => g.status === "scheduled" && g.startTime)
    .filter(g => g.home?.name && g.away?.name && g.home.name !== "TBD" && g.away.name !== "TBD")
    .sort((a, b) => new Date(a.startTime||0) - new Date(b.startTime||0));
  // Pregame = scheduled games the backend has opened for wagering (within 1h of kickoff, oracle seeded)
  const pregame = namedScheduled.filter(g => g.pregame);
  const upcoming = namedScheduled.filter(g => !g.pregame).slice(0, 18);

  // group live by sport
  const liveBySport = {};
  live.forEach(g => { const k = g.league || "nba"; (liveBySport[k] ||= []).push(g); });

  const hasAny = live.length > 0 || pregame.length > 0 || upcoming.length > 0;

  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>MARKETS</div>
          {live.length>0&&<span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>{live.length} LIVE</span>}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>Live &amp; Upcoming</h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6}}>Trade live games now, or browse what's coming up across the NFL, NBA, MLB, NHL, MLS, and World Cup.</p>
      </div>

      {!hasAny && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12}}>
          {[0,1,2,3].map(i=><SkeletonCard key={i}/>)}
        </div>
      )}

      {/* LIVE NOW — grouped by sport, tradeable */}
      {Object.entries(liveBySport).map(([key, games]) => (
        <div key={key} style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>{sportEmoji[key]||"🏀"}</span>
            <SectionHeader label={"● "+(sportLabel[key]||key.toUpperCase())} color={B.green}/>
          </div>
          <Grid>{games.map(g=>{const card=toCard(g);return(
            <MatchCard key={g.id} g={card} emoji={sportEmoji[key]||"🏀"} onTrade={onTrade?()=>onTrade(g):null} _espnKey={key} liveGames={liveGames}/>
          );})}</Grid>
        </div>
      ))}

      {/* PREGAME — open for wagering (within 1h of kickoff), tradeable */}
      {pregame.length>0 && (
        <div style={{marginBottom:32}}>
          <SectionHeader label="◷ PREGAME — OPEN FOR WAGERING" color={B.primaryLight}/>
          <Grid>{pregame.map(g=>(
            <MatchCard key={g.id} g={toCard(g)} emoji={sportEmoji[g.league]||"🗓️"} onTrade={onTrade?()=>onTrade(g):null} _espnKey={g.league} liveGames={liveGames}/>
          ))}</Grid>
        </div>
      )}

      {/* UPCOMING — browse, with date/time */}
      {upcoming.length>0 && (
        <div style={{marginBottom:32}}>
          <SectionHeader label="UPCOMING"/>
          <Grid>{upcoming.map(g=>(
            <MatchCard key={g.id} g={toCard(g)} emoji={sportEmoji[g.league]||"🗓️"} liveGames={liveGames}/>
          ))}</Grid>
        </div>
      )}
    </div>
  );
}
