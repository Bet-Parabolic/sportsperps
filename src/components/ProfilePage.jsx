import { useEffect, useState, useCallback } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { fmtUsd, fmtPct } from "../lib/helpers.js";
import { API_URL } from "../lib/constants.js";
import { currentUserId, authToken, getAuth, setAuth, logout as doLogout } from "../lib/auth.js";

// Full-screen profile / settings page, organized like the app's Settings mockup:
//   • top: identity + performance + open positions + Stats/Bets toggle (Stats is default)
//   • grouped settings: Account (Account details, Transactions), Privacy (public/private),
//     Support (Help & Support, Referrals), and Log out.
// Sub-screens (Account details, Transactions, Referrals, Help) push in with a back arrow.
export function ProfilePage({ userId: userIdProp, onClose, onLoggedOut }) {
  const userId = userIdProp || currentUserId();
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState("stats");      // 'stats' | 'bets' — Stats is the default
  const [view, setView] = useState("main");     // 'main' | 'account' | 'transactions' | 'referrals' | 'help'
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
  const score = Math.max(0, Math.min(100, Math.round(50 + returnPct)));

  const handleLogout = () => { doLogout(); onLoggedOut?.(); };

  const wrap = { position: "fixed", inset: 0, zIndex: 900, background: B.bg, overflowY: "auto", fontFamily: fb };
  const inner = { maxWidth: 640, margin: "0 auto", padding: "16px 16px 70px" };

  // ── Sub-screens ──────────────────────────────────────────────────────────
  if (view !== "main") {
    const titles = { account: "Account details", transactions: "Transactions", referrals: "Referrals", help: "Help & support" };
    return (
      <div style={wrap}><div style={inner}>
        <TopBar title={titles[view]} onBack={() => setView("main")} />
        {view === "account" && <AccountDetails userId={userId} profile={profile} onSaved={load} />}
        {view === "transactions" && <Transactions profile={profile} onLinkWallet={() => setView("account")} />}
        {view === "referrals" && <Referrals username={username} />}
        {view === "help" && <HelpSupport />}
      </div></div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div style={wrap}><div style={inner}>
      <TopBar title="Profile" onClose={onClose} />

      {/* Identity */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={avatar}>{username.charAt(0).toUpperCase()}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: B.white, fontFamily: fd }}>{username}</div>
        <div style={{ fontSize: 12, color: B.dim }}>Joined {joined}</div>
        <button onClick={() => setView("account")} style={editBtn}>Edit</button>
      </div>

      {/* Performance */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: fd, fontSize: 16, fontWeight: 600, color: B.white }}>Performance</div>
          <div style={{ fontFamily: fm, fontSize: 22, fontWeight: 800, color: B.white }}>{score}<span style={{ color: B.mute, fontSize: 14 }}> /100</span></div>
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
            <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{fmtUsd(p.margin)} · {(p.entryPx * 100).toFixed(0)}¢ · {p.leverage}x</div>
          </div>
          <div style={{ fontFamily: fm, fontWeight: 700, color: p.pnl >= 0 ? B.primary : B.red }}>{p.pnl >= 0 ? "+" : ""}{fmtUsd(p.pnl)}</div>
        </div>
      ))}

      {/* Stats / Bets toggle — Stats default */}
      <div style={{ display: "flex", gap: 20, margin: "22px 4px 12px" }}>
        {["stats", "bets"].map((t) => (
          <span key={t} onClick={() => setTab(t)} style={{ fontFamily: fd, fontSize: 16, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", color: tab === t ? B.white : B.mute }}>{t}</span>
        ))}
      </div>

      {tab === "stats" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatBox label="All-time P&L" value={`${(profile?.closedPnl ?? 0) >= 0 ? "+" : ""}${fmtUsd(profile?.closedPnl ?? 0)}`} color={(profile?.closedPnl ?? 0) >= 0 ? B.primary : B.red} />
          <StatBox label="ROI" value={fmtPct(returnPct)} color={returnPct >= 0 ? B.primary : B.red} />
          <StatBox label="Win rate" value={`${winRate}%`} />
          <StatBox label="Volume" value={fmtUsd(profile?.totalVolume ?? 0)} />
          <StatBox label="Settled bets" value={String(profile?.tradeCount ?? 0)} />
          <StatBox label="Open positions" value={String(profile?.openPositions ?? positions.length)} />
        </div>
      ) : (
        trades.length === 0 ? (
          <div style={{ ...card, color: B.dim, fontSize: 14 }}>{loading ? "Loading…" : "No settled bets yet."}</div>
        ) : trades.map((t) => {
          const win = t.pnl >= 0;
          return (
            <div key={t.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: B.white, textTransform: "capitalize" }}>{t.side} · {t.leverage}x</div>
                <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{(t.entryPx * 100).toFixed(0)}¢ → {t.exitPx != null ? (t.exitPx * 100).toFixed(0) + "¢" : "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: fm, fontWeight: 700, color: win ? B.primary : B.red }}>{win ? "+" : ""}{fmtUsd(t.pnl)}</div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "2px 7px", borderRadius: 5, background: win ? "rgba(31,209,130,0.15)" : "rgba(255,82,71,0.15)", color: win ? B.primary : B.red }}>{win ? "WIN" : "LOSS"}</span>
              </div>
            </div>
          );
        })
      )}

      {/* Settings groups */}
      <SectionTitle>Account</SectionTitle>
      <Group>
        <Row label="Account details" onClick={() => setView("account")} />
        <Row label="Transactions" sub="Deposits & withdrawals" onClick={() => setView("transactions")} last />
      </Group>

      <SectionTitle>Privacy</SectionTitle>
      <Group>
        <PrivacyRow userId={userId} profile={profile} onSaved={load} />
      </Group>

      <SectionTitle>Support</SectionTitle>
      <Group>
        <Row label="Help & support" onClick={() => setView("help")} />
        <Row label="Referrals" onClick={() => setView("referrals")} />
        <Row label="Follow on X" value="@betparabolic" onClick={() => window.open("https://x.com/betparabolic", "_blank")} last />
      </Group>

      <button onClick={handleLogout} style={logoutBtn}>Log out</button>
    </div></div>
  );
}

// ── Account details sub-screen ─────────────────────────────────────────────
function AccountDetails({ userId, profile, onSaved }) {
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const flash = (ok, text) => { (ok ? setMsg : setErr)(text); setTimeout(() => { setMsg(""); setErr(""); }, 2500); };

  const putProfile = async (body) => {
    const res = await fetch(`${API_URL}/profile/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, token: authToken() }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed"); return data;
  };

  return (
    <div>
      <EditableField label="Username" initial={profile?.username || ""} placeholder="gooner_tom" cta="Save"
        onSave={async (v) => { await putProfile({ username: v }); const a = getAuth(); if (a) setAuth({ ...a, username: v }); flash(true, "Username updated."); onSaved?.(); }} onError={(e) => flash(false, e)} />

      <ChangePassword userId={userId} hasPassword={profile?.hasPassword} onResult={flash} />

      <EditableField label="Email (for 2FA)" initial={profile?.email || ""} placeholder="you@email.com" type="email" cta="Save"
        onSave={async (v) => { await putProfile({ email: v }); flash(true, "Email saved."); onSaved?.(); }} onError={(e) => flash(false, e)} />

      <EditableField label="Phone (for 2FA)" initial={profile?.phone || ""} placeholder="+1 415 555 0172" type="tel" cta="Save"
        onSave={async (v) => { await putProfile({ phone: v }); flash(true, "Phone saved."); onSaved?.(); }} onError={(e) => flash(false, e)} />

      <WalletField userId={userId} initial={profile?.walletAddress || ""} onResult={flash} onSaved={onSaved} />

      {msg && <div style={{ color: B.primary, fontSize: 13, marginTop: 6 }}>{msg}</div>}
      {err && <div style={{ color: B.red, fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function ChangePassword({ userId, hasPassword, onResult }) {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState("");
  const save = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, currentPassword: cur, newPassword: nw, token: authToken() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed");
      setCur(""); setNw(""); onResult(true, "Password changed.");
    } catch (e) { onResult(false, e.message); }
  };
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={fieldLabel}>Change password</div>
      {hasPassword && <input style={input} type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input style={{ ...input, flex: 1, marginTop: 0 }} type="password" placeholder="New password" value={nw} onChange={(e) => setNw(e.target.value)} />
        <button style={saveBtn} onClick={save}>Update</button>
      </div>
    </div>
  );
}

function WalletField({ userId, initial, onResult, onSaved }) {
  const [wallet, setWallet] = useState(initial);
  useEffect(() => setWallet(initial), [initial]);
  const connect = async () => {
    try {
      let addr = wallet.trim();
      if (window.ethereum?.request) { const a = await window.ethereum.request({ method: "eth_requestAccounts" }); if (a?.[0]) addr = a[0]; }
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) throw new Error("Enter or connect a valid 0x… address");
      const res = await fetch(`${API_URL}/profile/${userId}/wallet`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: addr, token: authToken() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed");
      setWallet(addr); onResult(true, "Wallet linked."); onSaved?.();
    } catch (e) { onResult(false, e.message); }
  };
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={fieldLabel}>Wallet (deposits & withdrawals)</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...input, flex: 1, marginTop: 0 }} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x… or connect" />
        <button style={saveBtn} onClick={connect}>{window.ethereum ? "Connect" : "Link"}</button>
      </div>
    </div>
  );
}

// ── Transactions sub-screen ────────────────────────────────────────────────
function Transactions({ profile, onLinkWallet }) {
  return (
    <div>
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: B.dim, fontSize: 13 }}>Paper balance</div>
        <div style={{ fontFamily: fm, fontSize: 20, fontWeight: 800, color: B.white }}>{fmtUsd(profile?.balance ?? 10000)}</div>
      </div>
      <SectionTitle>History</SectionTitle>
      <div style={{ ...card, textAlign: "center", padding: "26px 16px" }}>
        <div style={{ color: B.white, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No transactions yet</div>
        <div style={{ color: B.dim, fontSize: 13, marginBottom: 16 }}>
          {profile?.walletAddress ? "Deposits and withdrawals will appear here." : "Link a wallet to deposit and withdraw."}
        </div>
        {!profile?.walletAddress && <button style={{ ...saveBtn, padding: "11px 20px" }} onClick={onLinkWallet}>Link wallet</button>}
      </div>
    </div>
  );
}

// ── Referrals sub-screen ───────────────────────────────────────────────────
function Referrals({ username }) {
  const link = `https://parabolic.gg/?ref=${encodeURIComponent(username)}`;
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };
  return (
    <div>
      <div style={{ ...card, textAlign: "center", padding: "22px 16px" }}>
        <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: B.white }}>Invite friends</div>
        <div style={{ color: B.dim, fontSize: 13, margin: "8px 0 18px" }}>Share your link — you both earn rewards when they start trading.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...input, flex: 1, marginTop: 0, color: B.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: fm, fontSize: 13 }}>{link}</div>
          <button style={saveBtn} onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatBox label="Friends joined" value="0" />
        <StatBox label="Rewards earned" value={fmtUsd(0)} />
      </div>
    </div>
  );
}

// ── Help & support sub-screen ──────────────────────────────────────────────
function HelpSupport() {
  return (
    <Group>
      <Row label="Email support" value="hello@parabolic.gg" onClick={() => window.open("mailto:hello@parabolic.gg")} />
      <Row label="Documentation" onClick={() => window.open("https://docs.parabolic.gg", "_blank")} />
      <Row label="Follow on X" value="@betparabolic" onClick={() => window.open("https://x.com/betparabolic", "_blank")} last />
    </Group>
  );
}

// ── Shared presentational pieces ───────────────────────────────────────────
const card = { background: B.card, border: `1px solid ${B.border}`, borderRadius: 16, padding: 16, marginBottom: 10 };
const avatar = { width: 76, height: 76, borderRadius: "50%", background: `linear-gradient(140deg, ${B.primary}, ${B.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#04130c", fontFamily: fd };
const editBtn = { marginTop: 4, padding: "7px 22px", borderRadius: 999, background: B.surface, border: `1px solid ${B.border2}`, color: B.white, fontFamily: fd, fontWeight: 600, fontSize: 13, cursor: "pointer" };
const logoutBtn = { width: "100%", marginTop: 18, padding: "13px", borderRadius: 12, background: "transparent", border: `1px solid ${B.border2}`, color: B.red, fontFamily: fd, fontWeight: 600, fontSize: 14, cursor: "pointer" };
const input = { width: "100%", boxSizing: "border-box", padding: "11px 12px", marginTop: 8, background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 10, color: B.white, fontSize: 14, fontFamily: fb, outline: "none" };
const saveBtn = { padding: "11px 16px", borderRadius: 10, border: "none", background: B.primary, color: "#04130c", fontFamily: fd, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" };
const fieldLabel = { fontSize: 11, color: B.dim, fontFamily: fm, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 };

function TopBar({ title, onClose, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <button onClick={onBack || onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: B.surface, color: B.white, fontSize: 16, cursor: "pointer" }}>{onBack ? "‹" : "✕"}</button>
      <span style={{ fontSize: 15, color: B.white, fontWeight: 600, fontFamily: fd }}>{title}</span>
      <span style={{ width: 36 }} />
    </div>
  );
}
function Group({ children }) {
  return <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 4 }}>{children}</div>;
}
function Row({ label, sub, value, onClick, last }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 16px", cursor: onClick ? "pointer" : "default", borderBottom: last ? "none" : `1px solid ${B.border}` }}>
      <div>
        <div style={{ color: B.white, fontSize: 15 }}>{label}</div>
        {sub && <div style={{ color: B.mute, fontSize: 12, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: B.dim, fontSize: 14 }}>
        {value && <span style={{ fontSize: 13 }}>{value}</span>}
        {onClick && <span style={{ color: B.mute, fontSize: 18 }}>›</span>}
      </div>
    </div>
  );
}
function PrivacyRow({ userId, profile, onSaved }) {
  const isPublic = profile?.profilePublic !== false;
  const toggle = async () => {
    try {
      await fetch(`${API_URL}/profile/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profilePublic: !isPublic, token: authToken() }) });
      onSaved?.();
    } catch { /* ignore */ }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 16px" }}>
      <div>
        <div style={{ color: B.white, fontSize: 15 }}>Profile privacy</div>
        <div style={{ color: B.mute, fontSize: 12, marginTop: 2 }}>{isPublic ? "Public — others can view your profile" : "Private — hidden from others"}</div>
      </div>
      <div onClick={toggle} style={{ width: 46, height: 27, borderRadius: 999, background: isPublic ? B.primary : B.border2, position: "relative", cursor: "pointer", transition: "background .15s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: isPublic ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </div>
    </div>
  );
}
function EditableField({ label, initial, placeholder, type = "text", cta = "Save", onSave, onError }) {
  const [val, setVal] = useState(initial);
  useEffect(() => setVal(initial), [initial]);
  const save = async () => { try { await onSave(val.trim()); } catch (e) { onError?.(e.message); } };
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...input, flex: 1, marginTop: 0 }} type={type} value={val} placeholder={placeholder} onChange={(e) => setVal(e.target.value)} />
        <button style={saveBtn} onClick={save}>{cta}</button>
      </div>
    </div>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontFamily: fm, fontSize: 12, fontWeight: 600, color: B.dim, textTransform: "uppercase", letterSpacing: 0.6, margin: "22px 6px 10px" }}>{children}</div>;
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
