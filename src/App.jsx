import { useState, lazy, Suspense } from "react";

import { FONT_URL } from "./lib/theme.js";
import { PROC_GAMES } from "./lib/games.js";
import { LOGO_MARK } from "./lib/logos.js";
import { useLiveGames } from "./lib/useLiveGames.js";

import { LandingPage } from "./components/LandingPage.jsx";
const TradingApp = lazy(() => import("./trading/TradingApp.jsx").then(m => ({ default: m.TradingApp })));
const LiveTradingApp = lazy(() => import("./trading/LiveTradingApp.jsx").then(m => ({ default: m.LiveTradingApp })));

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

  const [page, setPage] = useState(isAppDomain ? "trading" : "landing");
  const [sel, setSel] = useState(PROC_GAMES[0]);
  const [liveGame, setLiveGame] = useState(null);
  const [tradingTab, setTradingTab] = useState("home");
  const pick = (g) => { setSel(g); setPage("trading"); };
  const tradeLive = (g) => { setLiveGame(g); setPage("live-trading"); };
  const navTo = (tab) => { setTradingTab(tab); setPage("trading"); };

  // Launch App: from the marketing domain, cross over to the app subdomain.
  const launchApp = () => {
    if (isProdLanding) window.location.href = "https://app.parabolic.gg";
    else setPage("trading");
  };
  // Exit terminal: on the app subdomain, go back to the marketing site.
  const goLanding = () => {
    if (isAppDomain) window.location.href = "https://parabolic.gg";
    else setPage("landing");
  };

  // Real-time games over WebSocket (init + game_update push), REST fallback.
  const liveGames = useLiveGames();

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
      {page==="landing"
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
