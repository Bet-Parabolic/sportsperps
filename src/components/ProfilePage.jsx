import { useEffect, useState, useCallback } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { fmtUsd, fmtPct } from "../lib/helpers.js";
import { API_URL } from "../lib/constants.js";
import { currentUserId, authToken, getAuth, setAuth, logout as doLogout } from "../lib/auth.js";
import { CardShareModal } from "./CardShareModal.jsx";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";
import { StatCard } from "./CardShareModal.jsx";
import { loadCard, referralCodeFor, syncAvatarToBackend } from "../lib/onboarding.js";
import { webNotifyState, enableWebNotify, disableWebNotify } from "../lib/webNotify.js";

// League metadata for bet cards + the favorite-discipline card (league comes from gameId prefix).
const LEAGUE_META = {
  mlb:   { emoji: "⚾", label: "BASEBALL · MLB", name: "Baseball" },
  wcup:  { emoji: "⚽", label: "SOCCER · WORLD CUP", name: "World Cup" },
  mls:   { emoji: "⚽", label: "SOCCER · MLS", name: "Soccer" },
  nba:   { emoji: "🏀", label: "BASKETBALL · NBA", name: "Basketball" },
  ncaam: { emoji: "🏀", label: "BASKETBALL · NCAA", name: "College Hoops" },
  nfl:   { emoji: "🏈", label: "FOOTBALL · NFL", name: "Football" },
  nhl:   { emoji: "🏒", label: "HOCKEY · NHL", name: "Hockey" },
};
const leagueOf = (gameId) => LEAGUE_META[(gameId || "").split("_")[0]] || { emoji: "🎯", label: "MARKET", name: "Markets" };

// Points-derived tier chip (client-side flavor — mirrors nothing on the backend yet).
function tierOf(points) {
  if (points >= 50000) return { name: "LEGEND", color: "#f5a623" };
  if (points >= 10000) return { name: "SHARP", color: "#b58cff" };
  if (points >= 2000)  return { name: "TACTICIAN", color: "#2dd4bf" };
  if (points >= 500)   return { name: "GRINDER", color: "#60a5fa" };
  return { name: "ROOKIE", color: "#9aa4b2" };
}

// Full-screen profile, mirroring the mobile app's My-profile + Settings designs (desktop format):
//   • Profile view: identity (avatar, points, tier), favorite discipline, stat grid, open
//     positions, Bets/Badges tabs with All/Wins/Loses filter. (No performance-grade section.)
//   • Settings view (gear): Account / Security / Preferences / About groups + Log out.
// Sub-screens (Account details, Payment & deposits, Invite friends, Help) push in with a back arrow.
export function ProfilePage({ userId: userIdProp, onClose, onLoggedOut, worldcup = false }) {
  const userId = userIdProp || currentUserId();
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState("bets");       // 'bets' | 'badges'
  const [betFilter, setBetFilter] = useState("all"); // 'all' | 'wins' | 'loses'
  const [view, setView] = useState("main");     // 'main' | 'settings' | 'account' | 'transactions' | 'referrals' | 'help'
  const [showCard, setShowCard] = useState(false); // member-card overlay (front/QR back)
  const [memberCard] = useState(() => loadCard()); // device-local card (sport/avatar/signature)
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // World Cup surface → this profile's money data comes from the EVENT ledger (WC Cash,
      // wc:-prefixed trades); the main endpoints legitimately know nothing about it.
      const tk = `token=${encodeURIComponent(authToken() || "")}`; // own-profile reads are token-gated
      const balUrl = worldcup ? `${API_URL}/event/balance/${userId}?${tk}` : `${API_URL}/balance/${userId}`;
      const tradesUrl = worldcup ? `${API_URL}/event/profile/${userId}/trades?limit=100&${tk}` : `${API_URL}/profile/${userId}/trades?limit=100&${tk}`;
      const [p, b, t] = await Promise.all([
        fetch(`${API_URL}/profile/${userId}?${tk}`).then((r) => (r.ok ? r.json() : null)),
        fetch(balUrl).then((r) => (r.ok ? r.json() : null)),
        fetch(tradesUrl).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (p) {
        if (worldcup) {
          // WC surface: EVERY money stat comes from the event ledger — mixing main-ledger ROI/volume
          // with event PnL showed contradictory numbers (+P&L, 0% ROI, $0 volume — July 11 UI audit
          // P0-1). ROI = (equity − $10k grant) / grant, the same definition the leaderboard uses.
          const margins = (b?.openPositions || []).reduce((s, x) => s + (x.margin || 0), 0);
          const equity = (b?.balance ?? 0) + margins + (b?.unrealizedPnl ?? 0);
          setProfile({
            ...p,
            closedPnl: b?.closedPnl ?? 0,
            totalVolume: b?.totalVolume ?? 0,
            returnPct: b ? ((equity - 10000) / 10000) * 100 : 0,
          });
        } else setProfile(p);
      }
      if (b?.openPositions) setPositions(b.openPositions);
      else if (worldcup) setPositions([]); // not a participant yet
      if (t?.trades) setTrades(t.trades);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [userId, worldcup]);

  useEffect(() => { load(); }, [load]);
  // One-shot: push the device-local avatar to the account so leaderboards/feeds can show it.
  useEffect(() => { syncAvatarToBackend({ apiUrl: API_URL, userId, token: authToken() }); }, [userId]);

  const username = profile?.username || "trader";
  const joined = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";
  const returnPct = profile?.returnPct ?? 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const points = profile?.points ?? 0;
  const tier = tierOf(points);

  const filteredTrades = trades.filter((t) => betFilter === "all" ? true : betFilter === "wins" ? t.pnl >= 0 : t.pnl < 0);

  // Full reload after logout: every mounted component holds the old account's state (balance,
  // positions, chat identity, WS subscription) — clearing storage alone leaves that on screen.
  // The one-shot flag makes the reload land on the sign-in/sign-up screen instead of a guest view.
  const handleLogout = () => {
    doLogout();
    try { sessionStorage.setItem("parabolic_post_logout_auth", "1"); } catch { /* private mode */ }
    onLoggedOut?.();
    window.location.reload();
  };

  const wrap = { position: "fixed", inset: 0, zIndex: 900, background: B.bg, overflowY: "auto", fontFamily: fb };
  const inner = { maxWidth: 640, margin: "0 auto", padding: "16px 16px 70px" };
  const wideInner = { maxWidth: 1020, margin: "0 auto", padding: "16px 24px 70px" };

  // ── Sub-screens ──────────────────────────────────────────────────────────
  if (view !== "main" && view !== "settings") {
    const titles = { account: "Account details", transactions: "Payment & deposits", referrals: "Invite your friends", help: "Help & support", api: "API" };
    return (
      <div style={wrap}><div style={inner}>
        <TopBar title={titles[view]} onBack={() => setView(worldcup ? "main" : "settings")} />
        {view === "account" && <AccountDetails userId={userId} profile={profile} onSaved={load} />}
        {view === "transactions" && <Transactions profile={profile} onLinkWallet={() => setView("account")} />}
        {view === "referrals" && <Referrals username={username} />}
        {view === "help" && <HelpSupport />}
        {view === "api" && <ApiComingSoon />}
      </div></div>
    );
  }

  // ── Settings view (gear) — mirrors the mobile Settings design, desktop width ──
  if (view === "settings") {
    return (
      <div style={wrap}><div style={inner}>
        <TopBar title="Settings" onBack={() => setView("main")} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "8px 0 22px" }}>
          {memberCard.avatar ? <AvatarCircle avatar={memberCard.avatar} size={76} /> : <div style={avatar}>{username.charAt(0).toUpperCase()}</div>}
          <div style={{ fontSize: 20, fontWeight: 700, color: B.white, fontFamily: fd }}>{username}</div>
          <button onClick={() => setView("account")} style={editBtn}>Edit</button>
        </div>

        <SectionTitle>Account</SectionTitle>
        <Group>
          <Row label="Account details" onClick={() => setView("account")} />
          <Row label="Payment & deposits" onClick={() => setView("transactions")} last />
        </Group>

        <SectionTitle>Security</SectionTitle>
        <Group>
          <PrivacyRow userId={userId} profile={profile} onSaved={load} />
        </Group>

        <SectionTitle>Notifications</SectionTitle>
        <Group>
          <WebNotifyRow last />
        </Group>

        <SectionTitle>Developer</SectionTitle>
        <Group>
          <Row label="API" value="Coming soon" onClick={() => setView("api")} last />
        </Group>

        <SectionTitle>About</SectionTitle>
        <Group>
          <Row label="About Parabolic" onClick={() => window.open("https://docs.parabolic.gg/docs", "_blank", "noopener,noreferrer")} />
          <Row label="Help & support" onClick={() => setView("help")} />
          <Row label="Invite your friends" onClick={() => setView("referrals")} />
          <Row label="Follow on X" value="@betparabolic" onClick={() => window.open("https://x.com/betparabolic", "_blank")} last />
        </Group>

        <button onClick={handleLogout} style={logoutBtn}>Log out</button>
      </div></div>
    );
  }

  // ── Main: My profile (desktop two-column) ────────────────────────────────
  const isWide = typeof window !== "undefined" && window.innerWidth >= 980;
  return (
    <div style={wrap}><div style={wideInner}>
      {/* Header — title + card + gear (settings) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 14px" }}>
        <button onClick={onClose} style={iconBtn} title="Close">✕</button>
        <div style={{ fontFamily: fd, fontSize: 16, fontWeight: 700, color: B.white }}>My profile</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCard(true)} style={iconBtn} title="My member card">▤</button>
          {!worldcup && <button onClick={() => setView("settings")} style={iconBtn} title="Settings">⚙</button>}
        </div>
      </div>
      {showCard && (
        <CardShareModal userId={userId} username={username} avatar={memberCard.avatar}
          roiPct={returnPct} trades={trades.length}
          onClose={() => setShowCard(false)} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: isWide ? "380px 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        {/* LEFT column — identity, discipline, stats, open positions */}
        <div>
          {/* Identity — no standalone pfp; the member card below carries the avatar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fm, color: "#ddd", background: "#1a1d22", padding: "3px 9px", borderRadius: 999 }}>★ {points.toLocaleString()}</span>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: fm, letterSpacing: "0.08em", color: tier.color, background: tier.color + "1c", padding: "3px 9px", borderRadius: 6 }}>{tier.name}</span>
              {profile?.streak > 0 && <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fm, color: "#ff9f1c", background: "#ff9f1c18", padding: "3px 9px", borderRadius: 999 }}>🔥 {profile.streak}</span>}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: B.white, fontFamily: fd, letterSpacing: "-0.02em" }}>{username}</div>
            <div style={{ fontSize: 12, color: B.dim, marginTop: 2 }}>
              Joined {joined} · <span style={{ color: "#c8ccd2", fontWeight: 600 }}>{profile?.followers ?? 0}</span> follower{(profile?.followers ?? 0) === 1 ? "" : "s"} · <span style={{ color: "#c8ccd2", fontWeight: 600 }}>{profile?.following ?? 0}</span> following
            </div>
          </div>

          {/* Member card — always visible; click for the full overlay (flip/QR/share) */}
          <div onClick={() => setShowCard(true)} style={{ cursor: "pointer", marginBottom: 12 }} title="Open my card">
            <StatCard width={isWide ? 348 : Math.min((typeof window !== "undefined" ? window.innerWidth : 380) - 80, 348)} username={username} avatar={memberCard.avatar} signature={memberCard.signature} referralCode={referralCodeFor(userId)} />
            <div style={{ fontSize: 11, color: B.dim, marginTop: 6, textAlign: "center" }}>Tap the card to share</div>
          </div>

          {/* Stat grid — All-time P&L / ROI / Win rate / Volume (matches the design's 2x2) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <StatBox label={worldcup ? "Competition P&L" : "All-time P&L"} value={`${(profile?.closedPnl ?? 0) >= 0 ? "+" : ""}${fmtUsd(profile?.closedPnl ?? 0)}`} color={(profile?.closedPnl ?? 0) >= 0 ? B.primary : B.red} />
            <StatBox label="ROI" value={fmtPct(returnPct)} color={returnPct >= 0 ? B.primary : B.red} />
            <StatBox label="Win rate" value={`${winRate}%`} />
            <StatBox label="Volume" value={fmtUsd(profile?.totalVolume ?? 0)} />
          </div>

          <PnlSparkline trades={trades} />

          {/* Open positions */}
          <SectionTitle>Open positions</SectionTitle>
          {positions.length === 0 ? (
            <div style={{ ...card, color: B.dim, fontSize: 14 }}>No open positions.</div>
          ) : positions.map((p, i) => (
            <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: B.white, textTransform: p.teamName ? "none" : "capitalize" }}>{p.teamName || p.side}</div>
                <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{fmtUsd(p.margin)} · {(p.entryPx * 100).toFixed(0)}¢ · {p.leverage}x</div>
              </div>
              <div style={{ fontFamily: fm, fontWeight: 700, color: p.pnl >= 0 ? B.primary : B.red }}>{p.pnl >= 0 ? "+" : ""}{fmtUsd(p.pnl)}</div>
            </div>
          ))}

        {/* worldcup silo: no settings page — account controls live on the main profile */}
        {worldcup && (
          <div style={{ marginTop: 18 }}>
            <SectionTitle>Account</SectionTitle>
            <Group>
              <Row label="Account details" onClick={() => setView("account")} />
              <PrivacyRow userId={userId} profile={profile} onSaved={load} />
              <WebNotifyRow last />
            </Group>
            <button onClick={handleLogout} style={logoutBtn}>Log out</button>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <FeedbackWidget userId={userId} worldcup={worldcup} />
        </div>
        </div>

        {/* RIGHT column — Bets | Badges */}
        <div>
          <div style={{ display: "flex", gap: 20, margin: "2px 4px 12px" }}>
            {["bets", "badges"].map((t) => (
              <span key={t} onClick={() => setTab(t)} style={{ fontFamily: fd, fontSize: 17, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", color: tab === t ? B.white : B.mute }}>{t}</span>
            ))}
          </div>

          {tab === "badges" ? (
            <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🏅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: B.white, marginBottom: 4 }}>Badges are coming soon</div>
              <div style={{ fontSize: 12.5, color: B.dim, lineHeight: 1.5 }}>Milestone badges for wins, streaks, and volume land with the next points update.</div>
            </div>
          ) : (
            <>
              {/* All / Wins / Loses filter */}
              <div style={{ display: "inline-flex", background: "#111", border: "1px solid #1f1f1f", borderRadius: 999, padding: 3, gap: 3, marginBottom: 12 }}>
                {[["all", "All"], ["wins", "Wins"], ["loses", "Loses"]].map(([k, label]) => (
                  <button key={k} onClick={() => setBetFilter(k)} style={{
                    padding: "6px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fd, fontWeight: 700, fontSize: 13,
                    background: betFilter === k ? "#fff" : "transparent", color: betFilter === k ? "#0a0a0a" : "#888",
                  }}>{label}</button>
                ))}
              </div>

              {filteredTrades.length === 0 ? (
                <div style={{ ...card, color: B.dim, fontSize: 14 }}>{loading ? "Loading…" : betFilter === "all" ? "No settled bets yet." : `No ${betFilter} yet.`}</div>
              ) : filteredTrades.map((t) => {
                const win = t.pnl >= 0;
                const lg = leagueOf(t.gameId);
                return (
                  <div key={t.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px" }}>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: fm, letterSpacing: "0.1em", color: B.dim, marginBottom: 4 }}>{lg.emoji} {lg.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: B.white, textTransform: t.teamName ? "none" : "capitalize" }}>{t.teamName || t.side} · {t.leverage}x</div>
                      <div style={{ fontSize: 12, color: B.dim, fontFamily: fm }}>{(t.entryPx * 100).toFixed(0)}¢ → {t.exitPx != null ? (t.exitPx * 100).toFixed(0) + "¢" : "—"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: fm, fontWeight: 700, color: win ? B.primary : B.red }}>{win ? "+" : ""}{fmtUsd(t.pnl)}</div>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        {/* HOW it ended — always shown: TP/SL fired, liquidated, closed by the
                            user, or held all the way to settlement. */}
                        {(() => {
                          const ct = t.closeType || "CLOSED";
                          const [label, clr, bg] = ct === "LIQ" ? ["☠ LIQUIDATED", B.red, "rgba(255,82,71,0.15)"]
                            : ct === "TP" ? ["TP HIT", B.primary, "rgba(31,209,130,0.15)"]
                            : ct === "SL" ? ["SL HIT", "#ff9f1c", "rgba(255,159,28,0.15)"]
                            : ct === "SETTLED" ? ["HELD TO SETTLEMENT", "#8ab8ff", "rgba(96,150,255,0.15)"]
                            : ["CLOSED BY YOU", B.dim, "rgba(138,147,166,0.15)"];
                          return <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "2px 7px", borderRadius: 5, background: bg, color: clr, whiteSpace: "nowrap" }}>{label}</span>;
                        })()}
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: fm, padding: "2px 7px", borderRadius: 5, background: win ? "rgba(31,209,130,0.15)" : "rgba(255,82,71,0.15)", color: win ? B.primary : B.red }}>{win ? "WIN" : "LOSE"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
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

      <EditableField label="X account" initial={profile?.xHandle ? `@${profile.xHandle}` : ""} placeholder="@yourhandle" cta="Save"
        onSave={async (v) => { await putProfile({ xHandle: v.trim().replace(/^@/, "") }); flash(true, "X account saved."); onSaved?.(); }} onError={(e) => flash(false, e)} />

      {msg && <div style={{ color: B.primary, fontSize: 13, marginTop: 6 }}>{msg}</div>}
      {err && <div style={{ color: B.red, fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

// ── In-product feedback (POST /api/feedback) — shown on the main profile view ──
function FeedbackWidget({ userId, worldcup }) {
  const [text, setText] = useState("");
  const [state, setState] = useState("idle"); // idle | busy | sent | error
  const [err, setErr] = useState("");
  const send = async () => {
    if (state === "busy" || text.trim().length < 3) return;
    setState("busy"); setErr("");
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token: authToken(), message: text.trim(), context: worldcup ? "worldcup" : "app" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send — try again");
      setState("sent"); setText("");
    } catch (e) { setState("error"); setErr(e.message); }
  };
  if (state === "sent") {
    return (
      <div style={{ ...card, textAlign: "center", padding: "18px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: B.white }}>Thanks — we read every one. 🙏</div>
        <div style={{ fontSize: 12.5, color: B.dim, marginTop: 4 }}>Your feedback shapes what we build next.</div>
      </div>
    );
  }
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: B.white, marginBottom: 4 }}>Feedback</div>
      <div style={{ fontSize: 12, color: B.dim, marginBottom: 8 }}>Spotted a bug? Want a feature? Tell us — it goes straight to the team.</div>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={3} placeholder="What should we know?"
        style={{ width: "100%", boxSizing: "border-box", background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 12, padding: "10px 12px", color: B.white, fontSize: 16, fontFamily: fb, outline: "none", resize: "vertical" }} />
      {err && <div style={{ color: B.red, fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <button onClick={send} disabled={state === "busy" || text.trim().length < 3}
        style={{ ...saveBtn, marginTop: 8, opacity: state === "busy" || text.trim().length < 3 ? 0.5 : 1 }}>
        {state === "busy" ? "Sending…" : "Send feedback"}
      </button>
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
function Referrals() {
  return (
    <div>
      <div style={{ ...card, textAlign: "center", padding: "26px 16px" }}>
        <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: B.white }}>Invite friends</div>
        <div style={{ color: B.dim, fontSize: 13, margin: "8px 0 0" }}>Referral program coming soon — you and your friends will both earn rewards when they start trading.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatBox label="Friends joined" value="0" />
        <StatBox label="Rewards earned" value={fmtUsd(0)} />
      </div>
    </div>
  );
}

// ── Realized-PnL sparkline — cumulative closed PnL across the trader's bets, oldest → newest.
// Answers "am I up?" at a glance; pure client-side math over the trades already fetched. ──────
function PnlSparkline({ trades }) {
  if (!trades || trades.length < 2) return null;
  const sorted = [...trades].sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));
  let run = 0;
  const pts = [0, ...sorted.map((t) => (run += t.pnl || 0))];
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = Math.max(max - min, 1e-9);
  const W = 320, H = 64, PAD = 4;
  const x = (i) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const y = (v) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= 0;
  const col = up ? B.primary : B.red;
  const zeroY = min < 0 && max > 0 ? y(0) : null;
  return (
    <div style={{ ...card, padding: "12px 14px", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: fm, letterSpacing: "0.1em", color: B.dim }}>P&L HISTORY</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: fm, color: col }}>{up ? "+" : ""}{fmtUsd(pts[pts.length - 1])}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
        {zeroY != null && <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#ffffff18" strokeWidth="1" strokeDasharray="3 3" />}
        <polyline points={line} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polygon points={`${x(0)},${H - PAD} ${line} ${x(pts.length - 1)},${H - PAD}`} fill={col + "14"} stroke="none" />
      </svg>
      <div style={{ fontSize: 10, color: B.dim, marginTop: 4, textAlign: "right" }}>last {sorted.length} settled bets</div>
    </div>
  );
}

// ── API sub-screen (coming soon) ───────────────────────────────────────────
function ApiComingSoon() {
  return (
    <div style={{ ...card, textAlign: "center", padding: "34px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>🔌</div>
      <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: B.white, marginBottom: 6 }}>API coming soon</div>
      <div style={{ color: B.dim, fontSize: 13, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
        Programmatic access to markets, prices, and order placement is on the way.
        Keep an eye on <span style={{ color: B.white, fontWeight: 600 }}>@betparabolic</span> for the launch.
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
const iconBtn = { width: 34, height: 34, borderRadius: "50%", background: B.surface, border: `1px solid ${B.border2}`, color: "#ccc", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const avatar = { width: 76, height: 76, borderRadius: "50%", background: `linear-gradient(140deg, ${B.primary}, ${B.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#04130c", fontFamily: fd };
const editBtn = { marginTop: 4, padding: "7px 22px", borderRadius: 999, background: B.surface, border: `1px solid ${B.border2}`, color: B.white, fontFamily: fd, fontWeight: 600, fontSize: 13, cursor: "pointer" };
const logoutBtn = { width: "100%", marginTop: 18, padding: "13px", borderRadius: 12, background: "transparent", border: `1px solid ${B.border2}`, color: B.red, fontFamily: fd, fontWeight: 600, fontSize: 14, cursor: "pointer" };
const input = { width: "100%", boxSizing: "border-box", padding: "11px 12px", marginTop: 8, background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 10, color: B.white, fontSize: 16, fontFamily: fb, outline: "none" }; // ≥16px: sub-16 inputs make iOS Safari zoom on focus
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
// Browser-alert opt-in — liquidation/TP-SL/settlement notifications while the tab is hidden.
function WebNotifyRow({ last }) {
  const [state, setState] = useState(() => webNotifyState());
  if (state === "unsupported") return null;
  const value = state === "on" ? "On" : state === "blocked" ? "Blocked in browser" : "Off";
  const toggle = async () => {
    if (state === "blocked") return; // user must unblock in browser settings
    setState(state === "on" ? disableWebNotify() : await enableWebNotify());
  };
  return (
    <Row label="Browser alerts" sub="Liquidations, TP/SL fills and settlements while you're in another tab"
      value={value} onClick={state === "blocked" ? undefined : toggle} last={last} />
  );
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
