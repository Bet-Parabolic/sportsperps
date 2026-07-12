/**
 * Public trader profile — opened by clicking a user on the leaderboard (public accounts only).
 * Full profile page mirroring the own-profile layout: member card, account summary (All-time
 * P&L / ROI / Win rate / Volume), open positions, Bets/Badges tabs, followers · following, and
 * a Follow button. Following a trader routes their trading events into your News feed.
 */
import { useCallback, useEffect, useState } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { fmtUsd, fmtPct } from "../lib/helpers.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId } from "../lib/auth.js";
import { parseAvatar } from "../lib/onboarding.js";
import { StatCard } from "./CardShareModal.jsx";

const GREEN = "#5ed87e";
const fmtRoi = (v) => `${v >= 0 ? "+" : ""}${Number(v ?? 0).toFixed(2)}%`;

const LEAGUE_META = {
  mlb:   { emoji: "⚾", label: "BASEBALL · MLB" },
  wcup:  { emoji: "⚽", label: "SOCCER · WORLD CUP" },
  mls:   { emoji: "⚽", label: "SOCCER · MLS" },
  nba:   { emoji: "🏀", label: "BASKETBALL · NBA" },
  ncaam: { emoji: "🏀", label: "BASKETBALL · NCAA" },
  nfl:   { emoji: "🏈", label: "FOOTBALL · NFL" },
  nhl:   { emoji: "🏒", label: "HOCKEY · NHL" },
};
const leagueOf = (gameId) => LEAGUE_META[(gameId || "").split("_")[0]] || { emoji: "🎯", label: "MARKET" };
function tierOf(points) {
  if (points >= 50000) return { name: "LEGEND", color: "#f5a623" };
  if (points >= 10000) return { name: "SHARP", color: "#b58cff" };
  if (points >= 2000)  return { name: "TACTICIAN", color: "#2dd4bf" };
  if (points >= 500)   return { name: "GRINDER", color: "#60a5fa" };
  return { name: "ROOKIE", color: "#9aa4b2" };
}

const card = { background: "#101216", border: "1px solid #1c2028", borderRadius: 14, padding: 16, marginBottom: 10 };
const SectionTitle = ({ children }) => (
  <div style={{ fontFamily: fm, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a6", textTransform: "uppercase", margin: "18px 2px 8px" }}>{children}</div>
);
const StatBox = ({ label, value, color = "#fff" }) => (
  <div style={{ ...card, marginBottom: 0 }}>
    <div style={{ fontSize: 12, color: "#8a93a6" }}>{label}</div>
    <div style={{ fontFamily: fm, fontWeight: 800, fontSize: 20, color, marginTop: 6 }}>{value}</div>
  </div>
);

export function PublicProfilePage({ targetId, onClose, worldcup = false }) {
  const me = currentUserId();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [wc, setWc] = useState(null);          // event standing (if participant)
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState("bets");
  const [betFilter, setBetFilter] = useState("all");
  const [followingHim, setFollowingHim] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      // WC surface → stats/positions/trades come from the EVENT ledger (competition-only
      // traders have empty main-app numbers).
      const r = await fetch(`${API_URL}/profile/${targetId}/public${worldcup ? "?ledger=wc" : ""}`);
      if (r.status === 403) { setErr("This profile is private."); return; }
      if (!r.ok) { setErr("Profile not found."); return; }
      setP(await r.json());
      fetch(`${API_URL}/event/standing/${targetId}`).then((x) => (x.ok ? x.json() : null)).then(setWc).catch(() => {});
      const tradesUrl = worldcup ? `${API_URL}/event/profile/${targetId}/trades?limit=50` : `${API_URL}/profile/${targetId}/trades?limit=50`;
      fetch(tradesUrl).then((x) => (x.ok ? x.json() : null)).then((d) => setTrades(d?.trades || [])).catch(() => {});
      if (me && getAuth()) {
        fetch(`${API_URL}/follows/${me}?token=${encodeURIComponent(authToken() || "")}`)
          .then((x) => (x.ok ? x.json() : null))
          .then((d) => setFollowingHim(!!d?.following?.some((f) => f.userId === targetId)))
          .catch(() => {});
      }
    } catch { setErr("Network error"); }
  }, [targetId, me]);
  useEffect(() => { load(); }, [load]);

  const toggleFollow = async () => {
    if (busy) return;
    if (!getAuth()) { setErr("Log in to follow traders."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/follow/${targetId}`, {
        method: followingHim ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me, token: authToken() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setFollowingHim(!!d.following);
        setP((prev) => prev ? { ...prev, followers: d.followers ?? prev.followers } : prev);
      } else setErr(d.error || "Couldn't update follow");
    } catch { setErr("Network error"); }
    finally { setBusy(false); }
  };

  const avatar = parseAvatar(p?.avatar);
  const username = p?.username || "trader";
  const joined = p?.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "-";
  const points = p?.points ?? 0;
  const tier = tierOf(points);
  const positions = p?.openPositions || [];
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const filteredTrades = trades.filter((t) => betFilter === "all" ? true : betFilter === "wins" ? t.pnl >= 0 : t.pnl < 0);
  const isWide = typeof window !== "undefined" && window.innerWidth >= 980;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 940, background: B.bg, overflowY: "auto", fontFamily: fb, color: "#eef1f6" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "16px 24px 70px" }}>
        {/* Header - back, title, Follow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 14px" }}>
          <button onClick={onClose} title="Back" style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer" }}>‹</button>
          <div style={{ fontFamily: fd, fontSize: 16, fontWeight: 700, color: B.white }}>Trader profile</div>
          {p && targetId !== me ? (
            <button onClick={toggleFollow} disabled={busy} style={{
              padding: "8px 20px", borderRadius: 999, border: followingHim ? "1px solid rgba(255,255,255,0.22)" : "none", cursor: "pointer",
              fontFamily: fb, fontWeight: 700, fontSize: 13,
              background: followingHim ? "transparent" : "#fff", color: followingHim ? "#fff" : "#0a0a0a", opacity: busy ? 0.6 : 1,
            }}>{followingHim ? "Following" : "Follow"}</button>
          ) : <div style={{ width: 34 }} />}
        </div>

        {err && !p && <div style={{ textAlign: "center", color: "#8a93a6", padding: "60px 0" }}>{err}</div>}

        {p && (
          <div style={{ display: "grid", gridTemplateColumns: isWide ? "380px 1fr" : "1fr", gap: 24, alignItems: "start" }}>
            {/* LEFT - identity, card, stats, open positions */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fm, color: "#ddd", background: "#1a1d22", padding: "3px 9px", borderRadius: 999 }}>★ {points.toLocaleString()}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, fontFamily: fm, letterSpacing: "0.08em", color: tier.color, background: tier.color + "1c", padding: "3px 9px", borderRadius: 6 }}>{tier.name}</span>
                  {p.streak > 0 && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fm, color: "#ff9f1c", background: "#ff9f1c18", padding: "3px 9px", borderRadius: 999 }}>🔥 {p.streak}</span>}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: B.white, fontFamily: fd, letterSpacing: "-0.02em" }}>{username}</div>
                <div style={{ fontSize: 12, color: B.dim, marginTop: 2 }}>
                  Joined {joined} · <span style={{ color: "#c8ccd2", fontWeight: 600 }}>{p.followers ?? 0}</span> follower{(p.followers ?? 0) === 1 ? "" : "s"} · <span style={{ color: "#c8ccd2", fontWeight: 600 }}>{p.following ?? 0}</span> following
                </div>
              </div>

              {/* Member card (avatar synced from their account; no signature - device-local) */}
              <div style={{ marginBottom: 12 }}>
                <StatCard width={isWide ? 348 : Math.min((typeof window !== "undefined" ? window.innerWidth : 380) - 80, 348)} username={username} avatar={avatar} signature={null} />
              </div>

              {wc?.rank != null && (
                <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(255,173,10,0.08)", border: "1px solid rgba(255,173,10,0.25)", borderRadius: 12, padding: "9px 13px" }}>
                  <span style={{ fontSize: 13 }}>🏆</span>
                  <span style={{ fontSize: 12.5, color: "#ffd98a", fontWeight: 600 }}>World Cup Trading Competition - rank #{wc.rank}, {fmtRoi(wc.roiPct)} ROI</span>
                </div>
              )}

              {/* Stat grid - mirrors the own-profile 2x2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <StatBox label={worldcup ? "Competition P&L" : "All-time P&L"} value={`${(p.closedPnl ?? 0) >= 0 ? "+" : ""}${fmtUsd(p.closedPnl ?? 0)}`} color={(p.closedPnl ?? 0) >= 0 ? B.primary : B.red} />
                <StatBox label="ROI" value={fmtPct(p.returnPct ?? 0)} color={(p.returnPct ?? 0) >= 0 ? B.primary : B.red} />
                <StatBox label="Win rate" value={`${winRate}%`} />
                <StatBox label="Volume" value={fmtUsd(p.totalVolume ?? 0)} />
              </div>

              <SectionTitle>Open positions</SectionTitle>
              {positions.length === 0 ? (
                <div style={{ ...card, color: B.dim, fontSize: 14 }}>No open positions.</div>
              ) : positions.map((pos, i) => (
                <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: fm, letterSpacing: "0.1em", color: B.dim, marginBottom: 4 }}>{leagueOf(pos.gameId).emoji} {leagueOf(pos.gameId).label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: B.white, textTransform: pos.teamName ? "none" : "capitalize" }}>{pos.teamName || pos.side} · {pos.leverage}x</div>
                    <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{fmtUsd(pos.margin)} · {(pos.entryPx * 100).toFixed(0)}¢ → {(pos.markPrice * 100).toFixed(0)}¢</div>
                  </div>
                  <div style={{ fontFamily: fm, fontWeight: 700, color: pos.pnl >= 0 ? B.primary : B.red }}>{pos.pnl >= 0 ? "+" : ""}{fmtUsd(pos.pnl)}</div>
                </div>
              ))}
            </div>

            {/* RIGHT - Bets | Badges */}
            <div>
              <div style={{ display: "flex", gap: 20, margin: "2px 4px 12px" }}>
                {["bets", "badges"].map((t) => (
                  <span key={t} onClick={() => setTab(t)} style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", color: tab === t ? B.white : B.mute }}>{t}</span>
                ))}
              </div>

              {tab === "badges" ? (
                <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>🏅</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: B.white, marginBottom: 4 }}>Badges are coming soon</div>
                  <div style={{ fontSize: 12.5, color: B.dim, lineHeight: 1.5 }}>Milestone badges for wins, streaks, and volume land with the next points update.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "inline-flex", background: "#111", border: "1px solid #1f1f1f", borderRadius: 999, padding: 3, gap: 3, marginBottom: 12 }}>
                    {[["all", "All"], ["wins", "Wins"], ["loses", "Loses"]].map(([k, label]) => (
                      <button key={k} onClick={() => setBetFilter(k)} style={{
                        padding: "6px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 700, fontSize: 13,
                        background: betFilter === k ? "#fff" : "transparent", color: betFilter === k ? "#0a0a0a" : "#888",
                      }}>{label}</button>
                    ))}
                  </div>

                  {filteredTrades.length === 0 ? (
                    <div style={{ ...card, color: B.dim, fontSize: 14 }}>{betFilter === "all" ? "No settled bets yet." : `No ${betFilter} yet.`}</div>
                  ) : filteredTrades.map((t, i) => {
                    const win = t.pnl >= 0;
                    const lg = leagueOf(t.gameId);
                    return (
                      <div key={t.id ?? i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
                        <div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: fm, letterSpacing: "0.1em", color: B.dim, marginBottom: 4 }}>{lg.emoji} {lg.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: B.white, textTransform: t.teamName ? "none" : "capitalize" }}>{t.teamName || t.side} · {t.leverage}x</div>
                          <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{(t.entryPx * 100).toFixed(0)}¢ → {t.exitPx != null ? (t.exitPx * 100).toFixed(0) + "¢" : "-"}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: fm, fontWeight: 700, color: win ? B.primary : B.red }}>{win ? "+" : ""}{fmtUsd(t.pnl)}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "2px 7px", borderRadius: 5, background: win ? "rgba(31,209,130,0.15)" : "rgba(255,82,71,0.15)", color: win ? B.primary : B.red }}>{win ? "WIN" : "LOSE"}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {err && <div style={{ color: "#ff5247", fontSize: 12.5, marginTop: 12 }}>{err}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
