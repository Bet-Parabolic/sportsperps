/**
 * Rewards page (Figma Parabolic-7-21-26 node 195-24305) — rendered inside the terminal shell, so
 * it shares the exact NavRail + header the home page uses. Real data end-to-end:
 *   GET  /rewards/state/:userId  → points, streak, referrals, quests, submissions
 *   POST /rewards/checkin        → the Daily Climb scratch card (canvas scratch-off)
 *   POST /rewards/tasks/:id/claim→ quest claims
 * Referral link = app.parabolic.gg/?ref=<username> (register() sends localStorage.parabolic_ref
 * as referredBy; App.jsx captures the ?ref= param on boot).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Users, Sparkles, Gift, Copy, Check, Send } from "lucide-react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { authToken, getAuth } from "../lib/auth.js";
import { ago } from "../lib/notifications.js";

const GREEN = "#5ed87e";
const CARD = { background: "#101114", border: "1px solid #1c2028", borderRadius: 16 };

// ── decorative background rings (Figma's faint ellipses) ─────────────────────
function Rings() {
  const ring = (size, top, left, right) => (
    <div style={{ position: "absolute", width: size, height: size * 0.72, top, left, right, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.045)", transform: "rotate(-18deg)", pointerEvents: "none" }} />
  );
  return (
    <>
      {ring(180, 190, 60)}
      {ring(120, 90, undefined, 180)}
      {ring(260, 250, undefined, -40)}
      {ring(150, 780, 120)}
    </>
  );
}

// ── Daily Climb scratch card ─────────────────────────────────────────────────
function ScratchCard({ userId, checkin, prize, onClaimed }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const doneRef = useRef(false);       // claim fired (guards double-post)
  const [reveal, setReveal] = useState(null);   // {total,day} after a successful claim
  const [err, setErr] = useState("");

  const claimedToday = checkin?.claimedToday;

  // Paint the coating: dark card + dotted texture + "Scratch to get N points".
  useEffect(() => {
    if (claimedToday || reveal) return;
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    cv.width = w * 2; cv.height = h * 2;               // 2x for crisp text
    const ctx = cv.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = "#232529";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 10) ctx.fillRect(x, y, 1.5, 1.5);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 15px ${fb.split(",")[0] || "sans-serif"}, sans-serif`;
    ctx.fillStyle = "#e8ebf0";
    ctx.fillText(`Scratch to get ${prize} points`, w / 2, h / 2);
    doneRef.current = false;
  }, [claimedToday, reveal, prize]);

  const doCheckin = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/rewards/checkin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token: authToken() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setReveal({ total: d.total, day: d.day }); onClaimed?.(); }
      else if (r.status === 409) { setReveal({ already: true }); onClaimed?.(); }
      else { setErr(d.error || "Sign in to claim your daily points"); doneRef.current = false; }
    } catch { setErr("Network error — try again"); doneRef.current = false; }
  }, [userId, onClaimed]);

  // Scratch interaction: erase under the pointer; past ~35% cleared → claim.
  const scratching = useRef(false);
  const strokes = useRef(0);
  const scratch = (e) => {
    if (doneRef.current || claimedToday || reveal) return;
    const cv = canvasRef.current; if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left), y = (e.clientY - rect.top);
    const ctx = cv.getContext("2d");
    ctx.save(); ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (++strokes.current % 8 === 0) {
      // sample a coarse grid of alpha to estimate cleared fraction
      const { width, height } = cv;
      const img = ctx.getImageData(0, 0, width, height);
      let clear = 0, total = 0;
      for (let i = 3; i < img.data.length; i += 4 * 97) { total++; if (img.data[i] === 0) clear++; }
      if (total && clear / total > 0.35 && !doneRef.current) { doneRef.current = true; doCheckin(); }
    }
  };

  const revealed = claimedToday || reveal;
  const dayNum = reveal?.day ?? checkin?.current ?? 0;
  const claimedTotal = reveal?.total ?? (checkin ? (checkin.claimedToday ? prize : null) : null);

  return (
    <div ref={wrapRef} style={{ position: "relative", height: 176, borderRadius: 18, overflow: "hidden", background: "#17181c", border: "1px solid #23252b" }}>
      {/* revealed layer */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {revealed ? (
          <>
            <div style={{ fontFamily: fd, fontSize: 34, fontWeight: 800, color: GREEN, letterSpacing: "-0.02em" }}>
              {reveal?.already ? "Claimed" : `+${claimedTotal ?? prize} points`}
            </div>
            <div style={{ fontSize: 12.5, color: "#8a93a6", fontFamily: fb }}>
              {reveal?.already ? "Already claimed today — come back tomorrow" : `Day ${dayNum} streak · come back tomorrow`}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#565c68", fontFamily: fb }}>…</div>
        )}
      </div>
      {/* scratch coating */}
      {!revealed && (
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", touchAction: "none" }}
          onPointerDown={(e) => { scratching.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e); }}
          onPointerMove={(e) => { if (scratching.current) scratch(e); }}
          onPointerUp={() => { scratching.current = false; }}
          onPointerCancel={() => { scratching.current = false; }} />
      )}
      {err && <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#ff5247", fontFamily: fb }}>{err}</div>}
    </div>
  );
}

// ── week strip under the scratch card ────────────────────────────────────────
function WeekStrip({ checkin }) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (new Date().getDay() + 6) % 7;   // 0 = Monday
  const current = checkin?.current ?? 0;
  const claimedToday = !!checkin?.claimedToday;
  // offsets (days relative to today) covered by the live streak
  const covered = (off) => {
    if (claimedToday) return off <= 0 && off > -current;
    return off < 0 && off >= -current;
  };
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
      {labels.map((l, i) => {
        const off = i - todayIdx;
        const isToday = off === 0;
        const done = covered(off);
        const missed = off < 0 && !done;
        return (
          <div key={i} style={{ flex: "0 1 54px", minWidth: 32, textAlign: "center" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? "#fff" : "#565c68", fontFamily: fm, padding: "6px 0", background: "#131418", border: "1px solid #1e2026", borderRadius: "8px 8px 0 0" }}>{l}</div>
            <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0 0 8px 8px", border: "1px solid #1e2026", borderTop: "none",
              background: done ? "#0e2417" : missed ? "#241012" : isToday ? "#fff" : "#131418" }}>
              {done ? <span style={{ color: GREEN, fontSize: 11, fontWeight: 800, fontFamily: fm }}>✓</span>
                : missed ? <span style={{ color: "#ff5247", fontSize: 12, fontWeight: 800 }}>—</span>
                : isToday ? <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0a0a0a", display: "inline-block" }} />
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export function RewardsPage({ userId }) {
  const [st, setSt] = useState(null);
  const [tab, setTab] = useState("quests");
  const [copied, setCopied] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  const refresh = useCallback(() => {
    if (!userId) return;
    fetch(`${API_URL}/rewards/state/${userId}?token=${encodeURIComponent(authToken() || "")}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setSt(d); }).catch(() => {});
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh]);

  const username = st?.username || getAuth()?.username || null;
  const refLink = username ? `app.parabolic.gg/?ref=${username}` : "Sign in to get your invite link";
  const prize = (st?.config?.CHECKIN_BASE ?? 15) + (st?.checkin?.nextMilestone === (st?.checkin?.current ?? 0) + 1 ? (st?.checkin?.milestoneBonus ?? 0) : 0);
  const streak = st?.checkin?.current ?? 0;

  const copyLink = () => {
    if (!username) return;
    try { navigator.clipboard.writeText(`https://${refLink}`); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  const claimQuest = async (t) => {
    if (t.targetUrl) window.open(t.targetUrl, "_blank", "noopener,noreferrer");
    try {
      const r = await fetch(`${API_URL}/rewards/tasks/${t.id}/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token: authToken() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setClaimMsg(`+${t.points} points — ${t.title}`); refresh(); }
      else setClaimMsg(d.error || "Couldn't claim — sign in first");
    } catch { setClaimMsg("Network error"); }
    setTimeout(() => setClaimMsg(""), 3000);
  };

  const statCard = (label, value, extra, highlight) => (
    <div style={{ ...CARD, position: "relative", width: 186, padding: "14px 16px", ...(highlight ? { border: "1px solid #2b4a44", boxShadow: "0 0 34px rgba(31,209,130,0.12)", background: "linear-gradient(135deg,#101a17,#101114)" } : {}) }}>
      <div style={{ fontSize: 12.5, color: "#8a93a6", fontFamily: fb }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: fd, fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{value}</span>
        {extra}
      </div>
      {highlight && <Sparkles size={16} color={B.primary} style={{ position: "absolute", top: 12, right: 12 }} />}
    </div>
  );

  const tabs = [["quests", "Quests"], ["milestones", "Milestones"], ["history", "History"]];
  const milestones = Object.entries(st?.config?.CHECKIN_MILESTONES || { 7: 100, 14: 250, 21: 400, 31: 1000 });

  const row = { display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", borderBottom: "1px solid #16181d" };
  const rowIcon = { width: 34, height: 34, borderRadius: 10, background: "#181b20", border: "1px solid #23252b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 };

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "#0a0a0a", position: "relative", fontFamily: fb }} className="rewards-scroll">
      <Rings />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "44px 20px 70px", position: "relative" }}>

        {/* hero */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: B.primary, fontFamily: fm, marginBottom: 12 }}>REWARDS CENTER</div>
          <h1 style={{ fontFamily: fd, fontSize: 38, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 auto", maxWidth: 520 }}>
            Shape the network, earn points and collect cards
          </h1>
        </div>

        {/* stat cards */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
          {statCard("Your points", (st?.points ?? 0).toLocaleString(),
            streak > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#241a10", border: "1px solid #3a2a14", borderRadius: 999, padding: "2px 8px", fontSize: 11.5, fontWeight: 800, color: "#f5a623", fontFamily: fm }}><Flame size={11} color="#f5a623" />{streak}</span>)}
          {statCard("Referrals", st?.referrals?.count ?? 0)}
          {statCard("Cards to claim", st?.referrals?.qualified ?? 0, null, true)}
        </div>

        {/* daily climb */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center", marginBottom: 14 }}>
            <Flame size={13} color="#8a93a6" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a6", fontFamily: fm }}>DAILY CLIMB</span>
          </div>
          {/* painted-splash backdrop */}
          <div style={{ position: "relative", padding: "26px 30px" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 75% at 50% 50%, rgba(255,255,255,0.055), transparent 70%)", pointerEvents: "none" }} />
            <ScratchCard userId={userId} checkin={st?.checkin} prize={prize} onClaimed={refresh} />
            <WeekStrip checkin={st?.checkin} />
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", background: "#101114", border: "1px solid #1c2028", borderRadius: 999, padding: 4, marginBottom: 6 }}>
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fb, fontSize: 13.5, fontWeight: tab === k ? 700 : 500, background: tab === k ? "#1a1d22" : "transparent", color: tab === k ? "#fff" : "#8a93a6" }}>
              {label}
            </button>
          ))}
        </div>
        {claimMsg && <div style={{ fontSize: 12.5, color: GREEN, textAlign: "center", padding: "6px 0", fontFamily: fb }}>{claimMsg}</div>}

        <div style={{ minHeight: 220, marginBottom: 64 }}>
          {tab === "quests" && (
            (st?.tasks?.length ?? 0) === 0
              ? <div style={{ textAlign: "center", padding: "44px 0", color: "#565c68", fontSize: 13 }}>No open quests right now — check back soon.</div>
              : st.tasks.map((t) => (
                <div key={t.id} style={row}>
                  <div style={rowIcon}>🎯</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e8ebf0" }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: "#8a93a6", fontFamily: fm, marginTop: 2 }}>Quest</div>
                  </div>
                  {t.claimed
                    ? <span style={{ fontSize: 12.5, fontWeight: 700, color: "#565c68", fontFamily: fm }}>✓ Claimed</span>
                    : <button onClick={() => claimQuest(t)} style={{ background: "#fff", color: "#0a0a0a", border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: fb }}>+{t.points} points</button>}
                </div>
              ))
          )}
          {tab === "milestones" && (
            <>
              {milestones.map(([day, bonus]) => {
                const hit = (st?.checkin?.longest ?? 0) >= Number(day);
                return (
                  <div key={day} style={row}>
                    <div style={rowIcon}>{hit ? "🏆" : "🔒"}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: hit ? "#e8ebf0" : "#aab0ba" }}>{day}-day streak</div>
                      <div style={{ fontSize: 11.5, color: "#8a93a6", fontFamily: fm, marginTop: 2 }}>Daily climb</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: hit ? GREEN : "#565c68", fontFamily: fm }}>+{bonus} points</span>
                  </div>
                );
              })}
              <div style={row}>
                <div style={rowIcon}><Users size={15} color="#aab0ba" /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#aab0ba" }}>Qualified referral</div>
                  <div style={{ fontSize: 11.5, color: "#8a93a6", fontFamily: fm, marginTop: 2 }}>Friend joins, verifies and places a bet · +10% of their points daily</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#565c68", fontFamily: fm }}>+{st?.config?.REF_PTS ?? 50} each</span>
              </div>
            </>
          )}
          {tab === "history" && (
            (st?.submissions?.length ?? 0) === 0 && !st?.checkin?.claimedToday
              ? <div style={{ textAlign: "center", padding: "44px 0", color: "#565c68", fontSize: 13 }}>No activity yet — scratch the daily card or complete a quest.</div>
              : <>
                {st?.checkin?.claimedToday && (
                  <div style={row}>
                    <div style={rowIcon}>🔥</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8ebf0" }}>Daily reward claimed ({st.checkin.current} day streak)</div>
                      <div style={{ fontSize: 11.5, color: "#ff5247", fontFamily: fm, marginTop: 2 }}>Streak · today</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, fontFamily: fm }}>+{prize} points</span>
                  </div>
                )}
                {(st?.submissions || []).map((s) => (
                  <div key={s.id} style={row}>
                    <div style={rowIcon}>{s.kind === "clip" ? "🎬" : "📝"}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e8ebf0" }}>{s.kind === "clip" ? "Clip submitted" : "X post submitted"}</div>
                      <div style={{ fontSize: 11.5, color: "#8a93a6", fontFamily: fm, marginTop: 2 }}>{s.status} · {ago(s.createdAt)} ago</div>
                    </div>
                    {s.status === "approved" && <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, fontFamily: fm }}>+{s.points} points</span>}
                  </div>
                ))}
              </>
          )}
        </div>

        {/* invite friends */}
        <div style={{ display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {/* wireframe globe + avatars */}
          <div style={{ position: "relative", width: 190, height: 170, flexShrink: 0 }}>
            <svg viewBox="0 0 200 180" width="190" height="170" style={{ position: "absolute", inset: 0 }}>
              {[0, 1, 2].map((i) => (
                <ellipse key={i} cx="100" cy="90" rx={30 + i * 30} ry={78} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
              ))}
              <ellipse cx="100" cy="90" rx="92" ry={28} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
              <ellipse cx="100" cy="90" rx="92" ry={58} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            </svg>
            <div style={{ position: "absolute", bottom: 42, left: "50%", transform: "translateX(-50%)", display: "flex" }}>
              {["🧑‍🚀", "🥳", "😎"].map((e, i) => (
                <div key={i} style={{ width: 42, height: 42, borderRadius: "50%", background: ["#f2d9b0", "#f5b8c4", "#b8d8f5"][i], border: "2px solid #0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, marginLeft: i ? -10 : 0 }}>{e}</div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280, maxWidth: 340 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <Users size={13} color="#8a93a6" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#8a93a6", fontFamily: fm }}>INVITE FRIENDS</span>
            </div>
            <div style={{ fontFamily: fd, fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Refer and earn a mystery box</div>
            <div style={{ fontSize: 13, color: "#8a93a6", lineHeight: 1.55, marginBottom: 14 }}>
              Every friend who joins, verifies and places a bet earns you +{st?.config?.REF_PTS ?? 50} points — plus 10% of the points they earn, every day.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#101114", border: "1px solid #1c2028", borderRadius: 12, padding: "10px 12px", minWidth: 0 }}>
                <span style={{ fontSize: 12.5, color: username ? "#c8ccd2" : "#565c68", fontFamily: fm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{refLink}</span>
                <button onClick={copyLink} title="Copy invite link" aria-label="Copy invite link" style={{ background: "none", border: "none", cursor: username ? "pointer" : "default", padding: 2, display: "flex" }}>
                  {copied ? <Check size={15} color={GREEN} /> : <Copy size={15} color="#8a93a6" />}
                </button>
              </div>
              <a data-ungated="1" aria-label="Share on Telegram" title="Share on Telegram"
                href={username ? `https://t.me/share/url?url=${encodeURIComponent(`https://${refLink}`)}&text=${encodeURIComponent("Trade live sports win probability on Parabolic")}` : undefined}
                target="_blank" rel="noopener noreferrer"
                style={{ width: 38, height: 38, borderRadius: "50%", background: "#17191d", border: "1px solid #23252b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Send size={15} color="#aeb4bd" />
              </a>
              <a data-ungated="1" aria-label="Share on X" title="Share on X"
                href={username ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Trade live sports win probability on Parabolic — join with my link: https://${refLink}`)}` : undefined}
                target="_blank" rel="noopener noreferrer"
                style={{ width: 38, height: 38, borderRadius: "50%", background: "#17191d", border: "1px solid #23252b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#aeb4bd" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
