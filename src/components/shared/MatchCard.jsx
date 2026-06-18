import { B, fb, fm } from "../../lib/theme.js";
import { findBackendGame } from "../../lib/espn.js";
import { fmtGameTime } from "../../lib/helpers.js";

export function MatchCard({ g, emoji, showRecord, onTrade, _espnKey, liveGames }) {
  const homeScore = parseFloat(g.home.score) || 0;
  const awayScore = parseFloat(g.away.score) || 0;
  const homeWinning = homeScore > awayScore;
  const tied = homeScore === awayScore;
  const statusColor = g.isLive ? B.green : g.isHalf ? "#ff9f1c" : g.isPregame ? B.primaryLight : g.isDelayed ? "#ff9f1c" : "#555";
  const statusLabel = g.isLive && !g.isHalf ? "LIVE" : g.isHalf ? "HALF" : g.isPregame ? "PREGAME" : g.isFinal ? "FINAL" : g.isDelayed ? "DELAYED" : "UPCOMING";
  return (
    <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {g.isLive&&!g.isHalf&&<span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite",flexShrink:0}}/>}
          <span style={{fontSize:11,fontWeight:700,color:statusColor,fontFamily:fm,letterSpacing:"0.08em"}}>{statusLabel}</span>
          {g.detail&&<span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.detail}</span>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{t:g.home,w:homeWinning&&!tied},{t:g.away,w:!homeWinning&&!tied}].map(({t,w},i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {t.logo?<img src={t.logo} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt=""/>
                :<div style={{width:28,height:28,borderRadius:6,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{emoji}</div>}
              <div>
                <div style={{fontSize:14,fontWeight:700,color:(g.isLive||g.isFinal)&&w?"#fff":"#aaa"}}>{t.name}</div>
                {showRecord&&t.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{t.record}</div>}
              </div>
            </div>
            <span style={{fontSize:28,fontWeight:800,fontFamily:fm,color:(g.isLive||g.isFinal)&&w?"#fff":g.isScheduled?"#444":"#777",minWidth:44,textAlign:"right"}}>
              {g.isScheduled?"–":t.score??0}
            </span>
          </div>
        ))}
      </div>
      {g.isScheduled&&(()=>{const when=fmtGameTime(g.date);return(when||g.detail)?(<div style={{fontSize:11,color:"#888",fontFamily:fm,marginTop:10,letterSpacing:"0.04em"}}>{when}{when&&g.detail?" · ":""}{g.detail||""}</div>):null;})()}
      {(g.isLive||g.isHalf||g.isPregame)&&(()=>{const bg=liveGames?findBackendGame(liveGames,g,_espnKey):null;const wp=bg?.oracle?.indexPrice?(bg.oracle.indexPrice*100).toFixed(1):null;return(<>
        {wp&&<div style={{marginTop:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:10,color:B.primary,fontWeight:700,fontFamily:fm}}>{wp}% {g.home.name}</span>
            <span style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:fm}}>{(100-parseFloat(wp)).toFixed(1)}% {g.away.name}</span>
          </div>
          <div style={{height:4,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:wp+"%",background:`linear-gradient(90deg, ${B.primary}, ${B.primaryLight})`,borderRadius:4,transition:"width .5s ease"}}/>
          </div>
        </div>}
        {onTrade&&<button onClick={()=>onTrade(g)} style={{width:"100%",marginTop:10,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:13,
          background:"linear-gradient(135deg,"+B.green+","+B.greenLight+")",color:"#000",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {!g.isPregame&&<span style={{width:6,height:6,borderRadius:"50%",background:"#000",opacity:0.5,animation:"pulse 1.5s infinite"}}/>}
          {g.isPregame?"Trade Pregame":"Trade Live"}
        </button>}
      </>);})()}
    </div>
  );
}
