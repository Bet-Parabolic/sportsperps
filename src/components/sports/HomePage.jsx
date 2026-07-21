import { B, fd, fm } from "../../lib/theme.js";
import { periodLabel } from "../../lib/helpers.js";
import { MatchCard } from "../../components/shared/MatchCard.jsx";
import { Grid, SectionHeader, SkeletonCard } from "../../components/shared/SportPageShell.jsx";

// Per-league emoji (used for the mixed "Live" section where cards span sports).
const leagueEmoji = { nba: "🏀", ncaam: "🏀", mlb: "⚾", nfl: "🏈", nhl: "🏒", mls: "⚽", wcup: "🏆" };

// Upcoming is grouped by sport in this fixed order — Baseball first (in season now).
// (World Cup group removed July 20, 2026 — tournament over; wcup games, if any ever
//  reappear, would fall through to no group and simply not list here.)
const SPORT_GROUPS = [
  { key: "mlb",  label: "Baseball",   emoji: "⚾", leagues: ["mlb"] },
  { key: "nfl",  label: "Football",   emoji: "🏈", leagues: ["nfl"] },
  { key: "nba",  label: "Basketball", emoji: "🏀", leagues: ["nba", "ncaam"] },
  { key: "nhl",  label: "Hockey",     emoji: "🏒", leagues: ["nhl"] },
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
  const named = (g) => g.home?.name && g.away?.name && g.home.name !== "TBD" && g.away.name !== "TBD";
  const relevant = liveGames.filter((g) => ["live", "pregame", "upcoming"].includes(classify(g)) && named(g));

  // All live games, across sports, in one section.
  const live = relevant.filter((g) => classify(g) === "live");

  // Everything else grouped by sport (pregame first, then upcoming; upcoming tail capped).
  const sections = SPORT_GROUPS.map((grp) => {
    const inSport = relevant.filter((g) => grp.leagues.includes(g.league || "nba") && classify(g) !== "live");
    const pregame = inSport.filter((g) => classify(g) === "pregame")
      .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
    const upcoming = inSport.filter((g) => classify(g) === "upcoming")
      .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
      .slice(0, MAX_UPCOMING_PER_SPORT);
    return { ...grp, games: [...pregame, ...upcoming] };
  }).filter((s) => s.games.length > 0);

  const hasAny = live.length > 0 || sections.length > 0;

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>MARKETS</div>
          {live.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: B.green, fontFamily: fm, padding: "2px 8px", background: B.green + "15", borderRadius: 6, letterSpacing: "0.06em", animation: "pulse 2s infinite" }}>{live.length} LIVE</span>}
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 8 }}>Live &amp; upcoming</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Trade live games now, or browse what's coming up - upcoming markets organized by sport.</p>
      </div>

      {!hasAny && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* LIVE - all sports together, tradeable */}
      {live.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeader label="● LIVE" color={B.green} />
          <Grid>{live.map((g) => (
            <MatchCard key={g.id} g={toCard(g)} emoji={leagueEmoji[g.league] || "🏀"} onTrade={onTrade ? () => onTrade(g) : null} _espnKey={g.league} liveGames={liveGames} />
          ))}</Grid>
        </div>
      )}

      {/* UPCOMING - one section per sport (Baseball first) */}
      {sections.map((s) => (
        <div key={s.key} style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <span style={{ fontSize: 19 }}>{s.emoji}</span>
            <span style={{ fontFamily: fd, fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{s.label}</span>
          </div>
          <Grid>{s.games.map((g) => {
            const tradeable = classify(g) === "pregame";
            return <MatchCard key={g.id} g={toCard(g)} emoji={s.emoji} onTrade={(onTrade && tradeable) ? () => onTrade(g) : null} _espnKey={g.league} liveGames={liveGames} />;
          })}</Grid>
        </div>
      ))}
    </div>
  );
}
