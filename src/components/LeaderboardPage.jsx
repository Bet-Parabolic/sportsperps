import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { fmtUsd } from "../lib/helpers.js";
import { fetchEventMeta } from "../lib/event.js";

export function LeaderboardPage({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("points"); // 'points' | 'pnl' | 'worldcup'
  const [evLive, setEvLive] = useState(false); // World Cup toggle only appears while the event is open

  useEffect(() => { fetchEventMeta().then((m) => setEvLive(!!m?.live)); }, []);

  useEffect(() => {
    const url = mode === "worldcup"
      ? `${API_URL}/event/leaderboard?limit=50`
      : `${API_URL}/leaderboard?limit=50&sort=${mode === "points" ? "points" : "return"}`;
    const fetchLb = () => fetch(url)
      .then(r => r.json()).then(d => { setData(d.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));
    setLoading(true);
    fetchLb();
    const iv = setInterval(fetchLb, 30000);
    return () => clearInterval(iv);
  }, [mode]);

  const pts = mode === "points", wc = mode === "worldcup";
  const cols = wc ? "50px 1fr 120px 100px 80px" : pts ? "50px 1fr 110px 90px 80px" : "50px 1fr 100px 100px 80px 100px";

  const Toggle = () => (
    <div style={{ display: "inline-flex", background: "#111", border: "1px solid #1f1f1f", borderRadius: 10, padding: 3, gap: 3 }}>
      {[["points", "Points"], ["pnl", "PnL"], ...(evLive ? [["worldcup", "🏆 World Cup"]] : [])].map(([k, label]) => (
        <button key={k} onClick={() => setMode(k)} style={{
          padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 700, fontSize: 13,
          background: mode === k ? B.primary : "transparent", color: mode === k ? "#04130c" : "#888",
        }}>{label}</button>
      ))}
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Trophy size={18} color={B.primary} />
          <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>LEADERBOARD</div>
        </div>
        <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 8 }}>Top Traders</h2>
        <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>
          {wc ? "World Cup Championship — ranked by equity on the $10,000 World Cup Cash grant."
            : pts ? "Ranked by points earned — wager volume + daily streaks." : "Ranked by return % on the initial $10,000 balance."}
        </p>
        <Toggle />
        {/* How points work — mirrors the backend rules in src/points.js (keep in sync) */}
        {pts && (
          <div style={{ marginTop: 14, padding: "14px 16px", background: "#101010", borderRadius: 12, border: "1px solid #1c1c1c", maxWidth: 720 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.1em", fontFamily: fm, marginBottom: 8 }}>HOW POINTS WORK</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Wager volume</div>
                <div style={{ fontSize: 11.5, color: "#888", lineHeight: 1.55 }}>
                  <strong style={{ color: "#bbb" }}>1 point per $10 of margin</strong> committed when you open a wager (closing earns nothing). Capped at <strong style={{ color: "#bbb" }}>500 points/day</strong>.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Daily streak 🔥</div>
                <div style={{ fontSize: 11.5, color: "#888", lineHeight: 1.55 }}>
                  Your first wager of <strong style={{ color: "#bbb" }}>$50+ margin</strong> each day (UTC) extends your streak: <strong style={{ color: "#bbb" }}>+10 points</strong>, growing +5 per consecutive day (max +50/day).
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Milestones</div>
                <div style={{ fontSize: 11.5, color: "#888", lineHeight: 1.55 }}>
                  One-time bonuses: <strong style={{ color: "#bbb" }}>+100</strong> at a 7-day streak, <strong style={{ color: "#bbb" }}>+500</strong> at 30 days. Miss a day and the streak resets.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 60, color: "#555" }}>Loading leaderboard...</div> :
      data.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "#555" }}>No traders yet. Be the first!</div> : (
        <div style={{ borderRadius: 16, border: "1px solid #1f1f1f", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, padding: "12px 16px", background: "#111", borderBottom: "1px solid #1a1a1a", fontSize: 10, fontWeight: 700, color: "#555", fontFamily: fm, letterSpacing: "0.06em" }}>
            <div>RANK</div><div>TRADER</div>
            {wc
              ? <><div style={{ textAlign: "right" }}>WC CASH EQUITY</div><div style={{ textAlign: "right" }}>ROI</div><div style={{ textAlign: "right" }}>TRADES</div></>
              : pts
              ? <><div style={{ textAlign: "right" }}>POINTS</div><div style={{ textAlign: "right" }}>STREAK</div><div style={{ textAlign: "right" }}>TRADES</div></>
              : <><div style={{ textAlign: "right" }}>RETURN</div><div style={{ textAlign: "right" }}>PNL</div><div style={{ textAlign: "right" }}>TRADES</div><div style={{ textAlign: "right" }}>VOLUME</div></>}
          </div>
          {data.map((entry, i) => {
            const isMe = entry.userId === userId;
            return (
              <div key={entry.userId} style={{ display: "grid", gridTemplateColumns: cols, padding: "12px 16px", borderBottom: "1px solid #1a1a1a", fontSize: 12, fontFamily: fm,
                background: isMe ? B.primary + "10" : "transparent", borderLeft: isMe ? "3px solid " + B.primary : "3px solid transparent" }}>
                <div style={{ fontWeight: 800, color: i < 3 ? "#fff" : "#888" }}>{entry.rank || i + 1}</div>
                <div style={{ fontWeight: 600, color: isMe ? B.primary : "#fff" }}>{entry.username || entry.userId.slice(0, 8) + "..."}{isMe && " (you)"}</div>
                {wc
                  ? <>
                      <div style={{ textAlign: "right", fontWeight: 800, color: B.primaryLight }}>{fmtUsd(entry.equity)}</div>
                      <div style={{ textAlign: "right", fontWeight: 700, color: entry.roiPct >= 0 ? B.green : B.red }}>{entry.roiPct >= 0 ? "+" : ""}{entry.roiPct}%</div>
                      <div style={{ textAlign: "right", color: "#888" }}>{entry.trades}</div>
                    </>
                  : pts
                  ? <>
                      <div style={{ textAlign: "right", fontWeight: 800, color: B.primaryLight }}>{(entry.points || 0).toLocaleString()}</div>
                      <div style={{ textAlign: "right", color: entry.streak > 0 ? "#ff9f1c" : "#555" }}>{entry.streak > 0 ? "🔥 " + entry.streak : "—"}</div>
                      <div style={{ textAlign: "right", color: "#888" }}>{entry.tradeCount}</div>
                    </>
                  : <>
                      <div style={{ textAlign: "right", fontWeight: 700, color: entry.returnPct >= 0 ? B.green : B.red }}>{entry.returnPct >= 0 ? "+" : ""}{entry.returnPct}%</div>
                      <div style={{ textAlign: "right", color: entry.closedPnl >= 0 ? B.green : B.red }}>{fmtUsd(entry.closedPnl)}</div>
                      <div style={{ textAlign: "right", color: "#888" }}>{entry.tradeCount}</div>
                      <div style={{ textAlign: "right", color: "#888" }}>{fmtUsd(entry.totalVolume)}</div>
                    </>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
