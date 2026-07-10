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
  } catch { /* storage full — the card is cosmetic, never block onboarding on it */ }
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

/** Best-effort one-shot upload of the device-local avatar to the account (so leaderboards can
    show it). Safe to call on every mount — a localStorage flag stops repeats per avatar. */
export async function syncAvatarToBackend({ apiUrl, userId, token }) {
  try {
    if (!userId) return;
    const card = loadCard();
    const ser = serializeAvatar(card.avatar);
    if (!ser) return;
    const KEY = 'parabolic_avatar_synced';
    const sig = `${userId}:${ser.length}:${ser.slice(0, 40)}`;
    if (localStorage.getItem(KEY) === sig) return;
    // photos saved before resizing existed can be huge — shrink before upload
    let payload = ser;
    if (ser.startsWith('data:') && ser.length > 80_000) {
      payload = await resizeAvatar(ser);
      if (payload.length > 80_000) return; // still too big — skip, never block
      card.avatar = { kind: 'photo', uri: payload };
      try { localStorage.setItem('parabolic_card', JSON.stringify(card)); } catch { /* ignore */ }
    }
    const res = await fetch(`${apiUrl}/profile/${userId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: payload, token }),
    });
    if (res.ok) localStorage.setItem(KEY, sig);
  } catch { /* offline — retry next visit */ }
}
