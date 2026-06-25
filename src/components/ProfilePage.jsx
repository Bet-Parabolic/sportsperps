import { useEffect, useState, useCallback } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { fmtUsd, fmtPct } from "../lib/helpers.js";
import { API_URL } from "../lib/constants.js";
import { currentUserId, authToken, logout as doLogout } from "../lib/auth.js";

// Full-screen profile / account page. Shows real trading stats (P&L, ROI, win rate, volume,
// open positions, recent bets) and an Account section where the user adds an email for 2FA and
// links a wallet for deposits/withdrawals. Styled after the mobile profile mockups.
export function ProfilePage({ userId: userIdProp, onClose, onLoggedOut }) {
  const userId = userIdProp || currentUserId();
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState("bets"); // 'bets' | 'stats'
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, b, t] = await Promise.all([
        fetch(`${API_URL}/profile/${userId}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/balance/${userId}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_URL}/profile/${userId}/trades?limit=50`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (p) setProfile(p);
      if (b?.openPositions) setPositions(b.openPositions);
      if (t?.trades) setTrades(t.trades);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const username = profile?.username || "trader";
  const joined = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";
  const returnPct = profile?.returnPct ?? 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  // A simple 0–100 performance score from return% (50 = break-even), no fabricated social rank.
  const score = Math.max(0, Math.min(100, Math.round(50 + returnPct)));

  const handleLogout = () => { doLogout(); onLoggedOut?.(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: B.bg, overflowY: "auto", fontFamily: fb }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={onClose} style={iconBtn}>✕</button>
          <span style={{ fontSize: 13, color: B.dim, fontFamily: fm, letterSpacing: 0.5 }}>PROFILE</span>
          <span style={{ width: 36 }} />
        </div>

        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(140deg, ${B.primary}, ${B.cyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, fontWeight: 800, color: "#04130c", fontFamily: fd,
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: B.white, fontFamily: fd }}>{username}</div>
            <div style={{ fontSize: 13, color: B.dim }}>Joined {joined}</div>
          </div>
        </div>

        {/* Performance card */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontFamily: fd, fontSize: 16, fontWeight: 600, color: B.white }}>Performance</div>
            <div style={{ fontFamily: fm, fontSize: 22, fontWeight: 800, color: B.white }}>
              {score}<span style={{ color: B.mute, fontSize: 14 }}> /100</span>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 8, borderRadius: 6, background: B.bg, overflow: "hidden" }}>
            <div style={{ width: `${score}%`, height: "100%", background: returnPct >= 0 ? B.primary : B.red }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <Metric label="Account value" value={fmtUsd(profile?.balance ?? 10000)} />
            <Metric label="Return" value={fmtPct(returnPct)} color={returnPct >= 0 ? B.primary : B.red} alignRight />
          </div>
        </div>

        {/* Open positions */}
        <SectionTitle>Open positions</SectionTitle>
        {positions.length === 0 ? (
          <div style={{ ...card, color: B.dim, fontSize: 14 }}>No open positions.</div>
        ) : positions.map((p, i) => (
          <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: B.white, textTransform: "capitalize" }}>{p.side}</div>
              <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>
                {fmtUsd(p.margin)} · {(p.entryPx * 100).toFixed(0)}¢ · {p.leverage}x
              </div>
            </div>
            <div style={{ fontFamily: fm, fontWeight: 700, color: p.pnl >= 0 ? B.primary : B.red }}>
              {p.pnl >= 0 ? "+" : ""}{fmtUsd(p.pnl)}
            </div>
          </div>
        ))}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 20, margin: "22px 4px 12px" }}>
          {["bets", "stats"].map((t) => (
            <span key={t} onClick={() => setTab(t)} style={{
              fontFamily: fd, fontSize: 16, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
              color: tab === t ? B.white : B.mute,
            }}>{t}</span>
          ))}
        </div>

        {tab === "bets" ? (
          trades.length === 0 ? (
            <div style={{ ...card, color: B.dim, fontSize: 14 }}>{loading ? "Loading…" : "No settled bets yet."}</div>
          ) : trades.map((t) => {
            const win = t.pnl >= 0;
            return (
              <div key={t.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: B.white, textTransform: "capitalize" }}>{t.side} · {t.leverage}x</div>
                  <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>
                    {(t.entryPx * 100).toFixed(0)}¢ → {t.exitPx != null ? (t.exitPx * 100).toFixed(0) + "¢" : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: fm, fontWeight: 700, color: win ? B.primary : B.red }}>
                    {win ? "+" : ""}{fmtUsd(t.pnl)}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "2px 7px", borderRadius: 5,
                    background: win ? "rgba(31,209,130,0.15)" : "rgba(255,82,71,0.15)", color: win ? B.primary : B.red,
                  }}>{win ? "WIN" : "LOSS"}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatBox label="All-time P&L" value={`${(profile?.closedPnl ?? 0) >= 0 ? "+" : ""}${fmtUsd(profile?.closedPnl ?? 0)}`} color={(profile?.closedPnl ?? 0) >= 0 ? B.primary : B.red} />
            <StatBox label="ROI" value={fmtPct(returnPct)} color={returnPct >= 0 ? B.primary : B.red} />
            <StatBox label="Win rate" value={`${winRate}%`} />
            <StatBox label="Volume" value={fmtUsd(profile?.totalVolume ?? 0)} />
            <StatBox label="Settled bets" value={String(profile?.tradeCount ?? 0)} />
            <StatBox label="Open positions" value={String(profile?.openPositions ?? positions.length)} />
          </div>
        )}

        {/* Account & security */}
        <SectionTitle>Account & security</SectionTitle>
        <AccountSection userId={userId} profile={profile} onSaved={load} onLogout={handleLogout} />
      </div>
    </div>
  );
}

// ── Account section: username, email (2FA), wallet linking, logout ──────────────
function AccountSection({ userId, profile, onSaved, onLogout }) {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setEmail(profile?.email || "");
    setWallet(profile?.walletAddress || "");
  }, [profile]);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(""), 2500); };

  const saveEmail = async () => {
    setErr(""); setMsg("");
    try {
      const res = await fetch(`${API_URL}/profile/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: authToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      flash(setMsg, "Email saved — 2FA can be enabled next."); onSaved?.();
    } catch (e) { flash(setErr, e.message); }
  };

  const connectWallet = async () => {
    setErr(""); setMsg("");
    try {
      let addr = wallet.trim();
      if (window.ethereum?.request) {
        const accts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (accts?.[0]) addr = accts[0];
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) throw new Error("Enter or connect a valid 0x… wallet address");
      const res = await fetch(`${API_URL}/profile/${userId}/wallet`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr, token: authToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setWallet(addr); flash(setMsg, "Wallet linked for deposits & withdrawals."); onSaved?.();
    } catch (e) { flash(setErr, e.message); }
  };

  const inputStyle = {
    flex: 1, minWidth: 0, padding: "11px 12px", background: B.bg, border: `1px solid ${B.border2}`,
    borderRadius: 10, color: B.white, fontSize: 14, fontFamily: fb, outline: "none",
  };
  const smallBtn = {
    padding: "11px 16px", borderRadius: 10, border: "none", background: B.primary,
    color: "#04130c", fontFamily: fd, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
  };

  return (
    <div style={card}>
      <Field label="Email (for two-factor authentication)">
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" />
          <button style={smallBtn} onClick={saveEmail}>Save</button>
        </div>
      </Field>

      <Field label="Wallet (deposits & withdrawals)">
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inputStyle} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x… or connect" />
          <button style={smallBtn} onClick={connectWallet}>
            {window.ethereum ? "Connect" : "Link"}
          </button>
        </div>
      </Field>

      {msg && <div style={{ color: B.primary, fontSize: 13, marginTop: 4 }}>{msg}</div>}
      {err && <div style={{ color: B.red, fontSize: 13, marginTop: 4 }}>{err}</div>}

      <button onClick={onLogout} style={{
        width: "100%", marginTop: 16, padding: "12px", borderRadius: 10,
        background: "transparent", border: `1px solid ${B.border2}`, color: B.red,
        fontFamily: fd, fontWeight: 600, fontSize: 14, cursor: "pointer",
      }}>Log out</button>
    </div>
  );
}

// ── Small presentational helpers ───────────────────────────────────────────
const card = { background: B.card, border: `1px solid ${B.border}`, borderRadius: 16, padding: 16, marginBottom: 10 };
const iconBtn = {
  width: 36, height: 36, borderRadius: "50%", border: "none", background: B.surface,
  color: B.white, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
function SectionTitle({ children }) {
  return <div style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, color: B.white, margin: "22px 4px 12px" }}>{children}</div>;
}
function Metric({ label, value, color = "#eef1f6", alignRight }) {
  return (
    <div style={{ textAlign: alignRight ? "right" : "left" }}>
      <div style={{ fontFamily: fm, fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: B.dim, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}
function StatBox({ label, value, color = "#eef1f6" }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: B.dim, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fm, fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: B.dim, fontFamily: fm, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      {children}
    </div>
  );
}
