/**
 * News page (nav-rail newspaper icon) — two feeds:
 *   • News — live ESPN headlines/injuries/lineups across ALL leagues we cover (GET /api/news,
 *     sport-tagged), refreshed every 5 min, filterable by sport.
 *   • Following — trading activity of every trader you follow (opens, closes, TP/SL,
 *     liquidations, settlements with PnL).
 */
import { useCallback, useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { B, fd, fm, fb } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId } from "../lib/auth.js";
import { parseAvatar } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";
import { PublicProfilePage } from "./PublicProfilePage.jsx";

const GREEN = "#5ed87e";

// Always speak in TEAM terms — users bet Norway, they don't "open home".
const team = (e) => e.teamName || (e.side ? e.side : "");
const VERB = {
  open: (e) => `bet ${team(e)} ${e.leverage ? `${e.leverage}x` : ""}${e.notional ? ` · $${Math.round(e.notional).toLocaleString()}` : ""}`,
  close: (e) => `cashed out ${team(e)}`,
  tp: (e) => `hit take-profit on ${team(e)} ✅`,
  sl: (e) => `hit stop-loss on ${team(e)}`,
  liquidation: (e) => `got liquidated on ${team(e)} 💥`,
  settlement: (e) => `rode ${team(e)} to the whistle`,
};

const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const CATEGORY_CHIP = {
  injury: { label: "INJURY", color: "#ff5247", bg: "rgba(255,82,71,0.14)" },
  lineup: { label: "LINEUPS", color: "#ffd98a", bg: "rgba(255,173,10,0.12)" },
};
const SPORT_EMOJI = { Football: "🏈", Basketball: "🏀", Baseball: "⚾", Hockey: "🏒", Soccer: "⚽" };

function NewsFeed() {
  const [data, setData] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [sport, setSport] = useState("all");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/news?limit=200`);
      if (!r.ok) throw new Error();
      setData(await r.json()); setFailed(false);
    } catch { setFailed(true); if (!data) setData({ items: [] }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); const iv = setInterval(load, 60_000); return () => clearInterval(iv); }, [load]);

  const all = data?.items || [];
  // Sports present in the feed, in a stable display order, each with a count for the filter chips.
  const ORDER = ["Football", "Basketball", "Baseball", "Hockey", "Soccer"];
  const counts = all.reduce((m, n) => { if (n.sport) m[n.sport] = (m[n.sport] || 0) + 1; return m; }, {});
  const sportsPresent = ORDER.filter((s) => counts[s]);
  const items = sport === "all" ? all : all.filter((n) => n.sport === sport);

  return (
    <div style={{ maxWidth: 680 }}>
      {sportsPresent.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[["all", "All", all.length], ...sportsPresent.map((s) => [s, s, counts[s]])].map(([k, label, n]) => (
            <button key={k} onClick={() => setSport(k)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 999, cursor: "pointer", fontFamily: fb, fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${sport === k ? "transparent" : "#22252c"}`, background: sport === k ? "#fff" : "#101114", color: sport === k ? "#0a0a0a" : "#aeb4bd",
            }}>
              {k !== "all" && <span>{SPORT_EMOJI[k]}</span>}{label}
              <span style={{ fontFamily: fm, fontSize: 10.5, opacity: 0.6 }}>{n}</span>
            </button>
          ))}
        </div>
      )}
      {data == null && (
        <div style={{ display: "grid", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 84, borderRadius: 16, background: "rgba(255,255,255,0.05)", animation: "pulse 1.7s ease-in-out infinite" }} />)}
        </div>
      )}
      {data != null && items.length === 0 && (
        <div style={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "34px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>📰</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 5 }}>
            {failed ? "Couldn't load the news feed" : sport === "all" ? "No stories yet" : `No ${sport} stories right now`}
          </div>
          <div style={{ fontSize: 12.5, color: "#8a8f98" }}>{failed ? "Check your connection - retrying automatically." : "Fresh sports coverage lands here every few minutes."}</div>
        </div>
      )}
      {items.map((n) => {
        const chip = CATEGORY_CHIP[n.category];
        return (
          <a key={n.url} href={n.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", gap: 14, background: "#101114", border: "1px solid #1c1e24", borderRadius: 14, padding: "14px 16px", marginBottom: 8, textDecoration: "none", alignItems: "flex-start" }}>
            {n.image && (
              <img src={n.image} alt="" loading="lazy"
                style={{ width: 108, height: 68, objectFit: "cover", borderRadius: 10, flexShrink: 0, background: "#14161a" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontFamily: fm, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", color: n.source.startsWith("@") ? "#8ecbff" : B.primaryLight }}>{n.source.toUpperCase()}</span>
                {n.leagueLabel && <span style={{ fontFamily: fm, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "#c8cdd5", background: "#ffffff10", padding: "2px 8px", borderRadius: 999 }}>{SPORT_EMOJI[n.sport] ? `${SPORT_EMOJI[n.sport]} ` : ""}{n.leagueLabel.toUpperCase()}</span>}
                {chip && <span style={{ fontFamily: fm, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: chip.color, background: chip.bg, padding: "2px 8px", borderRadius: 999 }}>{chip.label}</span>}
                <span style={{ fontFamily: fm, fontSize: 10.5, color: "#6f7581" }}>{ago(n.publishedAt)}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.35, marginBottom: 3 }}>{n.title}</div>
              {n.summary && (
                <div style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.summary}</div>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function FollowingFeed({ onOpenUser }) {
  const authed = !!getAuth();
  const me = currentUserId();
  const [events, setEvents] = useState(null);
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
    <div style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 13, color: "#8a8f98", marginBottom: 16 }}>
        {followingCount > 0
          ? `Live moves from the ${followingCount} trader${followingCount === 1 ? "" : "s"} you follow.`
          : "Follow traders from the leaderboard to see their moves here."}
      </div>
      {events == null && <div style={{ color: "#8a8f98", fontSize: 13, padding: "24px 0" }}>Loading…</div>}
      {events?.length === 0 && (
        <div style={{ border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "34px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>👀</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 5 }}>Nothing here yet</div>
          <div style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.6 }}>
            {authed
              ? "Open a public trader's profile from the leaderboard and hit Follow - their opens, cash-outs, TP/SL hits and liquidations land here with PnL."
              : "Log in, then follow traders from the leaderboard to build your feed."}
          </div>
        </div>
      )}
      {events?.map((e, i) => {
        const av = parseAvatar(e.avatar);
        const pnlish = e.pnl != null && e.type !== "open";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#101114", border: "1px solid #1c1e24", borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
            {/* Avatar + name open the trader's profile */}
            <div onClick={() => onOpenUser?.(e.userId)} title="View profile"
              style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#1d2026", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: onOpenUser ? "pointer" : "default" }}>
              {av ? <AvatarCircle avatar={av} size={34} /> : <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 14, color: "#cfd4dc" }}>{(e.username || "?").charAt(0).toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: "#e8ebf0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span onClick={() => onOpenUser?.(e.userId)}
                  style={{ fontWeight: 700, color: "#fff", cursor: onOpenUser ? "pointer" : "default", textDecoration: onOpenUser ? "underline" : "none", textUnderlineOffset: 3, textDecorationColor: "rgba(255,255,255,0.25)" }}>
                  {e.username || "trader"}</span>{" "}
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
  );
}

export function NewsPage({ onOpenUser }) {
  const [tab, setTab] = useState("news"); // news | following
  // No handler from the host surface (main-app terminal) → render our own profile overlay.
  const [localUser, setLocalUser] = useState(null);
  const openUser = onOpenUser || ((id) => setLocalUser(id));
  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px", display: "flex", flexDirection: "column", fontFamily: fb }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Newspaper size={18} color={B.primary} />
        <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>NEWS</div>
      </div>
      <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 14 }}>
        {tab === "news" ? "Sports News" : "Following"}
      </h2>

      <div style={{ display: "inline-flex", background: "#111", border: "1px solid #1f1f1f", borderRadius: 999, padding: 3, gap: 3, marginBottom: 20, alignSelf: "flex-start" }}>
        {[["news", "News"], ["following", "Following"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: "7px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 700, fontSize: 13,
            background: tab === k ? "#fff" : "transparent", color: tab === k ? "#0a0a0a" : "#888",
          }}>{label}</button>
        ))}
      </div>

      {tab === "news" ? <NewsFeed /> : <FollowingFeed onOpenUser={openUser} />}
      {localUser && <PublicProfilePage targetId={localUser} onClose={() => setLocalUser(null)} />}
    </div>
  );
}
