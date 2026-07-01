// Auth state + API — username/password accounts on top of the existing localStorage userId.
//
// A first-time visitor is a "guest": a random UUID in localStorage (`perpdictions_userId`) with a
// paper balance. When they sign up we pass that UUID as `claimUserId` so the backend attaches the
// new credentials to the SAME account — their paper balance, positions and history carry over.
// The authenticated session ({ userId, username, token }) lives under `parabolic_auth`; the token
// is sent with order/profile mutations so the backend can verify the account.

import { API_URL } from "./constants.js";

const KEY = "parabolic_auth";
const GUEST_KEY = "perpdictions_userId";

export function getAuth() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function isLoggedIn() { return !!getAuth()?.token; }
export function authToken() { return getAuth()?.token || null; }

// Stable guest id, created on first use. Used as the trading userId until the user signs up.
export function guestUserId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, id); }
  return id;
}

// The userId to trade as: the authenticated account if logged in, otherwise the guest.
export function currentUserId() { return getAuth()?.userId || guestUserId(); }

export function setAuth(a) {
  localStorage.setItem(KEY, JSON.stringify(a));
  if (a?.userId) localStorage.setItem(GUEST_KEY, a.userId); // keep the trading userId in sync
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
  const data = await post("/auth/register", { username, password, claimUserId: guestUserId() });
  setAuth(data);
  return data;
}

export async function login(username, password) {
  const data = await post("/auth/login", { username, password });
  setAuth(data);
  return data;
}

export function logout() { clearAuth(); }

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
