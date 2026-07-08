// World Cup Cash event helpers (plan 010 frontend). GET /api/event is public and cheap; the
// whole feature is INERT until the backend flips EVENT_ENABLED (meta.live === false hides all
// event UI, so shipping this ahead of the flag changes nothing for users).
import { API_URL } from "./constants.js";

let _cache = { t: 0, meta: null };

export async function fetchEventMeta(force = false) {
  if (!force && _cache.meta && Date.now() - _cache.t < 60_000) return _cache.meta;
  try {
    const meta = await fetch(`${API_URL}/event`).then((r) => (r.ok ? r.json() : null));
    if (meta) _cache = { t: Date.now(), meta };
    return _cache.meta || { live: false };
  } catch {
    return _cache.meta || { live: false };
  }
}

/** Eligible = the competition is open AND this game is in the event league (wcup). */
export function isEventEligible(meta, game) {
  return !!meta?.live && !!game && game.league === meta.league;
}
