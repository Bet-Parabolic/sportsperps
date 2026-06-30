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

const Panel = ({ title, children, right }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{title}</div>
      {right}
    </div>
    {children}
  </div>
);

const Stat = ({ label, value, sub }) => (
  <div style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", minWidth: 120 }}>
    <div style={{ color: C.mut, fontSize: 11, fontWeight: 600 }}>{label}</div>
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

export function DashboardPage() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOK));
  const [summary, setSummary] = useState(null);
  const [sources, setSources] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [live, setLive] = useState([]);
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
      const [s, src, cov, set, lv] = await Promise.all([
        safe(adminFetch("/admin/oracle/summary")),
        safe(adminFetch("/admin/oracle/sources")),
        safe(adminFetch("/admin/oracle/coverage")),
        safe(adminFetch("/admin/oracle/settlements?limit=50")),
        safe(adminFetch("/admin/oracle/live")),
      ]);
      if (s) setSummary(s);
      if (src) setSources(src);
      if (cov) setCoverage(cov);
      setSettlements(set?.settlements || []);
      setLive(lv?.live || []);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>Oracle accuracy</div>
          <div style={{ color: C.mut, fontSize: 12 }}>Internal dashboard · all sports · graded forecasts</div>
        </div>
        <button onClick={load} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
      </div>

      {err && <div style={{ color: C.red, marginBottom: 12 }}>{err}</div>}

      <Panel title={`Live now — capturing (${live.length})`}>
        {live.length === 0
          ? <div style={{ color: C.mut, fontSize: 13 }}>No live games right now.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Game</th><th style={th}>Score</th><th style={th}>State</th><th style={th}>Oracle</th><th style={th}>Sources</th><th style={th}>Ticks</th><th style={th}></th></tr></thead>
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
            <Stat label="Games graded" value={summary.games} />
            <Stat label="Forecasts" value={summary.pairs} />
            <Stat label="Brier" value={fmt(summary.brier)} sub="lower better" />
            <Stat label="Log-loss" value={fmt(summary.logLoss, 3)} />
            <Stat label="AUC" value={fmt(summary.auc, 3)} sub="discrimination" />
            <Stat label="Reliability" value={fmt(summary.murphy?.reliability, 4)} sub="miscalibration" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Panel title="Calibration (reliability curve)"><ReliabilityChart bins={summary.reliability} /></Panel>
            <Panel title="Source accuracy (Brier, lower better)">
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
              <thead><tr><th style={th}>League</th><th style={th}>Games</th><th style={th}>Single-source</th><th style={th}>Avg confidence</th><th style={th}>Settle gap</th><th style={th}>Stale-Kalshi</th></tr></thead>
              <tbody>{Object.entries(coverage?.byLeague || {}).map(([lg, c]) => (
                <tr key={lg}><td style={td}>{lg}</td><td style={td}>{c.games}</td>
                  <td style={{ ...td, color: c.singleSourceFrac > 0.5 ? C.red : C.text }}>{fmt(c.singleSourceFrac * 100, 0)}%</td>
                  <td style={td}>{fmt(c.avgConfidence, 2)}</td><td style={td}>{fmt(c.avgSettleGap, 3)}</td><td style={{ ...td, color: C.mut }}>{fmt(c.avgStaleKalshi, 1)}</td></tr>
              ))}</tbody>
            </table>
          </Panel>

          <Panel title="Recent settlements">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Game</th><th style={th}>League</th><th style={th}>Outcome</th><th style={th}>Settle gap</th><th style={th}>Updates</th><th style={th}></th></tr></thead>
              <tbody>{settlements.map((s) => (
                <tr key={s.game_id}><td style={td}>{s.game_id}</td><td style={td}>{s.league}</td>
                  <td style={td}>{s.outcome_type} ({s.home_score}-{s.away_score})</td>
                  <td style={{ ...td, color: s.settle_gap > 0.1 ? C.red : C.text }}>{fmt(s.settle_gap, 3)}</td>
                  <td style={{ ...td, color: C.mut }}>{s.source_update_count}</td>
                  <td style={td}><button onClick={() => setExplore(s.game_id)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.primaryLt, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>path</button></td></tr>
              ))}</tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  );
}
