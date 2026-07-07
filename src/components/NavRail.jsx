/**
 * Left nav rail (ported from the mobile design — Frame 2147263018): brand mark, four icon
 * destinations (home / active bets / news / leaderboard), and below them a live-markets pill —
 * green dot + live count + stacked team-logo bubbles for every live and pre-game market.
 * Clicking a bubble jumps straight into that game's terminal.
 * Desktop only — mobile keeps the top tab bar (Bets/News fold into it there).
 */
import { Home, Ticket, Newspaper, Trophy } from "lucide-react";
import { B, fm } from "../lib/theme.js";
import { LOGO_MARK } from "../lib/logos.js";

const RAIL_W = 76;

export function NavRail({ active, onNav, liveGames = [], onTrade }) {
  const live = liveGames.filter((g) => g.status === "live" || g.status === "halftime");
  const pregame = liveGames.filter((g) => g.status === "scheduled" && (g.pregame || g.tradeable));
  const markets = [...live, ...pregame];
  const MAX_BUBBLES = 6;
  const shown = markets.slice(0, MAX_BUBBLES);
  const overflow = markets.length - shown.length;

  const items = [
    { key: "home", Icon: Home, label: "Home" },
    { key: "bets", Icon: Ticket, label: "Active bets" },
    { key: "news", Icon: Newspaper, label: "News" },
    { key: "leaderboard", Icon: Trophy, label: "Leaderboard" },
  ];

  return (
    <div style={{ width: RAIL_W, flexShrink: 0, borderRight: "1px solid #16181d", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0 18px", gap: 6, overflowY: "auto", height: "100%" }} className="mob-nav">
      {/* brand mark */}
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, flexShrink: 0 }}>
        <img src={LOGO_MARK} alt="Parabolic" style={{ width: 26, height: 26, filter: "invert(1)" }} />
      </div>

      {/* destinations */}
      {items.map(({ key, Icon, label }) => {
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

      {/* live + pregame markets pill */}
      {markets.length > 0 && (
        <div style={{ marginTop: 14, background: "#111318", border: "1px solid #1b1e24", borderRadius: 999, padding: "12px 0 8px", width: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: live.length > 0 ? B.green : "#555", animation: live.length > 0 ? "pulse 1.5s infinite" : "none" }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: fm, lineHeight: 1 }}>{live.length || markets.length}</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {shown.map((g, i) => (
              <button key={g.id} onClick={() => onTrade(g)} title={`${g.home?.name ?? ""} vs ${g.away?.name ?? ""}`} style={{
                width: 34, height: 34, borderRadius: "50%", border: "2px solid #111318", background: "#1c1f26",
                padding: 0, cursor: "pointer", marginTop: i === 0 ? 0 : -8, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: shown.length - i,
              }}>
                {g.home?.logo
                  ? <img src={g.home.logo} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />
                  : <span style={{ fontSize: 10, fontWeight: 800, color: "#aaa", fontFamily: fm }}>{(g.home?.abbreviation || "?").slice(0, 3)}</span>}
                {(g.status === "live" || g.status === "halftime") && (
                  <span style={{ position: "absolute", right: 1, bottom: 1, width: 7, height: 7, borderRadius: "50%", background: B.green, border: "1.5px solid #111318" }} />
                )}
              </button>
            ))}
            {overflow > 0 && (
              <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid #111318", background: "#1c1f26", marginTop: -8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#9aa0a8", fontFamily: fm }}>
                +{overflow}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
