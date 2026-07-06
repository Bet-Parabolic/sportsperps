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
