/* ═══════════════════════════════════════════════════════════
   PARABOLIC - twin-parabola brand
   Accent green = #1fd182 (replaces orange)
   ═══════════════════════════════════════════════════════════ */
export const B = {
  // Brand accent (mint green) — single source of truth for "Parabolic green"
  primary: "#1fd182", primaryLight: "#52e0a3", warm: "#1fd182",
  // Win/loss semantic. Green and primary are now the same hue (intentional).
  green: "#1fd182", greenLight: "#52e0a3",
  pink: "#ff5247", red: "#ff5247",
  // Cool accents (untouched — used sparingly in oracle source pills, etc.)
  cyan: "#00d4ff", ice: "#5ce1ff", blue: "#0088cc",
  // Carbon surfaces (from Parabolic brand spec)
  white: "#eef1f6", dim: "#949aa6", mute: "#5e636e",
  bg: "#06070a", card: "#0b0d11", surface: "#11141a",
  border: "#181b22", border2: "#1f2329",
  grad: "linear-gradient(135deg, #1fd182, #52e0a3, #b8f5d6, #eef1f6, #5ce1ff, #00d4ff)",
  gradText: "linear-gradient(90deg, #1fd182, #52e0a3, #b8f5d6, #5ce1ff)",
};

// Display = Clash Display (fontshare). Body = Hanken Grotesk. Mono = JetBrains Mono.
export const fd = "'Clash Display','Hanken Grotesk',sans-serif";
export const fb = "'Hanken Grotesk',system-ui,sans-serif";
export const fm = "'JetBrains Mono','SF Mono',monospace";
// Two stylesheets: Google Fonts for Hanken + Mono, Fontshare for Clash Display
export const FONT_URL = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap";

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
