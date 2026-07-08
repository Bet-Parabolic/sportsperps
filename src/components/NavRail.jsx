/**
 * Left nav rail (ported from the mobile design — Frame 2147263018): icon destinations only —
 * home / active bets / news / bookmarks / leaderboard. Desktop only; on mobile these fold into
 * the top tab bar. (The live-markets pill was removed July 2026 — market counts live in the top
 * nav's per-sport badges, and saved markets get their own bookmarks page.)
 */
import { Home, Ticket, Newspaper, Bookmark, Trophy } from "lucide-react";

const RAIL_W = 76;

export function NavRail({ active, onNav, hide = [] }) {
  const items = [
    { key: "home", Icon: Home, label: "Home" },
    { key: "bets", Icon: Ticket, label: "Active bets" },
    { key: "news", Icon: Newspaper, label: "News" },
    { key: "bookmarks", Icon: Bookmark, label: "Bookmarks" },
    { key: "leaderboard", Icon: Trophy, label: "Leaderboard" },
  ];

  return (
    <div style={{ width: RAIL_W, flexShrink: 0, borderRight: "1px solid #16181d", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0", gap: 6, overflowY: "auto", height: "100%" }} className="mob-nav">
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
    </div>
  );
}
