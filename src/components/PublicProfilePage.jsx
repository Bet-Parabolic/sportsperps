/**
 * Public trader profile — opened by clicking a user on the leaderboard (public accounts only).
 * Stats + Follow/Unfollow + recent bets. Following a trader routes their trading events into
 * your News feed.
 */
import { useCallback, useEffect, useState } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId } from "../lib/auth.js";
import { parseAvatar } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";

const GREEN = "#5ed87e";
const fmtRoi = (v) => `${v >= 0 ? "+" : ""}${Number(v ?? 0).toFixed(2)}%`;

export function PublicProfilePage({ targetId, onClose }) {
  const me = currentUserId();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [wc, setWc] = useState(null);          // event standing (if participant)
  const [trades, setTrades] = useState([]);
  const [followingHim, setFollowingHim] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/profile/${targetId}/public`);
      if (r.status === 403) { setErr("This profile is private."); return; }
      if (!r.ok) { setErr("Profile not found."); return; }
      setP(await r.json());
      fetch(`${API_URL}/event/standing/${targetId}`).then((x) => (x.ok ? x.json() : null)).then(setWc).catch(() => {});
      fetch(`${API_URL}/profile/${targetId}/trades?limit=12`).then((x) => (x.ok ? x.json() : null)).then((d) => setTrades(d?.trades || [])).catch(() => {});
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
  const Stat = ({ label, value, color = "#fff" }) => (
    <div style={{ flex: 1, background: "#131316", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", textAlign: "center" }}>
      <div style={{ fontFamily: fm, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: "#8a93a6" }}>{label}</div>
      <div style={{ fontFamily: fd, fontWeight: 800, fontSize: 18, color, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 940, fontFamily: fb, color: "#eef1f6" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(480px, 94vw)", maxHeight: "88vh", overflowY: "auto", background: "#0c0c0e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "20px 22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: fm, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a6" }}>TRADER PROFILE</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>
        </div>

        {err && !p && <div style={{ textAlign: "center", color: "#8a93a6", padding: "40px 0" }}>{err}</div>}

        {p && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", overflow: "hidden", background: "#1d2026", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.12)" }}>
                {avatar ? <AvatarCircle avatar={avatar} size={68} /> : <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 26, color: "#cfd4dc" }}>{(p.username || "?").charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fd, fontWeight: 800, fontSize: 22, color: "#fff" }}>{p.username || "trader"}</div>
                <div style={{ fontSize: 12, color: "#8a93a6", marginTop: 2 }}>
                  {p.followers} follower{p.followers === 1 ? "" : "s"} · joined {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                </div>
              </div>
              {targetId !== me && (
                <button onClick={toggleFollow} disabled={busy} style={{
                  padding: "9px 18px", borderRadius: 999, border: followingHim ? "1px solid rgba(255,255,255,0.2)" : "none", cursor: "pointer",
                  fontFamily: fb, fontWeight: 700, fontSize: 13,
                  background: followingHim ? "transparent" : "#fff", color: followingHim ? "#fff" : "#0a0a0a", opacity: busy ? 0.6 : 1,
                }}>{followingHim ? "Following" : "Follow"}</button>
              )}
            </div>

            {wc?.rank != null && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, background: "rgba(255,173,10,0.08)", border: "1px solid rgba(255,173,10,0.25)", borderRadius: 12, padding: "9px 13px" }}>
                <span style={{ fontSize: 13 }}>🏆</span>
                <span style={{ fontSize: 12.5, color: "#ffd98a", fontWeight: 600 }}>World Cup Trading Competition — rank #{wc.rank}, {fmtRoi(wc.roiPct)} ROI</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Stat label="ROI" value={fmtRoi(p.returnPct)} color={p.returnPct >= 0 ? GREEN : "#ff5247"} />
              <Stat label="TRADES" value={p.tradeCount} />
              <Stat label="POINTS" value={(p.points || 0).toLocaleString()} />
            </div>

            {trades.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: fm, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a6", marginBottom: 8 }}>RECENT BETS</div>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, height: 44, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontFamily: fm, fontSize: 11, color: "#8a93a6", width: 42, textTransform: "uppercase" }}>{(t.gameId || "").split("_")[0]}</span>
                    <span style={{ fontSize: 12.5, color: "#c8ccd2", flex: 1 }}>{t.side === "home" ? "Home" : "Away"} · {t.closeType || "CLOSED"}</span>
                    <span style={{ fontFamily: fb, fontWeight: 700, fontSize: 13, color: t.pnl >= 0 ? GREEN : "#ff5247" }}>{t.pnl >= 0 ? "+" : "−"}${Math.abs(t.pnl).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {err && <div style={{ color: "#ff5247", fontSize: 12.5, marginTop: 12, textAlign: "center" }}>{err}</div>}
          </>
        )}
      </div>
    </div>
  );
}
