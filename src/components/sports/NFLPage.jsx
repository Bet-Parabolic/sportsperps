import { B } from "../../lib/theme.js";
import { byDate, isRecent } from "../../lib/helpers.js";
import { findBackendGame, parseESPNEvent } from "../../lib/espn.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { EmptyState, Grid, SectionHeader, SportPageShell } from "../../components/shared/SportPageShell.jsx";

export function NFLPage({ data={events:[],loading:true,error:false}, onTrade, liveGames=[] }) {
  const games = data.events.map(parseESPNEvent);
  const live  = games.filter(g => g.isLive);
  const final = games.filter(g => g.isFinal && isRecent(g.date));
  const sched = games.filter(g => g.isScheduled).sort(byDate);
  const tradeFn = onTrade ? (g) => { const bg = findBackendGame(liveGames, g, 'nfl'); if (bg) onTrade(bg); } : null;
  return (
    <SportPageShell title="NFL" subtitle="FOOTBALL" emoji="🏈" liveCount={live.length} loading={data.loading} error={data.error}>
      {!data.loading&&!data.error&&games.length===0&&<EmptyState emoji="🏈" sport="NFL" scheduledGames={sched}/>}
      {live.length>0&&<><SectionHeader label="● LIVE NOW" color={B.green}/><Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord onTrade={tradeFn} _espnKey="nfl" liveGames={liveGames}/>)}</Grid></>}
      {sched.length>0&&<><SectionHeader label="UPCOMING"/><Grid>{sched.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord/>)}</Grid></>}
      {final.length>0&&<><SectionHeader label="FINAL"/><Grid>{final.map(g=><MatchCard key={g.id} g={g} emoji="🏈" showRecord/>)}</Grid></>}
    </SportPageShell>
  );
}
