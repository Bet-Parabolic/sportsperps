/**
 * Member-card share surface (Figma Parabolic--Copy- 157:24098) + the shared stat-card visual
 * used on the World Cup leaderboard (157:23575). StatCard = glossy black card with #rank pill,
 * avatar, username, ROI + trades; LanyardStrap = the red WORLD CUP strap it hangs from.
 * CardShareModal = fullscreen black view: rounded stadium panel with the card on its lanyard,
 * then Share on X / download PNG / copy link.
 */
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { fd, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { BARCODE_WIDTHS } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";
const stadiumBg = "/stadium.webp"; // stable public/ url — same file worldcup.html preloads (no double-download)

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

/* QR generator for the referral back face (ported from MemberCard so StatCard is fully self-contained). */
function useQrDataUrl(value, sizePx) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!value) { setUrl(null); return undefined; }
    let live = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 0, width: Math.max(64, Math.round(sizePx * 2)), color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((u) => { if (live) setUrl(u); })
      .catch(() => {});
    return () => { live = false; };
  }, [value, sizePx]);
  return url;
}

/* ── glossy black member card — the ONE canonical card used everywhere (leaderboard, share modal,
   profile, onboarding). variant "wordmark" (default) | "barcode" (share modal only). The bottom-
   right corner is context-swapped: rank/ROI/trades on the leaderboard + share; the drawn signature
   on profile + onboarding. `back` renders the QR + referral rail (onboarding flip). ── */
export function StatCard({ width = 336, username, avatar, rank = null, roiPct = null, trades = null, variant = "wordmark",
  signature = null, back = false, referralCode = "000000", qrValue = "https://parabolic.gg", placeholder = false }) {
  const k = width / 336;
  const h = 190 * k;
  const qrSize = 128 * k;
  const qrUrl = useQrDataUrl(back ? qrValue : null, qrSize);
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

      {back ? (
        <>
          {/* QR plate */}
          <div style={{ position: "absolute", left: 26 * k, top: 24 * k, width: 143 * k, height: 143 * k, borderRadius: 14 * k, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: qrSize, height: qrSize }} />}
            {avatar && <div style={{ position: "absolute" }}><AvatarCircle avatar={avatar} size={34 * k} /></div>}
          </div>
          {/* referral-code rail */}
          <div style={{ position: "absolute", right: 12 * k, top: 10 * k, bottom: 10 * k, width: 96 * k, display: "flex", alignItems: "center" }}>
            <div style={{ width: 26 * k, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", borderRadius: 6 * k, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ writingMode: "vertical-rl", fontFamily: fm, fontSize: 9 * k, letterSpacing: 2 * k, color: "rgba(255,255,255,0.7)" }}>REFERRAL CODE</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: `${4 * k}px 0`, alignSelf: "stretch" }}>
              {referralCode.split("").map((c, i) => (
                <span key={i} style={{ transform: "rotate(90deg)", fontWeight: 600, fontSize: 20 * k, color: "#fff" }}>{c}</span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
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
          <div style={{ position: "absolute", left: 22 * k, bottom: 20 * k, maxWidth: 190 * k, fontFamily: fb, fontWeight: 700, fontSize: 19 * k, color: placeholder ? "rgba(255,255,255,0.35)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {username}
          </div>

          {/* bottom-right — context swap: leaderboard/share show rank+ROI+trades; profile/onboarding
              show the drawn signature. ROI takes precedence if both are somehow supplied. */}
          {roiPct != null ? (
            <div style={{ position: "absolute", right: 22 * k, bottom: 22 * k, textAlign: "right" }}>
              <div style={{ fontFamily: fb, fontWeight: 700, fontSize: 17 * k, color: roiPct >= 0 ? GREEN : "#ff5247" }}>{fmtRoi(roiPct)}</div>
              {trades != null && <div style={{ fontFamily: fb, fontSize: 13 * k, color: "#a7abb3", marginTop: 2 * k }}>{trades} trades</div>}
            </div>
          ) : signature?.d ? (
            <div style={{ position: "absolute", right: 14 * k, bottom: 14 * k, opacity: 0.95, pointerEvents: "none" }}>
              <svg width={150 * k} height={82 * k} viewBox={`0 0 ${signature.w} ${signature.h}`} preserveAspectRatio="xMidYMax meet">
                <path d={signature.d} stroke="#fff" strokeWidth={Math.max(3, signature.w / 55)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ── canvas PNG for the download button — the FULL share composition (stadium panel +
   WORLD CUP lanyard + card), matching what the modal shows, not just the bare card. ── */
const loadImg = (src) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i); i.onerror = () => res(null);
  i.src = src;
});

async function downloadCardPng({ username, avatar, rank, roiPct, trades }) {
  const W = 1296, H = 1156, R = 48;      // 2× the modal's 648×578 stadium panel
  const CW = 860, CH = 486, P = 56;      // card size + inner padding
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  // ── stadium panel (rounded clip, cover-crop biased toward the pitch like the modal) ──
  rr(0, 0, W, H, R); ctx.save(); ctx.clip();
  const bg = await loadImg(stadiumBg);
  if (bg && bg.width) {
    const scale = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * scale, dh = bg.height * scale;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) * 0.68, dw, dh);
  } else { ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H); }
  const vg = ctx.createRadialGradient(W / 2, H * 0.3, H * 0.25, W / 2, H * 0.45, H * 0.9);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // wordmark top-left
  const wm = await loadImg(LOGO_WORDMARK);
  if (wm && wm.width) { const wh = 36; ctx.drawImage(wm, 52, 46, wm.width * (wh / wm.height), wh); }

  // ── red WORLD CUP lanyard strap + buckle ──
  const strapW = 72, strapH = 300, sx = W / 2 - strapW / 2;
  const sg = ctx.createLinearGradient(sx, 0, sx + strapW, 0);
  sg.addColorStop(0, "#7c121a"); sg.addColorStop(0.32, "#c22531"); sg.addColorStop(0.68, "#a01b26"); sg.addColorStop(1, "#6e0f16");
  ctx.fillStyle = sg; ctx.fillRect(sx, 0, strapW, strapH);
  ctx.save(); ctx.translate(W / 2 + 5, strapH / 2); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "700 15px monospace"; ctx.textAlign = "center";
  ctx.fillText("W O R L D   C U P", 0, 0);
  ctx.restore();
  rr(W / 2 - 60, strapH - 4, 120, 26, 8); ctx.fillStyle = "#1c1c1e"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2; ctx.stroke();

  // ── the card, centered under the strap (drop shadow, then local coords) ──
  const cx0 = (W - CW) / 2, cy0 = strapH + 14;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  rr(cx0, cy0, CW, CH, R); ctx.fillStyle = "#121214"; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(cx0, cy0);

  const grad = ctx.createLinearGradient(0, 0, CW, CH);
  grad.addColorStop(0, "#1d1d20"); grad.addColorStop(0.45, "#121214"); grad.addColorStop(1, "#0e0e10");
  rr(0, 0, CW, CH, R); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2; rr(1, 1, CW - 2, CH - 2, R); ctx.stroke();
  // lanyard notch slot
  rr(CW / 2 - 50, 18, 100, 16, 8); ctx.fillStyle = "#050505"; ctx.fill();
  // barcode + member line
  let bx = P;
  for (const w of BARCODE_WIDTHS) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(bx, P, w * 3.6, 30); bx += w * 3.6 + 3.5; }
  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "600 19px monospace"; ctx.fillText("PARABOLIC MEMBER", P, P + 62);
  // rank pill
  if (rank != null) {
    const label = `#${rank}`; ctx.font = "700 26px monospace";
    const tw = ctx.measureText(label).width;
    rr(CW - P - tw - 44, P - 6, tw + 44, 52, 26); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(label, CW - P - tw - 22, P + 30);
  }
  // avatar
  const ax = P + 52, ay = CH - 196, ar = 52;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  if (avatar?.kind === "photo") {
    const img = await loadImg(avatar.uri);
    if (img && img.width) ctx.drawImage(img, ax - ar, ay - ar, ar * 2, ar * 2);
    else { ctx.fillStyle = "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); }
  } else if (avatar?.kind === "emoji") {
    ctx.fillStyle = avatar.bg || "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    ctx.font = "54px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(avatar.emoji, ax, ay + 4); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  } else { ctx.fillStyle = "#26262a"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); }
  ctx.restore();
  // username
  ctx.fillStyle = "#fff"; ctx.font = "700 46px system-ui, sans-serif"; ctx.fillText(username, P, CH - P);
  // ROI + trades
  if (roiPct != null) {
    ctx.textAlign = "right";
    ctx.fillStyle = roiPct >= 0 ? GREEN : "#ff5247"; ctx.font = "700 42px system-ui, sans-serif";
    ctx.fillText(fmtRoi(roiPct), CW - P, CH - P - 46);
    if (trades != null) { ctx.fillStyle = "#a7abb3"; ctx.font = "400 30px system-ui, sans-serif"; ctx.fillText(`${trades} trades`, CW - P, CH - P); }
    ctx.textAlign = "left";
  }
  ctx.restore(); // card coords
  ctx.restore(); // panel clip

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
