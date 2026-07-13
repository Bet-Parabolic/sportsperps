/**
 * Onboarding + member-card state — web port of the mobile app's src/lib/onboarding.ts
 * (Figma "Parabolic" 82:18508 → 82:19663). Keep in behavioral parity with mobile.
 *
 * The card (sport lanyard, avatar, signature, referral) is DEVICE-LOCAL (localStorage) — the
 * backend has no avatar/signature storage yet. Username/email/password hit the real auth API.
 * Referral codes are derived deterministically from the userId; no server-side bonus yet.
 */

export const SPORTS = [
  { key: 'football', label: 'Football', emoji: '🏈', strap: '#365b2b' },
  { key: 'mma', label: 'MMA', emoji: '🥊', strap: '#a61d24' },
  { key: 'baseball', label: 'Baseball', emoji: '⚾', strap: '#1e4f8a' },
  { key: 'soccer', label: 'Soccer', emoji: '⚽', strap: '#1f7a3d' },
  { key: 'hockey', label: 'Hockey', emoji: '🏒', strap: '#0d7c86' },
  { key: 'basketball', label: 'Basketball', emoji: '🏀', strap: '#d96a1e' },
];

export const sportByKey = (key) => SPORTS.find((s) => s.key === key) ?? null;

/** Preset avatars for "Use from templates" (emoji on a tinted circle). */
export const AVATAR_TEMPLATES = [
  { kind: 'emoji', emoji: '😎', bg: '#f6e3a1' },
  { kind: 'emoji', emoji: '🤠', bg: '#e8c39a' },
  { kind: 'emoji', emoji: '👽', bg: '#bfe3c0' },
  { kind: 'emoji', emoji: '🐺', bg: '#c9d4e8' },
  { kind: 'emoji', emoji: '🔥', bg: '#f4b8a0' },
  { kind: 'emoji', emoji: '🤖', bg: '#cfcfe8' },
  { kind: 'emoji', emoji: '🦈', bg: '#a9d6e5' },
  { kind: 'emoji', emoji: '👑', bg: '#eddcae' },
];

/** In-memory draft while the onboarding flow runs (cleared on completion). */
export const draft = { email: '', password: '', referral: '', sport: null, avatar: null, signature: null };

export function resetDraft() {
  draft.email = ''; draft.password = ''; draft.referral = '';
  draft.sport = null; draft.avatar = null; draft.signature = null;
}

const CARD_KEY = 'parabolic_card';
const REFERRAL_KEY = 'parabolic_referral_used';

export function persistCard() {
  const data = { sport: draft.sport, avatar: draft.avatar, signature: draft.signature };
  try {
    localStorage.setItem(CARD_KEY, JSON.stringify(data));
    if (draft.referral) localStorage.setItem(REFERRAL_KEY, draft.referral);
  } catch { /* storage full - the card is cosmetic, never block onboarding on it */ }
}

export function loadCard() {
  try {
    const raw = localStorage.getItem(CARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sport: null, avatar: null, signature: null };
}

/**
 * Deterministic 6-digit referral code from the userId (djb2). Display/share only for now —
 * the backend referral program isn't live, so codes grant no server-side bonus yet.
 */
export function referralCodeFor(userId) {
  if (!userId) return '000000';
  let h = 5381;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) + h + userId.charCodeAt(i)) >>> 0;
  return String(h % 1_000_000).padStart(6, '0');
}

/** Exact bar widths of the card's barcode, lifted from the Figma node tree. */
export const BARCODE_WIDTHS = [3, 2, 4, 1, 2, 3, 1, 1, 3, 3, 2, 2, 4, 1, 1, 4, 1, 1];

/* ── avatar ↔ backend sync ─────────────────────────────────────────────────
   The backend stores one TEXT field: a data-URI for photos, or a JSON emoji
   descriptor. These helpers translate to/from the local {kind,...} shape. */

export function serializeAvatar(avatar) {
  if (!avatar) return null;
  if (avatar.kind === 'photo') return avatar.uri;
  if (avatar.kind === 'emoji') return JSON.stringify({ kind: 'emoji', emoji: avatar.emoji, bg: avatar.bg });
  return null;
}

export function parseAvatar(s) {
  if (!s || typeof s !== 'string') return null;
  if (s.startsWith('data:')) return { kind: 'photo', uri: s };
  if (s.startsWith('{')) { try { const o = JSON.parse(s); if (o?.kind) return o; } catch { /* ignore */ } }
  return null;
}

/** Downscale an uploaded image to a small square JPEG data-URI (leaderboard/feed friendly). */
export function resizeAvatar(dataUrl, px = 128) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = px; c.height = px;
        const ctx = c.getContext('2d');
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, px, px);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* Signature ↔ backend: the card's drawn signature is {d,w,h}; the backend stores it as a JSON
   string. These translate to/from that shape. */
export function serializeSignature(sig) {
  if (!sig || !sig.d) return null;
  return JSON.stringify({ d: sig.d, w: sig.w, h: sig.h });
}
export function parseSignature(s) {
  if (!s || typeof s !== 'string') return null;
  try { const o = JSON.parse(s); return o?.d ? o : null; } catch { return null; }
}

/**
 * Reconcile the device-local member card (avatar + signature) with the account.
 * Rule per field: if the ACCOUNT has a value, it wins — the local card is overwritten to match,
 * and no device ever auto-uploads over it. A device only uploads a field when the account has
 * NONE yet (the one legitimate case: the device that just onboarded seeding an empty account).
 * This is deliberately one-directional — an "authoring device re-uploads" variant let two devices
 * with different local cards ping-pong the account value forever. To make a specific device
 * authoritative, clear the account field server-side, then open that device first.
 * Returns the resolved local card, already persisted.
 */
export async function reconcileCardWithAccount({ apiUrl, userId, token }) {
  try {
    if (!userId || !token) return null;
    const card = loadCard();

    const res = await fetch(`${apiUrl}/profile/${userId}?token=${encodeURIComponent(token)}`);
    if (!res.ok) return card; // offline/authfail — change nothing
    const p = await res.json();

    let changed = false;
    const upload = {}; // fields the account is missing that this device can seed

    // ── avatar ──
    const srvAvatar = p?.avatar || null;
    if (srvAvatar) {
      const a = parseAvatar(srvAvatar);
      if (a && serializeAvatar(card.avatar) !== srvAvatar) { card.avatar = a; changed = true; }
    } else {
      let ser = serializeAvatar(card.avatar);
      if (ser && ser.startsWith('data:') && ser.length > 80_000) { // pre-resize-era photos can be huge
        ser = await resizeAvatar(ser);
        if (ser.length > 80_000) ser = null; // still too big — skip, never block
        else { card.avatar = { kind: 'photo', uri: ser }; changed = true; }
      }
      if (ser) upload.avatar = ser;
    }

    // ── signature ──
    const srvSig = p?.signature || null;
    if (srvSig) {
      const parsed = parseSignature(srvSig);
      if (parsed && serializeSignature(card.signature) !== srvSig) { card.signature = parsed; changed = true; }
    } else {
      const ser = serializeSignature(card.signature);
      if (ser) upload.signature = ser;
    }

    if (changed) { try { localStorage.setItem(CARD_KEY, JSON.stringify(card)); } catch { /* cosmetic */ } }

    if (Object.keys(upload).length) {
      await fetch(`${apiUrl}/profile/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...upload, token }),
      });
    }
    return card;
  } catch { return null; }
}

/** Back-compat wrappers — every avatar/card sync call routes through the single reconcile. */
export async function reconcileAvatarWithAccount(opts) { return reconcileCardWithAccount(opts); }
export async function syncAvatarToBackend(opts) { return reconcileCardWithAccount(opts); }
export async function hydrateAvatarFromBackend(opts) { return reconcileCardWithAccount(opts); }
