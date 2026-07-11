/**
 * Account onboarding — split modal (Figma Parabolic 157:19134 welcome, 157:18780 username+pfp,
 * 157:19501 signature, 157:19843 done). The right panel is a LIVE preview: the member card being
 * built (username/avatar/signature update as the user types) hanging from the WORLD CUP lanyard
 * over the stadium.
 *
 * Flow (email):   welcome (email+password) → email code → phone 2FA → username+pfp → signature
 *                 (Create account: register claims the guest UUID, verified flags carry over) → done.
 * Flow (Google):  GIS ID token → account created server-side w/ Google-verified email → phone 2FA
 *                 → username+pfp → signature (saves username) → done.
 * Flow (Wallet):  personal_sign → account created → email entry + code → phone 2FA → username+pfp
 *                 → signature → done.
 * Verification runs BEFORE the card is made; the WC join gate reads the same verified flags.
 */
import { useEffect, useRef, useState } from "react";
import { B, fd, fb, fm } from "../../lib/theme.js";
import { API_URL, GOOGLE_CLIENT_ID } from "../../lib/constants.js";
import { register, authToken, currentUserId, onboardingStagingId, getAuth, setAuth as setAuthState } from "../../lib/auth.js";

// The id the onboarding steps act on: the real account once registered, else the staging id that
// carries email/phone verification into register(). (currentUserId() is null while logged out.)
const stagingId = () => getAuth()?.userId || onboardingStagingId();
import { AuthModal } from "../AuthModal.jsx";
import { track } from "../../lib/track.js";
import { draft, resetDraft, persistCard, resizeAvatar, serializeAvatar } from "../../lib/onboarding.js";
import { MemberCard } from "./MemberCard.jsx";
import { SignaturePad } from "./SignaturePad.jsx";
import { LanyardStrap } from "../CardShareModal.jsx";
import { LOGO_WORDMARK } from "../../lib/logos.js";
const stadiumBg = "/stadium.webp"; // stable public/ url — same file worldcup.html preloads (no double-download)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/* ── shared styles ── */
const whitePill = { background: "#fff", border: "none", borderRadius: 999, height: 42, width: "100%", color: "#0a0a0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: fb };
const darkPill = { background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 999, height: 42, width: "100%", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fb, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 };
const fieldInput = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "11px 15px", color: "#fff", fontSize: 16, fontFamily: fb, outline: "none", width: "100%", boxSizing: "border-box" }; // ≥16px: sub-16 inputs make iOS Safari zoom on focus
const circleBtn = { width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const badge = { alignSelf: "center", background: "rgba(255,82,71,0.15)", color: "#ff5247", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600 };

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 900, background: "#1c1c1c", border: "1px solid #333", color: "#eee", borderRadius: 12, padding: "12px 18px", fontSize: 13, maxWidth: 340, textAlign: "center", fontFamily: fb }}>{msg}</div>
  );
}

const GoogleIcon = () => <svg width="16" height="16" viewBox="0 0 488 512"><path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>;
const WalletIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/></svg>;

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(d.error || "Something went wrong"), { cooldownMs: d.cooldownMs });
  return d;
}

/* ── modal shell: form panel left, LIVE card preview right (hidden on mobile) ── */
function Shell({ children, corner, onClose, preview }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, fontFamily: fb, color: "#fff" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: isMobile ? "100%" : "min(986px, 94vw)", height: isMobile ? "100%" : "min(600px, 92vh)", borderRadius: isMobile ? 0 : 20, overflow: "hidden", display: "flex", background: "#101010", boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", padding: isMobile ? "18px 20px 24px" : "16px 48px 40px", overflowY: "auto" }}>
          <div style={{ height: 40, display: "flex", alignItems: "center", marginLeft: isMobile ? 0 : -36 }}>{corner}</div>
          {children}
        </div>
        {!isMobile && (
          <div style={{ width: 494, flexShrink: 0, position: "relative", overflow: "hidden" }}>
            <img src={stadiumBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 70%" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 100% at 50% 30%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.45) 100%)" }} />
            <img src={LOGO_WORDMARK} alt="Parabolic" style={{ position: "absolute", left: 22, top: 20, height: 15 }} />
            {/* live preview: the card being built */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <LanyardStrap strapH={140} width={36} />
              <div style={{ marginTop: -6, filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.55))" }}>
                <MemberCard width={356} username={preview?.username || "Username"} placeholder={!preview?.username}
                  avatar={preview?.avatar || null} signature={preview?.signature || null} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── code boxes + resend cooldown (ported from the pre-redesign flow) ── */
function useCooldown() {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const start = (ms) => {
    setCooldown(Math.ceil(ms / 1000));
    clearInterval(timer.current);
    timer.current = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(timer.current); return 0; } return c - 1; }), 1000);
  };
  return [cooldown, start];
}

async function verifyPost(path, body) {
  return post(path, { userId: stagingId(), token: authToken(), ...body });
}

function CodeBoxes({ code, onChange, onEnter }) {
  const ref = useRef(null);
  return (
    <div onClick={() => ref.current?.focus()} style={{ display: "flex", gap: 8, cursor: "text", justifyContent: "center", position: "relative" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ width: 44, height: 54, borderRadius: 12, background: "#161616", display: "flex", alignItems: "center", justifyContent: "center", border: i === code.length ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontFamily: fd, fontSize: 21, fontWeight: 700, color: code[i] ? "#fff" : "#555" }}>{code[i] ?? "•"}</span>
        </div>
      ))}
      <input ref={ref} value={code} autoFocus inputMode="numeric"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && code.length === 6 && onEnter?.()}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
    </div>
  );
}

/* ── Google GIS button (renders Google's own button; falls back when unconfigured) ── */
function useGoogleButton(ref, onCredential) {
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !ref.current) return;
    const init = () => {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => onCredential(r.credential) });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, { theme: "filled_black", shape: "pill", size: "large", text: "signup_with", width: 345, logo_alignment: "center" });
    };
    if (window.google?.accounts?.id) { init(); return; }
    let s = document.getElementById("gsi-client");
    if (!s) {
      s = document.createElement("script");
      s.id = "gsi-client"; s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", init);
    return () => s.removeEventListener("load", init);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── main flow ── */
export function OnboardingFlow({ onDone, onGuest, worldcup = false }) {
  const [step, setStep] = useState("welcome"); // welcome | everify | phone | profile | signature | done
  const [mode, setMode] = useState("email");   // email | google | wallet — provider paths are pre-registered
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [preview, setPreview] = useState({ username: "", avatar: null, signature: null });
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const say = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => { resetDraft(); draft.sport = "soccer"; }, []);
  useEffect(() => { track("page_view", { page: "onboarding", step }); }, [step]);
  useEffect(() => { setPreview((p) => ({ ...p, username })); }, [username]);

  const close = () => onGuest?.();

  // Provider auth landed: existing users go straight in; new users continue onboarding.
  const onProviderAuth = (data, provider) => {
    setAuthState({ userId: data.userId, username: data.username, token: data.token });
    if (!data.isNew && data.username) { onDone(); return; }
    setMode(provider);
    setStep(provider === "google" ? "phone" : "everify"); // Google email arrives verified
  };

  return (
    <>
      {step === "welcome" && (
        <WelcomeStep onClose={close} say={say} preview={preview}
          onLogin={() => setShowLogin(true)}
          onProviderAuth={onProviderAuth}
          onNext={() => setStep("everify")} />
      )}
      {step === "everify" && (
        <EmailCodeStep preview={preview} needsEmail={mode === "wallet"}
          onBack={() => setStep("welcome")}
          onNext={() => setStep("phone")} />
      )}
      {step === "phone" && (
        <PhoneStep preview={preview}
          onBack={() => setStep(mode === "google" ? "welcome" : "everify")}
          onNext={() => setStep("profile")} />
      )}
      {step === "profile" && (
        <ProfileStep username={username} setUsername={setUsername}
          onAvatar={(a) => setPreview((p) => ({ ...p, avatar: a }))}
          onBack={() => setStep("phone")}
          onNext={() => setStep("signature")} />
      )}
      {step === "signature" && (
        <SignatureStep username={username} mode={mode} preview={preview}
          onDraw={(sig) => setPreview((p) => ({ ...p, signature: sig }))}
          onBack={() => setStep("profile")}
          onNext={() => setStep("done")} />
      )}
      {step === "done" && (
        <DoneStep worldcup={worldcup} preview={preview}
          onFinish={() => { persistCard(); track("signup_onboarded", { sport: draft.sport, mode }); onDone(); }} />
      )}
      {showLogin && <AuthModal defaultMode="login" onClose={() => setShowLogin(false)} onAuth={(data) => { setAuthState(data); onDone(); }} />}
      <Toast msg={toast} />
    </>
  );
}

/* ── screen 1: welcome (157:19134) ── */
function WelcomeStep({ onClose, onLogin, onNext, onProviderAuth, say, preview }) {
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const gRef = useRef(null);
  const emailOk = EMAIL_RE.test(email.trim());
  const passOk = password.length >= 6;
  const ready = emailOk && passOk;
  const go = () => { if (!ready) return; draft.email = email.trim(); draft.password = password; onNext(); };

  useGoogleButton(gRef, async (credential) => {
    try {
      const d = await post("/auth/google", { credential, claimUserId: stagingId() });
      onProviderAuth(d, "google");
    } catch (e) { say(e.message); }
  });

  const wallet = async () => {
    if (busy) return;
    const eth = typeof window !== "undefined" ? window.ethereum : null;
    if (!eth) { say("No wallet extension found — install MetaMask, or sign up with Email."); return; }
    setBusy(true);
    try {
      const [address] = await eth.request({ method: "eth_requestAccounts" });
      const n = await post("/auth/wallet/nonce", { address });
      const signature = await eth.request({ method: "personal_sign", params: [n.message, address] });
      const d = await post("/auth/wallet", { address, signature, claimUserId: stagingId() });
      onProviderAuth(d, "wallet");
    } catch (e) { say(e?.message?.includes("reject") ? "Wallet signature declined" : (e?.message || "Wallet sign-in failed")); }
    finally { setBusy(false); }
  };

  return (
    <Shell onClose={onClose} preview={preview} corner={<button onClick={onClose} style={circleBtn}>✕</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 345, width: "100%", margin: "0 auto", gap: 0 }}>
        <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Welcome to Parabolic</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder="Enter your email address" type="email" autoComplete="email" inputMode="email" autoFocus style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && go()} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)} placeholder="Create a password (6+ characters)" type="password" autoComplete="new-password" style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && go()} />
          {touched && email.length > 0 && !emailOk && <span style={{ fontSize: 12, color: B.red }}>Enter a valid email address.</span>}
          {touched && password.length > 0 && !passOk && <span style={{ fontSize: 12, color: B.red }}>Password must be at least 6 characters.</span>}
          <button onClick={go} style={{ ...whitePill, ...(ready ? {} : { opacity: 0.45, cursor: "default" }) }}>Continue with Email</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0" }}>
          <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.18)" }} />
          <span style={{ fontSize: 12, color: "#8a8f98" }}>or</span>
          <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.18)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GOOGLE_CLIENT_ID
            ? <div ref={gRef} style={{ height: 42, display: "flex", justifyContent: "center" }} />
            : <button onClick={() => say("Google sign-up is being configured — use Email for now.")} style={darkPill}><GoogleIcon /> Sign up with Google</button>}
          <button onClick={wallet} disabled={busy} style={{ ...darkPill, opacity: busy ? 0.6 : 1 }}><WalletIcon /> {busy ? "Waiting for wallet…" : "Sign up with Wallet"}</button>
        </div>
        <button onClick={onLogin} style={{ background: "none", border: "none", color: "#8a8f98", fontSize: 13, cursor: "pointer", padding: "18px 0 0", fontFamily: fb }}>
          Already have an account? <span style={{ color: "#fff", fontWeight: 700 }}>Log in</span>
        </button>
      </div>
    </Shell>
  );
}

/* ── screen 2: verify email (code to draft.email; wallet path enters an email first) ── */
function EmailCodeStep({ onBack, onNext, preview, needsEmail }) {
  const [email, setEmail] = useState(draft.email);
  const [phase, setPhase] = useState(needsEmail && !draft.email ? "enter" : "code");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const startedRef = useRef(false);
  const emailOk = EMAIL_RE.test(email.trim());

  const send = async (target = draft.email) => {
    setError("");
    try {
      const d = await verifyPost("/verify/email/start", { email: target });
      setSent(true); setPhase("code");
      startCooldown(d.cooldownMs || 30_000);
    } catch (e) {
      setError(e.message);
      if (e.cooldownMs) { setSent(true); setPhase("code"); startCooldown(e.cooldownMs); }
    }
  };
  useEffect(() => {
    if (phase === "code" && !startedRef.current) { startedRef.current = true; send(); }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true); setError("");
    try { await verifyPost("/verify/email/confirm", { code }); onNext(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Shell onClose={null} preview={preview} corner={<button onClick={onBack} style={circleBtn}>‹</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 345, width: "100%", margin: "0 auto" }}>
        {phase === "enter" ? (
          <>
            <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center" }}>Add your email</div>
            <div style={{ fontSize: 13.5, color: "#8a8f98", textAlign: "center", margin: "9px 0 24px" }}>For account recovery and competition entry.</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" type="email" autoComplete="email" inputMode="email" autoFocus style={fieldInput}
              onKeyDown={(e) => e.key === "Enter" && emailOk && (draft.email = email.trim(), send(email.trim()))} />
            {error && <div style={{ ...badge, marginTop: 12 }}>{error}</div>}
            <button onClick={() => { if (!emailOk) return; draft.email = email.trim(); send(email.trim()); }}
              style={{ ...whitePill, marginTop: 14, ...(emailOk ? {} : { opacity: 0.45, cursor: "default" }) }}>Send code</button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center" }}>Check your email</div>
            <div style={{ fontSize: 13.5, color: "#8a8f98", textAlign: "center", margin: "9px 0 26px" }}>We sent a 6-digit code to<br /><span style={{ color: "#c8ccd2" }}>{draft.email}</span></div>
            <CodeBoxes code={code} onChange={(c) => { setError(""); setCode(c); }} onEnter={confirm} />
            {error && <div style={{ ...badge, marginTop: 14 }}>{error}</div>}
            <button onClick={() => cooldown === 0 && send()} disabled={cooldown > 0}
              style={{ background: "none", border: "none", color: cooldown > 0 ? "#555" : "#fff", fontWeight: 600, fontSize: 13, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: fb, padding: "16px 0 0" }}>
              {sent ? (cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code") : "Send code"}
            </button>
            <button onClick={confirm} disabled={code.length !== 6 || busy}
              style={{ ...whitePill, marginTop: 18, ...(code.length === 6 && !busy ? {} : { opacity: 0.45, cursor: "default" }) }}>
              {busy ? "Checking…" : "Verify email"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ── screen 3: phone 2FA (anti-Sybil — one entry per person) ── */
function PhoneStep({ onBack, onNext, preview }) {
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState("enter"); // enter | code
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const phoneOk = phone.replace(/\D/g, "").length >= 10;

  const send = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const d = await verifyPost("/verify/phone/start", { phone });
      setPhase("code");
      startCooldown(d.cooldownMs || 30_000);
    } catch (e) {
      setError(e.message);
      if (e.cooldownMs) { setPhase("code"); startCooldown(e.cooldownMs); }
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true); setError("");
    try { await verifyPost("/verify/phone/confirm", { phone, code }); onNext(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Shell onClose={null} preview={preview} corner={<button onClick={phase === "enter" ? onBack : () => { setPhase("enter"); setCode(""); setError(""); }} style={circleBtn}>‹</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 345, width: "100%", margin: "0 auto" }}>
        {phase === "enter" ? (
          <>
            <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center" }}>Verify your phone</div>
            <div style={{ fontSize: 13.5, color: "#8a8f98", textAlign: "center", margin: "9px 0 24px", lineHeight: 1.5 }}>One entry per person — we text a code to keep the competition fair. Mobile numbers only.</div>
            <input value={phone} onChange={(e) => { setError(""); setPhone(e.target.value); }} placeholder="+1 (555) 000-0000" type="tel" autoComplete="tel" autoFocus style={fieldInput}
              onKeyDown={(e) => e.key === "Enter" && phoneOk && send()} />
            {error && <div style={{ ...badge, marginTop: 12 }}>{error}</div>}
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, marginTop: 12, textAlign: "center" }}>VoIP and landline numbers can't be verified. Standard SMS rates may apply.</div>
            <button onClick={send} disabled={!phoneOk || busy} style={{ ...whitePill, marginTop: 16, ...(phoneOk && !busy ? {} : { opacity: 0.45, cursor: "default" }) }}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center" }}>Enter the SMS code</div>
            <div style={{ fontSize: 13.5, color: "#8a8f98", textAlign: "center", margin: "9px 0 26px" }}>We texted a 6-digit code to<br /><span style={{ color: "#c8ccd2" }}>{phone}</span></div>
            <CodeBoxes code={code} onChange={(c) => { setError(""); setCode(c); }} onEnter={confirm} />
            {error && <div style={{ ...badge, marginTop: 14 }}>{error}</div>}
            <button onClick={() => cooldown === 0 && send()} disabled={cooldown > 0}
              style={{ background: "none", border: "none", color: cooldown > 0 ? "#555" : "#fff", fontWeight: 600, fontSize: 13, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: fb, padding: "16px 0 0" }}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button onClick={confirm} disabled={code.length !== 6 || busy}
              style={{ ...whitePill, marginTop: 18, ...(code.length === 6 && !busy ? {} : { opacity: 0.45, cursor: "default" }) }}>
              {busy ? "Checking…" : "Verify phone"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ── screen 4: username + profile picture (157:18780) ── */
function ProfileStep({ username, setUsername, onAvatar, onBack, onNext }) {
  const [avatar, setAvatar] = useState(draft.avatar);
  const [avail, setAvail] = useState(null); // null unknown | true | false
  const fileRef = useRef(null);
  const valid = NAME_RE.test(username);

  // live availability — debounce against GET /auth/available (unknown on network failure)
  useEffect(() => {
    setAvail(null);
    if (!valid) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_URL}/auth/available?username=${encodeURIComponent(username)}`);
        if (r.ok) { const d = await r.json(); setAvail(!!d.available); }
      } catch { /* offline — resolve at Create account */ }
    }, 400);
    return () => clearTimeout(t);
  }, [username, valid]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    // downscale to a small square so the avatar can sync to the account (leaderboards/feed)
    reader.onload = () => resizeAvatar(reader.result).then((uri) => { const a = { kind: "photo", uri }; setAvatar(a); onAvatar(a); });
    reader.readAsDataURL(f);
  };

  const ready = valid && avail !== false;
  const go = () => { if (!ready) return; draft.avatar = avatar; onNext(); };

  return (
    <Shell onClose={null} preview={{ username, avatar }} corner={<button onClick={onBack} style={circleBtn}>‹</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 392, width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginTop: 26, marginBottom: 34 }}>
          <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700 }}>Choose username and profile picture</div>
          <div style={{ fontSize: 13.5, color: "#8a8f98", lineHeight: 1.5, marginTop: 9 }}>
            Choose username and profile picture, this goes on your<br />member card. You can change it any time
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
          <div onClick={() => fileRef.current?.click()} style={{ width: 84, height: 84, borderRadius: "50%", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}>
            {avatar?.kind === "photo"
              ? <img src={avatar.uri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9aa0a8" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-9 9"/></svg>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Profile picture <span style={{ color: "#8a8f98", fontWeight: 400 }}>(optional)</span></div>
            <button onClick={() => fileRef.current?.click()} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 999, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fb, alignSelf: "flex-start" }}>Upload image</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Username</span>
          <input value={username} autoFocus autoComplete="username" onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))} placeholder="Enter username" style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && go()} />
          {valid && avail === true && (
            <span style={{ alignSelf: "flex-start", background: "rgba(94,216,126,0.14)", color: "#5ed87e", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600 }}>{username} is available</span>
          )}
          {valid && avail === false && (
            <span style={{ alignSelf: "flex-start", background: "rgba(255,82,71,0.14)", color: B.red, borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600 }}>{username} is already taken</span>
          )}
          {username.length > 0 && !valid && (
            <span style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", color: "#8a8f98", borderRadius: 8, padding: "5px 10px", fontSize: 12.5 }}>3–20 characters — letters, numbers, underscores</span>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={go} style={{ ...whitePill, ...(ready ? {} : { opacity: 0.45, cursor: "default" }) }}>Continue</button>
      </div>
    </Shell>
  );
}

/* ── screen 5: signature → Create account (157:19501) ── */
function SignatureStep({ username, mode, onDraw, onBack, onNext, preview }) {
  const [d, setD] = useState(draft.signature?.d ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const padRef = useRef(null);
  const padW = 380, padH = 240;

  const create = async () => {
    if (busy) return;
    setBusy(true); setError("");
    draft.signature = d ? { d, w: padW, h: padH } : null;
    try {
      const extras = {};
      const av = serializeAvatar(draft.avatar);
      if (av) extras.avatar = av;

      if (mode === "email") {
        await register(username, draft.password); // claims the guest UUID → verified flags + balance carry over
        if (draft.email) extras.email = draft.email;
      } else {
        // Provider account already exists — set the chosen username on it.
        extras.username = username;
      }
      if (Object.keys(extras).length) {
        const res = await fetch(`${API_URL}/profile/${stagingId()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...extras, token: authToken() }) });
        if (mode !== "email" && !res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Couldn't save the username");
        }
        if (mode !== "email") {
          const a = getAuth();
          if (a) setAuthState({ ...a, username });
        }
      }
      onNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(/taken|exists/i.test(msg) ? `${username} is already taken — go back to change it` : msg);
    } finally { setBusy(false); }
  };

  return (
    <Shell onClose={null} preview={{ ...preview, signature: d ? { d, w: padW, h: padH } : null }} corner={<button onClick={onBack} style={circleBtn}>‹</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 396, width: "100%", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginTop: 14, marginBottom: 24 }}>
          <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700 }}>Sign your member card</div>
          <div style={{ fontSize: 13.5, color: "#8a8f98", marginTop: 9 }}>Your signature is printed on the card. Draw it below.</div>
        </div>

        <div style={{ flex: 1, border: "1px dashed rgba(255,255,255,0.22)", borderRadius: 16, position: "relative", minHeight: padH, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!d && (
            <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none", color: "#8a8f98", fontWeight: 600, fontSize: 14, zIndex: 1 }}>
              ✍️ <span style={{ color: "#c8ccd2" }}>Sign your card</span> here
            </div>
          )}
          <SignaturePad ref={padRef} width={padW} height={padH} onChange={(v) => { setD(v); onDraw(v ? { d: v, w: padW, h: padH } : null); }} />
          {d && (
            <button onClick={() => { padRef.current?.clear(); setD(null); onDraw(null); }} style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 999, padding: "7px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fb }}>✕ Clear</button>
          )}
        </div>

        {error && <div style={{ color: B.red, fontSize: 13, textAlign: "center", marginTop: 12 }}>{error}</div>}
        <button onClick={create} disabled={busy} style={{ ...whitePill, marginTop: 20, ...(busy ? { opacity: 0.6, cursor: "default" } : {}) }}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </div>
    </Shell>
  );
}

/* ── screen 6: card issued (157:19843) ── */
function DoneStep({ worldcup, onFinish, preview }) {
  const username = getAuth()?.username ?? "trader";
  return (
    <Shell onClose={null} preview={{ ...preview, username }} corner={null}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", maxWidth: 396, width: "100%", margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: 22 }}>
          <MemberCard width={190} username={username} avatar={draft.avatar} signature={draft.signature} />
        </div>
        <span style={{ background: "rgba(94,216,126,0.14)", color: "#5ed87e", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 700 }}>Card issued</span>
        <div style={{ fontFamily: fd, fontSize: 21, fontWeight: 700, marginTop: 16 }}>Welcome, {username}</div>
        <div style={{ fontSize: 13.5, color: "#8a8f98", lineHeight: 1.55, marginTop: 10 }}>
          {worldcup
            ? <>Your member card is live.<br />Time to trade the knockouts.</>
            : <>Your member card is live.<br />Time to make your first trade.</>}
        </div>
        <div style={{ flex: 0.5 }} />
        <button onClick={onFinish} style={{ ...whitePill, marginTop: 34 }}>Start trading</button>
      </div>
    </Shell>
  );
}
