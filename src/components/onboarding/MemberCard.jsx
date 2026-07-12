/**
 * Avatar circle used across the app (member card, chat, feed, profiles). The member card itself
 * was unified into the canonical `StatCard` (components/CardShareModal.jsx) — one card design
 * everywhere (leaderboard, share, profile, onboarding). This module now only owns the avatar.
 */
export function AvatarCircle({ avatar, size }) {
  if (avatar?.kind === "photo") {
    return <img src={avatar.uri} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />;
  }
  if (avatar?.kind === "emoji") {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: avatar.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>{avatar.emoji}</span>
      </div>
    );
  }
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />;
}
