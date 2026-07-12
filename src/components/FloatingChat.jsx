/**
 * Floating, draggable live-chat window (ported from the mobile popout design): drag-handle dots +
 * "Live chat" title + ✕, with the existing ChatPanel inside. Dragged by the header via pointer
 * events; position is clamped to the viewport and remembered for the session.
 */
import { useRef, useState } from "react";
import { fb } from "../lib/theme.js";
import { ChatPanel } from "./ChatPanel.jsx";

const W = 420, H = 480;

export function FloatingChat({ gameId, userId, homeShort, awayShort, onRequireAuth, onClose }) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(12, (window.innerWidth - W) / 2),
    y: Math.max(12, (window.innerHeight - H) / 2 - 40),
  }));
  const drag = useRef(null);

  const onDown = (e) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const x = Math.min(Math.max(4, e.clientX - drag.current.dx), window.innerWidth - W - 4);
    const y = Math.min(Math.max(4, e.clientY - drag.current.dy), window.innerHeight - 60);
    setPos({ x, y });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, height: H, zIndex: 940, background: "#16171b", border: "1px solid #26282e", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: fb }}>
      {/* header = drag handle */}
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{ display: "flex", alignItems: "center", padding: "12px 14px", cursor: "grab", touchAction: "none", userSelect: "none", borderBottom: "1px solid #222429", flexShrink: 0 }}>
        {/* 2x3 handle dots */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 4px)", gap: 4, marginRight: 12 }}>
          {Array.from({ length: 6 }, (_, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#4a4d55" }} />)}
        </div>
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>Live chat</div>
        <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} style={{ background: "none", border: "none", color: "#9aa0a8", fontSize: 16, cursor: "pointer", padding: 4 }}>✕</button>
      </div>
      {/* body - the existing per-game chat */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <ChatPanel gameId={gameId} userId={userId} homeShort={homeShort} awayShort={awayShort} onRequireAuth={onRequireAuth} fill />
      </div>
    </div>
  );
}
