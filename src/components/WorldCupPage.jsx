import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { LOGO_WORDMARK, LOGO_MARK } from "../lib/logos.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId, logout as doLogout } from "../lib/auth.js";
import { AuthModal } from "./AuthModal.jsx";
import { VerifyModal } from "./VerifyModal.jsx";
import { useLiveGames } from "../lib/useLiveGames.js";

const LiveTradingApp = lazy(() => import("../trading/LiveTradingApp.jsx").then(m => ({ default: m.LiveTradingApp })));

// ═══════════════════════════════════════════════════════════════════════════
// /worldcup — the World Cup Championship hub (siloed event surface).
// Same backend + SAME ACCOUNTS as the main app (signup here = login there); the page only
// surfaces EVENT data: World Cup Cash, WC fixtures, and the WC-only leaderboard (equity/ROI on
// the $10k grant — no points, no main-app PnL). Join flow: sign in → join → (verify email+phone
// when the identity gate is armed) → $10,000 World Cup Cash.
// ═══════════════════════════════════════════════════════════════════════════
export function WorldCupPage() {
  const [meta, setMeta] = useState(null);        // GET /api/event
  const [games, setGames] = useState([]);        // wcup fixtures
  const [lb, setLb] = useState([]);              // event leaderboard (WC ONLY)
  const [auth, setAuth] = useState(getAuth);
  const [joined, setJoined] = useState(null);    // null unknown · false · true
  const [wcBalance, setWcBalance] = useState(null);
  const [standing, setStanding] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [activeGame, setActiveGame] = useState(null); // opens the full trading terminal
  const [now, setNow] = useState(Date.now());
  const liveGames = useLiveGames();
  const userId = auth?.userId || currentUserId();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 720;

  const refresh = useCallback(async () => {
    try {
      const [m, g, l] = await Promise.all([
        fetch(`${API_URL}/event`).then(r => r.json()),
        fetch(`${API_URL}/games?league=wcup`).then(r => r.json()),
        fetch(`${API_URL}/event/leaderboard?limit=50`).then(r => r.json()),
      ]);
      setMeta(m); setGames(g.games || []); setLb(l.leaderboard || []);
      if (auth?.userId) {
        const eb = await fetch(`${API_URL}/event/balance/${auth.userId}`);
        if (eb.status === 404) { setJoined(false); setWcBalance(null); setStanding(null); }
        else if (eb.ok) {
          const d = await eb.json();
          setJoined(true); setWcBalance(d.balance);
          const st = await fetch(`${API_URL}/event/standing/${auth.userId}`).then(r => r.ok ? r.json() : null).catch(() => null);
          setStanding(st);
        }
      } else { setJoined(false); }
    } catch { /* keep last state */ }
  }, [auth?.userId]);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 30_000); return () => clearInterval(iv); }, [refresh]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { document.title = "Parabolic · World Cup Championship"; }, []);

  const join = useCallback(async () => {
    setJoinErr("");
    if (!getAuth()) { setShowAuth(true); return; }
    try {
      const res = await fetch(`${API_URL}/event/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getAuth().userId, token: authToken() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.joined) { setJoined(true); setWcBalance(d.worldCupCash); refresh(); return; }
      if (res.status === 403 && /verify/i.test(d.error || "")) { setShowVerify(true); return; }
      if (res.status === 401) { setShowAuth(true); return; }
      setJoinErr(d.error || "Could not join right now");
    } catch (e) { setJoinErr("Network error — try again"); }
  }, [refresh]);

  // ── countdown to the next fixture ──
  const nextGame = games
    .filter(g => g.status === "scheduled" || g.status === "pre")
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
  const cd = nextGame ? Math.max(0, new Date(nextGame.startTime) - now) : null;
  const cdStr = cd != null ? `${Math.floor(cd / 86400000)}d ${Math.floor(cd / 3600000) % 24}h ${Math.floor(cd / 60000) % 60}m ${Math.floor(cd / 1000) % 60}s` : null;

  const openGame = async (g) => {
    try {
      const full = await fetch(`${API_URL}/games/${g.id}`).then(r => r.json());
      setActiveGame(full.game || full);
    } catch { setActiveGame(g); }
  };

  // ── full trading terminal for a WC game (event ledger handles the rest) ──
  if (activeGame) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
        <LiveTradingApp
          game={activeGame}
          onBack={() => { setActiveGame(null); refresh(); }}
          liveGames={liveGames.filter(g => g.league === "wcup")}
          onNavTo={() => { setActiveGame(null); refresh(); }}
          onTrade={(g) => openGame(g)}
          onOnboard={() => { setActiveGame(null); setShowAuth(true); }}
        />
      </Suspense>
    );
  }

  const card = { background: "#0b0d11", border: "1px solid #181b22", borderRadius: 16 };
  const label = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: fm, color: "#666" };

  return (
    <div style={{ minHeight: "100vh", background: "#06070a", fontFamily: fb, color: "#eef1f6" }}>
      {/* ── top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 16px" : "16px 32px", borderBottom: "1px solid #14161b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={isMobile ? LOGO_MARK : LOGO_WORDMARK} alt="Parabolic" style={{ height: 26 }} />
          <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 14, letterSpacing: "0.06em", color: B.primary }}>🏆 WORLD CUP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* TEMP (remove before launch): direct terminal access for internal testing */}
          <button onClick={() => games.length && openGame(games[0])}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #22252b", background: "transparent", color: "#8a93a6", fontSize: 12, cursor: "pointer", fontFamily: fb, fontWeight: 600 }}>
            Continue to terminal →
          </button>
          {joined && wcBalance != null && (
            <div style={{ padding: "6px 14px", borderRadius: 10, background: B.primary + "14", border: `1px solid ${B.primary}44`, textAlign: "right" }}>
              <div style={{ ...label, color: B.primary }}>WORLD CUP CASH</div>
              <div style={{ fontWeight: 800, fontFamily: fm, fontSize: 14 }}>${wcBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          )}
          {auth
            ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#aaa", fontFamily: fm }}>{auth.username}</span>
                <button onClick={() => { doLogout(); window.location.reload(); }} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #22252b", background: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: fb }}>Log out</button>
              </div>
            : <button onClick={() => setShowAuth(true)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: B.primary, color: "#04130c", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: fb }}>Sign in</button>}
        </div>
      </div>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: isMobile ? "24px 16px 60px" : "40px 32px 80px" }}>
        {/* ── hero ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: fd, fontWeight: 800, fontSize: isMobile ? 32 : 52, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            The World Cup<br /><span style={{ color: B.primary }}>Championship</span>
          </div>
          <p style={{ color: "#8a93a6", fontSize: isMobile ? 13.5 : 15, maxWidth: 560, margin: "14px auto 0", lineHeight: 1.65 }}>
            Every entrant gets <strong style={{ color: "#fff" }}>$10,000 World Cup Cash</strong> — trade live win
            probability on the knockout rounds. Ranked by return. Real cash prizes: <strong style={{ color: B.primary }}>$1,000 · $500 · $250</strong>.
          </p>

          {meta && !meta.live && (
            <div style={{ marginTop: 18, display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "#101216", border: "1px solid #1c1f24", color: "#8a93a6", fontSize: 13 }}>
              The championship isn't open yet — check back soon.
            </div>
          )}

          {meta?.live && (
            joined
              ? <div style={{ marginTop: 20 }}>
                  <div style={{ display: "inline-flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                    {standing && [["RANK", `#${standing.rank}`], ["EQUITY", `$${standing.equity.toLocaleString()}`], ["ROI", `${standing.roiPct >= 0 ? "+" : ""}${standing.roiPct}%`]].map(([k, v]) => (
                      <div key={k} style={{ ...card, padding: "12px 22px" }}>
                        <div style={label}>{k}</div>
                        <div style={{ fontFamily: fd, fontWeight: 800, fontSize: 20, color: k === "ROI" ? (standing.roiPct >= 0 ? B.primary : "#ff5247") : "#fff" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: B.primary, fontSize: 13, fontWeight: 700, marginTop: 12 }}>✓ You're in — pick a match below and trade</div>
                </div>
              : <div style={{ marginTop: 20 }}>
                  <button onClick={join} style={{ padding: isMobile ? "14px 28px" : "16px 40px", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 800, fontSize: isMobile ? 15 : 17, background: `linear-gradient(135deg, ${B.primary}, #52e0a3)`, color: "#04130c", boxShadow: `0 10px 34px ${B.primary}33` }}>
                    🏆 Join the Championship — get $10,000
                  </button>
                  {joinErr && <div style={{ color: "#ff5247", fontSize: 13, marginTop: 10 }}>{joinErr}</div>}
                  <div style={{ color: "#666", fontSize: 11.5, marginTop: 10 }}>One entry per person — email + phone verification keeps the prizes fair.</div>
                </div>
          )}

          {cdStr && nextGame && (
            <div style={{ marginTop: 26 }}>
              <div style={label}>NEXT MATCH — {nextGame.shortName || nextGame.name}</div>
              <div style={{ fontFamily: fm, fontWeight: 800, fontSize: isMobile ? 22 : 30, letterSpacing: "0.04em", marginTop: 4 }}>{cdStr}</div>
            </div>
          )}
        </div>

        {/* ── fixtures ── */}
        <div style={{ ...label, marginBottom: 10 }}>KNOCKOUT FIXTURES</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 40 }}>
          {games.length === 0 && <div style={{ color: "#555", fontSize: 13 }}>Fixtures load as they're announced.</div>}
          {games.map(g => {
            const live = g.status === "live" || g.status === "halftime";
            const hp = g.oracle?.indexPrice != null ? Math.round(g.oracle.indexPrice * 100) : (g.homeWinProb != null ? Math.round(g.homeWinProb * 100) : null);
            return (
              <div key={g.id} onClick={() => openGame(g)} style={{ ...card, padding: "16px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.08em", color: live ? "#ff5247" : "#666" }}>
                    {live ? "● LIVE" : g.status === "final" ? "FINAL" : new Date(g.startTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span style={{ fontSize: 11, color: B.primary, fontWeight: 700 }}>{live ? "Trade →" : "View →"}</span>
                </div>
                {[["home", g.home], ["away", g.away]].map(([side, t]) => (
                  <div key={side} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t?.logo && <img src={t.logo} alt="" style={{ width: 20, height: 20 }} />}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{t?.name}</span>
                    </div>
                    <span style={{ fontFamily: fm, fontWeight: 800, fontSize: 14, color: side === "home" ? B.primary : "#ff5247" }}>
                      {live || g.status === "final" ? (t?.score ?? 0) : hp != null ? `${side === "home" ? hp : 100 - hp}%` : "–"}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* ── leaderboard — WORLD CUP ONLY (equity/ROI on the grant; no points, no main-app PnL) ── */}
        <div style={{ ...label, marginBottom: 10 }}>CHAMPIONSHIP LEADERBOARD</div>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 120px 90px 70px", padding: "11px 16px", background: "#0e1015", borderBottom: "1px solid #181b22", ...label }}>
            <div>RANK</div><div>TRADER</div><div style={{ textAlign: "right" }}>WC CASH</div><div style={{ textAlign: "right" }}>ROI</div><div style={{ textAlign: "right" }}>TRADES</div>
          </div>
          {lb.length === 0
            ? <div style={{ padding: "22px 16px", color: "#555", fontSize: 13 }}>{meta?.live ? "No entrants yet — be first on the board." : "The board opens with the championship."}</div>
            : lb.map((e) => {
                const me = e.userId === userId;
                return (
                  <div key={e.userId} style={{ display: "grid", gridTemplateColumns: "54px 1fr 120px 90px 70px", padding: "11px 16px", borderBottom: "1px solid #12141a", fontSize: 13, fontFamily: fm, background: me ? B.primary + "0d" : "transparent", borderLeft: me ? `3px solid ${B.primary}` : "3px solid transparent" }}>
                    <div style={{ fontWeight: 800, color: e.rank <= 3 ? B.primary : "#888" }}>{e.rank}</div>
                    <div style={{ fontWeight: 600, color: me ? B.primary : "#fff", fontFamily: fb }}>{e.username || e.userId.slice(0, 8)}{me ? " (you)" : ""}</div>
                    <div style={{ textAlign: "right", fontWeight: 700 }}>${(e.equity ?? 0).toLocaleString()}</div>
                    <div style={{ textAlign: "right", fontWeight: 700, color: e.roiPct >= 0 ? B.primary : "#ff5247" }}>{e.roiPct >= 0 ? "+" : ""}{e.roiPct}%</div>
                    <div style={{ textAlign: "right", color: "#888" }}>{e.trades}</div>
                  </div>
                );
              })}
        </div>

        <div style={{ color: "#4a4f58", fontSize: 11, marginTop: 26, textAlign: "center", lineHeight: 1.7 }}>
          World Cup Cash is competition play money, fully separate from your Parabolic paper balance. Your account here IS your Parabolic
          account — same login everywhere. Prizes require verified identity; accounts showing signs of manipulation may be voided.
        </div>
      </div>

      {showAuth && (
        <AuthModal
          reason="Sign in or create your Parabolic account — it works here and on the main app."
          onClose={() => setShowAuth(false)}
          onAuth={(data) => { setAuth(data); setShowAuth(false); refresh(); }}
        />
      )}
      {showVerify && auth && (
        <VerifyModal
          userId={auth.userId}
          onClose={() => setShowVerify(false)}
          onVerified={() => { setShowVerify(false); join(); }}
        />
      )}
    </div>
  );
}
