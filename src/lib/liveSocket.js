import { WS_URL } from "./constants.js";

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

function connect() {
  let sock;
  try { sock = new WebSocket(WS_URL); } catch { scheduleReconnect(); return; }
  ws = sock;

  sock.onopen = () => { backoff = 1000; lastMsgAt = Date.now(); };

  sock.onmessage = (ev) => {
    lastMsgAt = Date.now();
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
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

/* Timestamp of the last message received — used by REST-fallback heartbeats. */
export function lastMessageAt() { return lastMsgAt; }
