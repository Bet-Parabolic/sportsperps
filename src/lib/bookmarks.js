// Account-backed bookmarks with a local cache. The server (POST/GET /api/bookmarks) is the
// source of truth — bookmarks follow the userId across devices, and a guest who claims an
// account (same UUID) keeps them. localStorage keeps the old key as a render-fast cache, and
// the first sync merges any pre-existing device-local list into the account (additive, once).
import { API_URL } from "./constants.js";
import { currentUserId, authToken } from "./auth.js";

const CACHE_KEY = "parabolic_bookmarks";          // now a cache of the server list
const MERGED_KEY = "parabolic_bookmarks_merged";  // one-time device → account merge flag

export function cachedBookmarks() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch { return []; }
}
function setCache(ids) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}
export function isBookmarked(gameId) { return cachedBookmarks().includes(gameId); }

/** Pull the account's list (merging any legacy device-local ids up first). Returns ids. */
export async function syncBookmarks() {
  const userId = currentUserId();
  try {
    if (!localStorage.getItem(MERGED_KEY)) {
      const local = cachedBookmarks();
      if (local.length) {
        const r = await fetch(`${API_URL}/bookmarks/merge`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, token: authToken(), gameIds: local }),
        });
        // Only mark migrated when the server actually accepted it — a failed merge (offline,
        // deploy window) retries on the next sync instead of silently dropping the device list.
        if (r.ok) localStorage.setItem(MERGED_KEY, "1");
      } else {
        localStorage.setItem(MERGED_KEY, "1");
      }
    }
    const r = await fetch(`${API_URL}/bookmarks/${userId}?token=${encodeURIComponent(authToken() || "")}`);
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.gameIds)) { setCache(d.gameIds); return d.gameIds; }
    }
  } catch { /* offline — fall back to cache */ }
  return cachedBookmarks();
}

/** Optimistic toggle: cache updates instantly, the server write is fire-and-forget. */
export function toggleBookmark(gameId, on) {
  const ids = new Set(cachedBookmarks());
  if (on) ids.add(gameId); else ids.delete(gameId);
  setCache([...ids]);
  fetch(`${API_URL}/bookmarks`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId(), token: authToken(), gameId, on }),
  }).catch(() => { /* cache is already right locally; next sync reconciles */ });
  return [...ids];
}
