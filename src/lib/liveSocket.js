import { WS_URL } from "./constants.js";
import { currentUserId, authToken, handleUnauthorized } from "./auth.js";

/* ─────────────────────────────────────────────────────────────
   liveSocket — ONE shared WebSocket for the whole app.

   Both the games list (useLiveGames) and the active trading view
   (LiveTradingApp) subscribe to this single connection instead of
   each opening their own socket. Auto-reconnects with exponential
   backoff and lives for the app's lifetime.

   subscribeLive(fn) → fn(msg) for every parsed message
                       ({init|game_update|liquidation|settlement}).
   Returns an unsubscribe function.
   ───────────────────────────────────────────────────────────── */

let ws = null;
const subscribers = new Set();
let backoff = 1000;
let lastMsgAt = 0;
let started = false;
let reconnectTimer = null;
let liveUid = null; // the userId this socket is subscribed as (for private per-user pushes)

// Tell the backend which user we are, so it routes private events (liquidations) only to us.
// Sent on every (re)connect and whenever the identity changes (guest → logged-in).
function sendSubscribe() {
  const userId = liveUid || currentUserId();
  if (ws && ws.readyState === 1 && userId) {
    // token lets the backend verify credentialed accounts before binding this socket to userId
    try { ws.send(JSON.stringify({ type: "subscribe", userId, token: authToken() })); } catch { /* noop */ }
  }
}

/* Update the subscribed user (call on login/logout). Re-subscribes immediately if connected. */
export function setLiveUser(userId) {
  liveUid = userId || null;
  sendSubscribe();
}

function connect() {
  let sock;
  try { sock = new WebSocket(WS_URL); } catch { scheduleReconnect(); return; }
  ws = sock;

  sock.onopen = () => { backoff = 1000; lastMsgAt = Date.now(); sendSubscribe(); };

  sock.onmessage = (ev) => {
    lastMsgAt = Date.now();
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    // Backend rejected our subscribe (credentialed account with a dead/rotated token) → treat as a
    // session expiry so the UI prompts a clean re-login. After clearAuth we re-subscribe as guest.
    if (msg.type === "subscribe_error") { handleUnauthorized(); return; }
    subscribers.forEach((fn) => { try { fn(msg); } catch { /* subscriber error — isolate */ } });
  };

  sock.onclose = () => scheduleReconnect();
  sock.onerror = () => { try { sock.close(); } catch { /* noop */ } };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  const delay = backoff;
  backoff = Math.min(delay * 2, 30000); // cap 30s
  reconnectTimer = setTimeout(connect, delay);
}

export function subscribeLive(fn) {
  subscribers.add(fn);
  if (!started) { started = true; connect(); }
  return () => subscribers.delete(fn);
}

// Foreground revive: iOS suspends background tabs — timers freeze and the socket can die WITHOUT
// firing onclose, so the auto-reconnect never triggers. When the tab returns to the foreground,
// force a fresh connection if the socket is closed or has gone silent (private liquidation /
// deleverage pushes ride this socket; a zombie connection silently drops them).
function revive() {
  clearTimeout(reconnectTimer);
  backoff = 1000;
  if (ws) { try { ws.onclose = null; ws.close(); } catch { /* noop */ } ws = null; }
  connect();
}
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !started) return;
    const silent = Date.now() - lastMsgAt > 45_000;
    const healthy = ws && (ws.readyState === 0 || ws.readyState === 1) && !silent;
    if (!healthy) revive();
  });
}

/* Timestamp of the last message received — used by REST-fallback heartbeats. */
export function lastMessageAt() { return lastMsgAt; }
