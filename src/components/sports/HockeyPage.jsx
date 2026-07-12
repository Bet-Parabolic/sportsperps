import { B } from "../../lib/theme.js";
import { byDate, isRecent } from "../../lib/helpers.js";
import { findBackendGame, parseESPNEvent } from "../../lib/espn.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { EmptyState, Grid, SectionHeader, SportPageShell } from "../../components/shared/SportPageShell.jsx";

export function HockeyPage({ data={events:[],loading:true,error:false}, onTrade, liveGames=[] }) {
  const games = data.events.map(parseESPNEvent);
  const live = games.filter(g=>g.isLive);
  const final = games.filter(g=>g.isFinal && isRecent(g.date));
  const sched = games.filter(g=>g.isScheduled).sort(byDate);
  const tradeFn = onTrade ? (g) => { const bg = findBackendGame(liveGames, g, 'nhl'); if (bg) onTrade(bg); } : null;
  const isPre = (g) => !!findBackendGame(liveGames, g, 'nhl')?.pregame;
  const pregame = sched.filter(isPre).map(g => ({ ...g, isPregame: true }));
  const upcoming = sched.filter(g => !isPre(g));
  return (
    <SportPageShell title="NHL" subtitle="HOCKEY" emoji="🏒" liveCount={live.length} loading={data.loading} error={data.error}>
      {!data.loading&&!data.error&&games.length===0&&<EmptyState emoji="🏒" sport="NHL" scheduledGames={sched}/>}
      {live.length>0&&<><SectionHeader label="● LIVE NOW" color={B.green}/><Grid>{live.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord onTrade={tradeFn} _espnKey="nhl" liveGames={liveGames}/>)}</Grid></>}
      {pregame.length>0&&<><SectionHeader label="◷ PREGAME - OPEN FOR WAGERING" color={B.primaryLight}/><Grid>{pregame.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord onTrade={tradeFn} _espnKey="nhl" liveGames={liveGames}/>)}</Grid></>}
      {upcoming.length>0&&<><SectionHeader label="UPCOMING"/><Grid>{upcoming.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord _espnKey="nhl" liveGames={liveGames}/>)}</Grid></>}
      {final.length>0&&<><SectionHeader label="FINAL"/><Grid>{final.map(g=><MatchCard key={g.id} g={g} emoji="🏒" showRecord/>)}</Grid></>}
    </SportPageShell>
  );
}
