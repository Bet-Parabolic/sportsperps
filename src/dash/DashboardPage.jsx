import { useState, useEffect, useCallback } from "react";
import {
  ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, ReferenceLine,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { API_URL } from "../lib/constants.js";

/* Internal oracle-accuracy dashboard — parabolic.gg/dash. Admin-gated, unlinked, noindex. */

const C = {
  bg: "#06070a", card: "#0b0d11", surface: "#11141a", border: "#181b22",
  text: "#eef1f6", mut: "#8a93a6", primary: "#1fd182", primaryLt: "#52e0a3", red: "#ff5247",
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

// Hover-explainers. Pure-CSS tooltip (no state) — a "?" badge that reveals plain-English help.
const TIP_CSS = `
.dinfo{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1px solid #2a2f3a;color:#8a93a6;font-size:9px;font-weight:700;margin-left:5px;cursor:help;position:relative;vertical-align:middle;}
.dinfo .dtip{display:none;position:absolute;bottom:150%;left:50%;transform:translateX(-50%);width:244px;background:#11141a;border:1px solid #2a2f3a;border-radius:8px;padding:9px 11px;color:#cfd6e4;font-size:11px;font-weight:400;line-height:1.55;z-index:60;text-align:left;box-shadow:0 8px 24px rgba(0,0,0,.55);white-space:normal;}
.dinfo:hover .dtip,.dinfo:focus .dtip{display:block;}
`;
const Info = ({ text }) => (
  <span className="dinfo" tabIndex={0} role="img" aria-label={text}>?<span className="dtip">{text}</span></span>
);
const TIP = {
  games: "Finished games we've scored the oracle against. Each one feeds every metric below.",
  forecasts: "Individual (predicted price → actual result) checkpoints across all graded games — the sample size behind the metrics.",
  brier: "The headline accuracy score: average squared gap between the oracle's price and what actually happened. 0 = perfect, 0.25 = a useless 50/50 guess. Lower is better.",
  logloss: "Like Brier, but punishes being confident AND wrong much harder. Lower is better — rewards honest probabilities, not just close ones.",
  auc: "Can the oracle tell winners from losers? 1.0 = it always priced the eventual winner higher; 0.5 = no better than a coin flip. Measures ranking, ignoring the exact price.",
  reliability: "How far the prices sit from reality on average (the gap in the calibration curve). 0 = perfectly honest. Lower is better — this is the 'miscalibration' number.",
  calibration: "Each dot: of all the moments the oracle said X%, did it actually happen X% of the time? On the dashed line = honest. Below = overpriced, above = underpriced.",
  sources: "Each price source graded on its own (lower Brier = more accurate). Tells us which source to trust and how to weight the blend.",
  singleSource: "Share of a game's logged moments priced by only ONE source. High = thin, fragile coverage (soccer's known weak spot).",
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

const Stat = ({ label, value, sub, info }) => (
  <div style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", minWidth: 120 }}>
    <div style={{ color: C.mut, fontSize: 11, fontWeight: 600 }}>{label}{info && <Info text={info} />}</div>
    <div style={{ color: C.text, fontSize: 22, fontWeight: 700, fontFamily: mono }}>{value}</div>
    {sub && <div style={{ color: C.mut, fontSize: 11 }}>{sub}</div>}
  </div>
);

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

function VaultTab({ vault }) {
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
        {vault.shadow && <Stat label="Hedge coverage" value={vault.shadow.coverageRate != null ? (vault.shadow.coverageRate * 100).toFixed(0) + "%" : "—"} sub={`${vault.shadow.samples || 0} samples`} />}
      </div>

      <Panel title={`Positions & hedges by game (${games.length})`} info={TIP.vHedge}>
        {games.length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No open vault inventory right now.</div>
          : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Game</th><th style={th}>Status</th><th style={th}>Oracle</th>
                <th style={th}>Net Δ<Info text={TIP.vNetDelta} /></th>
                <th style={th}>Liability H/A<Info text={TIP.vLiabRow} /></th>
                <th style={th}>Unreal<Info text={TIP.vUnreal} /></th>
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
    </>
  );
}

export function DashboardPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOK));
  const [tab, setTab] = useState("oracle"); // 'oracle' | 'vault'
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [live, setLive] = useState([]);
  const [vault, setVault] = useState(null);
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
      const [s, src, cov, set, lv, vlt] = await Promise.all([
        safe(adminFetch("/admin/oracle/summary")),
        safe(adminFetch("/admin/oracle/sources")),
        safe(adminFetch("/admin/oracle/coverage")),
        safe(adminFetch("/admin/oracle/settlements?limit=50")),
        safe(adminFetch("/admin/oracle/live")),
        safe(adminFetch("/admin/vault")),
      ]);
      if (s) setSummary(s);
      if (src) setSources(src);
      if (cov) setCoverage(cov);
      setSettlements(set?.settlements || []);
      setLive(lv?.live || []);
      if (vlt) setVault(vlt);
    } catch (e) {
      if (String(e.message) === "401") { localStorage.removeItem(TOK); setAuthed(false); }
      else setErr("Failed to load");
    }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  const empty = summary && summary.games === 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 28px", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <style>{TIP_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>{tab === "vault" ? "Vault monitor" : "Oracle accuracy"}</div>
          <div style={{ color: C.mut, fontSize: 12 }}>{tab === "vault" ? "Internal dashboard · liability · hedging · vault fills" : "Internal dashboard · all sports · graded forecasts"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[["oracle", "Oracle"], ["vault", "Vault"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? C.surface : "transparent", border: `1px solid ${tab === id ? C.border : "transparent"}`, color: tab === id ? C.text : C.mut, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 500 }}>{label}</button>
          ))}
          <button onClick={load} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
        </div>
      </div>

      {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}

      {tab === "vault" && <VaultTab vault={vault} />}

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

      {empty && <Panel title="No data yet"><div style={{ color: C.mut, fontSize: 13 }}>No games graded yet — settlements populate as live games finish. Capture is recording; check back after a game ends.</div></Panel>}

      {summary && !empty && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Games graded" value={summary.games} info={TIP.games} />
            <Stat label="Forecasts" value={summary.pairs} info={TIP.forecasts} />
            <Stat label="Brier" value={fmt(summary.brier)} sub="lower better" info={TIP.brier} />
            <Stat label="Log-loss" value={fmt(summary.logLoss, 3)} info={TIP.logloss} />
            <Stat label="AUC" value={fmt(summary.auc, 3)} sub="discrimination" info={TIP.auc} />
            <Stat label="Reliability" value={fmt(summary.murphy?.reliability, 4)} sub="miscalibration" info={TIP.reliability} />
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

          <Panel title="Coverage by sport">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>League</th><th style={th}>Games</th><th style={th}>Single-source<Info text={TIP.singleSource} /></th><th style={th}>Avg confidence<Info text={TIP.avgConf} /></th><th style={th}>Settle gap<Info text={TIP.settleGap} /></th><th style={th}>Stale-Kalshi<Info text={TIP.staleKalshi} /></th></tr></thead>
              <tbody>{Object.entries(coverage?.byLeague || {}).map(([lg, c]) => (
                <tr key={lg}><td style={td}>{lg}</td><td style={td}>{c.games}</td>
                  <td style={{ ...td, color: c.singleSourceFrac > 0.5 ? C.red : C.text }}>{fmt(c.singleSourceFrac * 100, 0)}%</td>
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
