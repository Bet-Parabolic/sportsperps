// Auth state + API — username/password accounts. GUESTS ELIMINATED (July 12): there is no
// anonymous trading identity. A logged-out visitor has NO userId and can only view the World Cup
// page (App gates everything else). The only place a pre-account UUID exists is the onboarding
// staging id (`onboardingStagingId`), used to carry email/phone verification through to register,
// which claims it. The authenticated session ({ userId, username, token }) lives under
// `parabolic_auth`; the token is sent with every account action.

import { API_URL } from "./constants.js";

const KEY = "parabolic_auth";
const STAGING_KEY = "perpdictions_userId"; // onboarding-only staging id (kept key name for continuity)

export function getAuth() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function isLoggedIn() { return !!getAuth()?.token; }
export function authToken() { return getAuth()?.token || null; }

// Onboarding staging id — created ONLY when signup runs, so the verify-before-register flow has a
// stable id to attach email/phone verification to; register(claimUserId) then turns it into the
// real account. NOT an app-wide guest: nothing outside onboarding calls this.
export function onboardingStagingId() {
  let id = localStorage.getItem(STAGING_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(STAGING_KEY, id); }
  return id;
}

// The authenticated account id, or null when logged out. NEVER mints an id (no guests).
export function currentUserId() { return getAuth()?.userId || null; }

export function setAuth(a) {
  localStorage.setItem(KEY, JSON.stringify(a));
  if (a?.userId) localStorage.setItem(STAGING_KEY, a.userId); // staging id becomes the account id
}
export function clearAuth() { localStorage.removeItem(KEY); }

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export async function register(username, password) {
  const data = await post("/auth/register", { username, password, claimUserId: onboardingStagingId() });
  setAuth(data);
  return data;
}

export async function login(username, password) {
  const data = await post("/auth/login", { username, password });
  setAuth(data);
  return data;
}

// Log out = clear the session + drop any onboarding staging id. With guests gone there is no
// anonymous identity to fall back to — the app lands the visitor on the login/onboarding gate.
export function logout() {
  clearAuth();
  try { localStorage.removeItem(STAGING_KEY); } catch { /* noop */ }
}

// ── Session-expired handling ─────────────────────────────────────────────
// A stored token can stop validating (e.g. AUTH_SECRET rotated, or a future token expiry). Any
// authenticated call that gets a 401 should route through handleUnauthorized(): it clears the dead
// session and fires a single app-level handler (the terminal registers one that opens the sign-in
// modal with a "session expired" notice) instead of the request silently failing.
let sessionExpiredHandler = null;
export function setSessionExpiredHandler(fn) { sessionExpiredHandler = fn; }

export function handleUnauthorized() {
  if (!getAuth()) return; // only meaningful if we believed we were logged in — ignore for guests
  clearAuth();
  if (sessionExpiredHandler) { try { sessionExpiredHandler(); } catch { /* noop */ } }
}
