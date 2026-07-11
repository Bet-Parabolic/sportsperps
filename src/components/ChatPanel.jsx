import { useEffect, useRef, useState, useCallback } from "react";
import { B, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { subscribeLive } from "../lib/liveSocket.js";
import { isLoggedIn, authToken, currentUserId } from "../lib/auth.js";

// Per-event chat + bettors feed. Loads recent messages over REST, then appends live ones from the
// shared WebSocket (bet messages are auto-posted by the backend on open/close). Only logged-in
// profiles can send; a sender's current position (team + notional) shows next to their name.
export function ChatPanel({ gameId, userId, homeShort = "Home", awayShort = "Away", onRequireAuth, fill = false }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  // Append one message, deduped by id against current state.
  const append = useCallback((m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  // Initial load (and reset) whenever the game changes.
  useEffect(() => {
    let alive = true;
    setMessages([]);
    fetch(`${API_URL}/chat/${gameId}?limit=200`).then((r) => r.json()).then((d) => {
      if (alive && Array.isArray(d.messages)) setMessages(d.messages);
    }).catch(() => {});
    return () => { alive = false; };
  }, [gameId]);

  // Live messages from the shared socket.
  useEffect(() => {
    return subscribeLive((msg) => {
      if (msg?.type === "chat" && msg.message?.gameId === gameId) append(msg.message);
    });
  }, [gameId, append]);

  // Auto-scroll to the newest message.
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);

  const send = async () => {
    if (!isLoggedIn()) { onRequireAuth?.(); return; }
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      const res = await fetch(`${API_URL}/chat/${gameId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId(), token: authToken(), text: body }),
      });
      const m = await res.json();
      if (res.ok && m.id) append(m); // WS will also deliver it; dedup by id
    } catch { /* ignore */ }
  };

  const teamOf = (side) => (side === "home" ? homeShort : awayShort);
  const teamColor = (side) => (side === "home" ? B.primary : B.red);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: fill ? "100%" : 300, ...(fill ? { flex: 1, minHeight: 0, padding: "12px 14px" } : {}) }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", fontSize: 13, color: "#555", padding: "28px 0" }}>💬 No messages yet — say something.</div>}
        {messages.map((m) => m.type === "bet" ? <BetRow key={m.id} m={m} teamOf={teamOf} teamColor={teamColor} /> : <UserRow key={m.id} m={m} mine={m.userId === userId} teamOf={teamOf} teamColor={teamColor} />)}
      </div>

      {/* Composer */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid #1f1f1f" }}>
        {isLoggedIn() ? (
          <>
            <input
              value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message…" maxLength={280}
              style={{ flex: 1, minWidth: 0, padding: "10px 12px", background: "#0a0a0a", border: "1px solid #1f2329", borderRadius: 10, color: "#fff", fontSize: 16 /* ≥16px avoids iOS zoom-on-focus */, fontFamily: fb, outline: "none" }}
            />
            <button onClick={send} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: B.primary, color: "#04130c", fontFamily: fb, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Send</button>
          </>
        ) : (
          <button onClick={() => onRequireAuth?.()} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #1f2329", background: "transparent", color: B.primary, fontFamily: fb, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Log in to chat</button>
        )}
      </div>
    </div>
  );
}

// Automated bet-feed message (open / close).
function BetRow({ m, teamOf, teamColor }) {
  const team = teamOf(m.side), color = teamColor(m.side);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#0c0e12", borderRadius: 10, border: "1px solid #15171c" }}>
      <span style={{ fontSize: 13 }}>{m.action === "open" ? "⚡" : "✓"}</span>
      <div style={{ fontSize: 12.5, color: "#bbb", fontFamily: fb, lineHeight: 1.4 }}>
        <b style={{ color: "#fff" }}>{m.username}</b>{" "}
        {m.action === "open" ? (
          <>opened <b style={{ color }}>{team}</b> · ${Number(m.margin).toLocaleString()} · {m.leverage}x · <span style={{ color: "#888" }}>${Number(m.notional).toLocaleString()} notional</span></>
        ) : (
          <>closed <b style={{ color }}>{team}</b>{m.pnl != null && <> · <span style={{ color: m.pnl >= 0 ? B.green : B.red, fontWeight: 700 }}>{m.pnl >= 0 ? "+" : "−"}${Math.abs(m.pnl).toLocaleString()}</span></>}</>
        )}
      </div>
    </div>
  );
}

// A user's chat message, with their position shown beside their name.
function UserRow({ m, mine, teamOf, teamColor }) {
  return (
    <div style={{ padding: "2px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: mine ? B.primary : "#dcdfe5", fontFamily: fb }}>{m.username}{mine && " (you)"}</span>
        {m.pos && (
          <span style={{ fontSize: 10, fontFamily: fm, fontWeight: 700, color: teamColor(m.pos.side), background: teamColor(m.pos.side) + "18", padding: "1px 7px", borderRadius: 999 }}>
            {teamOf(m.pos.side)} ${Number(m.pos.notional).toLocaleString()}
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "#e6e8ec", fontFamily: fb, lineHeight: 1.45, wordBreak: "break-word" }}>{m.text}</div>
    </div>
  );
}
