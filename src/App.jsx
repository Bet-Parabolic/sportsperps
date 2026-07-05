import { useState, useEffect, lazy, Suspense } from "react";

import { FONT_URL } from "./lib/theme.js";
import { PROC_GAMES } from "./lib/games.js";
import { LOGO_MARK } from "./lib/logos.js";
import { useLiveGames } from "./lib/useLiveGames.js";
import { track, initTracking, withVisitorId } from "./lib/track.js";

import { LandingPage } from "./components/LandingPage.jsx";
const TradingApp = lazy(() => import("./trading/TradingApp.jsx").then(m => ({ default: m.TradingApp })));
const LiveTradingApp = lazy(() => import("./trading/LiveTradingApp.jsx").then(m => ({ default: m.LiveTradingApp })));
const DashboardPage = lazy(() => import("./dash/DashboardPage.jsx").then(m => ({ default: m.DashboardPage })));
const WaitlistPage = lazy(() => import("./components/WaitlistPage.jsx").then(m => ({ default: m.WaitlistPage })));

const Splash = () => (
  <div style={{minHeight:"100vh",background:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <img src={LOGO_MARK} alt="" style={{width:64,height:64,animation:"pulse 1.4s ease-in-out infinite"}}/>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   ROOT — page router + global styles
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

  const [page, setPage] = useState(isAppDomain ? "trading" : "landing");
  const [sel, setSel] = useState(PROC_GAMES[0]);
  const [liveGame, setLiveGame] = useState(null);
  const [tradingTab, setTradingTab] = useState("home");
  const pick = (g) => { setSel(g); setPage("trading"); };
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
        .mob-nav::-webkit-scrollbar { display:none; }
        .mob-nav { -ms-overflow-style:none; scrollbar-width:none; }
        input[type=number]{-moz-appearance:textfield;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#333;}
        button:hover:not(:disabled){filter:brightness(1.15);}button:active:not(:disabled){transform:scale(0.98);}
        *{box-sizing:border-box;margin:0;padding:0;}
      `}</style>
      {isWaitlist
        ? <Suspense fallback={<Splash/>}><WaitlistPage/></Suspense>
        : isDash
        ? <Suspense fallback={<Splash/>}><DashboardPage/></Suspense>
        : page==="landing"
        ? <LandingPage onLaunch={launchApp} onDocs={()=>window.open("https://docs.parabolic.gg/docs","_blank","noopener,noreferrer")}/>
        : <Suspense fallback={<Splash/>}>
            {page==="live-trading"&&liveGame
              ? <LiveTradingApp game={liveGame} onBack={()=>setPage("trading")} liveGames={liveGames} onNavTo={navTo} onTrade={tradeLive}/>
              : sel
                ? <TradingApp game={sel} onBack={goLanding} onChangeGame={goLanding} onSwitchGame={pick} liveGames={liveGames} onTrade={tradeLive} initialTab={tradingTab}/>
                : null}
          </Suspense>}
    </div>
  );
}
