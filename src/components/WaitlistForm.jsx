import { useState } from "react";
import { B, fb, fd } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";

// ── Branching waitlist form (the card + all logic) ─────────────────────────
// Reused by WaitlistModal (overlay) and WaitlistPage (full page).
// Step 0: user vs market maker → Step 1: track-specific questions → Step 2: contact.
// Collects email and/or X handle (at least one required).
// Props: onClose? — if provided, renders a × (modal use). onDone? — fired after a successful submit.
//        heading? (default true) — the "Join the waitlist" title block; hidden on /waitlist (hero covers it).

const SPORTS = ["Soccer", "American Football", "Basketball", "Baseball", "MMA", "Hockey", "Other"];
const PERP_VOL = ["< $10M", "$10–50M", "$50–100M", "$100M+"];
const PRED_VOL = ["< $1M", "$1–5M", "$5–10M", "$10M+"];

const G = "#1fd182", GL = "#52e0a3";

export function WaitlistForm({ onClose, onDone, heading = true }) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(null); // 'user' | 'mm'

  // user answers
  const [tradedPerps, setTradedPerps] = useState(null);
  const [tradedPredictions, setTradedPredictions] = useState(null);
  const [favSport, setFavSport] = useState(null);
  const [favSportOther, setFavSportOther] = useState("");

  // market-maker answers
  const [runsPerps, setRunsPerps] = useState(null);
  const [makesPredictions, setMakesPredictions] = useState(null);
  const [perpVol, setPerpVol] = useState(null);
  const [predVol, setPredVol] = useState(null);

  // contact
  const [email, setEmail] = useState("");
  const [xHandle, setXHandle] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const xOk = xHandle.trim().replace(/^@/, "").length >= 2;
  const contactOk = emailOk || xOk;

  const questionsOk = kind === "user"
    ? (tradedPerps != null && tradedPredictions != null && favSport != null && (favSport !== "Other" || favSportOther.trim().length > 0))
    : (runsPerps != null && makesPredictions != null && perpVol != null && predVol != null);

  async function submit() {
    if (!contactOk || submitting) return;
    setSubmitting(true); setError("");
    const payload = kind === "user"
      ? { kind, tradedPerps, tradedPredictions, favSport: favSport === "Other" ? favSportOther.trim() : favSport,
          email: email.trim() || null, xHandle: xHandle.trim().replace(/^@/, "") || null }
      : { kind, runsPerps, makesPredictions, perpVol, predVol,
          email: email.trim() || null, xHandle: xHandle.trim().replace(/^@/, "") || null };
    try {
      const r = await fetch(`${API_URL}/waitlist`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Something went wrong"); }
      setDone(true); onDone?.();
    } catch (e) {
      setError(e.message || "Could not submit — try again");
    } finally { setSubmitting(false); }
  }

  // ── styles ──
  const card = { width: "100%", maxWidth: 460, background: B.card, border: `1px solid ${B.border2}`, borderRadius: 18,
    padding: "26px 26px 22px", position: "relative", maxHeight: "92vh", overflowY: "auto",
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)", fontFamily: fb, color: B.white };
  const label = { fontSize: 13, fontWeight: 600, color: B.dim, marginBottom: 9, marginTop: 18, letterSpacing: "0.01em" };
  const input = { width: "100%", padding: "12px 14px", background: B.surface, border: `1px solid ${B.border2}`,
    borderRadius: 10, color: B.white, fontFamily: fb, fontSize: 14, outline: "none", boxSizing: "border-box" };

  const Pill = ({ active, onClick, children, flex }) => (
    <button onClick={onClick} style={{
      flex: flex ? 1 : "unset", padding: "10px 14px", cursor: "pointer", fontFamily: fb, fontSize: 13.5,
      fontWeight: active ? 700 : 500, borderRadius: 10, transition: "all .12s",
      background: active ? `linear-gradient(135deg, ${G}22, ${GL}18)` : B.surface,
      border: `1px solid ${active ? G : B.border2}`, color: active ? "#fff" : B.dim,
    }}>{children}</button>
  );

  const YesNo = ({ value, set }) => (
    <div style={{ display: "flex", gap: 8 }}>
      <Pill flex active={value === true} onClick={() => set(true)}>Yes</Pill>
      <Pill flex active={value === false} onClick={() => set(false)}>No</Pill>
    </div>
  );

  const Question = ({ q, children }) => (
    <div>
      <div style={label}>{q}</div>
      {children}
    </div>
  );

  return (
    <div style={card} onClick={(e) => e.stopPropagation()}>
      {onClose && (
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14,
          background: "transparent", border: "none", color: B.mute, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
      )}

      {done ? (
        <div style={{ textAlign: "center", padding: "26px 8px 12px" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✓</div>
          <h3 style={{ fontFamily: fd, fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>You're on the list</h3>
          <p style={{ color: B.dim, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 22px" }}>
            Thanks — we'll reach out {emailOk ? "by email" : "on X"} with early access.
          </p>
          <button onClick={() => (onClose ? onClose() : (window.location.href = "https://parabolic.gg"))}
            style={{ padding: "12px 30px", border: "none", cursor: "pointer", fontFamily: fb,
              fontWeight: 700, fontSize: 14.5, background: `linear-gradient(135deg, ${G}, ${GL})`, color: "#04120c", borderRadius: 11 }}>Done</button>
        </div>
      ) : (
        <>
          {heading && (
            <div style={{ marginBottom: 4 }}>
              <h3 style={{ fontFamily: fd, fontSize: 23, fontWeight: 700, margin: "0 0 6px", color: "#fff" }}>Join the waitlist</h3>
              <p style={{ color: B.dim, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
                {step === 0 ? "Get early access to Parabolic." : step === 1 ? "Tell us a bit about you." : "Where should we reach you?"}
              </p>
            </div>
          )}

          {/* progress dots */}
          <div style={{ display: "flex", gap: 6, margin: "16px 0 4px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 3, flex: 1, borderRadius: 3, background: i <= step ? G : B.border2, transition: "background .2s" }} />
            ))}
          </div>

          {/* STEP 0 — kind */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              {[["user", "I'm a trader", "Retail / individual trader"], ["mm", "I'm a market maker", "Firm / liquidity provider"]].map(([k, t, s]) => (
                <button key={k} onClick={() => { setKind(k); setStep(1); }} style={{
                  textAlign: "left", padding: "16px 18px", cursor: "pointer", fontFamily: fb, borderRadius: 12,
                  background: B.surface, border: `1px solid ${B.border2}`, color: "#fff", transition: "all .12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = G; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = B.border2; }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: 12.5, color: B.dim }}>{s}</div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 1 — questions */}
          {step === 1 && kind === "user" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Question q="Have you ever traded perps?"><YesNo value={tradedPerps} set={setTradedPerps} /></Question>
              <Question q="Have you ever traded on prediction markets?"><YesNo value={tradedPredictions} set={setTradedPredictions} /></Question>
              <Question q="What's your favorite sport to watch?">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SPORTS.map((s) => <Pill key={s} active={favSport === s} onClick={() => setFavSport(s)}>{s}</Pill>)}
                </div>
                {favSport === "Other" && (
                  <input style={{ ...input, marginTop: 10 }} placeholder="Which sport?" value={favSportOther}
                    onChange={(e) => setFavSportOther(e.target.value)} maxLength={40} />
                )}
              </Question>
            </div>
          )}

          {step === 1 && kind === "mm" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Question q="Do you currently run strategies on perps?"><YesNo value={runsPerps} set={setRunsPerps} /></Question>
              <Question q="Do you currently market make prediction markets?"><YesNo value={makesPredictions} set={setMakesPredictions} /></Question>
              <Question q="Estimated weekly volume on perps?">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PERP_VOL.map((v) => <Pill key={v} active={perpVol === v} onClick={() => setPerpVol(v)}>{v}</Pill>)}
                </div>
              </Question>
              <Question q="Estimated weekly volume on prediction markets?">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PRED_VOL.map((v) => <Pill key={v} active={predVol === v} onClick={() => setPredVol(v)}>{v}</Pill>)}
                </div>
              </Question>
            </div>
          )}

          {/* STEP 2 — contact */}
          {step === 2 && (
            <div>
              <div style={label}>Email</div>
              <input style={input} type="email" placeholder="you@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <div style={{ textAlign: "center", color: B.mute, fontSize: 12, margin: "12px 0" }}>and / or</div>
              <div style={{ ...label, marginTop: 0 }}>X profile</div>
              <input style={input} placeholder="@yourhandle" value={xHandle}
                onChange={(e) => setXHandle(e.target.value)} />
              <p style={{ color: contactOk ? B.dim : B.mute, fontSize: 11.5, margin: "10px 2px 0", lineHeight: 1.5 }}>
                Give us at least one so we can reach you.
              </p>
              {error && <p style={{ color: B.red, fontSize: 12.5, margin: "10px 2px 0" }}>{error}</p>}
            </div>
          )}

          {/* nav */}
          {step > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(step - 1)} style={{ padding: "12px 20px", cursor: "pointer", fontFamily: fb,
                fontWeight: 600, fontSize: 14, background: "transparent", border: `1px solid ${B.border2}`, color: B.dim, borderRadius: 11 }}>Back</button>
              {step === 1 && (
                <button disabled={!questionsOk} onClick={() => setStep(2)} style={{ flex: 1, padding: "12px 20px",
                  cursor: questionsOk ? "pointer" : "not-allowed", fontFamily: fb, fontWeight: 700, fontSize: 14.5,
                  background: questionsOk ? `linear-gradient(135deg, ${G}, ${GL})` : B.surface,
                  color: questionsOk ? "#04120c" : B.mute, border: "none", borderRadius: 11, opacity: questionsOk ? 1 : 0.6 }}>Continue</button>
              )}
              {step === 2 && (
                <button disabled={!contactOk || submitting} onClick={submit} style={{ flex: 1, padding: "12px 20px",
                  cursor: contactOk && !submitting ? "pointer" : "not-allowed", fontFamily: fb, fontWeight: 700, fontSize: 14.5,
                  background: contactOk ? `linear-gradient(135deg, ${G}, ${GL})` : B.surface,
                  color: contactOk ? "#04120c" : B.mute, border: "none", borderRadius: 11, opacity: contactOk && !submitting ? 1 : 0.6 }}>
                  {submitting ? "Joining…" : "Join waitlist"}</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
