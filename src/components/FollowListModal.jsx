/**
 * Follower / following list modal — shared by the own-profile page (ProfilePage) and public
 * trader profiles (PublicProfilePage). Fetches GET /followers/:id or /follows/:id (viewable for
 * the owner or any PUBLIC profile; private profiles' lists stay hidden server-side). Each row
 * opens that trader's public profile via onOpenUser(userId).
 */
import { useEffect, useState } from "react";
import { B, fd, fb } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { authToken } from "../lib/auth.js";
import { parseAvatar } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";

export function FollowListModal({ userId, kind, onOpenUser, onClose }) {
  const [rows, setRows] = useState(null); // null = loading
  const title = kind === "followers" ? "Followers" : "Following";
  useEffect(() => {
    let on = true;
    const path = kind === "followers" ? "followers" : "follows";
    fetch(`${API_URL}/${path}/${userId}?token=${encodeURIComponent(authToken() || "")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (on) setRows(d?.[kind === "followers" ? "followers" : "following"] || []); })
      .catch(() => { if (on) setRows([]); });
    return () => { on = false; };
  }, [userId, kind]);

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(2,3,5,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", background: B.card, border: `1px solid ${B.border}`, borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", fontFamily: fb, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${B.border}` }}>
          <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 800, color: B.white }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a8f98", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 8px 12px" }}>
          {rows == null && <div style={{ padding: "28px 0", textAlign: "center", color: "#8a8f98", fontSize: 13 }}>Loading…</div>}
          {rows != null && rows.length === 0 && (
            <div style={{ padding: "34px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>👥</div>
              <div style={{ fontSize: 13.5, color: "#8a8f98", lineHeight: 1.6 }}>
                {kind === "followers" ? "No followers yet — share your card to grow your following." : "Not following anyone yet. Follow traders from the leaderboard to see their moves."}
              </div>
            </div>
          )}
          {rows?.map((u) => {
            const av = parseAvatar(u.avatar);
            return (
              <button key={u.userId} onClick={() => onOpenUser?.(u.userId)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: "none", borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#15171c")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", background: "#1d2026", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {av ? <AvatarCircle avatar={av} size={38} /> : <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 15, color: "#cfd4dc" }}>{(u.username || "?").charAt(0).toUpperCase()}</span>}
                </div>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: B.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username || "trader"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
