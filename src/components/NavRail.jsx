/**
 * Left nav rail (July 21 2026 redesign — Figma Parabolic-7-21-26): icon destinations
 * (home / active bets / news / bookmarks / leaderboard), a LIVE-GAMES bubble under the
 * leaderboard icon (green dot + count + up to three sport mini-icons; click → the home
 * page's live filter), and a bottom footer with the same three links the World Cup page
 * carries: Parabolic mark → parabolic.gg, docs, X.
 */
import { Home, Ticket, Newspaper, Bookmark, Trophy, BookOpen } from "lucide-react";
import { LOGO_MARK } from "../lib/logos.js";

const RAIL_W = 76;

const SPORT_EMOJI = { nba: "🏀", ncaam: "🏀", mlb: "⚾", nfl: "🏈", nhl: "🏒", mls: "⚽", wcup: "⚽" };

export function NavRail({ active, onNav, hide = [], liveGames = [], onLiveClick, onGameClick }) {
  const items = [
    { key: "home", Icon: Home, label: "Home" },
    { key: "bets", Icon: Ticket, label: "Active Bets" },
    { key: "news", Icon: Newspaper, label: "News" },
    { key: "bookmarks", Icon: Bookmark, label: "Bookmarks" },
    { key: "leaderboard", Icon: Trophy, label: "Leaderboard" },
  ];
  const live = liveGames.filter((g) => g.status === "live" || g.status === "halftime");

  const footLink = { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, opacity: 0.5, transition: "opacity .15s" };

  return (
    <div style={{ width: RAIL_W, flexShrink: 0, borderRight: "1px solid #16181d", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 14px", gap: 6, overflowY: "auto", height: "100%" }} className="mob-nav">
      {items.filter(({ key }) => !hide.includes(key)).map(({ key, Icon, label }) => {
        const on = active === key;
        return (
          <button key={key} onClick={() => onNav(key)} title={label} style={{
            width: 46, height: 46, borderRadius: 14, border: "none", cursor: "pointer", flexShrink: 0,
            background: on ? "#1a1d22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
          }}>
            <Icon size={22} color={on ? "#fff" : "#63676e"} strokeWidth={2.2} />
          </button>
        );
      })}

      {/* live-games bubble — under the leaderboard icon (Figma 195-24262): green dot + count,
          then one circle PER live game (team logo, fallback sport emoji). The dot/count jumps to
          the home Live filter; each game circle switches straight to that market. */}
      {live.length > 0 && (
        <div title={`${live.length} live game${live.length === 1 ? "" : "s"}`} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "9px 5px",
          borderRadius: 999, border: "1px solid #1d2026", background: "#101114", flexShrink: 0, marginTop: 2,
        }}>
          <button onClick={onLiveClick} title="All live games" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: onLiveClick ? "pointer" : "default", padding: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.6s infinite" }} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#e6e9ee", fontFamily: "inherit" }}>{live.length}</span>
          </button>
          {live.slice(0, 3).map((g) => (
            <button key={g.id} onClick={onGameClick ? () => onGameClick(g) : onLiveClick}
              title={`${g.away?.abbreviation ?? ""} @ ${g.home?.abbreviation ?? ""} — live`}
              style={{ width: 26, height: 26, borderRadius: "50%", background: "#181b20", border: "1px solid #22252b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, overflow: "hidden" }}>
              {g.home?.logo
                ? <img src={g.home.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                : <span style={{ fontSize: 12 }}>{SPORT_EMOJI[g.league] || "🏟️"}</span>}
            </button>
          ))}
        </div>
      )}

      {/* bottom footer — same trio as the World Cup page */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 14 }}>
        <a data-ungated="1" href="https://parabolic.gg" target="_blank" rel="noopener noreferrer" aria-label="Parabolic home" title="parabolic.gg" style={footLink}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}>
          <img src={LOGO_MARK} alt="Parabolic" style={{ width: 18, height: 18, objectFit: "contain" }} />
        </a>
        <a data-ungated="1" href="https://docs.parabolic.gg/docs" target="_blank" rel="noopener noreferrer" aria-label="Parabolic docs" title="Docs" style={footLink}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}>
          <BookOpen size={17} color="#aeb4bd" />
        </a>
        <a data-ungated="1" href="https://x.com/betparabolic" target="_blank" rel="noopener noreferrer" aria-label="Parabolic on X" title="@betparabolic on X" style={footLink}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#aeb4bd" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
