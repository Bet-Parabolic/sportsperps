import { useState, useEffect, useRef, useCallback } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { API_URL } from "../lib/constants.js";
import { authToken } from "../lib/auth.js";

// Verify-to-enter flow (plan 011 / WC-readiness A3): email step → phone step, each with
// send-code (cooldown timer) + 6-digit confirm. Opens when /event/join returns the
// verification 403; on both channels verified, calls onVerified() (which retries the join).
export function VerifyModal({ userId, onClose, onVerified }) {
  const [status, setStatus] = useState(null);   // { emailVerified, phoneVerified }
  const [step, setStep] = useState(null);       // 'email' | 'phone' | 'done'
  const [contact, setContact] = useState("");   // the email/phone being verified this step
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);  // seconds left before resend allowed
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cooldownTimer = useRef(null);

  // Load current state so already-verified channels are skipped.
  useEffect(() => {
    fetch(`${API_URL}/verify/status/${userId}`).then(r => r.json()).then(s => {
      setStatus(s);
      setStep(!s.emailVerified ? "email" : !s.phoneVerified ? "phone" : "done");
    }).catch(() => { setStatus({}); setStep("email"); });
  }, [userId]);

  useEffect(() => () => clearInterval(cooldownTimer.current), []);
  useEffect(() => { if (step === "done") onVerified?.(); }, [step, onVerified]);

  const startCooldown = (ms) => {
    setCooldown(Math.ceil(ms / 1000));
    clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(cooldownTimer.current); return 0; } return c - 1; }), 1000);
  };

  const post = async (path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token: authToken(), ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(d.error || "Something went wrong"), { cooldownMs: d.cooldownMs });
    return d;
  };

  const sendCode = useCallback(async () => {
    if (busy || cooldown > 0) return;
    setError(""); setBusy(true);
    try {
      const body = step === "email" ? { email: contact } : { phone: contact };
      const d = await post(`/verify/${step}/start`, body);
      setCodeSent(true);
      startCooldown(d.cooldownMs || 30_000);
    } catch (e) {
      setError(e.message);
      if (e.cooldownMs) { setCodeSent(true); startCooldown(e.cooldownMs); }
    } finally { setBusy(false); }
  }, [busy, cooldown, step, contact]);

  const confirmCode = useCallback(async () => {
    if (busy) return;
    setError(""); setBusy(true);
    try {
      const body = step === "email" ? { code } : { phone: contact, code };
      await post(`/verify/${step}/confirm`, body);
      // step complete → advance
      setCode(""); setContact(""); setCodeSent(false); setCooldown(0); clearInterval(cooldownTimer.current);
      if (step === "email") {
        setStatus(s => ({ ...s, emailVerified: true }));
        setStep(status?.phoneVerified ? "done" : "phone");
      } else {
        setStatus(s => ({ ...s, phoneVerified: true }));
        setStep("done");
      }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [busy, step, code, contact, status]);

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px", marginTop: 6,
    background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 12,
    color: B.white, fontSize: 16, fontFamily: fb, outline: "none", // ≥16px: sub-16 inputs make iOS Safari zoom on focus
  };
  const label = { fontSize: 12, color: B.dim, fontFamily: fm, letterSpacing: 0.3, textTransform: "uppercase" };
  const btn = (primary) => ({
    width: "100%", padding: "13px 0", marginTop: 12, border: "none", borderRadius: 12, cursor: "pointer",
    fontFamily: fb, fontWeight: 700, fontSize: 14,
    background: primary ? `linear-gradient(135deg, ${B.primary}, ${B.primary})` : "#1a1d22",
    color: primary ? "#04130c" : "#ccc", opacity: busy ? 0.6 : 1,
  });

  const isEmail = step === "email";
  const chip = (ok, txt) => (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: fm, padding: "3px 10px", borderRadius: 8,
      color: ok ? B.primary : B.dim, background: ok ? B.primary + "18" : "#15181d", border: `1px solid ${ok ? B.primary + "44" : B.border2}` }}>
      {ok ? "✓ " : ""}{txt}
    </span>
  );

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(2,3,5,0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 400, background: B.card, border: `1px solid ${B.border}`,
        borderRadius: 22, padding: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <img src={LOGO_WORDMARK} alt="Parabolic" style={{ height: 26, width: "auto" }} />
        </div>
        <h2 style={{ margin: "10px 0 2px", textAlign: "center", fontFamily: fd, fontSize: 21, color: B.white, fontWeight: 600 }}>
          🏆 Verify to enter the championship
        </h2>
        <p style={{ margin: "0 0 14px", textAlign: "center", fontSize: 12.5, color: B.dim, fontFamily: fb, lineHeight: 1.55 }}>
          Cash prizes need one entry per person. We use your email and phone to keep the contest fair and to contact winners — nothing else.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {chip(status?.emailVerified, "Email")}
          {chip(status?.phoneVerified, "Phone")}
        </div>

        {step === null && <div style={{ textAlign: "center", color: B.dim, fontSize: 13, padding: 20 }}>Loading…</div>}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontSize: 30 }}>🎉</div>
            <div style={{ color: B.white, fontWeight: 700, fontFamily: fd, fontSize: 16, marginTop: 6 }}>You're verified</div>
            <div style={{ color: B.dim, fontSize: 12.5, marginTop: 4 }}>Entering the championship…</div>
          </div>
        )}

        {(step === "email" || step === "phone") && (
          <>
            <div style={label}>{isEmail ? "Email address" : "Mobile number"}</div>
            <input
              style={inputStyle}
              type={isEmail ? "email" : "tel"}
              autoComplete={isEmail ? "email" : "tel"}
              inputMode={isEmail ? "email" : "tel"}
              placeholder={isEmail ? "you@example.com" : "+1 (555) 000-0000"}
              value={contact}
              disabled={codeSent}
              onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !codeSent && sendCode()}
            />
            {!isEmail && !codeSent && (
              <div style={{ fontSize: 11, color: B.dim, marginTop: 5 }}>Mobile numbers only — VoIP and landlines can't be verified.</div>
            )}
            {codeSent && (
              <>
                <div style={{ ...label, marginTop: 14 }}>6-digit code</div>
                <input
                  style={{ ...inputStyle, letterSpacing: "0.4em", textAlign: "center", fontFamily: fm, fontSize: 20 }}
                  inputMode="numeric" maxLength={6} placeholder="••••••" autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirmCode()}
                  autoFocus
                />
              </>
            )}
            {error && <div style={{ color: B.red, fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{error}</div>}
            {!codeSent
              ? <button onClick={sendCode} disabled={busy || !contact.trim()} style={btn(true)}>{busy ? "Sending…" : "Send code"}</button>
              : <>
                  <button onClick={confirmCode} disabled={busy || code.length !== 6} style={btn(true)}>{busy ? "Checking…" : "Confirm"}</button>
                  <button onClick={() => { if (cooldown === 0) { setCodeSent(false); setCode(""); } }} disabled={cooldown > 0} style={btn(false)}>
                    {cooldown > 0 ? `Resend available in ${cooldown}s` : "Change " + (isEmail ? "email" : "number") + " / resend"}
                  </button>
                </>}
          </>
        )}
      </div>
    </div>
  );
}
