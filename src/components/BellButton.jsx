/**
 * Header notifications bell — self-contained: owns its open state, outside-click close, polling,
 * unread dot, and dropdown. Feed comes from the account's closed_trades (see lib/notifications.js):
 * liquidations, settlements, TP/SL, deleverages, closes. Drop one <BellButton userId .../> into a
 * terminal header. `variant="live"` matches the dark LiveTradingApp header; default matches the
 * home terminal header.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { fb, fm } from "../lib/theme.js";
import { fetchNotifications, lastSeen, markSeen, ago } from "../lib/notifications.js";

const TONE_COLOR = { win: "#5ed87e", loss: "#ff5247", neutral: "#c8ccd2" };

export function BellButton({ userId, worldcup = false, variant = "default" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(() => lastSeen(userId, worldcup));
  const ref = useRef(null);

  const refresh = useCallback(async () => {
    const list = await fetchNotifications(userId, { worldcup });
    setItems(list);
  }, [userId, worldcup]);

  // Poll every 30s + on mount so the unread dot updates even while the menu is closed.
  useEffect(() => {
    if (!userId) return;
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [userId, refresh]);

  // Reset seen baseline when the account changes.
  useEffect(() => { setSeen(lastSeen(userId, worldcup)); }, [userId, worldcup]);

  // Outside-click to close.
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = items.filter((n) => n.ts > seen).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && items.length) {
      const maxTs = Math.max(...items.map((n) => n.ts));
      markSeen(userId, worldcup, maxTs);
      setSeen(maxTs);
      refresh(); // pull anything newer the moment it's opened
    }
  };

  const live = variant === "live";
  const btnStyle = live
    ? { background: open ? "#22252b" : "#17191d", border: "none" }
    : { background: "#111", border: "1px solid #1f1f1f" };
  const iconColor = live ? (open ? "#fff" : "#9aa0a8") : "#aeb4bd";
  const now = Date.now();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} title="Notifications" aria-label="Notifications" style={{
        width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", ...btnStyle,
      }}>
        <Bell size={16} color={iconColor} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: 6, right: 6, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 999, background: "#ff5247", color: "#fff", fontSize: 9, fontWeight: 800, fontFamily: fm, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: 42, right: 0, width: 300, maxHeight: 400, overflowY: "auto", background: "#101114", border: "1px solid #23262c", borderRadius: 14, padding: "12px 10px", zIndex: 60, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", margin: "2px 6px 8px", fontFamily: fb }}>Notifications</div>
          {items.length === 0 ? (
            <div style={{ fontSize: 12, color: "#79808a", lineHeight: 1.5, padding: "6px 6px 10px", fontFamily: fb }}>
              Nothing yet — liquidations, settlements, TP/SL triggers and closed positions will show up here.
            </div>
          ) : items.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 10 }}>
              <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{n.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e8ebf0", fontFamily: fb, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.label} · <span style={{ color: "#aab0ba" }}>{n.team}</span>
                </div>
                <div style={{ fontSize: 11, color: "#79808a", fontFamily: fm, marginTop: 1 }}>{ago(n.ts, now)} ago</div>
              </div>
              {n.type !== "SETTLED" || n.pnl !== 0 ? (
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: fm, color: TONE_COLOR[n.tone] || "#c8ccd2", flexShrink: 0 }}>
                  {n.pnl >= 0 ? "+" : "−"}${Math.abs(n.pnl).toFixed(2)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
