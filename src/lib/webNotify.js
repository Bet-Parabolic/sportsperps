/**
 * Browser (web push-less) notifications — the web parallel of the mobile app's Expo push.
 * Fires ONLY when the tab is hidden (in-tab the activity tray/toasts already cover it) and
 * only after the user explicitly opted in (Settings → Notifications, or the terminal bell).
 */
const OPT_KEY = "parabolic_web_notify"; // '1' = user opted in (separate from browser permission)

export function webNotifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current state: 'on' | 'off' | 'blocked' | 'unsupported' */
export function webNotifyState() {
  if (!webNotifySupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && localStorage.getItem(OPT_KEY) === "1" ? "on" : "off";
}

/** Ask for permission (must be called from a user gesture). Returns the new state. */
export async function enableWebNotify() {
  if (!webNotifySupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return perm === "denied" ? "blocked" : "off";
    localStorage.setItem(OPT_KEY, "1");
    return "on";
  } catch { return "off"; }
}

export function disableWebNotify() {
  try { localStorage.removeItem(OPT_KEY); } catch { /* ignore */ }
  return webNotifyState();
}

/** Fire a notification if opted-in AND the tab is hidden (never duplicate the in-tab tray). */
export function webNotify(title, body) {
  try {
    if (webNotifyState() !== "on" || !document.hidden) return;
    new Notification(title, { body, icon: "/favicon.svg", tag: "parabolic-" + title });
  } catch { /* notification constructor can throw on some mobile browsers - never break callers */ }
}
