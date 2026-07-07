/**
 * Bookmarked markets page (nav-rail bookmark icon) — every market the user bookmarked via the
 * bookmark toggle in a game's header. Bookmarks are device-local (localStorage), matching the
 * mobile app. Stale ids (settled/pruned games) simply don't render.
 */
import { Bookmark } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";

export function BookmarksPage({ liveGames = [], onTrade }) {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem("parabolic_bookmarks")) || []; } catch { /* ignore */ }
  const marked = liveGames.filter((g) => ids.includes(g.id));

  const card = { background: "#101114", border: "1px solid #1c1e24", borderRadius: 14, padding: "14px 16px", marginBottom: 8 };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Bookmark size={18} color={B.primary} />
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>BOOKMARKS</div>
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 6 }}>Saved markets</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Markets you've bookmarked from a game's header. Click one to jump back in.</p>
      </div>

      {marked.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🔖</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Nothing saved yet</div>
          <div style={{ fontSize: 12.5, color: "#666" }}>Open any market and hit the bookmark icon in its header — it'll be waiting here.</div>
        </div>
      ) : marked.map((g) => {
        const isLive = g.status === "live" || g.status === "halftime";
        const isPregame = g.status === "scheduled";
        return (
          <div key={g.id} onClick={() => onTrade(g)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex" }}>
                {g.home?.logo && <img src={g.home.logo} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />}
                {g.away?.logo && <img src={g.away.logo} alt="" style={{ width: 30, height: 30, objectFit: "contain", marginLeft: -8 }} />}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.home?.name ?? "Home"} vs {g.away?.name ?? "Away"}</div>
                <div style={{ fontSize: 11.5, color: "#666", fontFamily: fm, marginTop: 2 }}>
                  {isLive ? (g.statusDetail || "Live") : isPregame ? "Pregame" : (g.statusDetail || g.status)}
                  {g.home?.score != null && (isLive || g.status === "final") ? ` · ${g.home.score}–${g.away?.score ?? 0}` : ""}
                </div>
              </div>
            </div>
            {isLive
              ? <span style={{ fontSize: 9, fontWeight: 800, color: B.green, background: B.green + "18", padding: "3px 9px", borderRadius: 999, fontFamily: fm }}>● LIVE</span>
              : isPregame
              ? <span style={{ fontSize: 9, fontWeight: 800, color: "#ff5b3a", background: "#ff5b3a18", padding: "3px 9px", borderRadius: 999, fontFamily: fm }}>PREGAME</span>
              : <span style={{ fontSize: 9, fontWeight: 800, color: "#888", background: "#ffffff10", padding: "3px 9px", borderRadius: 999, fontFamily: fm }}>{(g.status || "").toUpperCase()}</span>}
          </div>
        );
      })}
    </div>
  );
}
