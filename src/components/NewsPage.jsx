/**
 * News page (nav-rail newspaper icon) — the Following feed: live trading activity of every
 * trader you follow (opens, closes, TP/SL, liquidations, settlements with PnL). Sports-news
 * articles remain the coming-soon half.
 */
import { useCallback, useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { B, fd, fm, fb } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId } from "../lib/auth.js";
import { parseAvatar } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";

const GREEN = "#5ed87e";

const VERB = {
  open: (e) => `opened ${e.side} ${e.leverage ? `${e.leverage}x` : ""}${e.notional ? ` · $${Math.round(e.notional).toLocaleString()}` : ""}`,
  close: () => "cashed out",
  tp: () => "hit take-profit ✅",
  sl: () => "hit stop-loss",
  liquidation: () => "got liquidated 💥",
  settlement: () => "settled at the whistle",
};

const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export function NewsPage() {
  const authed = !!getAuth();
  const me = currentUserId();
  const [events, setEvents] = useState(null);   // null = loading
  const [followingCount, setFollowingCount] = useState(0);

  const load = useCallback(async () => {
    if (!authed) { setEvents([]); return; }
    try {
      const r = await fetch(`${API_URL}/feed/${me}?token=${encodeURIComponent(authToken() || "")}`);
      if (!r.ok) { setEvents([]); return; }
      const d = await r.json();
      setEvents(d.events || []);
      setFollowingCount(d.followingCount || 0);
    } catch { setEvents([]); }
  }, [authed, me]);

  useEffect(() => { load(); const iv = setInterval(load, 30_000); return () => clearInterval(iv); }, [load]);

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px 60px", display: "flex", flexDirection: "column", fontFamily: fb }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Newspaper size={18} color={B.primary} />
        <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>NEWS</div>
      </div>
      <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 4 }}>Following</h2>
      <div style={{ fontSize: 13, color: "#8a8f98", marginBottom: 22 }}>
        {followingCount > 0
          ? `Live moves from the ${followingCount} trader${followingCount === 1 ? "" : "s"} you follow.`
          : "Follow traders from the leaderboard to see their moves here."}
      </div>

      <div style={{ maxWidth: 640 }}>
        {events == null && <div style={{ color: "#8a8f98", fontSize: 13, padding: "24px 0" }}>Loading…</div>}
        {events?.length === 0 && (
          <div style={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "34px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>👀</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Nothing here yet</div>
            <div style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.6 }}>
              {authed
                ? "Open a public trader's profile from the leaderboard and hit Follow — their opens, cash-outs, TP/SL hits and liquidations land here with PnL."
                : "Log in, then follow traders from the leaderboard to build your feed."}
            </div>
          </div>
        )}
        {events?.map((e, i) => {
          const av = parseAvatar(e.avatar);
          const pnlish = e.pnl != null && e.type !== "open";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#1d2026", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {av ? <AvatarCircle avatar={av} size={34} /> : <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 14, color: "#cfd4dc" }}>{(e.username || "?").charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "#e8ebf0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{e.username || "trader"}</span>{" "}
                  {(VERB[e.type] || (() => e.type))(e)}
                  {e.game ? <span style={{ color: "#9aa0a8" }}> · {e.game}</span> : null}
                </div>
                <div style={{ fontSize: 11, color: "#6f7581", marginTop: 2, fontFamily: fm }}>{ago(e.at)}</div>
              </div>
              {pnlish && (
                <span style={{ fontFamily: fb, fontWeight: 700, fontSize: 14, color: e.pnl >= 0 ? GREEN : "#ff5247", flexShrink: 0 }}>
                  {e.pnl >= 0 ? "+" : "−"}${Math.abs(e.pnl).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 44, maxWidth: 640, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 22 }}>📰</span>
        <div>
          <span style={{ display: "inline-block", fontSize: 9.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.1em", color: B.primaryLight, background: B.primary + "1c", padding: "3px 9px", borderRadius: 999, marginBottom: 5 }}>COMING SOON</span>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>Market-moving sports news</div>
          <div style={{ fontSize: 12, color: "#8a8f98", lineHeight: 1.5 }}>Injury reports, lineups, and momentum stories next to the price they move.</div>
        </div>
      </div>
    </div>
  );
}
