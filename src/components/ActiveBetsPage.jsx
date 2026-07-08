/**
 * Active bets page (nav-rail ticket icon) — every open position and resting order across all
 * games, with live PnL. Clicking a row jumps into that game's terminal when the market is still
 * known to the backend.
 */
import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { currentUserId } from "../lib/auth.js";
import { fmtUsd } from "../lib/helpers.js";

export function ActiveBetsPage({ liveGames = [], onTrade, eventOnly = false }) {
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [games, setGames] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let liveFlag = true;
    const userId = currentUserId();
    const load = async () => {
      try {
        // eventOnly (the /worldcup silo): positions come from the EVENT ledger (World Cup Cash);
        // resting orders share the /orders endpoint, filtered to WC games.
        const balUrl = eventOnly ? `${API_URL}/event/balance/${userId}` : `${API_URL}/balance/${userId}`;
        const [b, o, g] = await Promise.all([
          fetch(balUrl).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/orders/${userId}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/games`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!liveFlag) return;
        if (b?.openPositions) setPositions(eventOnly ? b.openPositions.filter((p) => p.gameId.startsWith("wcup_")) : b.openPositions);
        else if (eventOnly) setPositions([]); // not a participant yet → clean empty state
        if (o?.orders) setOrders(eventOnly ? o.orders.filter((x) => x.gameId.startsWith("wcup_")) : o.orders);
        if (g?.games) setGames(new Map(g.games.map((x) => [x.id, x])));
      } catch { /* ignore */ } finally { if (liveFlag) setLoading(false); }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { liveFlag = false; clearInterval(iv); };
  }, [eventOnly]);

  const gameOf = (gameId) => games.get(gameId) || liveGames.find((g) => g.id === gameId) || null;
  const nameOf = (gameId) => {
    const g = gameOf(gameId);
    return g ? `${g.home?.name ?? "Home"} vs ${g.away?.name ?? "Away"}` : gameId;
  };
  const teamOf = (gameId, side) => {
    const g = gameOf(gameId);
    if (!g) return side;
    return side === "home" ? (g.home?.name ?? "Home") : (g.away?.name ?? "Away");
  };
  const open = (gameId) => { const g = gameOf(gameId); if (g && onTrade) onTrade(g); };

  const card = { background: "#101114", border: "1px solid #1c1e24", borderRadius: 14, padding: "14px 16px", marginBottom: 8 };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Ticket size={18} color={B.primary} />
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>ACTIVE BETS</div>
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 6 }}>Your open positions</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Every live wager and resting order, across all games. Click one to jump into its market.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Loading…</div>
      ) : positions.length === 0 && orders.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🎟️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>No active bets yet</div>
          <div style={{ fontSize: 12.5, color: "#666" }}>Open a position from any live or pre-game market and it'll show up here.</div>
        </div>
      ) : (
        <>
          {positions.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.1em", fontFamily: fm, margin: "0 0 10px 2px" }}>POSITIONS ({positions.length})</div>
              {positions.map((p, i) => {
                const g = gameOf(p.gameId);
                const isLive = g && (g.status === "live" || g.status === "halftime");
                return (
                  <div key={i} onClick={() => open(p.gameId)} style={{ ...card, cursor: g ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {g?.home?.logo && <img src={g.home.logo} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                          {teamOf(p.gameId, p.side)}
                          {isLive && <span style={{ fontSize: 9, fontWeight: 800, color: B.green, background: B.green + "18", padding: "2px 7px", borderRadius: 999, fontFamily: fm }}>● LIVE</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#666", fontFamily: fm, marginTop: 2 }}>
                          {nameOf(p.gameId)} · {fmtUsd(p.margin)} · {(p.entryPx * 100).toFixed(0)}¢ · {p.leverage}x
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: fm, fontWeight: 800, fontSize: 15, color: (p.pnl ?? 0) >= 0 ? B.primary : B.red }}>{(p.pnl ?? 0) >= 0 ? "+" : ""}{fmtUsd(p.pnl ?? 0)}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>unrealized</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {orders.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.1em", fontFamily: fm, margin: "18px 0 10px 2px" }}>RESTING ORDERS ({orders.length})</div>
              {orders.map((o, i) => (
                <div key={o.oid ?? i} onClick={() => open(o.gameId)} style={{ ...card, cursor: gameOf(o.gameId) ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{o.side} · limit {(o.limitPx * 100).toFixed(1)}¢</div>
                    <div style={{ fontSize: 11.5, color: "#666", fontFamily: fm, marginTop: 2 }}>{nameOf(o.gameId)} · {o.restingSize ?? o.size} contracts</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, color: "#ff9f1c", background: "#ff9f1c15", padding: "3px 9px", borderRadius: 999 }}>RESTING</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
