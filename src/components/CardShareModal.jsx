/**
 * Member-card share surface (Figma Parabolic--Copy- 157:24098) + the shared stat-card visual
 * used on the World Cup leaderboard (157:23575). StatCard = glossy black card with #rank pill,
 * avatar, username, ROI + trades; LanyardStrap = the red WORLD CUP strap it hangs from.
 * CardShareModal = fullscreen black view: rounded stadium panel with the card on its lanyard,
 * then Share on X / download PNG / copy link.
 */
import { useEffect, useRef, useState } from "react";
import { fd, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { BARCODE_WIDTHS } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";
import stadiumBg from "../assets/worldcup/stadium.webp";

const GREEN = "#5ed87e";
const fmtRoi = (v) => `${v >= 0 ? "+" : ""}${Number(v ?? 0).toFixed(2)}%`;

/* ── red WORLD CUP lanyard strap + buckle ── */
export function LanyardStrap({ strapH = 96, width = 34 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ width, height: strapH, background: "linear-gradient(90deg,#7c121a,#c22531 32%,#a01b26 68%,#6e0f16)", boxShadow: "inset 0 0 6px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ writingMode: "vertical-rl", fontFamily: fm, fontWeight: 700, fontSize: 7.5, letterSpacing: "0.22em", color: "rgba(255,255,255,0.85)" }}>WORLD CUP</span>
      </div>
      <div style={{ width: width + 24, height: 13, borderRadius: 4, background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.14)", marginTop: -1, boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

/* ── glossy black stat card. variant "wordmark" (leaderboard) | "barcode" (share modal) ── */
export function StatCard({ width = 336, username, avatar, rank = null, roiPct = null, trades = null, variant = "wordmark" }) {
  const k = width / 336;
  const h = 190 * k;
  return (
    <div style={{ position: "relative", width, height: h, borderRadius: 22 * k, overflow: "hidden", flexShrink: 0,
      background: "linear-gradient(135deg, #1d1d20 0%, #121214 45%, #18181b 70%, #0e0e10 100%)",
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.16)" }}>
      {/* faint circle outlines + diagonal sheen */}
      <svg width={width} height={h} style={{ position: "absolute", inset: 0 }}>
        <circle cx={140 * k} cy={-330 * k} r={492 * k} stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" />
        <circle cx={60 * k} cy={-280 * k} r={492 * k} stroke="rgba(255,255,255,0.045)" strokeWidth={1} fill="none" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(118deg, transparent 30%, rgba(255,255,255,0.075) 44%, rgba(255,255,255,0.02) 52%, transparent 62%)" }} />
      {/* lanyard notch slot */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 9 * k, width: 51 * k, height: 8 * k, borderRadius: 4 * k, background: "#050505" }} />

      {variant === "wordmark" ? (
        <img src={LOGO_WORDMARK} alt="Parabolic" style={{ position: "absolute", left: 22 * k, top: 22 * k, height: 15 * k }} />
      ) : (
        <div style={{ position: "absolute", left: 24 * k, top: 22 * k, display: "flex", flexDirection: "column", gap: 4 * k }}>
          <div style={{ display: "flex", gap: 1.4 * k, alignItems: "flex-end" }}>
            {BARCODE_WIDTHS.map((w, i) => (
              <div key={i} style={{ width: w * 1.45 * k, height: 12 * k, background: "rgba(255,255,255,0.85)" }} />
            ))}
          </div>
          <span style={{ fontFamily: fm, fontSize: 8.5 * k, letterSpacing: "0.14em", color: "rgba(255,255,255,0.75)" }}>PARABOLIC MEMBER</span>
        </div>
      )}

      {rank != null && (
        <div style={{ position: "absolute", right: 20 * k, top: 18 * k, padding: `${5 * k}px ${11 * k}px`, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}>
          <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 12.5 * k, color: "#fff" }}>#{rank}</span>
        </div>
      )}

      <div style={{ position: "absolute", left: 22 * k, top: 88 * k }}>
        <AvatarCircle avatar={avatar} size={40 * k} />
      </div>
      <div style={{ position: "absolute", left: 22 * k, bottom: 20 * k, maxWidth: 190 * k, fontFamily: fb, fontWeight: 700, fontSize: 19 * k, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {username}
      </div>

      {roiPct != null && (
        <div style={{ position: "absolute", right: 22 * k, bottom: 22 * k, textAlign: "right" }}>
          <div style={{ fontFamily: fb, fontWeight: 700, fontSize: 17 * k, color: roiPct >= 0 ? GREEN : "#ff5247" }}>{fmtRoi(roiPct)}</div>
          {trades != null && <div style={{ fontFamily: fb, fontSize: 13 * k, color: "#a7abb3", marginTop: 2 * k }}>{trades} trades</div>}
        </div>
      )}
    </div>
  );
}

/* ── canvas PNG of the card for the download button ── */
async function downloadCardPng({ username, avatar, rank, roiPct, trades }) {
  const W = 860, H = 486, R = 48, P = 56;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1d1d20"); grad.addColorStop(0.45, "#121214"); grad.addColorStop(1, "#0e0e10");
  rr(0, 0, W, H, R); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(1, 1, W - 2, H - 2, R); ctx.stroke();
  // barcode + member line
  let bx = P;
  for (const w of BARCODE_WIDTHS) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(bx, P, w * 3.6, 30); bx += w * 3.6 + 3.5; }
  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "600 19px monospace"; ctx.fillText("PARABOLIC MEMBER", P, P + 62);
  // rank pill
  if (rank != null) {
    const label = `#${rank}`; ctx.font = "700 26px monospace";
    const tw = ctx.measureText(label).width;
    rr(W - P - tw - 44, P - 6, tw + 44, 52, 26); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(label, W - P - tw - 22, P + 30);
  }
  // avatar
  const ax = P + 52, ay = H - 196, ar = 52;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  if (avatar?.kind === "photo") {
    const img = new Image();
    await new Promise((res) => { img.onload = res; img.onerror = res; img.src = avatar.uri; });
    if (img.width) ctx.drawImage(img, ax - ar, ay - ar, ar * 2, ar * 2);
    else { ctx.fillStyle = "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); }
  } else if (avatar?.kind === "emoji") {
    ctx.fillStyle = avatar.bg || "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    ctx.font = "54px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(avatar.emoji, ax, ay + 4); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  } else { ctx.fillStyle = "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); }
  ctx.restore();
  // username
  ctx.fillStyle = "#fff"; ctx.font = "700 46px system-ui, sans-serif"; ctx.fillText(username, P, H - P);
  // ROI + trades
  if (roiPct != null) {
    ctx.textAlign = "right";
    ctx.fillStyle = roiPct >= 0 ? GREEN : "#ff5247"; ctx.font = "700 42px system-ui, sans-serif";
    ctx.fillText(fmtRoi(roiPct), W - P, H - P - 46);
    if (trades != null) { ctx.fillStyle = "#a7abb3"; ctx.font = "400 30px system-ui, sans-serif"; ctx.fillText(`${trades} trades`, W - P, H - P); }
    ctx.textAlign = "left";
  }
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${username}-parabolic-card.png`;
  a.click();
}

/* ── fullscreen share view (157:24098) ── */
export function CardShareModal({ userId, username, avatar, rank = null, roiPct = null, trades = null, onClose }) {
  const [st, setSt] = useState({ rank, roiPct, trades });
  const [toast, setToast] = useState("");
  const timer = useRef(null);
  const say = (m) => { setToast(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(""), 2200); };
  const isMobile = typeof window !== "undefined" && window.innerWidth < 720;

  // Prefer the live World Cup standing when this account is a participant.
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/event/standing/${userId}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && d.rank != null) setSt((s) => ({ rank: d.rank, roiPct: d.roiPct ?? s.roiPct, trades: d.trades ?? s.trades }));
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shareUrl = "https://app.parabolic.gg/worldcup";
  const shareText = st.rank != null
    ? `Rank #${st.rank} in the World Cup Trading Competition on @betparabolic (${fmtRoi(st.roiPct)} ROI) 🏆`
    : `Trading live win probability on @betparabolic 🏆`;
  const shareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  const copyLink = async () => { try { await navigator.clipboard.writeText(shareUrl); say("Link copied"); } catch { say("Couldn't copy — " + shareUrl); } };
  const download = () => downloadCardPng({ username, avatar, rank: st.rank, roiPct: st.roiPct, trades: st.trades }).catch(() => say("Couldn't render the image"));

  const circleBtn = { width: 44, height: 44, borderRadius: "50%", border: "none", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  const panelW = isMobile ? "94vw" : "min(648px, 90vw)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, fontFamily: fb }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "#050505" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* stadium panel with the card hanging from its lanyard */}
        <div style={{ position: "relative", width: panelW, height: isMobile ? "62vh" : "min(578px, 72vh)", borderRadius: 24, overflow: "hidden" }}>
          <img src={stadiumBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 68%" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 30%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.4) 100%)" }} />
          <img src={LOGO_WORDMARK} alt="Parabolic" style={{ position: "absolute", left: 26, top: 24, height: 18 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <LanyardStrap strapH={isMobile ? 90 : 150} width={36} />
            <div style={{ marginTop: -8 }}>
              <StatCard width={isMobile ? 300 : 430} username={username} avatar={avatar} rank={st.rank} roiPct={st.roiPct} trades={st.trades} variant="barcode" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
          <button onClick={shareX} style={{ background: "#fff", border: "none", borderRadius: 999, padding: "12px 22px", fontFamily: fb, fontWeight: 700, fontSize: 14, color: "#0a0a0a", cursor: "pointer" }}>Share on X</button>
          <button onClick={download} title="Download image" style={circleBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
          </button>
          <button onClick={copyLink} title="Copy link" style={circleBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/></svg>
          </button>
        </div>
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "#1c1c1c", border: "1px solid #333", color: "#eee", borderRadius: 12, padding: "10px 16px", fontSize: 13 }}>{toast}</div>
      )}
    </div>
  );
}
