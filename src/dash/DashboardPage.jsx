import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, ReferenceLine,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { API_URL } from "../lib/constants.js";

/* Internal oracle-accuracy dashboard — parabolic.gg/dash. Admin-gated, unlinked, noindex. */

const C = {
  bg: "#06070a", card: "#0b0d11", surface: "#11141a", border: "#181b22",
  text: "#eef1f6", mut: "#8a93a6", primary: "#1fd182", primaryLt: "#52e0a3", red: "#ff5247", amber: "#f5b14b",
};
const mono = "'JetBrains Mono', ui-monospace, monospace";
const TOK = "parabolic_admin_token";

const adminFetch = (path) =>
  fetch(`${API_URL}${path}`, { headers: { "x-admin-token": localStorage.getItem(TOK) || "" } })
    .then((r) => { if (r.status === 401) throw new Error("401"); return r.json(); });

const fmt = (v, d = 4) => (v == null ? "—" : (+v).toFixed(d));
const fmtUsd = (v) => (v == null ? "—" : "$" + (+v).toLocaleString(undefined, { maximumFractionDigits: 0 }));
const fmtSigned = (v) => (v == null ? "—" : (v >= 0 ? "+$" : "−$") + Math.abs(+v).toFixed(0));
const cents = (v) => (v == null ? "—" : (v * 100).toFixed(1) + "¢");
const ago = (ts) => {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  return Math.floor(s / 3600) + "h";
};

// Hover-explainers — a "?" badge that reveals plain-English help. The tooltip is rendered in a
// PORTAL with position:fixed (anchored to the badge's viewport rect) so it can never be clipped by
// a scrollable/overflow ancestor — e.g. the vault tables wrap in overflow-x:auto, which previously
// swallowed every table-header tooltip.
const TIP_CSS = `
.dinfo{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1px solid #2a2f3a;color:#8a93a6;font-size:9px;font-weight:700;margin-left:5px;cursor:help;position:relative;vertical-align:middle;}
.dtip{position:fixed;width:244px;background:#11141a;border:1px solid #2a2f3a;border-radius:8px;padding:9px 11px;color:#cfd6e4;font-size:11px;font-weight:400;line-height:1.55;z-index:9999;text-align:left;box-shadow:0 8px 24px rgba(0,0,0,.55);white-space:normal;transform:translate(-50%,calc(-100% - 9px));pointer-events:none;}
`;
const Info = ({ text }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const half = 126; // ~half tooltip width + margin, to keep it on-screen near the edges
    const x = Math.min(Math.max(r.left + r.width / 2, half + 4), window.innerWidth - half - 4);
    setPos({ x, y: r.top });
  };
  const hide = () => setPos(null);
  return (
    <span ref={ref} className="dinfo" tabIndex={0} role="img" aria-label={text}
      onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>?
      {pos && text && createPortal(
        <span className="dtip" style={{ left: pos.x, top: pos.y }}>{text}</span>,
        document.body)}
    </span>
  );
};
const TIP = {
  games: "Finished games we've scored the oracle against. Each one feeds every metric below.",
  forecasts: "Individual (predicted price → actual result) checkpoints across all graded games — the sample size behind the metrics.",
  brier: "The headline accuracy score: average squared gap between the oracle's price and what actually happened. 0 = perfect, 0.25 = a useless 50/50 guess. Lower is better. Target: green < 0.18, amber to 0.22, red above (barely beating a coin).",
  logloss: "Like Brier, but punishes being confident AND wrong much harder. Lower is better. Target: green < 0.55; above 0.69 (red) means we're confidently wrong somewhere.",
  auc: "Can the oracle tell winners from losers? 1.0 = always priced the winner higher; 0.5 = a coin flip. Target: green > 0.82, amber to 0.72, red below.",
  reliability: "How far the prices sit from reality on average (the gap in the calibration curve). 0 = perfectly honest. Lower is better. Target: green < 0.01, amber to 0.03, red above.",
  skill: "Brier Skill Score: how much we beat a dumb forecaster that always guesses the average outcome. > 0 = we add value; 1 = perfect; negative = worse than guessing. Target: green > 0.2, amber > 0, red ≤ 0.",
  phases: "Brier within each phase of the game (per sport) — shows WHERE in a game the oracle is least accurate (e.g. the chaotic final innings/minutes). Each cell colors once it has ≥ 10 forecasts.",
  weights: "Data-driven weighting: each source's suggested share is INVERSELY proportional to its error (more accurate → more weight). A heuristic to nudge toward — NOT a final answer; wait for ~1000 forecasts before a big reweight. ↑ = source is underweighted vs its accuracy, ↓ = overweighted.",
  calibration: "Each dot: of all the moments the oracle said X%, did it actually happen X% of the time? On the dashed line = honest. Below = overpriced, above = underpriced.",
  sources: "Each price source graded on its own (lower Brier = more accurate). Tells us which source to trust and how to weight the blend.",
  singleSource: "Share of a game's logged moments priced by only ONE source. Target: green < 25%, amber to 50%, red above — over 50% it can't be cross-checked (soccer's known weak spot).",
  avgConf: "The oracle's own confidence (how much its sources agreed), averaged over the game. Higher = sources agreed.",
  settleGap: "How far the oracle's last live price was from the true 1/0 result. A big gap = a late surprise it didn't see coming.",
  staleKalshi: "How often the safety guard dropped a Kalshi quote for disagreeing with the live model. High = Kalshi was stale that game.",
  liveOracle: "The current live win-probability price for the home side, in cents.",
  liveSources: "How many independent price sources are feeding this game right now.",
  ticks: "Price points logged for this game so far. 0 on a settled game = it was already over when capture started.",
  // Vault tab
  vBalance: "The vault's paper-USDC balance — its capital base. Grows with fees + winning inventory; shrinks on losing inventory.",
  vPnl: "Realized PnL booked from settled games (vault collected premium, then paid out the outcome). Lifetime.",
  vUnreal: "Open inventory marked at the current oracle price across all active games. What realized PnL would be if every game settled at today's price.",
  vLiability: "Total notional the vault is currently short across all games (sum of per-side exposure). The book it would need to hedge.",
  vActive: "Games where the vault currently holds inventory (is acting as counterparty).",
  vNetDelta: "Users' net home-contract exposure on this game = exactly what the vault is short = what it would buy externally to flatten. + = net-long home, − = net-long away.",
  vLiabRow: "Notional the vault is short on each side (home / away), marked at the oracle. Compared against the per-game exposure cap.",
  vHedge: "The hedge the vault would place to flatten: side × contracts. Capital intensity scales with leverage, but hedge SIZE does not.",
  vVenue: "Cheapest hedge venue right now (fee/gas-aware) and the price it'd cross at for the side being hedged.",
  vBasis: "Hedge venue's price minus our oracle (P = Polymarket, K = Kalshi). The cost of crossing to hedge; near 0 is ideal.",
  vState: "open = live game with residual delta, keep the hedge on. unwind = game final or all user positions closed → close the hedge. none = nothing to hedge.",
  vFills: "Every fill the vault took as counterparty, newest first — the moment a user's order was filled by the vault.",
  vFunding: "Net funding the vault has collected as the residual counterparty (it's short the book's net delta). A small steady revenue line that also pays traders to balance the book.",
  vFundRow: "Current funding rate for this game, %/hr (already tapered). + → home longs pay (away + vault receive); − → away longs pay (home + vault receive). Driven by book premium + vault inventory skew, per-sport calibrated. ·t = the time-to-settlement taper (1 early → 0.1 at the final whistle) shrinking the carry near game end. See FUNDING_SPEC.",
  vPin: "Funding→exposure coupling. When one side stays heavily one-sided (|skew| ≥ 0.8) the vault throttles how much MORE inventory it'll take on that side — its cap shrinks from ×1.00 toward ×0.50 over ~30 min of sustained pinning, then recovers as skew normalizes. Shows the pinned side (HOME/AWAY), how long it's been pinned, and the current cap multiplier. Applies symmetrically to either side.",
  vHistory: "Every position taken against the vault, full lifecycle: the user's entry + close, and the vault's mirror PnL on Parabolic plus the shadow hedge prices. Open episodes first, then closed.",
  vFundUser: "Net funding the user paid (−) or received (+) over the life of the position.",
  vVaultPnl: "The vault's PnL on Parabolic for this position — the zero-sum counterparty result (≈ −user PnL). Funding and platform fees are separate lines.",
  vHedgeShadow: "SHADOW hedge: the venue (P=Polymarket, K=Kalshi) and price the vault would have crossed at to flatten this position's side, at open / at close. No real order is placed yet (Phase 2).",
  // Health tab
  hUptime: "How long the backend has run since its last deploy/restart. The rolling counters below reset on restart.",
  hWs: "Live WebSocket clients connected right now (browsers watching games), plus total connects since restart.",
  hBlind: "In-play games running with NO fresh oracle source right now — priced blind / frozen. Should be 0; investigate any game listed below.",
  hSingle: "In-play games priced by only ONE source right now — can't be cross-checked against a second feed. Fewer is better.",
  hFetch: "Per data-source fetch success since restart: % of API calls that succeeded + the last error. A dropping rate = that feed is failing, which means mispriced or frozen markets.",
  hMatch: "Of a league's eligible games, how many this source actually matched on the latest poll. A low rate means the source has markets but our matcher isn't joining them to our games (a coverage hole).",
  hApi: "Per API route: request count and p50/p95 latency (ms) over the recent window, plus 4xx/5xx counts. Rising p95 or 5xx = backend trouble.",
  hStale: "Times a fresh source quote was dropped for disagreeing with the live model (kept OUT of the blend), by source — plus the most recent incidents. A few is healthy (the guard working); a flood means a feed is persistently wrong.",
  // Product tab
  pDau: "Daily active users — distinct users who took any tracked action (login, wager, account created) today (UTC).",
  pWau: "Weekly active users — distinct users active in the last 7 days.",
  pSignups: "Distinct users who created a username/password account (a signup event). Guests can wager without signing up, so this is lower than activated users.",
  pActivation: "Activation rate = of all users seen, the share that placed at least one wager. The single most important early metric — are people actually trying the core action?",
  pFunnel: "The activation journey: users seen → placed a wager → became a repeat trader (wagered on 2+ different days). '% of prev' is the conversion at each step. It's non-strict — signup isn't required to wager.",
  pRetention: "Do users come back? D1 = of users whose first day was ≥1 day ago, the share active again the next day. D7 = active again within the following week. Cohort = how many users are old enough to count. Target: green ≥40%, amber ≥20%.",
  pDaily: "Activity per day: DAU (distinct active users, green) and new users first seen that day (amber). Watch the trend across match-days.",
  pEvents: "Raw event volume by type since the backend last restarted — a sanity check that each tracked action is firing.",
  // Economics tab
  eVaultBal: "The vault's current paper-USDC balance. Starts at $50,000; moves with vault trading PnL (at settlement) + net funding collected. The core capital line.",
  eHouse: "Total house economics = realized (vault trading PnL + funding + fee revenue) + open-inventory unrealized. What the house has made on paper. Validates the money model before real capital.",
  eFees: "Fee revenue = taker fees collected − maker rebates paid. In a well-hedged book this + funding is the reliable house revenue (vault trading PnL should net toward 0). Since backend restart.",
  eFunding: "Net funding the vault has collected as the residual counterparty — a small steady revenue line that also pays traders to balance the book.",
  eWaterfall: "How the house made (or lost) money, broken out: vault trading PnL + funding + fee revenue = realized house profit; add open-inventory mark-to-oracle for the total incl. open risk.",
  eTrend: "House economics over time from periodic snapshots (every 5 min). Realized house = trading + funding + fees. Watch the slope — is the model compounding profit as volume grows?",
  eLiq: "Liquidations since restart: how many positions were force-closed and their total notional. A spike means the leverage/risk settings may be too loose (or a big gap hit).",
  eActivity: "Live platform activity at the latest snapshot: open interest (notional in open positions), open positions, active traders, live markets.",
};

function Login({ onAuthed }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    try {
      const r = await fetch(`${API_URL}/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!r.ok) return setErr("Wrong password");
      const { token } = await r.json();
      localStorage.setItem(TOK, token);
      onAuthed();
    } catch { setErr("Network error"); }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 320 }}>
        <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Oracle dashboard</div>
        <div style={{ color: C.mut, fontSize: 12, marginBottom: 16 }}>Internal · admin only</div>
        <input type="password" value={pw} placeholder="Admin password" autoFocus
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none" }} />
        {err && <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{err}</div>}
        <button onClick={submit} style={{ width: "100%", marginTop: 14, padding: "10px 0", background: C.primary, color: "#04140d", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Enter</button>
      </div>
    </div>
  );
}

const Panel = ({ title, children, right, info }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{title}{info && <Info text={info} />}</div>
      {right}
    </div>
    {children}
  </div>
);

const Stat = ({ label, value, sub, info, valueColor }) => (
  <div style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", minWidth: 120 }}>
    <div style={{ color: C.mut, fontSize: 11, fontWeight: 600 }}>{label}{info && <Info text={info} />}</div>
    <div style={{ color: valueColor || C.text, fontSize: 22, fontWeight: 700, fontFamily: mono }}>{value}</div>
    {sub && <div style={{ color: C.mut, fontSize: 11 }}>{sub}</div>}
  </div>
);

// Sample-size confidence: how much to trust the graded metrics (see ORACLE_METRICS_GUIDE.md §1).
function confidence(games, forecasts) {
  if (games == null) return { color: C.mut, label: "—", msg: "" };
  if (games < 10 || forecasts < 100)
    return { color: C.red, label: "Not yet meaningful", msg: "Too little data — ignore the values below for now. Watch that games accumulate and coverage stays healthy. (Trust overall numbers at ~50 games / 500 forecasts.)" };
  if (games < 50 || forecasts < 500)
    return { color: C.amber, label: "Directional only", msg: "Big biases and trends are visible, but the numbers aren't precise yet. Confirm at ~50 games / 500 forecasts." };
  return { color: C.primary, label: "Confident", msg: "Sample is large enough to trust — confirm it holds stable across multiple match-days." };
}
const ConfidenceBanner = ({ games, forecasts }) => {
  const c = confidence(games, forecasts);
  return (
    <div style={{ background: c.color + "14", border: `1px solid ${c.color}55`, borderRadius: 12, padding: "11px 16px", marginBottom: 16 }}>
      <span style={{ color: c.color, fontWeight: 800, fontSize: 13 }}>{c.label}</span>
      <span style={{ color: C.text, fontSize: 13 }}> · {games} games / {forecasts} forecasts graded</span>
      <div style={{ color: C.mut, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{c.msg}</div>
    </div>
  );
};
// Metric color band, gated by trust: gray until there's enough data, then green/amber/red vs targets.
const band = (v, trust, dir, good, ok) =>
  (!trust || v == null) ? C.mut
    : dir === "low" ? (v <= good ? C.primary : v <= ok ? C.amber : C.red)
      : (v >= good ? C.primary : v >= ok ? C.amber : C.red);

const th = { textAlign: "left", color: C.mut, fontSize: 11, fontWeight: 600, padding: "6px 10px", borderBottom: `1px solid ${C.border}` };
const td = { color: C.text, fontSize: 12, padding: "6px 10px", fontFamily: mono, borderBottom: `1px solid ${C.border}` };

function ReliabilityChart({ bins }) {
  const pts = (bins || []).filter((b) => b.n > 0).map((b) => ({ meanP: b.meanP, meanY: b.meanY, n: b.n }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid stroke={C.border} />
        <XAxis type="number" dataKey="meanP" domain={[0, 1]} stroke={C.mut} tick={{ fontSize: 11 }}
          label={{ value: "predicted", position: "insideBottom", offset: -12, fill: C.mut, fontSize: 11 }} />
        <YAxis type="number" dataKey="meanY" domain={[0, 1]} stroke={C.mut} tick={{ fontSize: 11 }}
          label={{ value: "actual", angle: -90, position: "insideLeft", fill: C.mut, fontSize: 11 }} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={C.mut} strokeDasharray="5 4" />
        <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
          formatter={(v, k) => [fmt(v, 3), k]} />
        <Scatter data={pts} fill={C.primary} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function GameExplorer({ gameId, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { adminFetch(`/admin/oracle/game/${gameId}`).then(setData).catch(() => {}); }, [gameId]);
  const path = (data?.ticks || []).map((t) => ({ t: t.t, ip: t.ip, label: t.clock_label, scoring: t.scoring }));
  return (
    <Panel title={`Game · ${gameId}`} right={<button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, color: C.mut, borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>close</button>}>
      {!data ? <div style={{ color: C.mut, fontSize: 12 }}>loading…</div> : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={path} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke={C.border} />
            <XAxis dataKey="label" stroke={C.mut} tick={{ fontSize: 10 }} minTickGap={40} />
            <YAxis domain={[0, 1]} stroke={C.mut} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
            <Line type="monotone" dataKey="ip" stroke={C.primary} dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function VaultTab({ vault, history = [] }) {
  const [sub, setSub] = useState("live"); // 'live' | 'history'
  if (!vault) return <Panel title="Vault"><div style={{ color: C.mut, fontSize: 13 }}>Loading…</div></Panel>;
  const v = vault.vault || {};
  const games = vault.games || [];
  const fills = vault.fills || [];
  const stateColor = { open: C.primaryLt, unwind: "#f5a524", none: C.mut };
  const signColor = (n) => ((n || 0) >= 0 ? C.primaryLt : C.red);
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Balance" value={fmtUsd(v.balance)} info={TIP.vBalance} />
        <Stat label="Realized PnL" value={fmtSigned(v.totalPnl)} sub="lifetime" info={TIP.vPnl} />
        <Stat label="Unrealized PnL" value={fmtSigned(v.unrealizedPnl)} sub="open inventory" info={TIP.vUnreal} />
        <Stat label="Liability" value={fmtUsd(v.liability)} sub="short notional" info={TIP.vLiability} />
        <Stat label="Active games" value={v.activeGames ?? 0} info={TIP.vActive} />
        <Stat label="Volume" value={fmtUsd(v.totalVolume)} />
        <Stat label="Funding collected" value={fmtSigned(v.fundingCollected)} sub="net carry" info={TIP.vFunding} />
        {vault.shadow && <Stat label="Hedge coverage" value={vault.shadow.coverageRate != null ? (vault.shadow.coverageRate * 100).toFixed(0) + "%" : "—"} sub={`${vault.shadow.samples || 0} samples`} />}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["live", `Live (${games.length})`], ["history", `History (${history.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)} style={{ background: sub === id ? C.surface : "transparent", border: `1px solid ${sub === id ? C.border : "transparent"}`, color: sub === id ? C.text : C.mut, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: sub === id ? 700 : 500 }}>{label}</button>
        ))}
      </div>

      {sub === "history" && <VaultHistory rows={history} />}
      {sub === "live" && <>

      <Panel title={`Positions & hedges by game (${games.length})`} info={TIP.vHedge}>
        {games.length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No open vault inventory right now.</div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Game</th><th style={th}>Status</th><th style={th}>Oracle</th>
                <th style={th}>Net Δ<Info text={TIP.vNetDelta} /></th>
                <th style={th}>Liability H/A<Info text={TIP.vLiabRow} /></th>
                <th style={th}>Unreal<Info text={TIP.vUnreal} /></th>
                <th style={th}>Funding/hr<Info text={TIP.vFundRow} /></th>
                <th style={th}>Pin<Info text={TIP.vPin} /></th>
                <th style={th}>Hedge<Info text={TIP.vHedge} /></th>
                <th style={th}>Best venue<Info text={TIP.vVenue} /></th>
                <th style={th}>Basis ¢ P/K<Info text={TIP.vBasis} /></th>
                <th style={th}>State<Info text={TIP.vState} /></th>
              </tr></thead>
              <tbody>{games.map((g) => (
                <tr key={g.gameId}>
                  <td style={td}>{g.matchup} <span style={{ color: C.mut }}>{g.league}</span></td>
                  <td style={{ ...td, color: C.mut }}>{g.status}</td>
                  <td style={{ ...td, color: C.primaryLt }}>{cents(g.oraclePx)}</td>
                  <td style={{ ...td, color: signColor(g.users?.netHomeDelta) }}>{(g.users?.netHomeDelta ?? 0) >= 0 ? "+" : ""}{g.users?.netHomeDelta}</td>
                  <td style={td}>{fmtUsd(g.liability?.homeNotional)} / {fmtUsd(g.liability?.awayNotional)}</td>
                  <td style={{ ...td, color: signColor(g.unrealizedPnl) }}>{fmtSigned(g.unrealizedPnl)}</td>
                  <td style={{ ...td, color: g.funding ? signColor(g.funding.hourlyPct) : C.mut }}>{g.funding ? (g.funding.hourlyPct >= 0 ? "+" : "") + g.funding.hourlyPct.toFixed(3) + "%" : "—"}{g.funding && g.funding.taper != null && g.funding.taper < 0.99 ? <span style={{ color: C.mut, fontSize: 10 }}> ·t{g.funding.taper.toFixed(2)}</span> : null}</td>
                  <td style={td}>{(() => {
                    const f = g.funding;
                    if (!f || !f.pinSide) return <span style={{ color: C.mut }}>—</span>;
                    const side = f.pinSide > 0 ? "HOME" : "AWAY";
                    const cap = f.exposureScale ? (f.pinSide > 0 ? f.exposureScale.home : f.exposureScale.away) : 1;
                    const hot = cap <= 0.75;
                    return <span style={{ color: hot ? C.red : C.amber, fontWeight: 700 }}>{side} {f.pinMinutes}m <span style={{ color: C.mut, fontWeight: 400 }}>×{cap.toFixed(2)}</span></span>;
                  })()}</td>
                  <td style={td}>{g.hedge?.contracts > 0 ? `${g.hedge.side} ×${g.hedge.contracts}` : "—"}</td>
                  <td style={td}>{g.hedge?.bestVenue ? `${g.hedge.bestVenue} @ ${cents(g.hedge.bestVenuePx)}` : <span style={{ color: C.red }}>no venue</span>}</td>
                  <td style={td}>{g.hedge?.basisPoly != null ? (g.hedge.basisPoly * 100).toFixed(1) : "—"} / {g.hedge?.basisKalshi != null ? (g.hedge.basisKalshi * 100).toFixed(1) : "—"}</td>
                  <td style={{ ...td, color: stateColor[g.hedge?.state] || C.mut, fontWeight: 700 }}>{g.hedge?.state}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </Panel>

      <Panel title={`Recent vault fills (${fills.length})`} info={TIP.vFills}>
        {fills.length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No vault fills yet.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>When</th><th style={th}>Game</th><th style={th}>User</th><th style={th}>Side</th><th style={th}>Size</th><th style={th}>Price</th><th style={th}>Notional</th></tr></thead>
              <tbody>{fills.map((f, i) => (
                <tr key={i}>
                  <td style={{ ...td, color: C.mut }}>{ago(f.ts)} ago</td>
                  <td style={td}>{f.matchup}</td>
                  <td style={{ ...td, color: C.mut }} title={f.userId}>{(f.userId || "").slice(0, 8)}</td>
                  <td style={{ ...td, color: f.side === "home" ? C.primaryLt : C.red }}>{f.side}</td>
                  <td style={td}>{f.size}</td>
                  <td style={td}>{cents(f.px)}</td>
                  <td style={td}>{fmtUsd(f.notional)}</td>
                </tr>
              ))}</tbody>
            </table>}
      </Panel>
      </>}
    </>
  );
}

function VaultHistory({ rows }) {
  const signColor = (n) => ((n || 0) >= 0 ? C.primaryLt : C.red);
  const px = (v) => (v == null ? "—" : (v * 100).toFixed(1) + "¢");
  const closed = rows.filter((r) => r.status === "closed");
  const open = rows.filter((r) => r.status === "open");
  const Row = ({ r }) => (
    <tr>
      <td style={td}>{r.matchup} <span style={{ color: C.mut }}>{r.league}</span></td>
      <td style={{ ...td, color: r.side === "home" ? C.primaryLt : C.red }}>{r.side}</td>
      {/* User entry */}
      <td style={td}>{px(r.entry_px)}</td>
      <td style={td}>{r.size}</td>
      <td style={td}>{fmtUsd(r.margin)}</td>
      <td style={td}>{fmtUsd(r.notional)}</td>
      <td style={{ ...td, color: C.mut }}>{px(r.liq_price)}</td>
      <td style={td}>{r.leverage}x</td>
      {/* User close */}
      <td style={td}>{r.close_type ? <span style={{ color: C.mut }}>{r.close_type}</span> : "—"}</td>
      <td style={td}>{px(r.exit_px)}</td>
      <td style={{ ...td, color: signColor(r.user_pnl) }}>{r.user_pnl == null ? "—" : fmtSigned(r.user_pnl)}</td>
      <td style={{ ...td, color: signColor(r.funding_user) }}>{r.funding_user == null ? "—" : fmtSigned(r.funding_user)}</td>
      <td style={{ ...td, color: C.mut }}>{fmtUsd((r.open_fee || 0) + (r.close_fee || 0))}</td>
      {/* Vault side */}
      <td style={{ ...td, color: signColor(r.vault_pnl) }}>{r.vault_pnl == null ? "—" : fmtSigned(r.vault_pnl)}</td>
      <td style={td}>{r.hedge_venue_open ? `${r.hedge_venue_open[0].toUpperCase()} ${px(r.hedge_px_open)}` : "—"}</td>
      <td style={td}>{r.hedge_venue_close ? `${r.hedge_venue_close[0].toUpperCase()} ${px(r.hedge_px_close)}` : "—"}</td>
      <td style={{ ...td, color: C.mut }}>{r.closed_at ? new Date(r.closed_at).toLocaleString() : (r.opened_at ? new Date(r.opened_at).toLocaleString() : "—")}</td>
    </tr>
  );
  const head = (
    <thead>
      <tr>
        <th style={{ ...th, borderBottom: "none" }}></th><th style={{ ...th, borderBottom: "none" }}></th>
        <th style={{ ...th, textAlign: "center", color: C.primaryLt }} colSpan={6}>USER ENTRY</th>
        <th style={{ ...th, textAlign: "center", color: C.text }} colSpan={5}>USER CLOSE</th>
        <th style={{ ...th, textAlign: "center", color: "#f5b14b" }} colSpan={4}>VAULT</th>
        <th style={{ ...th, borderBottom: "none" }}></th>
      </tr>
      <tr>
        <th style={th}>Game</th><th style={th}>Side</th>
        <th style={th}>Entry</th><th style={th}>Size</th><th style={th}>Margin</th><th style={th}>Notional</th><th style={th}>Liq</th><th style={th}>Lev</th>
        <th style={th}>Type</th><th style={th}>Exit</th><th style={th}>User PnL</th><th style={th}>Funding<Info text={TIP.vFundUser} /></th><th style={th}>Fees</th>
        <th style={th}>Vault PnL<Info text={TIP.vVaultPnl} /></th><th style={th}>Hedge open<Info text={TIP.vHedgeShadow} /></th><th style={th}>Hedge close<Info text={TIP.vHedgeShadow} /></th>
        <th style={th}>When</th>
      </tr>
    </thead>
  );
  return (
    <Panel title={`Position history — all vault counterparty actions (${rows.length})`} info={TIP.vHistory}>
      <div style={{ color: C.mut, fontSize: 11, marginBottom: 10 }}>Hedge columns are <b>shadow</b> prices (the venue + price the vault would cross at). Real on-venue execution + its fees/PnL arrive in Phase 2.</div>
      {rows.length === 0
        ? <div style={{ color: C.mut, fontSize: 13 }}>No vault actions recorded yet.</div>
        : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            {head}
            <tbody>
              {open.map((r) => <Row key={r.id} r={r} />)}
              {closed.map((r) => <Row key={r.id} r={r} />)}
            </tbody>
          </table></div>}
    </Panel>
  );
}

// Reliability & data-source health — "are the feeds and systems healthy?".
function HealthTab({ data }) {
  if (!data) return <Panel title="Health"><div style={{ color: C.mut, fontSize: 13 }}>Loading…</div></Panel>;
  const live = data.live || { total: 0, noSource: 0, singleSource: 0, blind: [] };
  const pct = (v) => (v == null ? "—" : (v * 100).toFixed(0) + "%");
  const up = data.uptimeS || 0, upH = Math.floor(up / 3600), upM = Math.floor((up % 3600) / 60);
  const fetchColor = (r) => r == null ? C.mut : r >= 0.98 ? C.primary : r >= 0.9 ? C.amber : C.red;
  const matchColor = (r) => r == null ? C.mut : r >= 0.8 ? C.primary : r >= 0.5 ? C.amber : C.red;
  const p95Color = (ms) => ms == null ? C.mut : ms <= 150 ? C.primary : ms <= 500 ? C.amber : C.red;
  const errColor = (r) => r == null ? C.mut : r <= 0.005 ? C.primary : r <= 0.02 ? C.amber : C.red;
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Uptime" value={upH > 0 ? `${upH}h ${upM}m` : `${upM}m`} info={TIP.hUptime} />
        <Stat label="WS clients" value={data.ws?.clients ?? 0} sub={`${data.ws?.totalConnects ?? 0} total connects`} info={TIP.hWs} />
        <Stat label="Live games" value={live.total} />
        <Stat label="Blind (no source)" value={live.noSource} valueColor={live.noSource > 0 ? C.red : C.primary} info={TIP.hBlind} />
        <Stat label="Single-source" value={live.singleSource} valueColor={live.singleSource > 0 ? C.amber : C.primary} info={TIP.hSingle} />
      </div>

      {live.blind.length > 0 && (
        <Panel title={`⚠ Live games running blind (${live.blind.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Game</th><th style={th}>League</th><th style={th}>Sources</th></tr></thead>
            <tbody>{live.blind.map((g) => (
              <tr key={g.game_id}><td style={{ ...td, color: C.red }}>{g.away}@{g.home}</td><td style={{ ...td, color: C.mut }}>{g.league}</td><td style={td}>{g.sources}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
      )}

      <Panel title="Data-source fetch health" info={TIP.hFetch}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Source</th><th style={th}>OK rate</th><th style={th}>OK / Fail</th><th style={th}>Last OK</th><th style={th}>Last error</th></tr></thead>
          <tbody>{(data.sources || []).map((s) => (
            <tr key={s.source}>
              <td style={td}>{s.source}</td>
              <td style={{ ...td, color: fetchColor(s.okRate) }}>{pct(s.okRate)}</td>
              <td style={{ ...td, color: C.mut }}>{s.ok} / {s.fail}</td>
              <td style={{ ...td, color: C.mut }}>{s.lastOkAgoS == null ? "—" : s.lastOkAgoS + "s ago"}</td>
              <td style={{ ...td, color: s.lastError ? C.red : C.mut, fontFamily: "inherit", maxWidth: 340, whiteSpace: "normal" }}>{s.lastError || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>

      <Panel title="Market match rate by league (latest poll)" info={TIP.hMatch}>
        {(data.match || []).length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No match data yet — no active games this poll.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Source</th><th style={th}>League</th><th style={th}>Matched</th><th style={th}>Rate</th></tr></thead>
              <tbody>{data.match.map((m) => (
                <tr key={m.source + m.league}>
                  <td style={td}>{m.source}</td><td style={{ ...td, color: C.mut }}>{m.league}</td>
                  <td style={td}>{m.matched}/{m.eligible}</td>
                  <td style={{ ...td, color: matchColor(m.rate) }}>{pct(m.rate)}</td>
                </tr>
              ))}</tbody>
            </table>}
      </Panel>

      <Panel title="API latency & errors (recent window)" info={TIP.hApi}>
        {(data.api || []).length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No requests recorded yet.</div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead><tr><th style={th}>Route</th><th style={th}>Count</th><th style={th}>p50 ms</th><th style={th}>p95 ms</th><th style={th}>Max</th><th style={th}>4xx</th><th style={th}>5xx</th><th style={th}>Err%</th></tr></thead>
              <tbody>{data.api.map((r) => (
                <tr key={r.route}>
                  <td style={{ ...td, fontFamily: "inherit" }}>{r.route}</td>
                  <td style={td}>{r.count}</td>
                  <td style={td}>{r.p50 == null ? "—" : r.p50.toFixed(0)}</td>
                  <td style={{ ...td, color: p95Color(r.p95) }}>{r.p95 == null ? "—" : r.p95.toFixed(0)}</td>
                  <td style={{ ...td, color: C.mut }}>{r.maxMs == null ? "—" : r.maxMs.toFixed(0)}</td>
                  <td style={{ ...td, color: r.err4xx > 0 ? C.amber : C.mut }}>{r.err4xx}</td>
                  <td style={{ ...td, color: r.err5xx > 0 ? C.red : C.mut }}>{r.err5xx}</td>
                  <td style={{ ...td, color: errColor(r.errRate) }}>{(r.errRate * 100).toFixed(1)}%</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </Panel>

      <Panel title="Oracle stale-source drops" info={TIP.hStale}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: (data.staleIncidents || []).length ? 12 : 0 }}>
          {(data.staleDrops || []).length === 0
            ? <div style={{ color: C.mut, fontSize: 13 }}>None — no source has been dropped as stale since restart.</div>
            : data.staleDrops.map((s) => <Stat key={s.source} label={s.source} value={s.count} sub="stale drops" />)}
        </div>
        {(data.staleIncidents || []).length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Game</th><th style={th}>Source</th><th style={th}>Reason</th><th style={th}>When</th></tr></thead>
            <tbody>{data.staleIncidents.map((i, idx) => (
              <tr key={idx}><td style={td}>{i.gameId}</td><td style={td}>{i.source}</td><td style={{ ...td, color: C.mut }}>{i.reason}</td><td style={{ ...td, color: C.mut }}>{i.agoS}s ago</td></tr>
            ))}</tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

// Product analytics — "are users showing up, activating, and coming back?".
function ProductTab({ data }) {
  if (!data) return <Panel title="Product"><div style={{ color: C.mut, fontSize: 13 }}>Loading…</div></Panel>;
  const f = data.funnel || { stages: [], activationRate: null, repeatRate: null, signups: 0 };
  const r = data.retention || {};
  const pct = (v) => (v == null ? "—" : (v * 100).toFixed(0) + "%");
  const maxStage = Math.max(1, ...(f.stages || []).map((s) => s.count));
  const retColor = (v) => (v == null ? C.mut : v >= 0.4 ? C.primary : v >= 0.2 ? C.amber : C.red);
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="DAU (today)" value={data.dauToday ?? 0} info={TIP.pDau} />
        <Stat label="WAU (7d)" value={data.wau ?? 0} info={TIP.pWau} />
        <Stat label="Signups" value={f.signups ?? 0} info={TIP.pSignups} />
        <Stat label="Activation" value={pct(f.activationRate)} sub="seen → wagered" info={TIP.pActivation} />
        <Stat label="Total events" value={data.totalEvents ?? 0} />
      </div>

      <Panel title="Activation funnel" info={TIP.pFunnel}>
        {(f.stages || []).length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No events yet.</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {f.stages.map((s, i) => {
                const prev = i > 0 ? f.stages[i - 1].count : null;
                const conv = prev ? s.count / prev : null;
                return (
                  <div key={s.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.text }}>{s.label}</span>
                      <span style={{ color: C.mut, fontFamily: mono }}>{s.count}{conv != null && ` · ${pct(conv)} of prev`}</span>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 6, height: 22, overflow: "hidden" }}>
                      <div style={{ width: `${(s.count / maxStage) * 100}%`, height: "100%", background: C.primary, opacity: 1 - i * 0.22, borderRadius: 6, transition: "width .3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>}
      </Panel>

      <Panel title="Retention" info={TIP.pRetention}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Stat label="D1 return" value={pct(r.d1)} sub={`${r.d1Cohort || 0} in cohort`} valueColor={retColor(r.d1)} />
          <Stat label="D7 return" value={pct(r.d7)} sub={`${r.d7Cohort || 0} in cohort`} valueColor={retColor(r.d7)} />
          <Stat label="Repeat traders" value={pct(f.repeatRate)} sub="wagered on 2+ days" />
        </div>
      </Panel>

      <Panel title="Daily active users" info={TIP.pDaily}>
        {(data.daily || []).length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No daily data yet.</div>
          : <ResponsiveContainer width="100%" height={190}>
              <LineChart data={data.daily} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: C.mut, fontSize: 10 }} tickFormatter={(d) => (d || "").slice(5)} />
                <YAxis tick={{ fill: C.mut, fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.text }} />
                <Line type="monotone" dataKey="dau" stroke={C.primary} strokeWidth={2} dot={false} name="DAU" />
                <Line type="monotone" dataKey="newUsers" stroke={C.amber} strokeWidth={1.5} dot={false} name="New users" />
              </LineChart>
            </ResponsiveContainer>}
      </Panel>

      <Panel title="Event volume (since restart)" info={TIP.pEvents}>
        {(data.byEvent || []).length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No events yet.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Event</th><th style={th}>Count</th><th style={th}>Distinct users</th></tr></thead>
              <tbody>{data.byEvent.map((e) => (
                <tr key={e.event}><td style={td}>{e.event}</td><td style={td}>{e.count}</td><td style={{ ...td, color: C.mut }}>{e.users}</td></tr>
              ))}</tbody>
            </table>}
      </Panel>
    </>
  );
}

// Engine economics — "is the vault-as-counterparty money model working, and trending up?".
function EconomicsTab({ data }) {
  if (!data) return <Panel title="Economics"><div style={{ color: C.mut, fontSize: 13 }}>Loading…</div></Panel>;
  if (!data.hasData) return (
    <Panel title="Economics">
      <div style={{ color: C.mut, fontSize: 13 }}>No snapshots yet — the first one is taken at boot, then every 5 minutes. Check back shortly.</div>
    </Panel>
  );
  const w = data.waterfall || {};
  const l = data.latest || {};
  const d24 = data.deltas24h || {};
  const liq = data.liquidations || {};
  const sc = (n) => (n == null ? C.mut : n > 0 ? C.primaryLt : n < 0 ? C.red : C.text);
  const delta = (n) => (n == null ? "" : ` (${n >= 0 ? "+" : "−"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} 24h)`);
  // Waterfall rows: components then subtotals.
  const rows = [
    { label: "Vault trading PnL", v: w.tradingPnl, kind: "comp" },
    { label: "Funding collected", v: w.funding, kind: "comp" },
    { label: "Fee revenue", v: w.feeRevenue, kind: "comp" },
    { label: "Realized house profit", v: w.realizedHouse, kind: "sub" },
    { label: "Open inventory (unrealized)", v: w.unrealized, kind: "comp" },
    { label: "Total house economics", v: w.totalHouse, kind: "total" },
  ];
  const chart = (data.series || []).map((p) => ({
    ts: p.ts,
    realizedHouse: +((p.vaultRealizedPnl || 0) + (p.funding || 0) + (p.feeRevenue || 0)).toFixed(2),
    feeRevenue: p.feeRevenue,
  }));
  const fmtT = (ts) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat label="Vault balance" value={fmtUsd(l.vaultBalance)} sub={`from ${fmtUsd(data.vaultInitial)}${delta(d24.vaultBalance)}`} info={TIP.eVaultBal} />
        <Stat label="Total house P&L" value={fmtSigned(w.totalHouse)} valueColor={sc(w.totalHouse)} sub="realized + open" info={TIP.eHouse} />
        <Stat label="Fee revenue" value={fmtSigned(w.feeRevenue)} valueColor={sc(w.feeRevenue)} sub={`since restart${delta(d24.feeRevenue)}`} info={TIP.eFees} />
        <Stat label="Funding" value={fmtSigned(w.funding)} valueColor={sc(w.funding)} info={TIP.eFunding} />
        <Stat label="24h volume" value={fmtUsd(d24.volume)} info={TIP.pEvents} />
      </div>

      <Panel title="House P&L waterfall" info={TIP.eWaterfall}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((r) => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 10px",
              borderTop: r.kind !== "comp" ? `1px solid ${C.border}` : "none",
              background: r.kind === "total" ? C.surface : "transparent", borderRadius: r.kind === "total" ? 8 : 0,
            }}>
              <span style={{ color: r.kind === "comp" ? C.mut : C.text, fontSize: 13, fontWeight: r.kind === "total" ? 700 : 500 }}>{r.label}</span>
              <span style={{ color: sc(r.v), fontSize: 13, fontWeight: r.kind === "comp" ? 500 : 700, fontFamily: mono }}>{fmtSigned(r.v)}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="House economics over time" info={TIP.eTrend}>
        {chart.length < 2
          ? <div style={{ color: C.mut, fontSize: 13 }}>Need at least two snapshots to plot a trend — building history (every 5 min).</div>
          : <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: -6 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                <XAxis dataKey="ts" tick={{ fill: C.mut, fontSize: 10 }} tickFormatter={fmtT} />
                <YAxis tick={{ fill: C.mut, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.text }} labelFormatter={fmtT} formatter={(v) => "$" + (+v).toFixed(2)} />
                <ReferenceLine y={0} stroke={C.mut} strokeDasharray="2 2" />
                <Line type="monotone" dataKey="realizedHouse" stroke={C.primary} strokeWidth={2} dot={false} name="Realized house" />
                <Line type="monotone" dataKey="feeRevenue" stroke={C.amber} strokeWidth={1.5} dot={false} name="Fee revenue" />
              </LineChart>
            </ResponsiveContainer>}
      </Panel>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <Panel title="Activity (latest snapshot)" info={TIP.eActivity}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Stat label="Open interest" value={fmtUsd(l.openInterest)} />
              <Stat label="Open positions" value={l.openPositions ?? 0} />
              <Stat label="Active traders" value={l.activeTraders ?? 0} sub={`${l.totalUsers ?? 0} total`} />
              <Stat label="Live markets" value={l.liveMarkets ?? 0} />
            </div>
          </Panel>
        </div>
        <div style={{ flex: "1 1 220px" }}>
          <Panel title="Liquidations (since restart)" info={TIP.eLiq}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Stat label="Count" value={liq.count ?? 0} valueColor={liq.count > 0 ? C.amber : C.primary} />
              <Stat label="Notional" value={fmtUsd(liq.notional)} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOK));
  const [tab, setTab] = useState("oracle"); // 'oracle' | 'vault' | 'health' | 'product' | 'economics'
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [live, setLive] = useState([]);
  const [vault, setVault] = useState(null);
  const [vaultHistory, setVaultHistory] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [productData, setProductData] = useState(null);
  const [economicsData, setEconomicsData] = useState(null);
  const [explore, setExplore] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Parabolic · Oracle dash";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => document.head.removeChild(m);
  }, []);

  const load = useCallback(async () => {
    // Resilient: a single failing/undeployed endpoint shouldn't blank the dashboard. 401 still logs out.
    const safe = (p) => p.catch((e) => { if (String(e.message) === "401") throw e; return null; });
    try {
      const [s, src, cov, set, lv, vlt, vh, hlth, prod, econ] = await Promise.all([
        safe(adminFetch("/admin/oracle/summary")),
        safe(adminFetch("/admin/oracle/sources")),
        safe(adminFetch("/admin/oracle/coverage")),
        safe(adminFetch("/admin/oracle/settlements?limit=50")),
        safe(adminFetch("/admin/oracle/live")),
        safe(adminFetch("/admin/vault")),
        safe(adminFetch("/admin/vault/history?limit=200")),
        safe(adminFetch("/admin/health")),
        safe(adminFetch("/admin/analytics")),
        safe(adminFetch("/admin/economics")),
      ]);
      if (s) setSummary(s);
      if (src) setSources(src);
      if (cov) setCoverage(cov);
      setSettlements(set?.settlements || []);
      setLive(lv?.live || []);
      if (vlt) setVault(vlt);
      if (vh) setVaultHistory(vh.rows || []);
      if (hlth) setHealthData(hlth);
      if (prod) setProductData(prod);
      if (econ) setEconomicsData(econ);
    } catch (e) {
      if (String(e.message) === "401") { localStorage.removeItem(TOK); setAuthed(false); }
      else setErr("Failed to load");
    }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  const empty = summary && summary.games === 0;
  const trust = !!summary && summary.games >= 10 && summary.pairs >= 100;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 28px", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <style>{TIP_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>{tab === "vault" ? "Vault monitor" : tab === "health" ? "Reliability & health" : tab === "product" ? "Product analytics" : tab === "economics" ? "Engine economics" : "Oracle accuracy"}</div>
          <div style={{ color: C.mut, fontSize: 12 }}>{tab === "vault" ? "Internal dashboard · liability · hedging · vault fills" : tab === "health" ? "Internal dashboard · feeds · match rate · API · staleness" : tab === "product" ? "Internal dashboard · funnel · retention · DAU/WAU" : tab === "economics" ? "Internal dashboard · house P&L · fees · funding · trends" : "Internal dashboard · all sports · graded forecasts"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[["oracle", "Oracle"], ["vault", "Vault"], ["health", "Health"], ["product", "Product"], ["economics", "Economics"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? C.surface : "transparent", border: `1px solid ${tab === id ? C.border : "transparent"}`, color: tab === id ? C.text : C.mut, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 500 }}>{label}</button>
          ))}
          <button onClick={load} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
        </div>
      </div>

      {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}

      {tab === "vault" && <VaultTab vault={vault} history={vaultHistory} />}

      {tab === "health" && <HealthTab data={healthData} />}

      {tab === "product" && <ProductTab data={productData} />}

      {tab === "economics" && <EconomicsTab data={economicsData} />}

      {tab === "oracle" && <>
      <Panel title={`Live now — capturing (${live.length})`}>
        {live.length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No live games right now.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Game</th><th style={th}>Score</th><th style={th}>State</th><th style={th}>Oracle<Info text={TIP.liveOracle} /></th><th style={th}>Sources<Info text={TIP.liveSources} /></th><th style={th}>Ticks<Info text={TIP.ticks} /></th><th style={th}></th></tr></thead>
              <tbody>{live.map((g) => (
                <tr key={g.game_id}>
                  <td style={td}>{g.away}@{g.home} <span style={{ color: C.mut }}>{g.league}</span></td>
                  <td style={td}>{g.away_score}-{g.home_score}</td>
                  <td style={{ ...td, color: C.mut }}>{g.statusDetail || `P${g.period}`}</td>
                  <td style={{ ...td, color: C.primaryLt }}>{g.ip == null ? "—" : (g.ip * 100).toFixed(1) + "¢"}</td>
                  <td style={{ ...td, color: C.mut }}>{g.sources}</td>
                  <td style={td}>{g.ticks}</td>
                  <td style={td}><button onClick={() => setExplore(g.game_id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.primaryLt, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>path</button></td>
                </tr>
              ))}</tbody>
            </table>}
      </Panel>

      {explore && <GameExplorer gameId={explore} onClose={() => setExplore(null)} />}

      {summary && <ConfidenceBanner games={summary.games} forecasts={summary.pairs} />}

      {empty && <Panel title="No data yet"><div style={{ color: C.mut, fontSize: 13 }}>No games graded yet — settlements populate as live games finish. Capture is recording; check back after a game ends.</div></Panel>}

      {summary && !empty && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Games graded" value={summary.games} info={TIP.games} valueColor={confidence(summary.games, summary.pairs).color} />
            <Stat label="Forecasts" value={summary.pairs} info={TIP.forecasts} />
            <Stat label="Brier" value={fmt(summary.brier)} sub="lower better" info={TIP.brier} valueColor={band(summary.brier, trust, "low", 0.18, 0.22)} />
            <Stat label="Log-loss" value={fmt(summary.logLoss, 3)} info={TIP.logloss} valueColor={band(summary.logLoss, trust, "low", 0.55, 0.69)} />
            <Stat label="AUC" value={fmt(summary.auc, 3)} sub="discrimination" info={TIP.auc} valueColor={band(summary.auc, trust, "high", 0.82, 0.72)} />
            <Stat label="Reliability" value={fmt(summary.murphy?.reliability, 4)} sub="miscalibration" info={TIP.reliability} valueColor={band(summary.murphy?.reliability, trust, "low", 0.01, 0.03)} />
            <Stat label="Skill score" value={fmt(summary.brierSkill, 3)} sub="vs base rate" info={TIP.skill} valueColor={band(summary.brierSkill, trust, "high", 0.2, 0)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Panel title="Calibration (reliability curve)" info={TIP.calibration}><ReliabilityChart bins={summary.reliability} /></Panel>
            <Panel title="Source accuracy (Brier, lower better)" info={TIP.sources}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Source</th><th style={th}>Brier</th><th style={th}>Log-loss</th><th style={th}>n</th></tr></thead>
                <tbody>{Object.entries(sources || {}).sort((a, b) => (a[1].brier ?? 9) - (b[1].brier ?? 9)).map(([name, s]) => (
                  <tr key={name}><td style={td}>{name}</td><td style={{ ...td, color: C.primaryLt }}>{fmt(s.brier)}</td><td style={td}>{fmt(s.logLoss, 3)}</td><td style={{ ...td, color: C.mut }}>{s.n}</td></tr>
                ))}</tbody>
              </table>
            </Panel>
          </div>

          <Panel title="Source weighting — current vs suggested" info={TIP.weights}>
            {(summary.weights || []).length === 0
              ? <div style={{ color: C.mut, fontSize: 13 }}>No source data yet.</div>
              : (() => {
                const w = summary.weights;
                const curTot = w.reduce((a, r) => a + (r.current || 0), 0) || 1;
                return <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Source</th><th style={th}>Current</th><th style={th}>Suggested</th><th style={th}>Log-loss</th><th style={th}>n</th></tr></thead>
                  <tbody>{w.map((r) => {
                    const cur = (r.current || 0) / curTot;
                    const up = r.suggestedShare > cur + 0.02, down = r.suggestedShare < cur - 0.02;
                    return <tr key={r.name}>
                      <td style={td}>{r.name}</td>
                      <td style={{ ...td, color: C.mut }}>{r.current ?? "—"} · {(cur * 100).toFixed(0)}%</td>
                      <td style={{ ...td, color: up ? C.primaryLt : down ? C.amber : C.text, fontWeight: 700 }}>{(r.suggestedShare * 100).toFixed(0)}% {up ? "↑" : down ? "↓" : ""}</td>
                      <td style={td}>{fmt(r.logLoss, 3)}</td>
                      <td style={{ ...td, color: C.mut }}>{r.n}</td>
                    </tr>;
                  })}</tbody>
                </table>;
              })()}
          </Panel>

          <Panel title="Calibration by game phase" info={TIP.phases}>
            {Object.keys(summary.phases || {}).length === 0
              ? <div style={{ color: C.mut, fontSize: 13 }}>No phase data yet.</div>
              : Object.entries(summary.phases).map(([lg, rows]) => (
                <div key={lg} style={{ marginBottom: 12 }}>
                  <div style={{ color: C.mut, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>{lg}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {rows.map((r) => (
                      <div key={r.bucket} style={{ background: C.surface, borderRadius: 8, padding: "6px 10px", minWidth: 60, textAlign: "center" }}>
                        <div style={{ color: C.mut, fontSize: 10 }}>{r.bucket}</div>
                        <div style={{ color: band(r.brier, r.n >= 10, "low", 0.18, 0.22), fontSize: 15, fontWeight: 700, fontFamily: mono }}>{fmt(r.brier, 3)}</div>
                        <div style={{ color: C.mut, fontSize: 9 }}>n={r.n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </Panel>

          <Panel title="Coverage by sport">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>League</th><th style={th}>Games</th><th style={th}>Single-source<Info text={TIP.singleSource} /></th><th style={th}>Avg confidence<Info text={TIP.avgConf} /></th><th style={th}>Settle gap<Info text={TIP.settleGap} /></th><th style={th}>Stale-Kalshi<Info text={TIP.staleKalshi} /></th></tr></thead>
              <tbody>{Object.entries(coverage?.byLeague || {}).map(([lg, c]) => (
                <tr key={lg}><td style={td}>{lg}</td><td style={td}>{c.games}</td>
                  <td style={{ ...td, color: band(c.singleSourceFrac, true, "low", 0.25, 0.5) }}>{fmt(c.singleSourceFrac * 100, 0)}%</td>
                  <td style={td}>{fmt(c.avgConfidence, 2)}</td><td style={td}>{fmt(c.avgSettleGap, 3)}</td><td style={{ ...td, color: C.mut }}>{fmt(c.avgStaleKalshi, 1)}</td></tr>
              ))}</tbody>
            </table>
          </Panel>

          <Panel title="Recent settlements">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Game</th><th style={th}>League</th><th style={th}>Outcome</th><th style={th}>Settle gap<Info text={TIP.settleGap} /></th><th style={th}>Updates<Info text={TIP.ticks} /></th><th style={th}></th></tr></thead>
              <tbody>{settlements.map((s) => (
                <tr key={s.game_id}><td style={td} title={s.game_id}>{s.away_team && s.home_team ? `${s.away_team} @ ${s.home_team}` : s.game_id}</td><td style={td}>{s.league}</td>
                  <td style={td}>{s.outcome_type} ({s.home_score}-{s.away_score})</td>
                  <td style={{ ...td, color: s.settle_gap > 0.1 ? C.red : C.text }}>{fmt(s.settle_gap, 3)}</td>
                  <td style={{ ...td, color: C.mut }}>{s.source_update_count}</td>
                  <td style={td}><button onClick={() => setExplore(s.game_id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.primaryLt, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>path</button></td></tr>
              ))}</tbody>
            </table>
          </Panel>
        </>
      )}
      </>}
    </div>
  );
}
