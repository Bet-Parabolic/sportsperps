import { useState } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { API_URL } from "../lib/constants.js";
import { register, login } from "../lib/auth.js";

// Login / sign-up modal. Username + password only (email is added later on the profile page for
// 2FA). On success calls onAuth(authData). `reason` is an optional line explaining why it opened
// (e.g. shown when a wager is gated behind sign-in). 'forgot' mode emails a reset code (needs the
// account's 2FA email), then trades code + new password for a fresh session.
export function AuthModal({ onClose, onAuth, reason, defaultMode = "signup" }) {
  const [mode, setMode] = useState(defaultMode); // 'signup' | 'login' | 'forgot'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  const submit = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const u = username.trim();
      const data = isSignup ? await register(u, password) : await login(u, password);
      onAuth?.(data);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (busy || !email.trim()) return;
    setError(""); setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send the code");
      setCodeSent(true);
      setNotice("If that email has an account, a 6-digit code is on its way.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const doReset = async () => {
    if (busy || code.length !== 6 || password.length < 6) return;
    setError(""); setBusy(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), code, newPassword: password }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't reset the password");
      onAuth?.(d); // { userId, username, token } — logged straight in
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px", marginTop: 6,
    background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 12,
    color: B.white, fontSize: 16, fontFamily: fb, outline: "none", // ≥16px: sub-16 inputs make iOS Safari zoom on focus
  };
  const label = { fontSize: 12, color: B.dim, fontFamily: fm, letterSpacing: 0.3, textTransform: "uppercase" };

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(2,3,5,0.78)",
        backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 380, background: B.card, border: `1px solid ${B.border}`,
        borderRadius: 22, padding: 26, boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <img src={LOGO_WORDMARK} alt="Parabolic" style={{ height: 26, width: "auto" }} />
        </div>

        <h2 style={{ margin: "10px 0 2px", textAlign: "center", fontFamily: fd, fontSize: 22, color: B.white, fontWeight: 600 }}>
          {isForgot ? "Reset your password" : isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p style={{ margin: "0 0 18px", textAlign: "center", fontSize: 13, color: B.dim, fontFamily: fb }}>
          {isForgot
            ? (codeSent ? "Enter the code we emailed plus a new password." : "We'll email a 6-digit reset code to your account's email.")
            : reason || (isSignup ? "Sign up to place wagers and track your record." : "Log in to your Parabolic account.")}
        </p>

        {isForgot ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Email</span>
              <input
                style={inputStyle} value={email} autoFocus type="email" autoComplete="email" disabled={codeSent}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !codeSent && sendReset()}
                placeholder="you@email.com"
              />
            </div>
            {codeSent && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <span style={label}>6-digit code</span>
                  <input
                    style={inputStyle} value={code} inputMode="numeric" autoFocus
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={label}>New password</span>
                  <input
                    type="password" style={inputStyle} value={password} autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doReset()}
                    placeholder="at least 6 characters"
                  />
                </div>
              </>
            )}
            {notice && !error && <div style={{ color: B.dim, fontSize: 13, fontFamily: fb, margin: "10px 2px 0" }}>{notice}</div>}
            {error && <div style={{ color: B.red, fontSize: 13, fontFamily: fb, margin: "10px 2px 0" }}>{error}</div>}
            <button
              onClick={codeSent ? doReset : sendReset} disabled={busy}
              style={{
                width: "100%", marginTop: 18, padding: "14px", borderRadius: 12, border: "none",
                background: busy ? B.surface : B.primary, color: busy ? B.dim : "#04130c",
                fontFamily: fd, fontSize: 16, fontWeight: 700, cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "…" : codeSent ? "Reset password & log in" : "Send reset code"}
            </button>
            {codeSent && (
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: B.dim, fontFamily: fb }}>
                <span onClick={() => { setCodeSent(false); setCode(""); setNotice(""); setError(""); }} style={{ color: B.primary, cursor: "pointer", fontWeight: 600 }}>Use a different email</span>
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: B.dim, fontFamily: fb }}>
              Remembered it?{" "}
              <span onClick={() => { setMode("login"); setError(""); setNotice(""); setCodeSent(false); setPassword(""); }} style={{ color: B.primary, cursor: "pointer", fontWeight: 600 }}>Log in</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <span style={label}>Username</span>
              <input
                style={inputStyle} value={username} autoFocus autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("pw-input")?.focus()}
                placeholder="gooner_tom"
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={label}>Password</span>
              <input
                id="pw-input" type="password" style={inputStyle} value={password}
                autoComplete={isSignup ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={isSignup ? "at least 6 characters" : "••••••••"}
              />
            </div>

            {!isSignup && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <span onClick={() => { setMode("forgot"); setError(""); setPassword(""); }} style={{ color: B.dim, cursor: "pointer", fontSize: 12.5, fontFamily: fb }}>Forgot password?</span>
              </div>
            )}

            {error && (
              <div style={{ color: B.red, fontSize: 13, fontFamily: fb, margin: "10px 2px 0" }}>{error}</div>
            )}

            <button
              onClick={submit} disabled={busy}
              style={{
                width: "100%", marginTop: 18, padding: "14px", borderRadius: 12, border: "none",
                background: busy ? B.surface : B.primary, color: busy ? B.dim : "#04130c",
                fontFamily: fd, fontSize: 16, fontWeight: 700, cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "…" : isSignup ? "Create account" : "Log in"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: B.dim, fontFamily: fb }}>
              {isSignup ? "Already have an account? " : "New to Parabolic? "}
              <span
                onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }}
                style={{ color: B.primary, cursor: "pointer", fontWeight: 600 }}
              >
                {isSignup ? "Log in" : "Sign up"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
