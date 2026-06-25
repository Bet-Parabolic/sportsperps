import { B, fd, fm } from "../../lib/theme.js";
import { periodLabel } from "../../lib/helpers.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { Grid, SkeletonCard } from "../../components/shared/SportPageShell.jsx";

// Sport groups define how the home page is organized: each section is one sport (NBA + NCAAM
// merge into Basketball; World Cup is split out from club Soccer). Order here is the fallback
// order; sports with live games float to the top.
const SPORT_GROUPS = [
  { key: "nfl",  label: "Football",   emoji: "🏈", leagues: ["nfl"] },
  { key: "nba",  label: "Basketball", emoji: "🏀", leagues: ["nba", "ncaam"] },
  { key: "mlb",  label: "Baseball",   emoji: "⚾", leagues: ["mlb"] },
  { key: "nhl",  label: "Hockey",     emoji: "🏒", leagues: ["nhl"] },
  { key: "wcup", label: "World Cup",  emoji: "🏆", leagues: ["wcup"] },
  { key: "mls",  label: "Soccer",     emoji: "⚽", leagues: ["mls"] },
];
const MAX_UPCOMING_PER_SPORT = 6;

const classify = (g) =>
  (g.status === "live" || g.status === "halftime") ? "live"
  : (g.status === "scheduled" && g.pregame) ? "pregame"
  : (g.status === "scheduled") ? "upcoming"
  : "other";

// Map a backend game object → the shape MatchCard expects.
function toCard(g) {
  const isLive = g.status === "live" || g.status === "halftime";
  return {
    id: g.id,
    isLive, isHalf: g.status === "halftime", isScheduled: g.status === "scheduled", isFinal: g.status === "final", isDelayed: false,
    isPregame: g.pregame === true, tradeable: g.tradeable === true,
    date: g.startTime,
    detail: isLive ? periodLabel(g.league, g.period, g.clock, g.statusDetail) : "",
    home: { name: g.home.name || "", abbr: g.home.abbreviation || "", logo: g.home.logo || "", score: g.home.score ?? null },
    away: { name: g.away.name || "", abbr: g.away.abbreviation || "", logo: g.away.logo || "", score: g.away.score ?? null },
    _backendGame: g, _league: g.league,
  };
}

export function HomePage({ liveGames = [], onTrade }) {
  // Keep only games we can show (named teams) that are live / pregame / upcoming.
  const named = (g) => g.home?.name && g.away?.name && g.home.name !== "TBD" && g.away.name !== "TBD";
  const relevant = liveGames.filter((g) => ["live", "pregame", "upcoming"].includes(classify(g)) && named(g));
  const totalLive = relevant.filter((g) => classify(g) === "live").length;

  // Build one section per sport group (with games), ordered: live sports first, then fixed order.
  const rank = { live: 0, pregame: 1, upcoming: 2 };
  const sections = SPORT_GROUPS.map((grp, idx) => {
    const all = relevant
      .filter((g) => grp.leagues.includes(g.league || "nba"))
      .sort((a, b) => (rank[classify(a)] - rank[classify(b)]) || (new Date(a.startTime || 0) - new Date(b.startTime || 0)));
    const liveCount = all.filter((g) => classify(g) === "live").length;
    // Cap the upcoming tail per sport so a long schedule doesn't bury the next sport.
    const upcoming = all.filter((g) => classify(g) === "upcoming");
    const games = all.filter((g) => classify(g) !== "upcoming").concat(upcoming.slice(0, MAX_UPCOMING_PER_SPORT));
    return { ...grp, idx, games, liveCount };
  }).filter((s) => s.games.length > 0)
    .sort((a, b) => (b.liveCount > 0) - (a.liveCount > 0) || (b.liveCount - a.liveCount) || (a.idx - b.idx));

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>MARKETS</div>
          {totalLive > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: B.green, fontFamily: fm, padding: "2px 8px", background: B.green + "15", borderRadius: 6, letterSpacing: "0.06em", animation: "pulse 2s infinite" }}>{totalLive} LIVE</span>}
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 8 }}>Markets by sport</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Trade live and pregame games, or browse what's coming up — organized by sport.</p>
      </div>

      {sections.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* One section per sport */}
      {sections.map((s) => (
        <div key={s.key} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <span style={{ fontSize: 19 }}>{s.emoji}</span>
            <span style={{ fontFamily: fd, fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{s.label}</span>
            {s.liveCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: B.green, fontFamily: fm, padding: "2px 7px", background: B.green + "15", borderRadius: 5, letterSpacing: "0.06em" }}>{s.liveCount} LIVE</span>}
          </div>
          <Grid>{s.games.map((g) => {
            const tradeable = classify(g) === "live" || classify(g) === "pregame";
            return <MatchCard key={g.id} g={toCard(g)} emoji={s.emoji} onTrade={(onTrade && tradeable) ? () => onTrade(g) : null} _espnKey={g.league} liveGames={liveGames} />;
          })}</Grid>
        </div>
      ))}
    </div>
  );
}
