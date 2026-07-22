/**
 * Terminal home — "Overview" (Figma Parabolic-7-21-26 node 195-24094, July 21 2026 redesign).
 * Four stacked sections:
 *   1. HERO   — current balance + Deposit/Withdraw, wager stats (Total P&L / Open P&L / ROI /
 *               Win rate), and a balance chart with a Balance↔P&L toggle + time ranges. The chart
 *               is a realized-PnL walk ANCHORED BACKWARD from the live number (each closed trade
 *               steps the curve), so its right edge always equals the displayed balance.
 *   2. OPEN POSITIONS — cross-game table (Bet / Stake / Leverage / Entry / Live P&L / Close);
 *               Close sends the same reduce-only market order the terminal uses.
 *   3. GAMES BROWSER — category column (Live games / All games / per-sport with counts) + a
 *               searchable card grid grouped Live → by date. Replaces the header sport tabs.
 * Data: /balance (10s poll — includes openPositions w/ teamName), /profile/:id/trades (chart +
 * win rate), liveGames prop (WS-pushed backend games) for the browser + matchup context.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { B, fd, fb, fm } from "../../lib/theme.js";
import { API_URL } from "../../lib/constants.js";
import { periodLabel } from "../../lib/helpers.js";
import { currentUserId, authToken } from "../../lib/auth.js";

const START_BALANCE = 10000; // every paper account starts here — the ROI + chart baseline

// Category registry for the games browser (order = display order). Exported for the trading
// terminal's market-nav column (July 21 reconcile) so both surfaces share one sport taxonomy.
export const CATS = [
  { key: "nfl", label: "Football", emoji: "🏈", leagues: ["nfl"] },
  { key: "nba", label: "Basketball", emoji: "🏀", leagues: ["nba", "ncaam"] },
  { key: "soccer", label: "Soccer", emoji: "⚽", leagues: ["mls", "wcup"] },
  { key: "mlb", label: "Baseball", emoji: "⚾", leagues: ["mlb"] },
  { key: "nhl", label: "Hockey", emoji: "🏒", leagues: ["nhl"] },
];
const LEAGUE_LABEL = { nba: "NBA", ncaam: "NCAAM", mlb: "MLB", nfl: "NFL", nhl: "NHL", mls: "MLS", wcup: "WORLD CUP" };
// Browser-card bar palette per the Figma (browse surface only — the trading chart keeps mint/red).
const BAR_AWAY = "#53b1fd", BAR_HOME = "#f077c8";

const classify = (g) =>
  (g.status === "live" || g.status === "halftime") ? "live"
  : (g.status === "scheduled" && (g.pregame || g.tradeable)) ? "pregame"
  : (g.status === "scheduled") ? "upcoming"
  : "other";
const named = (g) => g.home?.name && g.away?.name && g.home.name !== "TBD" && g.away.name !== "TBD";

const fmtMoney = (v, dp = 2) => (v == null ? "—" : `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`);
const signed = (v, suffix = "") => (v == null ? "—" : `${v >= 0 ? "+" : "−"}${fmtMoney(v)}${suffix}`);
const pnlClr = (v) => (v == null ? "#888" : v >= 0 ? B.green : "#ef4444");

/* ── Hero balance/P&L chart — pure SVG, no dep. Points step at each closed trade; the walk is
   anchored backward from the CURRENT value so the right edge always matches the hero number. ── */
const RANGES = [
  { key: "1H", ms: 3600e3 }, { key: "12H", ms: 43200e3 }, { key: "1D", ms: 86400e3 },
  { key: "7D", ms: 7 * 86400e3 }, { key: "All", ms: null },
];
function buildSeries(trades, endValue, rangeMs) {
  const now = Date.now();
  const from = rangeMs ? now - rangeMs : 0;
  const asc = [...trades].filter((t) => t.closedAt).sort((a, b) => a.closedAt - b.closedAt);
  // Walk backward from the current value so fees/grants can't make the curve end ≠ hero number.
  let v = endValue;
  const pts = [{ t: now, v }];
  for (let i = asc.length - 1; i >= 0; i--) {
    const tr = asc[i];
    pts.push({ t: Math.max(tr.closedAt, 0), v }); // value AFTER this trade holds until the next
    v -= tr.pnl || 0;
    if (tr.closedAt < from) break;
    pts.push({ t: tr.closedAt, v });              // step down/up at the trade
  }
  pts.push({ t: from || (asc[0]?.closedAt ?? now) - 1, v });
  const win = pts.filter((p) => p.t >= from).sort((a, b) => a.t - b.t);
  if (win.length < 2) return [{ t: from || now - 1, v: endValue }, { t: now, v: endValue }];
  return win;
}
// Compact axis money label, e.g. $10k / $1.2k / $250, signed in P&L mode (0 = "$0", no sign).
function axisMoney(v, mode) {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : `$${Math.round(a)}`;
  return mode === "pnl" ? (v > 0.005 ? "+" : v < -0.005 ? "−" : "") + s : s;
}
const AXIS_W = 54;

function AreaChart({ series, height = 250, mode = "balance" }) {
  const W = 1000, H = height;
  const wrapRef = useRef(null); // the PLOT area (svg parent) — hover math is relative to this
  const [hover, setHover] = useState(null); // { t, v, px, py, rectW }
  const vs = series.map((p) => p.v);
  // Y domain: balance auto-fits the values; P&L is SYMMETRIC around 0 so the midpoint is always
  // zero and the curve reads clearly positive/negative.
  let lo, hi;
  if (mode === "pnl") {
    const maxAbs = Math.max(1, ...vs.map((v) => Math.abs(v)));
    hi = maxAbs; lo = -maxAbs;
  } else {
    lo = Math.min(...vs); hi = Math.max(...vs);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  }
  const pad = (hi - lo) * 0.15;
  lo -= pad; hi += pad; // symmetric padding keeps 0 exactly centered in P&L mode
  const t0 = series[0].t, t1 = series[series.length - 1].t || t0 + 1;
  const x = (t) => ((t - t0) / (t1 - t0 || 1)) * W;
  const y = (v) => H - ((v - lo) / (hi - lo)) * H;
  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  // 5 evenly-spaced ticks across the domain; in P&L mode the middle one is exactly 0.
  const N = 4;
  const ticks = Array.from({ length: N + 1 }, (_, i) => lo + (hi - lo) * (i / N));
  const isZero = (v) => Math.abs(v) < (hi - lo) * 1e-3;

  const valueAt = (t) => {
    if (t <= series[0].t) return series[0].v;
    if (t >= series[series.length - 1].t) return series[series.length - 1].v;
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1], b = series[i];
      if (t >= a.t && t <= b.t) return a.v + (b.v - a.v) * (b.t === a.t ? 0 : (t - a.t) / (b.t - a.t));
    }
    return series[series.length - 1].v;
  };
  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const xf = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = t0 + xf * (t1 - t0);
    const v = valueAt(t);
    setHover({ t, v, px: xf * rect.width, py: (y(v) / H) * rect.height, rectW: rect.width });
  };
  const fmtV = (v) => (mode === "pnl" ? signed(v) : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const fmtT = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ display: "flex", width: "100%", height }}>
      {/* Y AXIS gutter — value labels aligned to the gridlines */}
      <div style={{ position: "relative", width: AXIS_W, height, flexShrink: 0 }}>
        {ticks.map((tv, i) => (
          <div key={i} style={{ position: "absolute", right: 8, top: Math.min(Math.max(y(tv) - 6, 0), H - 12), fontSize: 10, fontFamily: fm, fontWeight: isZero(tv) && mode === "pnl" ? 700 : 500, color: isZero(tv) && mode === "pnl" ? "#9aa1ab" : "#5b616b", whiteSpace: "nowrap" }}>
            {axisMoney(tv, mode)}
          </div>
        ))}
      </div>

      {/* PLOT area */}
      <div ref={wrapRef} style={{ position: "relative", flex: 1, height, minWidth: 0 }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
          <defs>
            <linearGradient id="homeBalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fc7ff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#8fc7ff" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {ticks.map((tv, i) => (
            <line key={i} x1="0" x2={W} y1={y(tv)} y2={y(tv)}
              stroke={isZero(tv) && mode === "pnl" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)"}
              strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#homeBalFill)" />
          <path d={line} fill="none" stroke="#a5cdf5" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        </svg>
        {hover && (
          <>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: hover.px, width: 1, background: "rgba(255,255,255,0.2)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: hover.px - 4.5, top: hover.py - 4.5, width: 9, height: 9, borderRadius: "50%", background: "#a5cdf5", border: "2px solid #0e0f12", pointerEvents: "none" }} />
            <div style={{ position: "absolute", pointerEvents: "none", left: Math.min(Math.max(hover.px + 12, 4), Math.max(4, hover.rectW - 132)), top: Math.max(4, hover.py - 48), background: "#0a0c10", border: "1px solid #23262c", borderRadius: 9, padding: "6px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, fontFamily: fm, color: mode === "pnl" ? pnlClr(hover.v) : "#fff" }}>{fmtV(hover.v)}</div>
              <div style={{ fontSize: 10.5, color: "#7a828c", fontFamily: fm, marginTop: 1 }}>{fmtT(hover.t)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── kickoff formatting for upcoming cards ── */
function kickoffBits(startTime) {
  const d = new Date(startTime);
  if (isNaN(d)) return { rel: "", at: "" };
  const ms = d - Date.now();
  const h = Math.floor(ms / 3600e3), m = Math.max(0, Math.round((ms % 3600e3) / 60e3));
  const rel = ms <= 0 ? "Soon" : h > 0 ? `In ${h}:${String(m).padStart(2, "0")}` : `In ${m}m`;
  const today = new Date(); const isToday = d.toDateString() === today.toDateString();
  const tom = new Date(today.getTime() + 86400e3); const isTom = d.toDateString() === tom.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
  const at = `${isToday ? "Today" : isTom ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short" })} at ${time}`;
  return { rel, at };
}
function dateGroupLabel(startTime) {
  const d = new Date(startTime); const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const tom = new Date(today.getTime() + 86400e3);
  if (d.toDateString() === tom.toDateString()) return `Tomorrow, ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/* ── one games-browser card (Figma: matchup title, logos + win% chips, center state, 2-tone bar) ── */
function GameCard({ g, onTrade }) {
  const cls = classify(g);
  const live = cls === "live";
  const tradeable = live || cls === "pregame";
  const hp = g.oracle?.indexPrice != null && g.oracle?.confidence !== 0 ? g.oracle.indexPrice : null;
  const homePct = hp != null ? Math.round(hp * 100) : null;
  const awayPct = hp != null ? 100 - homePct : null;
  const { rel, at } = kickoffBits(g.startTime);
  const chip = (pct) => pct == null ? null : (
    <span style={{ fontSize: 11, fontWeight: 800, fontFamily: fm, color: "#dfe6ee", background: "#ffffff14", borderRadius: 6, padding: "2px 7px" }}>{pct}%</span>
  );
  const logo = (side) => side?.logo
    ? <img src={side.logo} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
    : <span style={{ fontSize: 22 }}>🏟️</span>;
  return (
    <div onClick={tradeable && onTrade ? () => onTrade(g) : undefined}
      style={{ background: "#101114", border: `1px solid ${live ? "#23262c" : "#1a1c21"}`, borderRadius: 16, padding: "16px 18px 14px", cursor: tradeable && onTrade ? "pointer" : "default", transition: "border-color .15s" }}
      onMouseEnter={(e) => { if (tradeable) e.currentTarget.style.borderColor = "#3a3f47"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = live ? "#23262c" : "#1a1c21"; }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", color: "#5b616b", fontFamily: fm, marginBottom: 4 }}>{LEAGUE_LABEL[g.league] || (g.league || "").toUpperCase()}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f2f4f7", fontFamily: fb, marginBottom: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {g.away?.name} vs {g.home?.name}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 52 }}>
          {logo(g.away)}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#c8cdd5", fontFamily: fm }}>{g.away?.abbreviation}</span>
            {chip(awayPct)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          {live ? (
            <>
              <div style={{ display: "inline-flex", gap: 6, marginBottom: 6 }}>
                <span style={{ background: "#1b1e23", borderRadius: 8, padding: "4px 12px", fontSize: 17, fontWeight: 800, fontFamily: fm, color: "#fff" }}>{g.away?.score ?? 0}</span>
                <span style={{ background: "#1b1e23", borderRadius: 8, padding: "4px 12px", fontSize: 17, fontWeight: 800, fontFamily: fm, color: "#fff" }}>{g.home?.score ?? 0}</span>
              </div>
              <div><span style={{ background: "#e8462d", color: "#fff", borderRadius: 6, padding: "2px 9px", fontSize: 10.5, fontWeight: 800, fontFamily: fm, letterSpacing: "0.04em" }}>LIVE · {periodLabel(g.league, g.period, g.clock, g.statusDetail) || "In play"}</span></div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#dfe3ea", fontFamily: fm }}>{rel}</div>
              <div style={{ fontSize: 11.5, color: "#79808a", marginTop: 2 }}>{at}</div>
              {cls === "pregame" && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: B.primaryLight, marginTop: 4, fontFamily: fm }}>TRADE PRE-GAME</div>}
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 52 }}>
          {logo(g.home)}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {chip(homePct)}
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "#c8cdd5", fontFamily: fm }}>{g.home?.abbreviation}</span>
          </div>
        </div>
      </div>
      {/* two-tone probability bar: away (left, blue) / home (right, pink) */}
      <div style={{ display: "flex", gap: 4, height: 4, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${awayPct ?? 50}%`, background: BAR_AWAY, borderRadius: 3 }} />
        <div style={{ flex: 1, background: BAR_HOME, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export function HomePage({ liveGames = [], onTrade, initialCategory = null, onOpenDeposit }) {
  const userId = currentUserId();

  /* ── account data: balance (10s) + trade history (60s) ── */
  const [bal, setBal] = useState(null);
  const [trades, setTrades] = useState([]);
  useEffect(() => {
    let on = true;
    const pull = () => {
      fetch(`${API_URL}/balance/${userId}`).then((r) => (r.ok ? r.json() : null))
        .then((b) => { if (on && b) setBal(b); }).catch(() => {});
      fetch(`${API_URL}/profile/${userId}/trades?limit=500&token=${encodeURIComponent(authToken() || "")}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((h) => { if (on && h?.trades) setTrades(h.trades); }).catch(() => {});
    };
    pull();
    const iv = setInterval(pull, 10000);
    return () => { on = false; clearInterval(iv); };
  }, [userId]);

  const openPnl = bal?.unrealizedPnl ?? null;
  const totalPnl = bal != null ? +(bal.closedPnl + (bal.unrealizedPnl || 0)).toFixed(2) : null;
  const equity = bal?.accountValue ?? null;
  const roi = totalPnl != null ? (totalPnl / START_BALANCE) * 100 : null;
  const winRate = useMemo(() => {
    const closes = trades.filter((t) => t.closeType !== "OPEN");
    if (!closes.length) return null;
    return Math.round((closes.filter((t) => (t.pnl || 0) > 0).length / closes.length) * 100);
  }, [trades]);

  /* ── chart state ── */
  const [chartMode, setChartMode] = useState("balance");
  const [range, setRange] = useState("All");
  const series = useMemo(() => {
    if (equity == null) return null;
    const end = chartMode === "balance" ? equity : (totalPnl ?? 0);
    return buildSeries(trades, end, RANGES.find((r) => r.key === range)?.ms ?? null);
  }, [trades, equity, totalPnl, chartMode, range]);

  /* ── open positions (from /balance's openPositions, teamName included) ── */
  const positions = bal?.openPositions || [];
  const [closing, setClosing] = useState({});
  const closePosition = useCallback(async (pos) => {
    if (closing[pos.gameId]) return;
    setClosing((c) => ({ ...c, [pos.gameId]: true }));
    try {
      await fetch(`${API_URL}/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, token: authToken(), gameId: pos.gameId,
          side: pos.side === "home" ? "away" : "home",
          size: pos.size, type: "market", reduceOnly: true,
        }),
      });
      const b = await fetch(`${API_URL}/balance/${userId}`).then((r) => (r.ok ? r.json() : null));
      if (b) setBal(b);
    } catch { /* next poll reconciles */ }
    setClosing((c) => ({ ...c, [pos.gameId]: false }));
  }, [userId, closing]);
  const gameOf = useCallback((gid) => liveGames.find((g) => g.id === gid), [liveGames]);

  /* ── games browser ── */
  const [cat, setCat] = useState(initialCategory || "all");
  useEffect(() => { if (initialCategory) setCat(initialCategory); }, [initialCategory]);
  const [q, setQ] = useState("");
  const relevant = useMemo(() => liveGames.filter((g) => named(g) && ["live", "pregame", "upcoming"].includes(classify(g))), [liveGames]);
  const liveAll = useMemo(() => relevant.filter((g) => classify(g) === "live"), [relevant]);
  const catCount = useCallback((c) => relevant.filter((g) => c.leagues.includes(g.league || "nba")).length, [relevant]);
  const shown = useMemo(() => {
    let list = cat === "live" ? liveAll
      : cat === "all" ? relevant
      : relevant.filter((g) => (CATS.find((c) => c.key === cat)?.leagues || []).includes(g.league || "nba"));
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((g) => `${g.home?.name} ${g.away?.name} ${g.home?.abbreviation} ${g.away?.abbreviation}`.toLowerCase().includes(needle));
    return list;
  }, [relevant, liveAll, cat, q]);
  const shownLive = shown.filter((g) => classify(g) === "live");
  const shownUpcoming = shown.filter((g) => classify(g) !== "live").sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const upcomingGroups = useMemo(() => {
    const m = new Map();
    for (const g of shownUpcoming) {
      const k = dateGroupLabel(g.startTime);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(g);
    }
    return [...m.entries()];
  }, [shownUpcoming]);
  const browserTitle = cat === "live" ? "Live Games" : cat === "all" ? "All Games" : `${CATS.find((c) => c.key === cat)?.label ?? ""} Games`;

  const sectionTitle = { fontFamily: fd, fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" };
  const card = { background: "#0e0f12", border: "1px solid #1a1c21", borderRadius: 18 };

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "26px 32px 60px", minWidth: 0 }} className="home-page-pad">
      {/* ═══ 1. HERO — balance + stats | chart ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 430px) 1fr", gap: 26, marginBottom: 34, alignItems: "stretch" }} className="home-hero">
        <div>
          <div style={{ fontSize: 13, color: "#8a919c", marginBottom: 6 }}>Current balance</div>
          <div style={{ fontFamily: fd, fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {equity != null ? `$${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={onOpenDeposit} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 999, border: "none", cursor: "pointer", background: "#1c1f24", color: "#fff", fontWeight: 700, fontSize: 13.5, fontFamily: fb }}>
              <ArrowDown size={15} /> Deposit
            </button>
            <button onClick={onOpenDeposit} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 999, border: "none", cursor: "pointer", background: "#1c1f24", color: "#fff", fontWeight: 700, fontSize: 13.5, fontFamily: fb }}>
              <ArrowUp size={15} /> Withdraw
            </button>
          </div>
          <div style={{ height: 1, background: "#191b20", margin: "22px 0 6px" }} />
          {[
            ["Total P&L", signed(totalPnl), pnlClr(totalPnl)],
            ["Open P&L", signed(openPnl), pnlClr(openPnl)],
            ["ROI", roi == null ? "—" : `${roi >= 0 ? "+" : "−"}${Math.abs(roi).toFixed(1)}%`, pnlClr(roi)],
            ["Win rate", winRate == null ? "—" : `${winRate}%`, "#e6e9ee"],
          ].map(([label, val, clr]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", fontSize: 13.5 }}>
              <span style={{ color: "#8a919c" }}>{label}</span>
              <span style={{ color: clr, fontWeight: 700, fontFamily: fm, fontVariantNumeric: "tabular-nums" }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ ...card, padding: "14px 16px 10px", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", background: "#16181d", borderRadius: 9, padding: 3 }}>
              {["balance", "pnl"].map((m) => (
                <button key={m} onClick={() => setChartMode(m)} style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, fontFamily: fb, border: "none", cursor: "pointer", borderRadius: 7, background: chartMode === m ? "#2a2e35" : "transparent", color: chartMode === m ? "#fff" : "#777e88" }}>
                  {m === "balance" ? "Balance" : "P&L"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setRange(r.key)} style={{ padding: "4px 8px", fontSize: 11.5, fontWeight: range === r.key ? 800 : 500, fontFamily: fm, border: "none", cursor: "pointer", borderRadius: 6, background: "transparent", color: range === r.key ? "#fff" : "#6a7078" }}>
                  {r.key}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 220 }}>
            {series ? <AreaChart series={series} height={236} mode={chartMode} /> : <div style={{ height: 236, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>Loading…</div>}
          </div>
        </div>
      </div>

      {/* ═══ 2. OPEN POSITIONS ═══ */}
      <div style={{ marginBottom: 38 }}>
        <h2 style={{ ...sectionTitle, marginBottom: 14 }}>Open positions</h2>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }} className="mob-nav">
          <div style={{ minWidth: 620 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1fr 1fr 1fr 1.4fr 84px", gap: 8, padding: "10px 18px", background: "#101114", fontSize: 11, fontWeight: 700, color: "#6a7078", fontFamily: fm, letterSpacing: "0.02em" }}>
            <span>Bet</span><span style={{ textAlign: "right" }}>Stake</span><span style={{ textAlign: "right" }}>Leverage</span><span style={{ textAlign: "right" }}>Entry</span><span style={{ textAlign: "right" }}>Live P&L</span><span />
          </div>
          {positions.length === 0 ? (
            <div style={{ padding: "26px 18px", fontSize: 13, color: "#6a7078", textAlign: "center" }}>
              No open positions — pick a game below to place your first trade.
            </div>
          ) : positions.map((p) => {
            const g = gameOf(p.gameId);
            const sideTeam = p.teamName || (p.side === "home" ? g?.home?.name : g?.away?.name) || p.side;
            const sub = g ? `${g.away?.abbreviation ?? ""} vs ${g.home?.abbreviation ?? ""}` : p.gameId;
            const logo = p.side === "home" ? g?.home?.logo : g?.away?.logo;
            const pct = p.margin ? (p.pnl / p.margin) * 100 : null;
            return (
              <div key={p.gameId + p.side} style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1fr 1fr 1fr 1.4fr 84px", gap: 8, padding: "13px 18px", alignItems: "center", borderTop: "1px solid #16181d" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#181b20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {logo ? <img src={logo} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <span style={{ fontSize: 14 }}>🏟️</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f2f4f7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sideTeam}</div>
                    <div style={{ fontSize: 11, color: "#6a7078", fontFamily: fm }}>{sub}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontFamily: fm, color: "#dfe3ea", fontWeight: 600 }}>{fmtMoney(p.margin)}</div>
                <div style={{ textAlign: "right", fontSize: 13, fontFamily: fm, color: "#dfe3ea", fontWeight: 600 }}>{p.leverage ? `${p.leverage}x` : "—"}</div>
                <div style={{ textAlign: "right", fontSize: 13, fontFamily: fm, color: "#dfe3ea", fontWeight: 600 }}>{p.entryPx != null ? `${Math.round(p.entryPx * 100)}¢` : "—"}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: fm, color: pnlClr(p.pnl) }}>{signed(p.pnl)}</div>
                  {pct != null && <div style={{ fontSize: 11, fontFamily: fm, color: pnlClr(p.pnl), opacity: 0.75 }}>{pct >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(0)}%</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button onClick={() => closePosition(p)} disabled={!!closing[p.gameId]} style={{ padding: "7px 16px", borderRadius: 999, border: "1px solid #2a2e35", cursor: "pointer", background: "#1c1f24", color: "#fff", fontWeight: 700, fontSize: 12, fontFamily: fb, opacity: closing[p.gameId] ? 0.5 : 1 }}>
                    {closing[p.gameId] ? "…" : "Close"}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
          </div>
        </div>
      </div>

      {/* ═══ 3. GAMES BROWSER — category column + card grid ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 30, alignItems: "start" }} className="home-browser">
        <div>
          <button onClick={() => setCat("live")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: cat === "live" ? "#15171c" : "transparent", fontFamily: fb }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: cat === "live" ? "#fff" : "#aeb4bd" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8462d", animation: liveAll.length ? "pulse 1.6s infinite" : "none" }} />
              Live games
            </span>
            <span style={{ fontSize: 12, fontFamily: fm, color: "#7a828c" }}>{liveAll.length}</span>
          </button>
          <button onClick={() => setCat("all")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: cat === "all" ? "#15171c" : "transparent", fontFamily: fb, marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: cat === "all" ? "#fff" : "#aeb4bd" }}>All games</span>
            <span style={{ fontSize: 12, fontFamily: fm, color: "#7a828c" }}>{relevant.length}</span>
          </button>
          <div style={{ borderTop: "1px solid #191b20", paddingTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {CATS.map((c) => {
              const n = catCount(c);
              const on = cat === c.key;
              return (
                <button key={c.key} onClick={() => setCat(c.key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: on ? "#15171c" : "transparent", fontFamily: fb }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "#fff" : "#aeb4bd" }}>
                    <span style={{ fontSize: 15 }}>{c.emoji}</span>{c.label}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: fm, color: "#7a828c" }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
            <h2 style={sectionTitle}>{browserTitle}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#101114", border: "1px solid #1a1c21", borderRadius: 999, padding: "8px 14px", width: 260 }}>
              <Search size={15} color="#6a7078" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 13, fontFamily: fb, width: "100%" }} />
            </div>
          </div>

          {shown.length === 0 && (
            <div style={{ ...card, padding: "34px 20px", textAlign: "center", color: "#6a7078", fontSize: 13.5 }}>
              {q ? "No games match your search." : cat === "live" ? "No live games right now — browse upcoming below." : "No games scheduled in this category yet."}
            </div>
          )}

          {shownLive.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8a919c", marginBottom: 10 }}>Live</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }} className="home-cards">
                {shownLive.map((g) => <GameCard key={g.id} g={g} onTrade={onTrade} />)}
              </div>
            </div>
          )}
          {upcomingGroups.map(([label, games]) => (
            <div key={label} style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8a919c", marginBottom: 10 }}>{label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }} className="home-cards">
                {games.map((g) => <GameCard key={g.id} g={g} onTrade={onTrade} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* narrow screens: stack the hero + browser columns */}
      <style>{`
        @media (max-width: 900px) {
          .home-hero { grid-template-columns: 1fr !important; }
          .home-browser { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          .home-page-pad { padding: 20px 14px 50px !important; }
          .home-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
