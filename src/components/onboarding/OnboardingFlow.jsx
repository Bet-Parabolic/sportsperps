/**
 * Account onboarding flow — web port of the mobile app's welcome + onboarding screens
 * (Figma 82:18508 → 82:19663). Behavior parity with mobile:
 *   welcome (WIN hero, Explore as guest, Create account, Log in)
 *   → account sheet (Apple/Google/Wallet = coming soon; Email = real path)
 *   → email+password (held in memory) → referral (skippable) → sport (lanyard color)
 *   → username (creates the REAL account: register claims the guest UUID, then attaches email)
 *   → profile image (upload or emoji templates, skippable) → signature (canvas, skippable)
 *   → congrats (card on lanyard) → persist card locally → terminal.
 * Card data is device-local; referral codes are deterministic from the userId (no server bonus).
 */
import { useEffect, useRef, useState } from "react";
import { B, fd, fb, fm } from "../../lib/theme.js";
import { API_URL } from "../../lib/constants.js";
import { register, authToken, currentUserId, getAuth, setAuth as setAuthState } from "../../lib/auth.js";
import { AuthModal } from "../AuthModal.jsx";
import { track } from "../../lib/track.js";
import { SPORTS, AVATAR_TEMPLATES, draft, resetDraft, persistCard, referralCodeFor } from "../../lib/onboarding.js";
import { MemberCard, AvatarCircle } from "./MemberCard.jsx";
import { Lanyard } from "./Lanyard.jsx";
import { SignaturePad } from "./SignaturePad.jsx";
import { LOGO_WORDMARK } from "../../lib/logos.js";
import winNeon from "../../assets/winNeon.png";
import heroPlayer from "../../assets/heroPlayer.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const COL_W = 400; // centered column width on desktop

/* ── shared chrome ────────────────────────────────────────────────────────── */

function Frame({ title, subtitle, children, cta = "Continue", ctaEnabled = true, onCta, onSkip, onBack }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", maxWidth: COL_W, margin: "0 auto", padding: "0 16px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        {onBack ? (
          <button onClick={onBack} style={circleBtn}>←</button>
        ) : <div style={{ width: 40 }} />}
        {onSkip ? (
          <button onClick={onSkip} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: fb }}>Skip</button>
        ) : <div style={{ width: 40 }} />}
      </div>
      {(title || subtitle) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, paddingBottom: 18, textAlign: "center" }}>
          {title && <div style={{ fontFamily: fd, fontSize: 24, lineHeight: "30px", fontWeight: 700, color: "#fff" }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 14, color: "#8a8f98", lineHeight: 1.5, whiteSpace: "pre-line", padding: "0 24px" }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ padding: "8px 0 24px" }}>
        <button onClick={() => ctaEnabled && onCta()} style={{ ...ctaBtn, ...(ctaEnabled ? {} : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", cursor: "default" }) }}>{cta}</button>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "#1c1c1c", border: "1px solid #333", color: "#eee", borderRadius: 12, padding: "12px 18px", fontSize: 13, maxWidth: 340, textAlign: "center", fontFamily: fb, animation: "fadeIn .2s ease-out" }}>{msg}</div>
  );
}

function SheetRow({ icon, label, onClick, trailing }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 14, padding: "0 16px", height: 52, cursor: "pointer", width: "100%", fontFamily: fb }}>
      <span style={{ width: 24, textAlign: "center", fontSize: 17 }}>{icon}</span>
      <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, flex: 1, textAlign: "left" }}>{label}</span>
      {trailing}
    </button>
  );
}

const WALLETS = [
  { name: "MetaMask", emoji: "🦊" },
  { name: "Coinbase", emoji: "🔵" },
  { name: "Phantom", emoji: "👻" },
  { name: "WalletConnect", emoji: "🔗" },
];

/* ── main flow ────────────────────────────────────────────────────────────── */

export function OnboardingFlow({ onDone, onGuest, worldcup = false }) {
  const [step, setStep] = useState("welcome"); // welcome|email|referral|sport|username|image|signature|done
  const [sheet, setSheet] = useState("none");  // none|account|wallet
  const [showLogin, setShowLogin] = useState(false);
  const onLogin = () => { setSheet("none"); setShowLogin(true); };
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const say = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => { resetDraft(); }, []);
  useEffect(() => { track("page_view", { page: "onboarding", step }); }, [step]);

  const wrap = { position: "fixed", inset: 0, zIndex: 800, background: "#050505", overflowY: "auto", fontFamily: fb, color: "#fff" };

  /* ── welcome ── */
  if (step === "welcome") {
    return (
      <div style={wrap}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", maxWidth: 480, margin: "0 auto", padding: 16, gap: 16 }}>
          {/* hero card */}
          <div style={{ flex: 1, position: "relative", background: "#101208", borderRadius: 28, overflow: "hidden", padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 480 }}>
            {/* tiled WIN backdrop */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              {Array.from({ length: 8 }, (_, r) => Array.from({ length: 4 }, (_, c) => (
                <span key={`${r}-${c}`} style={{ position: "absolute", left: c * 180 - (r % 2 ? 90 : 0), top: r * 100, fontFamily: fd, fontSize: 68, fontWeight: 800, letterSpacing: 2, color: "rgba(255,255,255,0.05)" }}>WIN</span>
              )))}
            </div>
            <img src={winNeon} alt="" style={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 460, objectFit: "contain", pointerEvents: "none" }} />
            <img src={heroPlayer} alt="" style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", width: "94%", maxWidth: 440, objectFit: "contain", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
              <img src={LOGO_WORDMARK} alt="Parabolic" style={{ height: 19, width: "auto" }} />
              <button onClick={onGuest} style={{ background: "rgba(255,255,255,0.14)", border: "none", borderRadius: 999, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: fb }}>Explore as guest</button>
            </div>
            <div style={{ textAlign: "center", paddingBottom: 24, position: "relative" }}>
              <div style={{ fontSize: 28, lineHeight: "38px", fontWeight: 700 }}>
                Trade <span style={{ background: B.red, borderRadius: 999, padding: "2px 10px", fontSize: 16, fontWeight: 800, verticalAlign: "middle" }}>• LIVE</span> on every<br />game as it happens
              </div>
            </div>
          </div>
          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => worldcup ? setStep("email") : setSheet("account")} style={ctaBtn}>Create account</button>
            <button onClick={onLogin} style={{ ...ctaBtn, background: "rgba(255,255,255,0.08)", color: "#fff" }}>Log in</button>
          </div>
        </div>

        {/* account / wallet sheets */}
        {sheet !== "none" && (
          <>
            <div onClick={() => setSheet("none")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 55 }} />
            <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 56, background: "#131313", borderRadius: "24px 24px 0 0", padding: "10px 20px 36px", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10, animation: "slideUp .25s ease-out" }}>
              <div style={{ alignSelf: "center", width: 44, height: 4, borderRadius: 2, background: "#333", marginBottom: 6 }} />
              {sheet === "account" ? (
                <>
                  <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Create your account</div>
                  <SheetRow icon="" label="Sign up with Apple" onClick={() => say("Apple sign-up is coming soon — use Email for now; your paper balance and card carry over.")} />
                  <SheetRow icon="🇬" label="Sign up with Google" onClick={() => say("Google sign-up is coming soon — use Email for now; your paper balance and card carry over.")} />
                  <SheetRow icon="✉️" label="Sign up with Email" onClick={() => { setSheet("none"); setStep("email"); }} />
                  <SheetRow icon="👛" label="Sign up with Wallet" onClick={() => setSheet("wallet")} trailing={
                    <span style={{ display: "flex" }}>
                      {WALLETS.slice(0, 3).map((w, i) => (
                        <span key={w.name} style={{ width: 20, height: 20, borderRadius: 10, background: "#2a2a2a", border: "1px solid #131313", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: i ? -8 : 0 }}>{w.emoji}</span>
                      ))}
                    </span>
                  } />
                  <button onClick={onLogin} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", padding: "10px 0", fontFamily: fb }}>
                    Already have an account? <span style={{ color: "#fff", fontWeight: 700, textDecoration: "underline" }}>Log in</span>
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <button onClick={() => setSheet("account")} style={circleBtn}>←</button>
                    <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center", flex: 1 }}>Connect a wallet</div>
                    <div style={{ width: 36 }} />
                  </div>
                  {WALLETS.map((w) => (
                    <SheetRow key={w.name} icon={w.emoji} label={w.name} onClick={() => say("Wallet linking is coming soon — wallet sign-in arrives with on-chain deposits. Use Email for now.")} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
        {showLogin && <AuthModal defaultMode="login" onClose={() => setShowLogin(false)} onAuth={(data) => { setAuthState(data); onDone(); }} />}
        <Toast msg={toast} />
      </div>
    );
  }

  /* ── steps ── */
  return (
    <div style={wrap}>
      {step === "email" && <EmailStep onBack={() => setStep("welcome")} onNext={() => setStep(worldcup ? "everify" : "referral")} />}
      {step === "everify" && <EmailCodeStep onBack={() => setStep("email")} onNext={() => setStep("phone")} />}
      {step === "phone" && <PhoneStep onBack={() => setStep("everify")} onNext={() => setStep("sport")} />}
      {step === "referral" && <ReferralStep onBack={() => setStep("email")} onNext={() => setStep("sport")} say={say} />}
      {step === "sport" && <SportStep onBack={() => setStep(worldcup ? "phone" : "referral")} onNext={() => setStep("username")} />}
      {step === "username" && <UsernameStep onBack={() => setStep("sport")} onNext={() => setStep("image")} />}
      {step === "image" && <ImageStep onBack={() => setStep("username")} onNext={() => setStep("signature")} />}
      {step === "signature" && <SignatureStep onBack={() => setStep("image")} onNext={() => setStep("done")} />}
      {step === "done" && <DoneStep onFinish={() => { persistCard(); track("signup_onboarded", { sport: draft.sport }); onDone(); }} />}
      <Toast msg={toast} />
    </div>
  );
}

/* ── individual steps ─────────────────────────────────────────────────────── */

function EmailStep({ onBack, onNext }) {
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [touched, setTouched] = useState(false);
  const emailOk = EMAIL_RE.test(email.trim());
  const passOk = password.length >= 6;
  return (
    <Frame title="Sign up with Email" subtitle="You'll pick a username for the leaderboard in a moment." ctaEnabled={emailOk && passOk} onCta={() => { draft.email = email.trim(); draft.password = password; onNext(); }} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={capsLabel}>EMAIL</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" autoFocus style={fieldInput} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={capsLabel}>PASSWORD</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)} placeholder="At least 6 characters" type="password" style={fieldInput} />
          {touched && password.length > 0 && !passOk && <span style={{ fontSize: 12, color: B.red }}>Password must be at least 6 characters.</span>}
        </label>
      </div>
    </Frame>
  );
}

/* ── WC identity steps (worldcup onboarding) — real email + phone verification, bound to the
      guest UUID; the username step's register CLAIMS that UUID so the flags carry over. ── */

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
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId(), token: authToken(), ...body }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(d.error || "Something went wrong"), { cooldownMs: d.cooldownMs });
  return d;
}

function CodeBoxes({ code, onChange, onEnter }) {
  const ref = useRef(null);
  return (
    <div onClick={() => ref.current?.focus()} style={{ display: "flex", gap: 8, cursor: "text", justifyContent: "center" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{ width: 46, height: 56, borderRadius: 14, background: "#161616", display: "flex", alignItems: "center", justifyContent: "center", border: i === code.length ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent" }}>
          <span style={{ fontFamily: fd, fontSize: 22, fontWeight: 700, color: code[i] ? "#fff" : "#555" }}>{code[i] ?? "•"}</span>
        </div>
      ))}
      <input ref={ref} value={code} autoFocus inputMode="numeric"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && code.length === 6 && onEnter?.()}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
    </div>
  );
}

function EmailCodeStep({ onBack, onNext }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, startCooldown] = useCooldown();
  const startedRef = useRef(false);

  const send = async () => {
    setError("");
    try {
      const d = await verifyPost("/verify/email/start", { email: draft.email });
      setSent(true);
      startCooldown(d.cooldownMs || 30_000);
    } catch (e) {
      setError(e.message);
      if (e.cooldownMs) { setSent(true); startCooldown(e.cooldownMs); }
    }
  };
  useEffect(() => { if (!startedRef.current) { startedRef.current = true; send(); } }, []); // eslint-disable-line

  const confirm = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true); setError("");
    try { await verifyPost("/verify/email/confirm", { code }); onNext(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Frame title="Check your email" subtitle={`We sent a 6-digit code to\n${draft.email}`} cta={busy ? "Checking…" : "Verify email"} ctaEnabled={code.length === 6 && !busy} onCta={confirm} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CodeBoxes code={code} onChange={(c) => { setError(""); setCode(c); }} onEnter={confirm} />
        {error && <div style={{ ...badge, background: "rgba(255,82,71,0.15)", color: B.red, alignSelf: "center" }}>{error}</div>}
        <button onClick={() => cooldown === 0 && send()} disabled={cooldown > 0}
          style={{ background: "none", border: "none", color: cooldown > 0 ? "#555" : "#fff", fontWeight: 600, fontSize: 13, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: fb, padding: "6px 0" }}>
          {sent ? (cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code") : "Send code"}
        </button>
      </div>
    </Frame>
  );
}

function PhoneStep({ onBack, onNext }) {
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

  return phase === "enter" ? (
    <Frame title="Verify your phone" subtitle={"One entry per person — we text a code to keep\nthe competition fair. Mobile numbers only."} cta={busy ? "Sending…" : "Send code"} ctaEnabled={phoneOk && !busy} onCta={send} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={capsLabel}>MOBILE NUMBER</span>
          <input value={phone} onChange={(e) => { setError(""); setPhone(e.target.value); }} placeholder="+1 (555) 000-0000" type="tel" autoFocus style={fieldInput}
            onKeyDown={(e) => e.key === "Enter" && phoneOk && send()} />
        </label>
        {error && <div style={{ ...badge, background: "rgba(255,82,71,0.15)", color: B.red }}>{error}</div>}
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>VoIP and landline numbers can't be verified. Standard SMS rates may apply.</div>
      </div>
    </Frame>
  ) : (
    <Frame title="Enter the SMS code" subtitle={`We texted a 6-digit code to\n${phone}`} cta={busy ? "Checking…" : "Verify phone"} ctaEnabled={code.length === 6 && !busy} onCta={confirm} onBack={() => { setPhase("enter"); setCode(""); setError(""); }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CodeBoxes code={code} onChange={(c) => { setError(""); setCode(c); }} onEnter={confirm} />
        {error && <div style={{ ...badge, background: "rgba(255,82,71,0.15)", color: B.red, alignSelf: "center" }}>{error}</div>}
        <button onClick={() => cooldown === 0 && send()} disabled={cooldown > 0}
          style={{ background: "none", border: "none", color: cooldown > 0 ? "#555" : "#fff", fontWeight: 600, fontSize: 13, cursor: cooldown > 0 ? "default" : "pointer", fontFamily: fb, padding: "6px 0" }}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </Frame>
  );
}


function ReferralStep({ onBack, onNext, say }) {
  const LEN = 6;
  const [code, setCode] = useState(draft.referral);
  const inputRef = useRef(null);
  return (
    <Frame title="Got a referral code?" subtitle={"Enter a friend's code or scan their QR.\nYou'll both get a bonus"} ctaEnabled={code.length === LEN} onCta={() => { draft.referral = code; onNext(); }} onSkip={() => { draft.referral = ""; onNext(); }} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Enter referral code</div>
        <div onClick={() => inputRef.current?.focus()} style={{ display: "flex", gap: 8, cursor: "text" }}>
          {Array.from({ length: LEN }, (_, i) => (
            <div key={i} style={{ flex: 1, aspectRatio: "0.86", borderRadius: 999, background: "#161616", display: "flex", alignItems: "center", justifyContent: "center", border: i === code.length ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent" }}>
              <span style={{ fontFamily: fd, fontSize: 20, fontWeight: 700, color: code[i] ? "#fff" : "#555" }}>{code[i] ?? "✱"}</span>
            </div>
          ))}
        </div>
        <input ref={inputRef} value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, LEN).toUpperCase())} maxLength={LEN} autoFocus
          style={{ position: "absolute", opacity: 0, height: 1, width: 1, pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <div style={hairline} /><span style={{ fontSize: 12, color: "#666" }}>or</span><div style={hairline} />
        </div>
        <button onClick={() => say("QR scanning is coming soon — enter your friend's code manually for now.")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#161616", border: "none", borderRadius: 999, padding: "15px 0", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: fb }}>
          ⌗ Scan a friend's QR
        </button>
      </div>
    </Frame>
  );
}

function SportStep({ onBack, onNext }) {
  const [sport, setSport] = useState(draft.sport);
  return (
    <Frame title="" ctaEnabled={sport != null} onCta={() => { draft.sport = sport; onNext(); }} onBack={onBack}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 4 }}>
          <Lanyard sport={sport} width={54} height={230} />
        </div>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
          <div style={{ fontFamily: fd, fontSize: 24, fontWeight: 700 }}>Pick your favorite sport</div>
          <div style={{ fontSize: 14, color: "#8a8f98" }}>We'll print it on your member card lanyard</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingBottom: 8 }}>
          {SPORTS.map((s) => {
            const on = sport === s.key;
            return (
              <button key={s.key} onClick={() => setSport(s.key)} style={{ display: "flex", alignItems: "center", gap: 7, borderRadius: 999, border: on ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.14)", background: on ? "rgba(255,255,255,0.14)" : "transparent", padding: "11px 16px", cursor: "pointer", fontFamily: fb }}>
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: on ? 700 : 500 }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

function UsernameStep({ onBack, onNext }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const valid = NAME_RE.test(name);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(null);
    try {
      await register(name, draft.password); // claims the guest UUID → paper balance carries over
      if (draft.email) {
        // Attach the email for 2FA/recovery; never block onboarding if it fails.
        try {
          await fetch(`${API_URL}/profile/${currentUserId()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: draft.email, token: authToken() }) });
        } catch { /* ignore */ }
      }
      onNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(/taken|exists/i.test(msg) ? `${name} is already taken` : msg);
    } finally { setBusy(false); }
  };

  return (
    <Frame title="Choose a username" subtitle={"This is how you'll show up on the leaderboard.\nYou can change this any time"} cta={busy ? "Creating account…" : "Continue"} ctaEnabled={valid && !busy} onCta={submit} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div onClick={() => inputRef.current?.focus()} style={{ cursor: "text" }}>
          <MemberCard width={Math.min(COL_W - 32, 368)} username={name || "Username"} placeholder={!name} avatar={draft.avatar} signature={null} />
        </div>
        {error ? (
          <div style={{ ...badge, background: "rgba(255,82,71,0.15)", color: B.red }}>{error}</div>
        ) : name.length > 0 && !valid ? (
          <div style={badge}>3–20 characters — letters, numbers, underscores</div>
        ) : null}
        <input ref={inputRef} value={name} autoFocus onChange={(e) => { setError(null); setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20)); }}
          style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
      </div>
    </Frame>
  );
}

function ImageStep({ onBack, onNext }) {
  const [avatar, setAvatar] = useState(draft.avatar);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileRef = useRef(null);
  const username = getAuth()?.username ?? "Username";

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar({ kind: "photo", uri: reader.result });
    reader.readAsDataURL(f);
  };

  return (
    <Frame title="Add a profile image" subtitle="You can change this any time" ctaEnabled={avatar != null} onCta={() => { draft.avatar = avatar; onNext(); }} onSkip={() => { draft.avatar = avatar; onNext(); }} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 20 }}>
        <MemberCard width={Math.min(COL_W - 32, 368)} username={username} avatar={avatar} signature={null} />
        {avatar && (
          <button onClick={() => setShowTemplates(true)} style={{ background: "none", border: "none", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: fb }}>✏️ Change profile image</button>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <OptionRow icon="📷" label="Upload a photo" onClick={() => fileRef.current?.click()} />
          <OptionRow icon="😊" label="Use from templates" onClick={() => setShowTemplates((v) => !v)} trailing={
            <span style={{ display: "flex" }}>
              {AVATAR_TEMPLATES.slice(0, 3).map((t, i) => (
                <span key={i} style={{ width: 20, height: 20, borderRadius: 10, background: t.bg, border: "1px solid #141414", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, marginLeft: i ? -8 : 0 }}>{t.emoji}</span>
              ))}
            </span>
          } />
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </div>
        {showTemplates && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {AVATAR_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => setAvatar(t)} style={{ width: 56, height: 56, borderRadius: 28, background: t.bg, border: avatar?.kind === "emoji" && avatar.emoji === t.emoji ? "2px solid #fff" : "none", cursor: "pointer", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.emoji}</button>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

function OptionRow({ icon, label, onClick, trailing }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, background: "#141414", border: "none", borderRadius: 999, padding: "0 18px", height: 54, cursor: "pointer", width: "100%", fontFamily: fb }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, flex: 1, textAlign: "left" }}>{label}</span>
      {trailing}
    </button>
  );
}

function SignatureStep({ onBack, onNext }) {
  const [d, setD] = useState(draft.signature?.d ?? null);
  const padRef = useRef(null);
  const padW = Math.min(COL_W - 52, 348);
  const padH = 260;
  const username = getAuth()?.username ?? "Username";
  const save = () => { draft.signature = d ? { d, w: padW, h: padH } : null; };
  return (
    <Frame title="Sign your card" subtitle="Make it yours — your signature goes on the card." ctaEnabled={!!d} onCta={() => { save(); onNext(); }} onSkip={() => { draft.signature = null; onNext(); }} onBack={onBack}>
      <div style={{ flex: 1, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 20, padding: 10, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <MemberCard width={Math.min(COL_W - 52, 348)} username={username} avatar={draft.avatar} signature={d ? { d, w: padW, h: padH } : null} />
        <div style={{ width: padW, height: padH, position: "relative" }}>
          {!d && (
            <div style={{ position: "absolute", top: "45%", left: 0, right: 0, textAlign: "center", pointerEvents: "none", color: "#8a8f98", fontWeight: 600, fontSize: 14, zIndex: 1 }}>
              ✍️ Sign your card here
            </div>
          )}
          <SignaturePad ref={padRef} width={padW} height={padH} onChange={setD} />
          {d && (
            <button onClick={() => padRef.current?.clear()} style={{ position: "absolute", right: 6, bottom: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.14)", border: "none", borderRadius: 999, padding: "7px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fb }}>✕ Clear</button>
          )}
        </div>
      </div>
    </Frame>
  );
}

function DoneStep({ onFinish }) {
  const username = getAuth()?.username ?? "trader";
  return (
    <Frame title="" cta="Start trading" onCta={onFinish}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(-9deg)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Lanyard sport={draft.sport} width={44} height={150} />
            <div style={{ marginTop: -6 }}>
              <MemberCard width={Math.min(COL_W - 40, 360)} username={username} avatar={draft.avatar} signature={draft.signature} referralCode={referralCodeFor(currentUserId())} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10 }}>
          <div style={{ fontFamily: fd, fontSize: 24, fontWeight: 700 }}>Congrats, {username}</div>
          <div style={{ fontSize: 14, color: "#8a8f98", lineHeight: 1.5 }}>Your member card is ready.<br />Now it's time for first bet</div>
        </div>
      </div>
    </Frame>
  );
}

/* ── shared styles ────────────────────────────────────────────────────────── */
const ctaBtn = { background: B.primary, border: "none", borderRadius: 999, padding: "16px 0", width: "100%", color: "#04130c", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: fb };
const circleBtn = { width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const fieldInput = { background: "#141414", border: "none", borderRadius: 16, padding: "14px 16px", color: "#fff", fontSize: 15, fontFamily: fb, outline: "none" };
const capsLabel = { fontSize: 11, letterSpacing: "0.08em", color: "#949494", fontWeight: 700, fontFamily: fm };
const hairline = { flex: 1, height: 1, background: "rgba(255,255,255,0.15)" };
const badge = { alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#8a8f98" };
