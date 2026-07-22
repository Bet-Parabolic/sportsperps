/**
 * Notifications feed — derived from the account's closed_trades history (server-persisted, so it
 * survives reloads and follows the user across devices). Covers exactly the "happened while you
 * were away" events: liquidations, settlements, TP/SL triggers, deleverages, and manual closes.
 * The unread dot is driven by a per-user last-seen timestamp in localStorage.
 */
import { API_URL } from "./constants.js";
import { authToken } from "./auth.js";

// close_type (backend) → display. tone drives the P&L colour; icon is the row glyph.
const TYPE_META = {
  LIQ:     { label: "Liquidated",        icon: "⚠", tone: "loss" },
  SETTLED: { label: "Market settled",    icon: "🏁", tone: "neutral" },
  TP:      { label: "Take-profit hit",   icon: "🎯", tone: "win" },
  SL:      { label: "Stop-loss hit",     icon: "✋", tone: "loss" },
  DELEV:   { label: "Auto-deleveraged",  icon: "📉", tone: "neutral" },
  CLOSED:  { label: "Position closed",   icon: "✓", tone: "neutral" },
};

const seenKey = (userId, wc) => `parabolic_notif_seen_${wc ? "wc_" : ""}${userId || "guest"}`;
export function lastSeen(userId, wc) {
  try { return Number(localStorage.getItem(seenKey(userId, wc))) || 0; } catch { return 0; }
}
export function markSeen(userId, wc, ts) {
  try { localStorage.setItem(seenKey(userId, wc), String(ts || 0)); } catch { /* private mode */ }
}

// Map a closed_trades row (snake_case from the API, teamName attached by withTeamNames) → a notif.
export function tradeToNotif(t) {
  const type = String(t.close_type || t.closeType || "CLOSED").toUpperCase();
  const meta = TYPE_META[type] || TYPE_META.CLOSED;
  const ts = Number(t.closed_at ?? t.closedAt ?? 0);
  const gameId = t.game_id || t.gameId || "";
  const team = t.teamName || t.team ||
    (t.side === "home" ? (t.homeTeam || t.home) : (t.awayTeam || t.away)) || "your position";
  return { id: `${gameId}-${ts}-${type}`, type, ts, pnl: Number(t.pnl ?? 0), ...meta, team };
}

export async function fetchNotifications(userId, { worldcup = false, limit = 25 } = {}) {
  if (!userId) return [];
  const base = worldcup ? "event/profile" : "profile";
  try {
    const r = await fetch(`${API_URL}/${base}/${userId}/trades?limit=${limit}&token=${encodeURIComponent(authToken() || "")}`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.trades || []).map(tradeToNotif).filter((n) => n.ts > 0);
  } catch { return []; }
}

// "3m", "2h", "5d" — compact relative time. Absolute times aren't available offline; callers pass now.
export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
