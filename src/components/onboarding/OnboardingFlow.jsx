/**
 * Account onboarding — 4-screen split modal (Figma Parabolic 157:19134 welcome,
 * 157:18780 username+pfp, 157:19501 signature, 157:19843 done). Replaces the old
 * 9-step full-page flow (email code / phone 2FA / referral / sport steps removed —
 * identity verification now happens at WC join time via VerifyModal).
 *   welcome (email+password, Apple/Google/Wallet coming-soons, Log in)
 *   → profile (username w/ live availability + optional picture)
 *   → signature (draw on the card) → Create account (register claims the guest UUID)
 *   → done (card issued, Start trading).
 * Card data stays device-local (persistCard). Deviation from the frames: a password
 * field on screen 1 — accounts are username/password and the design has no other
 * place to set one.
 */
import { useEffect, useRef, useState } from "react";
import { B, fd, fb, fm } from "../../lib/theme.js";
import { API_URL } from "../../lib/constants.js";
import { register, authToken, currentUserId, getAuth, setAuth as setAuthState } from "../../lib/auth.js";
import { AuthModal } from "../AuthModal.jsx";
import { track } from "../../lib/track.js";
import { draft, resetDraft, persistCard } from "../../lib/onboarding.js";
import { MemberCard } from "./MemberCard.jsx";
import { SignaturePad } from "./SignaturePad.jsx";
import heroImg from "../../assets/onboard-hero.jpg";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/* ── shared styles ── */
const whitePill = { background: "#fff", border: "none", borderRadius: 999, height: 42, width: "100%", color: "#0a0a0a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: fb };
const darkPill = { background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 999, height: 42, width: "100%", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fb, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 };
const fieldInput = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "11px 15px", color: "#fff", fontSize: 14, fontFamily: fb, outline: "none", width: "100%", boxSizing: "border-box" };
const circleBtn = { width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 900, background: "#1c1c1c", border: "1px solid #333", color: "#eee", borderRadius: 12, padding: "12px 18px", fontSize: 13, maxWidth: 340, textAlign: "center", fontFamily: fb }}>{msg}</div>
  );
}

const AppleIcon = () => <svg width="16" height="16" viewBox="0 0 384 512" fill="#fff"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>;
const GoogleIcon = () => <svg width="16" height="16" viewBox="0 0 488 512"><path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>;
const WalletIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/></svg>;

/* ── modal shell: form panel left, lanyard-card hero right (hidden on mobile) ── */
function Shell({ children, corner, onClose }) {
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
          <div style={{ width: 494, flexShrink: 0 }}>
            <img src={heroImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── main flow ── */
export function OnboardingFlow({ onDone, onGuest, worldcup = false }) {
  const [step, setStep] = useState("welcome"); // welcome | profile | signature | done
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const say = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  // draft fields reused from the old flow; sport defaults to soccer (lanyard color — no sport step)
  const [username, setUsername] = useState("");
  useEffect(() => { resetDraft(); draft.sport = "soccer"; }, []);
  useEffect(() => { track("page_view", { page: "onboarding", step }); }, [step]);

  const close = () => onGuest?.();

  return (
    <>
      {step === "welcome" && (
        <WelcomeStep onClose={close} say={say}
          onLogin={() => setShowLogin(true)}
          onNext={() => setStep("profile")} />
      )}
      {step === "profile" && (
        <ProfileStep username={username} setUsername={setUsername}
          onBack={() => setStep("welcome")}
          onNext={() => setStep("signature")} />
      )}
      {step === "signature" && (
        <SignatureStep username={username}
          onBack={() => setStep("profile")}
          onNext={() => setStep("done")} />
      )}
      {step === "done" && (
        <DoneStep worldcup={worldcup}
          onFinish={() => { persistCard(); track("signup_onboarded", { sport: draft.sport }); onDone(); }} />
      )}
      {showLogin && <AuthModal defaultMode="login" onClose={() => setShowLogin(false)} onAuth={(data) => { setAuthState(data); onDone(); }} />}
      <Toast msg={toast} />
    </>
  );
}

/* ── screen 1: welcome (157:19134) ── */
function WelcomeStep({ onClose, onLogin, onNext, say }) {
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [touched, setTouched] = useState(false);
  const emailOk = EMAIL_RE.test(email.trim());
  const passOk = password.length >= 6;
  const ready = emailOk && passOk;
  const go = () => { if (!ready) return; draft.email = email.trim(); draft.password = password; onNext(); };
  const soon = (what) => say(`${what} sign-up is coming soon — use Email for now.`);

  return (
    <Shell onClose={onClose} corner={<button onClick={onClose} style={circleBtn}>✕</button>}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 345, width: "100%", margin: "0 auto", gap: 0 }}>
        <div style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Welcome to Parabolic</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" type="email" autoFocus style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && go()} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)} placeholder="Create a password (6+ characters)" type="password" style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && go()} />
          {touched && password.length > 0 && !passOk && <span style={{ fontSize: 12, color: B.red }}>Password must be at least 6 characters.</span>}
          <button onClick={go} style={{ ...whitePill, ...(ready ? {} : { opacity: 0.45, cursor: "default" }) }}>Continue with Email</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0" }}>
          <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.18)" }} />
          <span style={{ fontSize: 12, color: "#8a8f98" }}>or</span>
          <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.18)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => soon("Apple")} style={darkPill}><AppleIcon /> Sign up with Apple</button>
          <button onClick={() => soon("Google")} style={darkPill}><GoogleIcon /> Sign up with Google</button>
          <button onClick={() => soon("Wallet")} style={darkPill}><WalletIcon /> Sign up with Wallet</button>
        </div>
        <button onClick={onLogin} style={{ background: "none", border: "none", color: "#8a8f98", fontSize: 13, cursor: "pointer", padding: "18px 0 0", fontFamily: fb }}>
          Already have an account? <span style={{ color: "#fff", fontWeight: 700 }}>Log in</span>
        </button>
      </div>
    </Shell>
  );
}

/* ── screen 2: username + profile picture (157:18780) ── */
function ProfileStep({ username, setUsername, onBack, onNext }) {
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
      } catch { /* offline / old backend — resolve at Create account */ }
    }, 400);
    return () => clearTimeout(t);
  }, [username, valid]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar({ kind: "photo", uri: reader.result });
    reader.readAsDataURL(f);
  };

  const ready = valid && avail !== false;
  const go = () => { if (!ready) return; draft.avatar = avatar; onNext(); };

  return (
    <Shell onClose={null} corner={<button onClick={onBack} style={circleBtn}>‹</button>}>
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
          <input value={username} autoFocus onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))} placeholder="Enter username" style={fieldInput}
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

/* ── screen 3: signature → Create account (157:19501) ── */
function SignatureStep({ username, onBack, onNext }) {
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
      await register(username, draft.password); // claims the guest UUID → paper balance carries over
      if (draft.email) {
        // Attach the email for 2FA/recovery; never block onboarding if it fails.
        try {
          await fetch(`${API_URL}/profile/${currentUserId()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: draft.email, token: authToken() }) });
        } catch { /* ignore */ }
      }
      onNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(/taken|exists/i.test(msg) ? `${username} is already taken — go back to change it` : msg);
    } finally { setBusy(false); }
  };

  return (
    <Shell onClose={null} corner={<button onClick={onBack} style={circleBtn}>‹</button>}>
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
          <SignaturePad ref={padRef} width={padW} height={padH} onChange={setD} />
          {d && (
            <button onClick={() => { padRef.current?.clear(); setD(null); }} style={{ position: "absolute", right: 10, bottom: 10, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 999, padding: "7px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fb }}>✕ Clear</button>
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

/* ── screen 4: card issued (157:19843) ── */
function DoneStep({ worldcup, onFinish }) {
  const username = getAuth()?.username ?? "trader";
  return (
    <Shell onClose={null} corner={null}>
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
