import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Home, Ticket, Newspaper, Trophy } from "lucide-react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { LOGO_WORDMARK, LOGO_MARK } from "../lib/logos.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId, logout as doLogout } from "../lib/auth.js";
import { AuthModal } from "./AuthModal.jsx";
import { VerifyModal } from "./VerifyModal.jsx";
import { NavRail } from "./NavRail.jsx";
import { ActiveBetsPage } from "./ActiveBetsPage.jsx";
import { NewsPage } from "./NewsPage.jsx";
import { ProfilePage } from "./ProfilePage.jsx";
import { useLiveGames } from "../lib/useLiveGames.js";

const LiveTradingApp = lazy(() => import("../trading/LiveTradingApp.jsx").then(m => ({ default: m.LiveTradingApp })));

// ═══════════════════════════════════════════════════════════════════════════
// /worldcup — the World Cup Championship app (siloed event surface).
// The terminal-style HOME of the event: left nav rail (Home / Active bets / News / Bookmarks /
// Leaderboard — all live), countdown hero, and the knockout BRACKET (QF → SF → Final + 3rd place)
// sourced from ESPN so winners advance automatically as games finish. No top sport tabs — one
// sport here. Same backend + SAME ACCOUNTS as the main app. Leaderboard tab is WC-ONLY (equity/
// ROI on the $10k grant — no points, no main-app PnL).
// ═══════════════════════════════════════════════════════════════════════════

const ESPN_WC = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260704-20260721";

// Parse an ESPN event into a bracket match. Winner flags are only meaningful once state==='post'
// (pre-game events carry winner:false on both sides).
function parseMatch(e) {
  const c = e.competitions?.[0] || {};
  const side = (ha) => {
    const t = (c.competitors || []).find((x) => x.homeAway === ha) || {};
    return {
      name: t.team?.shortDisplayName || t.team?.displayName || t.team?.abbreviation || "TBD",
      abbr: t.team?.abbreviation || "TBD",
      logo: t.team?.logo || null,
      score: t.score != null ? +t.score : null,
      winner: e.status?.type?.state === "post" ? t.winner === true : null,
    };
  };
  return {
    espnId: e.id,
    backendId: `wcup_${e.id}`,
    date: new Date(e.date),
    state: e.status?.type?.state, // pre | in | post
    detail: e.status?.type?.shortDetail || "",
    note: (c.notes || [])[0]?.headline || null, // e.g. "Switzerland advance 4-3 on penalties"
    home: side("home"),
    away: side("away"),
  };
}

// Round classification by the 2026 knockout calendar: R16 Jul 4–7, QF Jul 9–12, SF Jul 14–15,
// third place Jul 18, final Jul 19.
function classifyRounds(matches) {
  const sorted = [...matches].sort((a, b) => a.date - b.date);
  const r16 = sorted.filter((m) => m.date < new Date("2026-07-08T00:00:00Z"));
  const qf = sorted.filter((m) => m.date >= new Date("2026-07-08T00:00:00Z") && m.date < new Date("2026-07-13T00:00:00Z"));
  const sf = sorted.filter((m) => m.date >= new Date("2026-07-13T00:00:00Z") && m.date < new Date("2026-07-17T00:00:00Z"));
  const rest = sorted.filter((m) => m.date >= new Date("2026-07-17T00:00:00Z"));
  const final = rest.length ? rest[rest.length - 1] : null;
  const third = rest.length > 1 ? rest[0] : null;
  return { r16, qf, sf, third, final };
}

// The two R16 games whose winners meet in a given quarterfinal (matched by team, so the wings
// wire themselves correctly regardless of listing order).
function feedersFor(qfMatch, r16) {
  const inQf = (abbr) => abbr && (qfMatch.home.abbr === abbr || qfMatch.away.abbr === abbr);
  const winnerAbbr = (m) => (m.home.winner ? m.home.abbr : m.away.winner ? m.away.abbr : null);
  return r16.filter((m) => inQf(winnerAbbr(m)));
}

// Compact bracket match card — flag + code + score per row, winner in mint, loser dimmed.
function MatchCard({ m, onOpen, slim = false, center = false }) {
  if (!m) return null;
  const live = m.state === "in";
  const done = m.state === "post";
  const Row = ({ t }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: slim ? "2.5px 0" : "4px 0", opacity: done && t.winner === false ? 0.4 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {t.logo ? <img src={t.logo} alt="" style={{ width: slim ? 15 : 18, height: slim ? 15 : 18, flexShrink: 0 }} /> : <span style={{ width: slim ? 15 : 18 }} />}
        <span style={{ fontWeight: done && t.winner ? 800 : 600, fontFamily: fm, fontSize: slim ? 11 : 12.5, letterSpacing: "0.02em", color: done && t.winner ? B.primary : "#eef1f6", whiteSpace: "nowrap" }}>{t.abbr}</span>
      </div>
      <span style={{ fontFamily: fm, fontWeight: 800, fontSize: slim ? 11 : 12.5, color: done && t.winner ? B.primary : live ? "#fff" : "#7c8494", marginLeft: 6 }}>
        {m.state === "pre" ? "" : t.score ?? ""}
      </span>
    </div>
  );
  return (
    <div onClick={() => onOpen?.(m)} title={`${m.away.name} vs ${m.home.name}${m.note ? " — " + m.note : ""}`} style={{
      background: live ? "#0e1a14" : "#0d0f13", border: `1px solid ${live ? B.primary + "66" : center ? "#252a33" : "#1a1d24"}`,
      borderRadius: 10, padding: slim ? "6px 9px" : "8px 11px", cursor: "pointer", minWidth: 0,
    }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.07em", color: live ? "#ff5247" : "#4d545f", marginBottom: 3, whiteSpace: "nowrap" }}>
        {live ? "● LIVE — TRADE →" : done ? "FT" : m.date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })}
      </div>
      <Row t={m.home} />
      <Row t={m.away} />
    </div>
  );
}

// Classic FIFA bracket: two wings converging on the trophy. Left wing = QF1/QF2 (+ their R16
// feeders) → Semifinal 1; right wing (mirrored) = QF3/QF4 → Semifinal 2; center = FINAL + 🏆 +
// third place. ESPN fills TBD slots as rounds resolve, so winners advance automatically.
function Bracket({ matches, onOpen, isMobile }) {
  const { r16, qf, sf, third, final } = classifyRounds(matches);
  const label = (t) => <div style={{ fontSize: 9.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.12em", color: "#5a6170", textAlign: "center" }}>{t}</div>;

  if (isMobile) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div>{label("QUARTERFINALS")}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>{qf.map((m) => <MatchCard key={m.espnId} m={m} onOpen={onOpen} />)}</div></div>
        <div>{label("SEMIFINALS")}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>{sf.map((m) => <MatchCard key={m.espnId} m={m} onOpen={onOpen} />)}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {final && <div>{label("FINAL 🏆")}<div style={{ marginTop: 8 }}><MatchCard m={final} onOpen={onOpen} center /></div></div>}
          {third && <div>{label("THIRD PLACE")}<div style={{ marginTop: 8 }}><MatchCard m={third} onOpen={onOpen} /></div></div>}
        </div>
        {r16.length > 0 && <div>{label("ROUND OF 16 — RESULTS")}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>{r16.map((m) => <MatchCard key={m.espnId} m={m} onOpen={onOpen} slim />)}</div></div>}
      </div>
    );
  }

  // Wings: QF1+QF2 left, QF3+QF4 right; each QF's R16 feeders sit outboard of it.
  const leftQf = qf.slice(0, 2), rightQf = qf.slice(2, 4);
  const leftR16 = leftQf.flatMap((q) => feedersFor(q, r16));
  const rightR16 = rightQf.flatMap((q) => feedersFor(q, r16));
  const cell = (col, row, span, child, key) => (
    <div key={key} style={{ gridColumn: col, gridRow: `${row} / span ${span}`, alignSelf: "center", minWidth: 0 }}>{child}</div>
  );

  return (
    <div style={{ background: "#08090c", border: "1px solid #14161b", borderRadius: 18, padding: "20px 22px" }}>
      {/* column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.15fr 1fr 1fr 1fr", columnGap: 10, marginBottom: 12 }}>
        {label("ROUND OF 16")}{label("QUARTERS")}{label("SEMIFINAL 1")}<div style={{ textAlign: "center", fontFamily: fd, fontWeight: 800, fontSize: 15, letterSpacing: "0.14em", color: "#fff" }}>FINAL</div>{label("SEMIFINAL 2")}{label("QUARTERS")}{label("ROUND OF 16")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.15fr 1fr 1fr 1fr", gridTemplateRows: "repeat(4, minmax(74px, auto))", columnGap: 10, rowGap: 8 }}>
        {/* left wing — R16 feeders (outboard) */}
        {leftR16.slice(0, 4).map((m, i) => cell(1, i + 1, 1, <MatchCard m={m} onOpen={onOpen} slim />, m.espnId))}
        {/* left QFs */}
        {leftQf[0] && cell(2, 1, 2, <MatchCard m={leftQf[0]} onOpen={onOpen} />, "lqf0")}
        {leftQf[1] && cell(2, 3, 2, <MatchCard m={leftQf[1]} onOpen={onOpen} />, "lqf1")}
        {/* semifinal 1 */}
        {sf[0] && cell(3, 1, 4, <MatchCard m={sf[0]} onOpen={onOpen} />, "sf0")}
        {/* center — final, trophy, third place */}
        {cell(4, 1, 4, (
          <div style={{ display: "grid", gap: 10, justifyItems: "stretch" }}>
            {final && <MatchCard m={final} onOpen={onOpen} center />}
            <div style={{ textAlign: "center", fontSize: 44, lineHeight: 1, filter: "drop-shadow(0 6px 18px rgba(212,175,55,.35))" }}>🏆</div>
            {third && <div>
              <div style={{ fontSize: 8.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.1em", color: "#5a6170", textAlign: "center", marginBottom: 5 }}>THIRD PLACE</div>
              <MatchCard m={third} onOpen={onOpen} slim />
            </div>}
          </div>
        ), "center")}
        {/* semifinal 2 */}
        {sf[1] && cell(5, 1, 4, <MatchCard m={sf[1]} onOpen={onOpen} />, "sf1")}
        {/* right QFs */}
        {rightQf[0] && cell(6, 1, 2, <MatchCard m={rightQf[0]} onOpen={onOpen} />, "rqf0")}
        {rightQf[1] && cell(6, 3, 2, <MatchCard m={rightQf[1]} onOpen={onOpen} />, "rqf1")}
        {/* right wing — R16 feeders (outboard) */}
        {rightR16.slice(0, 4).map((m, i) => cell(7, i + 1, 1, <MatchCard m={m} onOpen={onOpen} slim />, m.espnId))}
      </div>
    </div>
  );
}

export function WorldCupPage() {
  const [tab, setTab] = useState("home"); // home | bets | news | bookmarks | leaderboard
  const [meta, setMeta] = useState(null);
  const [bracket, setBracket] = useState([]);   // ESPN knockout matches (QF → final)
  const [lb, setLb] = useState([]);             // event leaderboard (WC ONLY)
  const [auth, setAuth] = useState(getAuth);
  const [joined, setJoined] = useState(null);
  const [wcBalance, setWcBalance] = useState(null);
  const [standing, setStanding] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [now, setNow] = useState(Date.now());
  const liveGames = useLiveGames();
  const wcLive = liveGames.filter((g) => g.league === "wcup");
  const userId = auth?.userId || currentUserId();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 860;

  const refresh = useCallback(async () => {
    try {
      const [m, l, e] = await Promise.all([
        fetch(`${API_URL}/event`).then(r => r.json()),
        fetch(`${API_URL}/event/leaderboard?limit=50`).then(r => r.json()),
        fetch(ESPN_WC).then(r => r.json()).catch(() => null),
      ]);
      setMeta(m); setLb(l.leaderboard || []);
      if (e?.events) setBracket(e.events.map(parseMatch));
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
    } catch { setJoinErr("Network error — try again"); }
  }, [refresh]);

  // countdown to the next unplayed match
  const nextMatch = bracket.filter((m) => m.state === "pre").sort((a, b) => a.date - b.date)[0];
  const cd = nextMatch ? Math.max(0, nextMatch.date - now) : null;
  const cdStr = cd != null ? `${Math.floor(cd / 86400000)}d ${Math.floor(cd / 3600000) % 24}h ${Math.floor(cd / 60000) % 60}m ${Math.floor(cd / 1000) % 60}s` : null;

  const openMatch = async (m) => {
    try {
      const r = await fetch(`${API_URL}/games/${m.backendId}`);
      if (!r.ok) return; // future round the backend hasn't discovered yet — nothing to trade
      const full = await r.json();
      setActiveGame(full.game || full);
    } catch { /* ignore */ }
  };
  const openGame = async (g) => {
    try { const full = await fetch(`${API_URL}/games/${g.id}`).then(r => r.json()); setActiveGame(full.game || full); }
    catch { setActiveGame(g); }
  };

  if (activeGame) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
        <LiveTradingApp
          game={activeGame}
          onBack={() => { setActiveGame(null); refresh(); }}
          liveGames={wcLive}
          onNavTo={(t) => { setActiveGame(null); setTab(["home", "bets", "news", "leaderboard"].includes(t) ? t : "home"); refresh(); }}
          onTrade={(g) => openGame(g)}
          onOnboard={() => { setActiveGame(null); setShowAuth(true); }}
        />
      </Suspense>
    );
  }

  const card = { background: "#0b0d11", border: "1px solid #181b22", borderRadius: 16 };
  const label = { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: fm, color: "#666" };

  const navItems = [["home", Home], ["bets", Ticket], ["news", Newspaper], ["leaderboard", Trophy]];

  const LeaderboardTab = () => (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Trophy size={18} color={B.primary} />
        <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>THE WORLD CUP TRADING COMPETITION LEADERBOARD</div>
      </div>
      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>Ranked by PnL. Each entrant starts with $10,000 World Cup Cash.</p>
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 130px 100px", padding: "11px 16px", background: "#0e1015", borderBottom: "1px solid #181b22", ...label }}>
          <div>RANK</div><div>TRADER</div><div style={{ textAlign: "right" }}>WC CASH</div><div style={{ textAlign: "right" }}>ROI</div>
        </div>
        {lb.length === 0
          ? <div style={{ padding: "22px 16px", color: "#555", fontSize: 13 }}>{meta?.live ? "No entrants yet — be first on the board." : "The board opens with the championship."}</div>
          : lb.map((e) => {
              const me = e.userId === userId;
              return (
                <div key={e.userId} style={{ display: "grid", gridTemplateColumns: "54px 1fr 130px 100px", padding: "11px 16px", borderBottom: "1px solid #12141a", fontSize: 13, fontFamily: fm, background: me ? B.primary + "0d" : "transparent", borderLeft: me ? `3px solid ${B.primary}` : "3px solid transparent" }}>
                  <div style={{ fontWeight: 800, color: e.rank <= 3 ? B.primary : "#888" }}>{e.rank}</div>
                  <div style={{ fontWeight: 600, color: me ? B.primary : "#fff", fontFamily: fb }}>{e.username || e.userId.slice(0, 8)}{me ? " (you)" : ""}</div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>${(e.equity ?? 0).toLocaleString()}</div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: e.roiPct >= 0 ? B.primary : "#ff5247" }}>{e.roiPct >= 0 ? "+" : ""}{e.roiPct}%</div>
                </div>
              );
            })}
      </div>
    </div>
  );

  const HomeTab = () => (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontFamily: fd, fontWeight: 800, fontSize: isMobile ? 30 : 44, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          The World Cup <span style={{ color: B.primary }}>Trading Competition</span>
        </div>
        <p style={{ color: "#8a93a6", fontSize: isMobile ? 13 : 14.5, maxWidth: 560, margin: "12px auto 0", lineHeight: 1.6 }}>
          $10,000 World Cup Cash per entrant · trade live win probability through the bracket · cash prizes <strong style={{ color: B.primary }}>$1,000 · $500 · $250</strong>
        </p>
        {meta?.live && (joined
          ? <div style={{ marginTop: 14, display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {standing && [["RANK", `#${standing.rank}`], ["EQUITY", `$${standing.equity.toLocaleString()}`], ["ROI", `${standing.roiPct >= 0 ? "+" : ""}${standing.roiPct}%`]].map(([k, v]) => (
                <div key={k} style={{ ...card, padding: "10px 20px" }}>
                  <div style={label}>{k}</div>
                  <div style={{ fontFamily: fd, fontWeight: 800, fontSize: 18, color: k === "ROI" ? (standing.roiPct >= 0 ? B.primary : "#ff5247") : "#fff" }}>{v}</div>
                </div>
              ))}
            </div>
          : <div style={{ marginTop: 16 }}>
              <button onClick={join} style={{ padding: isMobile ? "13px 26px" : "15px 36px", borderRadius: 14, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 800, fontSize: isMobile ? 14 : 16, background: `linear-gradient(135deg, ${B.primary}, #52e0a3)`, color: "#04130c", boxShadow: `0 10px 34px ${B.primary}33` }}>
                🏆 Join the Championship — get $10,000
              </button>
              {joinErr && <div style={{ color: "#ff5247", fontSize: 13, marginTop: 10 }}>{joinErr}</div>}
              <div style={{ color: "#666", fontSize: 11.5, marginTop: 8 }}>One entry per person — email + phone verification keeps the prizes fair.</div>
            </div>)}
        {cdStr && nextMatch && (
          <div style={{ marginTop: 22 }}>
            <div style={label}>NEXT MATCH — {nextMatch.away.abbr} vs {nextMatch.home.abbr}</div>
            <div style={{ fontFamily: fm, fontWeight: 800, fontSize: isMobile ? 22 : 30, letterSpacing: "0.04em", marginTop: 4 }}>{cdStr}</div>
          </div>
        )}
      </div>

      <div style={{ ...label, marginBottom: 12 }}>THE ROAD TO THE FINAL</div>
      {bracket.length === 0
        ? <div style={{ color: "#555", fontSize: 13 }}>Bracket loads as fixtures are announced.</div>
        : <Bracket matches={bracket} onOpen={openMatch} isMobile={isMobile} />}

      <div style={{ color: "#4a4f58", fontSize: 11, marginTop: 30, textAlign: "center", lineHeight: 1.7 }}>
        World Cup Cash is competition play money, fully separate from your Parabolic paper balance. Your account here IS your
        Parabolic account — same login everywhere. Prizes require verified identity; accounts showing manipulation may be voided.
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", background: "#06070a", fontFamily: fb, color: "#eef1f6", display: "flex", overflow: "hidden" }}>
      {!isMobile && <NavRail active={tab} onNav={(t) => setTab(t)} hide={["bookmarks"]} />}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* top bar — brand + account only (single sport → no category tabs) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "14px 28px", borderBottom: "1px solid #14161b", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={isMobile ? LOGO_MARK : LOGO_WORDMARK} alt="Parabolic" style={{ height: 24 }} />
            <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 13, letterSpacing: "0.06em", color: B.primary }}>🏆 WORLD CUP</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {joined && wcBalance != null && (
              <div style={{ padding: "5px 12px", borderRadius: 10, background: B.primary + "14", border: `1px solid ${B.primary}44`, textAlign: "right" }}>
                {!isMobile && <div style={{ ...label, color: B.primary, fontSize: 8.5 }}>WORLD CUP CASH</div>}
                <div style={{ fontWeight: 800, fontFamily: fm, fontSize: 13 }}>${wcBalance.toLocaleString(undefined, { minimumFractionDigits: isMobile ? 0 : 2 })}</div>
              </div>
            )}
            {auth
              ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isMobile && <span style={{ fontSize: 13, color: "#aaa", fontFamily: fm }}>{auth.username}</span>}
                  <div onClick={() => setShowProfile(true)} title="My profile" style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1d22", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}>👤</div>
                </div>
              : <button onClick={() => setShowAuth(true)} style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: B.primary, color: "#04130c", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: fb }}>Sign in</button>}
          </div>
        </div>

        {/* tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "22px 14px 84px" : "32px 32px 60px" }}>
          {tab === "home" && <HomeTab />}
          {tab === "bets" && <ActiveBetsPage eventOnly liveGames={wcLive} onTrade={openGame} />}
          {tab === "news" && <NewsPage />}
          {tab === "leaderboard" && <LeaderboardTab />}
        </div>
      </div>

      {/* mobile bottom nav — same five destinations as the desktop rail */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#0a0a0a", borderTop: "1px solid #16181d", display: "flex", height: 56, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map(([key, Icon]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={tab === key ? B.primary : "#5a6170"} />
            </button>
          ))}
        </div>
      )}

      {showProfile && (
        <ProfilePage
          worldcup
          userId={auth?.userId}
          onClose={() => { setShowProfile(false); refresh(); }}
          onLoggedOut={() => { setShowProfile(false); }}
        />
      )}
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
