import { B, fm } from "../../lib/theme.js";

/* Hover tooltip for the win-probability charts — shows home/away win % (and the
   x-value) at the hovered point. Recharts clones this with {active,payload,label}. */
export function ChartTip({ active, payload, home, away, xFormat }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p || p.ph == null) return null;
  const h = (p.ph * 100).toFixed(1);
  const a = ((1 - p.ph) * 100).toFixed(1);
  const hName = home?.short || home?.name || "Home";
  const aName = away?.short || away?.name || "Away";
  return (
    <div style={{ background: "#0b0d11", border: "1px solid #1f1f1f", borderRadius: 8, padding: "7px 10px", fontFamily: fm, fontSize: 11, boxShadow: "0 4px 16px #000a", pointerEvents: "none" }}>
      {xFormat && <div style={{ color: "#666", fontSize: 10, marginBottom: 4 }}>{xFormat(p.t)}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: B.green, fontWeight: 700 }}>
        <span>{hName}</span><span>{h}%</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: B.red, fontWeight: 700 }}>
        <span>{aName}</span><span>{a}%</span>
      </div>
    </div>
  );
}
