/**
 * Active bets page (nav-rail ticket icon) — every open position and resting order across all
 * games, with live PnL. Clicking a row jumps into that game's terminal when the market is still
 * known to the backend.
 */
import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { currentUserId, authToken } from "../lib/auth.js";
import { fmtUsd } from "../lib/helpers.js";

const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

// Activity chip styling per event type — same language as the profile's outcome chips.
const ACT = {
  open:        { label: "BET",       color: B.primary,  bg: "rgba(31,209,130,0.15)" },
  close:       { label: "CASH OUT",  color: "#8ab8ff",  bg: "rgba(96,150,255,0.15)" },
  tp:          { label: "TP HIT",    color: B.primary,  bg: "rgba(31,209,130,0.15)" },
  sl:          { label: "SL HIT",    color: "#ff9f1c",  bg: "rgba(255,159,28,0.15)" },
  liquidation: { label: "☠ LIQ",     color: B.red,      bg: "rgba(255,82,71,0.15)" },
  settlement:  { label: "SETTLED",   color: "#8a93a6",  bg: "rgba(138,147,166,0.15)" },
};

export function ActiveBetsPage({ liveGames = [], onTrade, eventOnly = false, showMarkets = false }) {
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [games, setGames] = useState(new Map());
  const [activity, setActivity] = useState([]);   // own wager history (opens/TP/SL/liq/cashouts)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let liveFlag = true;
    const userId = currentUserId();
    const load = async () => {
      try {
        // eventOnly (the /worldcup silo): positions come from the EVENT ledger (World Cup Cash);
        // resting orders share the /orders endpoint, filtered to WC games.
        const balUrl = eventOnly ? `${API_URL}/event/balance/${userId}?token=${encodeURIComponent(authToken() || "")}` : `${API_URL}/balance/${userId}`;
        const [b, o, g, a] = await Promise.all([
          fetch(balUrl).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/orders/${userId}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/games`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/activity/${userId}?limit=100&token=${encodeURIComponent(authToken() || "")}`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!liveFlag) return;
        if (b?.openPositions) setPositions(eventOnly ? b.openPositions.filter((p) => p.gameId.startsWith("wcup_")) : b.openPositions);
        else if (eventOnly) setPositions([]); // not a participant yet → clean empty state
        if (o?.orders) setOrders(eventOnly ? o.orders.filter((x) => x.gameId.startsWith("wcup_")) : o.orders);
        if (g?.games) setGames(new Map(g.games.map((x) => [x.id, x])));
        if (a?.events) setActivity(eventOnly ? a.events.filter((e) => (e.gameId || "").startsWith("wcup_")) : a.events);
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

  // Games in scope (eventOnly → WC only), split LIVE NOW vs PREGAME vs UPCOMING. Between matches
  // (most of the competition's wall-clock) live+pregame are BOTH empty — without the upcoming
  // section this tab offered no path to the next market (July 11 UI audit P1-5).
  const scoped = [...games.values()].filter((g) => !eventOnly || g.id.startsWith("wcup_"));
  const liveNow = scoped.filter((g) => g.status === "live" || g.status === "halftime");
  const pregame = scoped.filter((g) => g.status !== "live" && g.status !== "halftime" && g.status !== "final" && g.pregame);
  const upcoming = scoped
    .filter((g) => g.status !== "live" && g.status !== "halftime" && g.status !== "final" && !g.pregame && new Date(g.startTime).getTime() > Date.now())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 3);
  const opensIn = (g) => {
    const win = (g.league === "wcup" ? 24 : 6) * 3600e3;
    const ms = new Date(g.startTime).getTime() - Date.now() - win;
    if (ms <= 0) return "Market opens soon";
    const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60000) % 60;
    return `Market opens in ${h > 0 ? `${h}h ${m}m` : `${m}m`}`;
  };
  const hasBets = positions.length > 0 || orders.length > 0;

  const sectionHead = (label, count, topGap) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.1em", fontFamily: fm, margin: `${topGap ? 18 : 0}px 0 10px 2px` }}>{label}{count != null ? ` (${count})` : ""}</div>
  );

  const gameRow = (g) => {
    const isLive = g.status === "live" || g.status === "halftime";
    const isUpcoming = !isLive && !g.pregame; // outside the wager window — market not open yet
    const px = g.oracle?.indexPrice;
    return (
      <div key={g.id} onClick={() => onTrade && onTrade(g)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {g.home?.logo && <img src={g.home.logo} alt="" style={{ width: 30, height: 30, objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              {g.home?.name ?? "Home"} vs {g.away?.name ?? "Away"}
              {isLive
                ? <span style={{ fontSize: 9, fontWeight: 800, color: B.green, background: B.green + "18", padding: "2px 7px", borderRadius: 999, fontFamily: fm }}>● LIVE</span>
                : isUpcoming
                ? <span style={{ fontSize: 9, fontWeight: 800, color: "#8b93a5", background: "#8b93a518", padding: "2px 7px", borderRadius: 999, fontFamily: fm }}>UPCOMING</span>
                : <span style={{ fontSize: 9, fontWeight: 800, color: "#8b93a5", background: "#8b93a518", padding: "2px 7px", borderRadius: 999, fontFamily: fm }}>PREGAME</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "#666", fontFamily: fm, marginTop: 2 }}>
              {isLive ? `${g.home?.score ?? 0} - ${g.away?.score ?? 0}` : isUpcoming ? opensIn(g) : "Market open · trade now"}
            </div>
          </div>
        </div>
        {px != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: fm, fontWeight: 800, fontSize: 15, color: "#fff" }}>{(px * 100).toFixed(0)}¢</div>
            <div style={{ fontSize: 10, color: "#555" }}>{g.home?.abbreviation ?? g.home?.name ?? "home"}</div>
          </div>
        )}
      </div>
    );
  };

  const MarketsSection = () => (liveNow.length === 0 && pregame.length === 0 && upcoming.length === 0) ? null : (
    <>
      {liveNow.length > 0 && <>{sectionHead("LIVE NOW", liveNow.length, true)}{liveNow.map(gameRow)}</>}
      {pregame.length > 0 && <>{sectionHead("PREGAME MARKETS", pregame.length, true)}{pregame.map(gameRow)}</>}
      {upcoming.length > 0 && <>{sectionHead("UPCOMING", upcoming.length, true)}{upcoming.map(gameRow)}</>}
    </>
  );

  // Full wager history — every open / cash-out / TP / SL / liquidation / settlement with
  // leverage, margin (notional ÷ leverage) and notional. Server-recorded, survives everything.
  const ActivitySection = () => activity.length === 0 ? null : (
    <>
      {sectionHead("WAGER ACTIVITY", activity.length, true)}
      {activity.map((e, i) => {
        const a = ACT[e.type] || { label: e.type?.toUpperCase?.() || "?", color: "#8a93a6", bg: "rgba(138,147,166,0.15)" };
        const margin = e.notional && e.leverage ? e.notional / e.leverage : null;
        return (
          <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "3px 8px", borderRadius: 6, background: a.bg, color: a.color, flexShrink: 0, whiteSpace: "nowrap" }}>{a.label}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.teamName || e.side || "-"}{e.leverage ? <span style={{ color: "#8a93a6", fontWeight: 600 }}> · {e.leverage}x</span> : null}
                </div>
                <div style={{ fontSize: 11, color: "#666", fontFamily: fm, marginTop: 1 }}>
                  {[margin != null && `margin ${fmtUsd(margin)}`, e.notional != null && `notional ${fmtUsd(e.notional)}`, e.game].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {e.pnl != null && e.type !== "open" && (
                <div style={{ fontFamily: fm, fontWeight: 800, fontSize: 14, color: e.pnl >= 0 ? B.primary : B.red }}>{e.pnl >= 0 ? "+" : ""}{fmtUsd(e.pnl)}</div>
              )}
              <div style={{ fontSize: 10, color: "#555", fontFamily: fm }}>{ago(e.at)}</div>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Ticket size={18} color={B.primary} />
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>ACTIVE BETS</div>
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 6 }}>Your Open Positions</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Every live wager and resting order, across all games. Click one to jump into its market.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Loading…</div>
      ) : !hasBets ? (
        (liveNow.length > 0 || pregame.length > 0 || upcoming.length > 0 || activity.length > 0) ? (
          <>
            <div style={{ ...card, textAlign: "center", padding: "20px 16px", marginBottom: 4 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginBottom: 3 }}>No active bets right now</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {liveNow.length > 0 || pregame.length > 0
                  ? "Pick a market below to open your next position."
                  : upcoming.length > 0 ? opensIn(upcoming[0]) + " - see the schedule below." : "Your wager history is below."}
              </div>
            </div>
            {MarketsSection()}
            {ActivitySection()}
          </>
        ) : (
          <div style={{ ...card, textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🎟️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>No active bets yet</div>
            <div style={{ fontSize: 12.5, color: "#666" }}>Open a position from any live or pre-game market and it'll show up here.</div>
          </div>
        )
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
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{teamOf(o.gameId, o.side)} · limit {(o.limitPx * 100).toFixed(1)}¢</div>
                    <div style={{ fontSize: 11.5, color: "#666", fontFamily: fm, marginTop: 2 }}>{nameOf(o.gameId)} · {o.restingSize ?? o.size} contracts</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, color: "#ff9f1c", background: "#ff9f1c15", padding: "3px 9px", borderRadius: 999 }}>RESTING</span>
                </div>
              ))}
            </>
          )}

          {MarketsSection()}
          {ActivitySection()}
        </>
      )}
    </div>
  );
}
