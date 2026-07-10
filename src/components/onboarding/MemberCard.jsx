/**
 * Parabolic member card — web port of the mobile member-card.tsx (Figma 82:19398 / 82:17574
 * front, 82:17612 back). Dark plastic card with radial sheen, big circle outlines, plastic-film
 * texture, lanyard notch, logo lockup, barcode (exact widths from the design), avatar, username,
 * drawn signature. Back face = QR (referral link) + vertical referral-code rail.
 *
 * Design space is 339×191; everything scales off `width`.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { LOGO_WORDMARK } from "../../lib/logos.js";
import { BARCODE_WIDTHS } from "../../lib/onboarding.js";
import cardTexture from "../../assets/cardTexture.webp"; // 51KB webp (alpha kept) — the 527KB png was pure page weight at 32% opacity

const BASE_W = 339;
const BASE_H = 191;

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

function useQrDataUrl(value, sizePx) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value || "https://parabolic.gg", { errorCorrectionLevel: "M", margin: 0, width: Math.max(64, Math.round(sizePx * 2)), color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((u) => { if (live) setUrl(u); })
      .catch(() => {});
    return () => { live = false; };
  }, [value, sizePx]);
  return url;
}

export function MemberCard({ width, username, avatar, signature, back = false, referralCode = "000000", qrValue = "https://parabolic.gg", placeholder = false }) {
  const k = width / BASE_W;
  const height = BASE_H * k;
  const qrSize = 128 * k;
  const qrUrl = useQrDataUrl(back ? qrValue : null, qrSize);

  return (
    <div style={{ position: "relative", width, height, borderRadius: 20 * k, background: "#141414", overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
      {/* big faint circle outlines */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <circle cx={140 * k} cy={-330 * k} r={492 * k} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" />
        <circle cx={60 * k} cy={-280 * k} r={492 * k} stroke="rgba(255,255,255,0.04)" strokeWidth={1} fill="none" />
        <circle cx={88 * k} cy={95 * k} r={71 * k} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" />
      </svg>

      {/* plastic-film texture */}
      <img src={cardTexture} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.32, borderRadius: 20 * k }} />

      {/* radial sheen */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 20% -10%, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%)" }} />

      {/* inner hairline border */}
      <div style={{ position: "absolute", left: 6 * k, top: 6 * k, right: 6 * k, bottom: 6 * k, borderRadius: 15 * k, border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />

      {/* lanyard notch slot */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 10 * k, width: 51 * k, height: 8 * k, borderRadius: 4 * k, background: "#050505" }} />

      {back ? (
        <>
          {/* QR plate */}
          <div style={{ position: "absolute", left: 26 * k, top: 24 * k, width: 143 * k, height: 143 * k, borderRadius: 14 * k, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: qrSize, height: qrSize }} />}
            {avatar && (
              <div style={{ position: "absolute" }}>
                <AvatarCircle avatar={avatar} size={34 * k} />
              </div>
            )}
          </div>
          {/* referral-code rail */}
          <div style={{ position: "absolute", right: 12 * k, top: 10 * k, bottom: 10 * k, width: 96 * k, display: "flex", alignItems: "center" }}>
            <div style={{ width: 26 * k, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", borderRadius: 6 * k, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ writingMode: "vertical-rl", fontFamily: "monospace", fontSize: 9 * k, letterSpacing: 2 * k, color: "rgba(255,255,255,0.7)" }}>REFERRAL CODE</span>
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
          {/* logo lockup top-right */}
          <img src={LOGO_WORDMARK} alt="Parabolic" style={{ position: "absolute", top: 13 * k, right: 16 * k, height: 15 * k, width: "auto", objectFit: "contain" }} />

          {/* avatar */}
          {/* avatar — sized/raised so it clears the username row (191-unit card: 32+96=128 < name top 139) */}
          <div style={{ position: "absolute", left: 33 * k, top: 32 * k }}>
            <AvatarCircle avatar={avatar} size={96 * k} />
          </div>

          {/* username */}
          <div style={{ position: "absolute", left: 36 * k, bottom: 22 * k, maxWidth: 200 * k, fontWeight: 600, fontSize: 24 * k, lineHeight: `${30 * k}px`, color: placeholder ? "rgba(255,255,255,0.35)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {username}
          </div>

          {/* signature — fitted to the clear band between the wordmark (bottom ~28) and the
              barcode block (top ~142) on the right side */}
          {signature?.d ? (
            <div style={{ position: "absolute", right: 12 * k, top: 36 * k, opacity: 0.95, pointerEvents: "none" }}>
              <svg width={150 * k} height={96 * k} viewBox={`0 0 ${signature.w} ${signature.h}`} preserveAspectRatio="xMidYMid meet">
                <path d={signature.d} stroke="#fff" strokeWidth={Math.max(3, signature.w / 55)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : null}

          {/* barcode + PARABOLIC MEMBER bottom-right */}
          <div style={{ position: "absolute", right: 16 * k, bottom: 24 * k, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 * k }}>
            <div style={{ display: "flex", gap: 1.4 * k, alignItems: "flex-end" }}>
              {BARCODE_WIDTHS.map((w, i) => (
                <div key={i} style={{ width: w * 1.45 * k, height: 12 * k, background: "rgba(255,255,255,0.85)" }} />
              ))}
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 8.5 * k, letterSpacing: 1.4 * k, color: "rgba(255,255,255,0.75)" }}>PARABOLIC MEMBER</span>
          </div>
        </>
      )}
    </div>
  );
}
