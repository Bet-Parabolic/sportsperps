/**
 * Member-card overlay — web port of the mobile card.tsx (Figma 82:17574 front / 82:17612 back).
 * Opened from the Profile page's card icon. Card hangs on its sport lanyard; click flips
 * front ↔ QR/referral back. Copy via navigator.clipboard, Share via navigator.share (copy
 * fallback). "Scan a code" is coming-soon (no camera flow on web yet).
 */
import { useState } from "react";
import { B, fd, fb, fm } from "../../lib/theme.js";
import { currentUserId, getAuth } from "../../lib/auth.js";
import { loadCard, referralCodeFor } from "../../lib/onboarding.js";
import { StatCard } from "../CardShareModal.jsx";
import { Lanyard } from "./Lanyard.jsx";

export function CardOverlay({ onClose }) {
  const [tab, setTab] = useState("card");   // 'card' | 'scan'
  const [back, setBack] = useState(false);
  const [card] = useState(() => loadCard());
  const [copied, setCopied] = useState(false);

  const username = getAuth()?.username ?? "Guest";
  const code = referralCodeFor(currentUserId());
  const shareUrl = `https://parabolic.gg?ref=${code}`;
  const cardW = Math.min(window.innerWidth - 48, 380);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };
  const share = async () => {
    const message = `Join me on Parabolic - trade live win probability. Use my code ${code} when you sign up: ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ text: message, url: shareUrl }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "#050505", overflowY: "auto", fontFamily: fb, color: "#fff" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        {/* header: segmented tabs + close */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", flex: 1, background: "#141414", borderRadius: 999, padding: 3, gap: 3 }}>
            {[["card", "My card"], ["scan", "Scan a code"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "10px 0", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fb, fontWeight: 600, fontSize: 14, background: tab === key ? "rgba(255,255,255,0.12)" : "transparent", color: tab === key ? "#fff" : "#777" }}>{label}</button>
            ))}
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer" }}>✕</button>
        </div>

        {tab === "card" ? (
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Lanyard sport={card.sport} width={46} height={190} />
              <div onClick={() => setBack((v) => !v)} style={{ marginTop: -6, cursor: "pointer" }} title="Tap to flip">
                <StatCard width={cardW} username={username} avatar={card.avatar} signature={card.signature} back={back} referralCode={code} qrValue={shareUrl} />
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 14 }}>Tap the card to flip</div>
            </div>
            <div style={{ display: "flex", gap: 10, padding: "16px 0 24px" }}>
              <button onClick={copy} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 999, padding: "15px 0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: fb }}>{copied ? "Copied ✓" : `Copy code · ${code}`}</button>
              <button onClick={share} style={{ flex: 1, background: B.primary, border: "none", borderRadius: 999, padding: "15px 0", color: "#04130c", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: fb }}>Share</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 34 }}>⌗</div>
            <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700 }}>Scanning is coming soon</div>
            <div style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.5, maxWidth: 300 }}>Camera scanning arrives in a future update. Share your code from the My card tab for now.</div>
          </div>
        )}
      </div>
    </div>
  );
}
