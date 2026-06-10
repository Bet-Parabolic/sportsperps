import { useState, useEffect, lazy, Suspense } from "react";

import { FONT_URL } from "./lib/theme.js";
import { API_URL } from "./lib/constants.js";
import { PROC_GAMES } from "./lib/games.js";
import { LOGO_MARK } from "./lib/logos.js";

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
  const [page, setPage] = useState("landing");
  const [sel, setSel] = useState(PROC_GAMES[0]);
  const [liveGames, setLiveGames] = useState([]);
  const [liveGame, setLiveGame] = useState(null);
  const [tradingTab, setTradingTab] = useState("game");
  const pick = (g) => { setSel(g); setPage("trading"); };
  const tradeLive = (g) => { setLiveGame(g); setPage("live-trading"); };
  const navTo = (tab) => { setTradingTab(tab); setPage("trading"); };

  // Poll backend every 15s for live games (NBA, NCAAM, MLB, NFL, NHL, MLS)
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch(`${API_URL}/games`);
        if (!res.ok) return;
        const data = await res.json();
        setLiveGames(data.games || []);
      } catch (err) {
        console.log("[API] Backend not available, using demo games only");
      }
    };
    fetchGames();
    const iv = setInterval(fetchGames, 15000);
    return () => clearInterval(iv);
  }, []);

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
        ? <LandingPage onLaunch={()=>setPage("trading")} onDocs={()=>window.open("https://docs.perpdictions.com/docs","_blank","noopener,noreferrer")}/>
        : <Suspense fallback={<Splash/>}>
            {page==="live-trading"&&liveGame
              ? <LiveTradingApp game={liveGame} onBack={()=>setPage("trading")} liveGames={liveGames} onNavTo={navTo} onTrade={tradeLive}/>
              : sel
                ? <TradingApp game={sel} onBack={()=>setPage("landing")} onChangeGame={()=>setPage("landing")} onSwitchGame={pick} liveGames={liveGames} onTrade={tradeLive} initialTab={tradingTab}/>
                : null}
          </Suspense>}
    </div>
  );
}
