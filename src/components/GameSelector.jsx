import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { PROC_GAMES } from "../lib/games.js";

export function GameSelector({ onSelect, onBack }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 50); }, []);
  const a = (d) => ({ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)", transition:`all 0.5s cubic-bezier(0.16,1,0.3,1) ${d}s` });

  return (
    <div style={{background:B.bg,minHeight:"100vh",fontFamily:fb,color:B.white}}>
      <div style={{position:"fixed",inset:0,backgroundImage:`linear-gradient(${B.border} 1px, transparent 1px), linear-gradient(90deg, ${B.border} 1px, transparent 1px)`,backgroundSize:"60px 60px",opacity:.2,pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1}}>
        <nav style={{...a(0),padding:"20px 48px",display:"flex",alignItems:"center",gap:16,borderBottom:"1px solid "+B.border}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:B.dim,display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,fontFamily:fm,padding:0,letterSpacing:"0.06em"}}>
            <ChevronRight size={14} style={{transform:"rotate(180deg)"}}/> HOME
          </button>
          <div style={{width:1,height:16,background:B.border}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <img src={LOGO_NAV} style={{height:120,width:"auto",margin:"-26px 0",marginRight:-8}} alt="Perpdictions"/>
            <img src={LOGO_WORDMARK} style={{height:28,width:"auto"}} alt="Perpdictions"/>
          </div>
        </nav>

        <div style={{maxWidth:1000,margin:"0 auto",padding:"80px 48px"}}>
          <div style={a(0.05)}>
            <span style={{fontFamily:fm,fontSize:12,color:B.primary,letterSpacing:"0.15em",fontWeight:700}}>SELECT MARKET</span>
            <h1 style={{fontFamily:fd,fontSize:48,fontWeight:800,letterSpacing:"-0.04em",marginTop:12,marginBottom:48}}>Choose a game.</h1>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,background:B.border}}>
            {PROC_GAMES.map((game, i) => (
              <button key={game.id} onClick={() => onSelect(game)} style={{
                ...a(0.1+i*0.06), background:B.bg, border:"none", padding:"36px 28px",
                cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", gap:16, color:B.white,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
                  <span style={{fontSize:36}}>{game.emoji}</span>
                  <span style={{fontFamily:fm,fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.1em"}}>{game.sport}</span>
                </div>
                <div>
                  <h3 style={{fontFamily:fd,fontSize:20,fontWeight:800,letterSpacing:"-0.02em",marginBottom:6}}>{game.label}</h3>
                  <p style={{fontSize:12,color:B.mute,fontWeight:600,fontFamily:fm}}>{game.subtitle}</p>
                </div>
                <div style={{background:B.surface,border:"1px solid "+B.border,padding:"12px 14px",width:"100%"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700}}>{game.home.logo} {game.home.name}</span>
                    <span style={{fontSize:11,color:B.dim}}>vs</span>
                    <span style={{fontSize:13,fontWeight:700}}>{game.away.logo} {game.away.name}</span>
                  </div>
                </div>
                <p style={{fontSize:12,color:B.dim,fontWeight:500,lineHeight:1.5}}>{game.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
