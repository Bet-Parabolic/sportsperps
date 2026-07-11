/**
 * Team-color selection + legibility guard (WCAG-based).
 *
 * ESPN sends KIT colors (`color` = first kit, `altColor` = second kit), not brand colors —
 * England's altColor is literally its white away shirt. The old rule ("away prefers altColor")
 * blindly shipped that to solid buttons under hardcoded white text: England = white-on-white,
 * Switzerland = its pale-mint second kit, Argentina = 2.4:1 washout.
 *
 * Two layers fix the class, not the instance:
 *   1. pickTeamColors() — scores BOTH kit colors per team and picks a vivid, dark-UI-readable
 *      one (primary kit preferred), falling back to the other kit, then to the side default.
 *      Clash-avoidance vs the opponent is kept, but by measurement instead of "away takes alt".
 *   2. The guard — every pick is lightened until it reads ≥4.5:1 as an accent on the carbon
 *      background, and labelOn() gives black-or-white text for SOLID fills, so no future
 *      color (any league, any team) can render illegibly again.
 */

const TERMINAL_BG = "#0a0a0a"; // darkest surface team-colored text/tints sit on

// ── hex/HSL plumbing ─────────────────────────────────────────────────────────
const parse = (hex) => {
  if (typeof hex !== "string") return null;
  const h = hex.replace("#", "").trim();
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h * 360, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
}

// ── WCAG math ────────────────────────────────────────────────────────────────
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function relLum(hex) {
  const rgb = parse(hex);
  if (!rgb) return null;
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}
export function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  if (la == null || lb == null) return 1;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white — whichever reads better on a SOLID fill of `bg`. */
export const labelOn = (bg) => (contrast(bg, "#000000") >= contrast(bg, "#ffffff") ? "#000000" : "#ffffff");

/** Lighten (dark UI) until the color reads as text/accent on `bg` at ≥ `min`. */
export function ensureReadableOn(color, bg = TERMINAL_BG, min = 4.5) {
  const rgb = parse(color);
  if (!rgb) return color;
  let [h, s, l] = rgbToHsl(...rgb);
  let out = toHex(...rgb);
  for (let i = 0; i < 24 && contrast(out, bg) < min; i++) {
    l = Math.min(0.95, l + 0.04);
    out = hslToHex(h, s, l);
  }
  return out;
}

/** Darken until the color reads as text on a LIGHT `bg` at ≥ `min` (England red on white). */
export function ensureDarkOn(color, bg, min = 4.5) {
  const rgb = parse(color);
  if (!rgb) return color;
  let [h, s, l] = rgbToHsl(...rgb);
  let out = toHex(...rgb);
  for (let i = 0; i < 24 && contrast(out, bg) < min; i++) {
    l = Math.max(0.05, l - 0.04);
    out = hslToHex(h, s, l);
  }
  return out;
}

// ── kit-color selection ──────────────────────────────────────────────────────
// A kit color is usable as this team's accent if it's actually a COLOR (not the white/grey
// away shirt) and isn't so bright that black text would be needed on the dark UI's tints.
const isVivid = (hex) => {
  const rgb = parse(hex);
  if (!rgb) return false;
  const [, s] = rgbToHsl(...rgb);
  const L = relLum(hex);
  return s >= 0.25 && L <= 0.72;
};

// Two picks "clash" when they'd be hard to tell apart as side identities: similar hue AND
// similar brightness (NOR red vs ENG red), or nearly identical luminance overall.
const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
function clashes(a, b) {
  const ra = parse(a), rb = parse(b);
  if (!ra || !rb) return false;
  const [ha, sa] = rgbToHsl(...ra), [hb, sb] = rgbToHsl(...rb);
  return hueDiff(ha, hb) < 25 && sa > 0.2 && sb > 0.2 && contrast(a, b) < 1.6;
}

// "White kit" detection — a near-white/undyed shirt color (England's away #FFFFFF). Such a color
// becomes the button PLATE with the other kit color as its label, never text on a dark UI.
const nearWhite = (hex) => {
  const rgb = parse(hex);
  if (!rgb) return false;
  const [, s] = rgbToHsl(...rgb);
  const L = relLum(hex);
  return L >= 0.88 || (L >= 0.8 && s <= 0.25);
};

// Label fallback for a solid kit-colored plate. Plain luminance math picks BLACK on pure red
// (5.2:1 vs 4.0:1), but bold button text reads better white there and 4.0:1 clears the WCAG
// large/bold-text bar — so bias to white whenever white reaches 3:1.
const plateLabel = (bg) => (contrast(bg, "#ffffff") >= 3 ? "#ffffff" : "#000000");

/**
 * Choose colors for both sides from each team's TWO kit colors.
 * `home`/`away` are the backend team objects ({ color, altColor }).
 * Returns per side:
 *   light   — accent safe as text/tint on the dark UI (chart legend, borders, tints)
 *   btnBg   — solid Buy-button plate: the primary kit color, or the white kit when one
 *             of the pair is a white shirt (England → white plate)
 *   btnText — the OTHER kit color when the pairing passes ≥4.5:1 (Argentina sky/navy,
 *             England white/red), else the verified white/black fallback (Switzerland
 *             red/white, Norway red/white)
 */
export function pickTeamColors(home, away, { homeFallback = "#1fd182", awayFallback = "#ff5247" } = {}) {
  const candidates = (t) => [t?.color, t?.altColor].map((c) => (c && !String(c).startsWith("#") ? "#" + c : c)).filter((c) => parse(c));
  const usable = (t) => candidates(t).filter(isVivid);

  // The kit PAIR for the solid button: plate + label, contrast-verified.
  const btnPair = (t, fallback) => {
    const [A, B] = candidates(t);                            // A = first kit, B = second kit
    const white = [A, B].find((c) => c && nearWhite(c));
    const other = white === A ? B : A;
    if (white && other && !nearWhite(other)) {
      // White-shirt kit: white plate, the trim color as the label (darkened until it reads).
      return { btnBg: white, btnText: ensureDarkOn(other, white, 4.5) };
    }
    const plate = A && !nearWhite(A) ? A : fallback;         // primary kit plate (a white plate only happens WITH a trim color above)
    const label = B && !nearWhite(B) && contrast(plate, B) >= 4.5 ? B : plateLabel(plate);
    return { btnBg: plate, btnText: label };
  };

  const pickSide = (t, fallback, opponentPick) => {
    const u = usable(t);
    let pick = u[0] || null;                                 // primary kit preferred
    if (pick && opponentPick && clashes(pick, opponentPick) && u[1] && !clashes(u[1], opponentPick)) {
      pick = u[1];                                           // second kit resolves the clash
    }
    if (!pick) pick = fallback;                              // both kits white/grey → side default
    pick = ensureReadableOn(pick, TERMINAL_BG, 4.5);         // the guard: always legible on dark
    // Still indistinguishable from the opponent (e.g. red vs red, no usable alt):
    // push the lightness apart so the two sides stay tellable.
    if (opponentPick && clashes(pick, opponentPick)) {
      const rgb = parse(pick);
      const [h, s, l] = rgbToHsl(...rgb);
      pick = ensureReadableOn(hslToHex(h, Math.max(0.2, s - 0.15), Math.min(0.9, l + 0.22)), TERMINAL_BG, 4.5);
    }
    return pick;
  };

  const homePick = pickSide(home, homeFallback, null);
  const awayPick = pickSide(away, awayFallback, homePick);
  return {
    home: { light: homePick, ...btnPair(home, homeFallback) },
    away: { light: awayPick, ...btnPair(away, awayFallback) },
  };
}
