import { useState, useEffect, lazy, Suspense } from "react";

import { FONT_URL } from "./lib/theme.js";
import { LOGO_MARK } from "./lib/logos.js";
import { useLiveGames } from "./lib/useLiveGames.js";
import { track, initTracking, withVisitorId } from "./lib/track.js";
import { getAuth } from "./lib/auth.js";

import { LandingPage } from "./components/LandingPage.jsx";

// Stale-chunk guard: a deploy replaces the hashed chunk files, so a tab that loaded index.html
// BEFORE the deploy 404s when it lazy-loads a page after it (common on phones — tabs live for
// days). On chunk-load failure, reload once to fetch the fresh index.html; a sessionStorage
// latch stops a reload loop if the failure is real (offline, adblock). Cleared on success.
const RELOAD_KEY = "parabolic_chunk_reloaded";
const lazyPage = (importer, pick) => lazy(() =>
  importer().then((m) => {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage blocked */ }
    return { default: pick(m) };
  }).catch((err) => {
    let latched = true;
    try { latched = !!sessionStorage.getItem(RELOAD_KEY); if (!latched) sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* storage blocked */ }
    if (!latched) { window.location.reload(); return new Promise(() => {}); } // reload takes over
    throw err; // second failure → surface to the ErrorBoundary
  })
);
const TradingApp = lazyPage(() => import("./trading/TradingApp.jsx"), m => m.TradingApp);
const LiveTradingApp = lazyPage(() => import("./trading/LiveTradingApp.jsx"), m => m.LiveTradingApp);
const DashboardPage = lazyPage(() => import("./dash/DashboardPage.jsx"), m => m.DashboardPage);
const WaitlistPage = lazyPage(() => import("./components/WaitlistPage.jsx"), m => m.WaitlistPage);
const WorldCupPage = lazyPage(() => import("./components/WorldCupPage.jsx"), m => m.WorldCupPage);
const OnboardingFlow = lazyPage(() => import("./components/onboarding/OnboardingFlow.jsx"), m => m.OnboardingFlow);

const Splash = () => (
  <div style={{minHeight:"100vh",background:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <img src={LOGO_MARK} alt="" style={{width:64,height:64,animation:"pulse 1.4s ease-in-out infinite"}}/>
  </div>
);

/* ── Competition gate — during the World Cup event the MAIN terminal on app.parabolic.gg is
   team-only: stray visitors get funneled to /worldcup (the actual product right now), the team
   unlocks with the dash password (verified against the backend admin login - no secret in the
   bundle). SOFT gate by design: it prevents accidental use, it is not a security boundary. ── */
const GATE_KEY = "parabolic_team_gate";
function TeamGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const tryUnlock = async (e) => {
    e?.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    try {
      const { API_URL } = await import("./lib/constants.js");
      const r = await fetch(`${API_URL}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) { try { localStorage.setItem(GATE_KEY, "1"); } catch { /* storage blocked */ } onUnlock(); }
      else setErr("Wrong password");
    } catch { setErr("Network error - try again"); }
    setBusy(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#06070a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Hanken Grotesk', sans-serif", textAlign: "center" }}>
      <img src={LOGO_MARK} alt="Parabolic" style={{ width: 56, height: 56, marginBottom: 22 }} />
      <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>The World Cup Trading Competition is live</h1>
      <p style={{ color: "#8a93a6", fontSize: 14.5, lineHeight: 1.6, maxWidth: 420, marginBottom: 24 }}>
        The main Parabolic terminal is closed while the competition runs. Join the championship - free entry, $10,000 World Cup Cash, real cash prizes.
      </p>
      <a href="/worldcup" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 999, background: "#fff", color: "#0a0a0a", fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 10px 34px rgba(255,255,255,0.15)" }}>
        Enter the Competition →
      </a>
      <form onSubmit={tryUnlock} style={{ marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {!showPw ? (
          <button type="button" onClick={() => setShowPw(true)} style={{ background: "none", border: "none", color: "#3a4150", fontSize: 12, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Team access</button>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Team password" autoFocus
                style={{ background: "#101114", border: "1px solid #1c1e24", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", width: 200 }} />
              <button type="submit" disabled={busy} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1fd182", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                {busy ? "…" : "Unlock"}
              </button>
            </div>
            {err && <div style={{ color: "#ff5247", fontSize: 12.5 }}>{err}</div>}
          </>
        )}
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT - page router + global styles
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  // Domain split: app.parabolic.gg → terminal; parabolic.gg → landing.
  // Same deploy serves both; on localhost / *.vercel.app we stay single-origin.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isAppDomain = /^app\./.test(host);
  const isProdLanding = host === "parabolic.gg" || host === "www.parabolic.gg";
  // Internal oracle-accuracy dashboard — /dash on any host (admin-gated, unlinked, noindex).
  const isDash = typeof window !== "undefined" && window.location.pathname.startsWith("/dash");
  // Public waitlist page — /waitlist on any host (parabolic.gg/waitlist).
  const isWaitlist = typeof window !== "undefined" && window.location.pathname.startsWith("/waitlist");
  // World Cup Championship hub — /worldcup on any host (app.parabolic.gg/worldcup). Siloed event
  // surface: same backend + same accounts, WC-only leaderboard, inert until EVENT_ENABLED.
  const isWorldCup = typeof window !== "undefined" && window.location.pathname.startsWith("/worldcup");

  // Post-logout: ProfilePage stamps a one-shot flag before its reload so the boot lands on the
  // sign-in/sign-up screen instead of a fresh guest terminal. (WorldCupPage reads it too.)
  const [postLogoutAuth] = useState(() => {
    try { return sessionStorage.getItem("parabolic_post_logout_auth") === "1"; } catch { return false; }
  });
  // /worldcup consumes + clears the flag itself — its page component is lazy-loaded, so clearing
  // here would race its mount and it would never see the flag.
  useEffect(() => {
    if (window.location.pathname.startsWith("/worldcup")) return;
    try { sessionStorage.removeItem("parabolic_post_logout_auth"); } catch { /* noop */ }
  }, []);

  // Competition gate: the main terminal on app.parabolic.gg is team-only while the WC event
  // runs — everyone else belongs on /worldcup. Only the app domain is gated (marketing landing,
  // /worldcup, /dash, /waitlist, localhost/vercel previews all stay open).
  const [gateOpen, setGateOpen] = useState(() => {
    try { return localStorage.getItem(GATE_KEY) === "1"; } catch { return false; }
  });
  const gated = isAppDomain && !isWorldCup && !isDash && !isWaitlist && !gateOpen;
  // Gated visitors go straight to the competition; the team unlocks at app.parabolic.gg/?team
  // (the gate page with the password prompt only renders there).
  const isTeamEntry = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("team");
  useEffect(() => {
    if (gated && !isTeamEntry) window.location.replace("/worldcup");
  }, [gated, isTeamEntry]);

  // AUTH GATE (guests eliminated, July 12): a logged-out visitor can only VIEW the World Cup page;
  // any interaction there opens onboarding (WorldCupPage handles the click-capture on its own auth
  // state, so the lock lifts the moment they register/login). Every other route/page requires an
  // account. /dash keeps its own admin password; /waitlist stays public.
  const loggedOut = !getAuth();
  // The MARKETING domain (parabolic.gg) is exempt — it shows the landing page to everyone
  // (July 12 fix: the gate was funneling parabolic.gg visitors to /worldcup too, making the
  // landing page unreachable; only app.parabolic.gg should route logged-out visitors to the WC
  // hub). parabolic.gg/worldcup still shows the locked WC page.
  const authGate = loggedOut && !isDash && !isWaitlist && !(isProdLanding && !isWorldCup);

  const [page, setPage] = useState(postLogoutAuth ? "onboarding" : isAppDomain ? "trading" : "landing");
  const [liveGame, setLiveGame] = useState(null);
  const [tradingTab, setTradingTab] = useState("home");
  const tradeLive = (g) => { setLiveGame(g); setPage("live-trading"); };
  const navTo = (tab) => { setTradingTab(tab); setPage("trading"); };

  // Launch App: from the marketing domain, cross over to the app subdomain. The visitor id rides
  // along (?pv=) so landing → app conversion survives the cross-subdomain localStorage split.
  const launchApp = () => {
    if (isProdLanding) window.location.href = withVisitorId("https://app.parabolic.gg");
    else setPage("trading");
  };
  // Exit terminal: on the app subdomain, go back to the marketing site.
  const goLanding = () => {
    if (isAppDomain) window.location.href = "https://parabolic.gg";
    else setPage("landing");
  };

  // Real-time games over WebSocket (init + game_update push), REST fallback.
  const liveGames = useLiveGames();

  // Analytics beacon: 60s visibility-aware session heartbeat + top-of-funnel page events.
  // landing_view on the marketing page, app_open when a terminal mounts (boot or Launch App),
  // page_view for the live-game terminal. Tab-level page_views fire inside the terminals.
  useEffect(() => { initTracking(); }, []);
  useEffect(() => {
    if (isDash || isWaitlist) return; // dashboard + standalone waitlist page aren't landing traffic
    if (isWorldCup) { track("page_view", { page: "worldcup" }); return; } // the WC event hub IS the funnel — count it
    if (page === "landing") track("landing_view");
    else if (page === "trading") track("app_open", { terminal: "home" });
    else if (page === "live-trading") track("page_view", { page: "live-trading" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <style>{`
        @import url('${FONT_URL}');
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes scroll { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        /* Leverage slider — progress-bar track is painted by the input's background gradient;
           the thumb is a slim mint handle riding on top. */
        .lev-slider { -webkit-appearance:none; appearance:none; width:100%; height:14px; border-radius:7px; outline:none; cursor:pointer; }
        .lev-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:6px; height:22px; border-radius:3px; background:#fff; border:none; box-shadow:0 0 6px rgba(31,209,130,.8); cursor:grab; }
        .lev-slider::-webkit-slider-thumb:active { cursor:grabbing; }
        .lev-slider::-moz-range-thumb { width:6px; height:22px; border-radius:3px; background:#fff; border:none; box-shadow:0 0 6px rgba(31,209,130,.8); cursor:grab; }
        .lev-slider::-moz-range-track { background:transparent; }
        .mob-nav::-webkit-scrollbar { display:none; }
        .mob-nav { -ms-overflow-style:none; scrollbar-width:none; }
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#333;}
        button:hover:not(:disabled){filter:brightness(1.15);}button:active:not(:disabled){transform:scale(0.98);}
        *{box-sizing:border-box;margin:0;padding:0;}
      `}</style>
      {isDash
        ? <Suspense fallback={<Splash/>}><DashboardPage/></Suspense>
        : isWaitlist
        ? <Suspense fallback={<Splash/>}><WaitlistPage/></Suspense>
        : authGate
        // Logged out → World Cup page only, with a click-to-onboard lock (the page lifts it once
        // the visitor registers/logs in). No terminal, no landing, no guest browsing.
        ? <Suspense fallback={<Splash/>}><WorldCupPage lockedOut /></Suspense>
        : gated
        ? (isTeamEntry ? <TeamGate onUnlock={() => setGateOpen(true)} /> : <Splash/>)
        : isWorldCup
        ? <Suspense fallback={<Splash/>}><WorldCupPage/></Suspense>
        : page==="onboarding"
        ? <Suspense fallback={<Splash/>}><OnboardingFlow onDone={()=>setPage("trading")} onGuest={()=>setPage("trading")}/></Suspense>
        : page==="landing"
        ? <LandingPage onLaunch={launchApp} onCreateAccount={()=>setPage("onboarding")} onDocs={()=>window.open("https://docs.parabolic.gg/docs","_blank","noopener,noreferrer")}/>
        : <Suspense fallback={<Splash/>}>
            {page==="live-trading"&&liveGame
              ? <LiveTradingApp game={liveGame} onBack={()=>setPage("trading")} liveGames={liveGames} onNavTo={navTo} onTrade={tradeLive} onOnboard={()=>setPage("onboarding")}/>
              : <TradingApp onBack={goLanding} onChangeGame={goLanding} liveGames={liveGames} onTrade={tradeLive} initialTab={tradingTab}/>}
          </Suspense>}
    </div>
  );
}
