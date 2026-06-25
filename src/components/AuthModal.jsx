import { useState } from "react";
import { B, fd, fb, fm } from "../lib/theme.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { register, login } from "../lib/auth.js";

// Login / sign-up modal. Username + password only (email is added later on the profile page for
// 2FA). On success calls onAuth(authData). `reason` is an optional line explaining why it opened
// (e.g. shown when a wager is gated behind sign-in).
export function AuthModal({ onClose, onAuth, reason }) {
  const [mode, setMode] = useState("signup"); // 'signup' | 'login'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

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

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px", marginTop: 6,
    background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 12,
    color: B.white, fontSize: 15, fontFamily: fb, outline: "none",
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
          {isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p style={{ margin: "0 0 18px", textAlign: "center", fontSize: 13, color: B.dim, fontFamily: fb }}>
          {reason || (isSignup ? "Sign up to place wagers and track your record." : "Log in to your Parabolic account.")}
        </p>

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
      </div>
    </div>
  );
}
