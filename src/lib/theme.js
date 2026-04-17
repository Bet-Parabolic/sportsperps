/* ═══════════════════════════════════════════════════════════
   BRAND — AGGRESSIVE FINTECH
   ═══════════════════════════════════════════════════════════ */
export const B = {
  primary: "#fe4202", primaryLight: "#ff6b2b", warm: "#fe4202",
  green: "#22c55e", greenLight: "#4ade80",
  pink: "#ff2d6f", red: "#ef4444",
  cyan: "#00d4ff", ice: "#5ce1ff", blue: "#0088cc",
  white: "#f0f0f0", dim: "#888888", mute: "#444444",
  bg: "#000000", card: "#0a0a0a", surface: "#111111",
  border: "#1a1a1a", border2: "#252525",
  grad: "linear-gradient(135deg, #fe4202, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00d4ff)",
  gradText: "linear-gradient(90deg, #fe4202, #ff6b2b, #ff9f1c, #5ce1ff)",
};

export const fd = "'Plus Jakarta Sans',sans-serif";
export const fb = "'DM Sans',sans-serif";
export const fm = "'JetBrains Mono','SF Mono',monospace";
export const FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap";

/* Brighten a hex color toward white for dark-background readability */
export function brighten(hex, factor=0.45){
  if(!hex||typeof hex!=="string")return "#ffffff";
  const c=hex.replace("#","");
  const full=c.length===3?c.split("").map(x=>x+x).join(""):c;
  if(full.length!==6)return hex;
  const r=parseInt(full.slice(0,2),16),g=parseInt(full.slice(2,4),16),b=parseInt(full.slice(4,6),16);
  const br=Math.min(255,Math.round(r+(255-r)*factor));
  const bg=Math.min(255,Math.round(g+(255-g)*factor));
  const bb=Math.min(255,Math.round(b+(255-b)*factor));
  return "#"+[br,bg,bb].map(v=>v.toString(16).padStart(2,"0")).join("");
}
