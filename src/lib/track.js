// Client analytics beacon → POST /api/track (public, strict allowlist server-side).
// Extends product analytics to the TOP of the funnel: anonymous visitors, sessions,
// landing → app conversion. Fire-and-forget — analytics must never break the app.
//
// Transport: text/plain on BOTH paths (sendBeacon's native type and an explicit header on the
// fetch fallback). text/plain is CORS-safelisted → no preflight, which matters because
// parabolic.gg → Railway is cross-origin and sendBeacon cannot perform a preflight.

import { API_URL } from "./constants.js";

const GUEST_KEY = "perpdictions_userId";  // the app's existing stable user uuid (lib/auth.js)
const ANON_KEY = "parabolic_anon_id";     // landing-page visitors who never minted a user id
const URL_PARAM = "pv";                   // cross-subdomain visitor-id handoff (landing → app)

// Identity for the beacon: the real user uuid when the app has minted one, else a persistent
// "anon-…" visitor id (adopted from the ?pv= handoff param when arriving from the landing page,
// so landing → app conversion survives the parabolic.gg / app.parabolic.gg localStorage split).
function getId() {
  try {
    const uid = localStorage.getItem(GUEST_KEY);
    if (uid) return uid;
    let anon = localStorage.getItem(ANON_KEY);
    if (!anon) {
      const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
      anon = fromUrl && /^anon-[A-Za-z0-9-]{4,40}$/.test(fromUrl) ? fromUrl : `anon-${crypto.randomUUID()}`;
      localStorage.setItem(ANON_KEY, anon);
    }
    return anon;
  } catch { return null; }
}

export function track(event, props) {
  try {
    const payload = JSON.stringify({ event, id: getId(), props });
    const url = `${API_URL}/track`;
    if (navigator.sendBeacon && navigator.sendBeacon(url, payload)) return;
    fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: payload, keepalive: true }).catch(() => {});
  } catch { /* never break the app for analytics */ }
}

// Decorate an app URL with the visitor id (Launch App links on the landing page).
export function withVisitorId(url) {
  try {
    const id = getId();
    return id ? `${url}${url.includes("?") ? "&" : "?"}${URL_PARAM}=${encodeURIComponent(id)}` : url;
  } catch { return url; }
}

// 60s session heartbeat while the tab is visible — sessions + median session length on /dash are
// reconstructed from these. Call once at boot; visibility-aware so a background tab goes silent
// (its session ends after the server-side gap) and re-beats the moment it's foregrounded.
let started = false;
export function initTracking() {
  if (started || typeof document === "undefined") return;
  started = true;
  setInterval(() => { if (document.visibilityState === "visible") track("session_beat"); }, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") track("session_beat");
  });
}
