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

const SYNC_KEY = 'parabolic_avatar_synced';
const syncSig = (userId, ser) => `${userId}:${ser.length}:${ser.slice(0, 40)}`;

/**
 * Two-way avatar reconcile between the device-local member card and the account.
 * The ACCOUNT is the source of truth, with one exception: if THIS device previously uploaded
 * exactly this avatar for exactly this account (the synced-flag signature matches), the device
 * is the author — it re-uploads when the server differs, which self-heals a server value that
 * was overwritten by a stale device.
 *
 * Any other local card (no flag, or a flag from a different userId — e.g. a card left over from
 * a pre-wipe account on this machine) NEVER uploads; the account avatar replaces it locally.
 * Returns the resolved {kind,...} avatar (or null), already saved into the local card.
 */
export async function reconcileAvatarWithAccount({ apiUrl, userId, token }) {
  try {
    if (!userId || !token) return null;
    const card = loadCard();
    let ser = serializeAvatar(card.avatar);
    // photos saved before resizing existed can be huge — shrink before any compare/upload
    if (ser && ser.startsWith('data:') && ser.length > 80_000) {
      ser = await resizeAvatar(ser);
      if (ser.length > 80_000) ser = null; // still too big — treat as no local avatar
      else { card.avatar = { kind: 'photo', uri: ser }; try { localStorage.setItem(CARD_KEY, JSON.stringify(card)); } catch { /* ignore */ } }
    }
    const authored = !!ser && localStorage.getItem(SYNC_KEY) === syncSig(userId, ser);

    const res = await fetch(`${apiUrl}/profile/${userId}?token=${encodeURIComponent(token)}`);
    if (!res.ok) return card.avatar || null; // offline/authfail - change nothing
    const server = (await res.json())?.avatar || null;

    const upload = async () => {
      const r = await fetch(`${apiUrl}/profile/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: ser, token }),
      });
      if (r.ok) localStorage.setItem(SYNC_KEY, syncSig(userId, ser));
    };

    if (authored) {           // this device set the account avatar — keep the account in sync
      if (server !== ser) await upload();
      return card.avatar;
    }
    if (server) {             // account wins over any un-authored local card
      const avatar = parseAvatar(server);
      if (avatar) {
        card.avatar = avatar;
        try {
          localStorage.setItem(CARD_KEY, JSON.stringify(card));
          localStorage.setItem(SYNC_KEY, syncSig(userId, server)); // this device now mirrors the account
        } catch { /* cosmetic */ }
      }
      return avatar;
    }
    if (ser) { await upload(); return card.avatar; } // fresh onboarding device, empty account
    return null;
  } catch { return null; }
}

/** Back-compat wrappers — both halves now route through the single reconcile. */
export async function syncAvatarToBackend(opts) { return reconcileAvatarWithAccount(opts); }
export async function hydrateAvatarFromBackend(opts) { return reconcileAvatarWithAccount(opts); }
