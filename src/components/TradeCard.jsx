import { useState, useRef } from "react";
import { B, fb, fm } from "../lib/theme.js";
import { fmtUsd } from "../lib/helpers.js";
import { LOGO_MARK } from "../lib/logos.js";

export function TradeCard({ card, onClose }) {
  const cardRef = useRef(null);
  const [copying, setCopying] = useState(false);

  const capture = async (action) => {
    if(!cardRef.current) return;
    setCopying(true);
    try {
      const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor:'#0a0a0a', useCORS:true, scale:2 });
      if(action==='copy'){
        canvas.toBlob(async blob=>{
          try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);}catch(e){}
        },'image/png');
      } else if(action==='download'){
        const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='perpdictions-trade.png';a.click();
      } else if(action==='share'&&navigator.share){
        canvas.toBlob(async blob=>{
          try{await navigator.share({files:[new File([blob],'perpdictions-trade.png',{type:'image/png'})]});}catch(e){}
        },'image/png');
      }
    } catch(e){ console.log('Trade card capture error:', e); }
    setCopying(false);
  };

  const isClose = card.type==='close';
  const direction = card.side==='home'?'LONG':'SHORT';
  const pnlColor = card.pnl>=0?B.green:B.red;

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:9998,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',animation:'fadeIn .2s'}}>
      <div ref={cardRef} onClick={e=>e.stopPropagation()} style={{width:400,background:'linear-gradient(180deg,#0a0a0a,#111)',borderRadius:20,border:'1px solid #1f1f1f',borderLeft:'4px solid '+(card.teamColor||B.primary),padding:'28px 32px',fontFamily:fb}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
          <img src={LOGO_MARK} style={{height:20,width:20}} alt=""/>
          <span style={{fontSize:13,fontWeight:700,color:'#888'}}>Perpdictions</span>
          <span style={{marginLeft:'auto',fontSize:10,color:'#444',fontFamily:fm}}>perps.io</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          {card.teamLogo
            ?<img src={card.teamLogo} crossOrigin="anonymous" onError={e=>{e.target.style.display='none';e.target.nextSibling&&(e.target.nextSibling.style.display='flex');}} style={{width:40,height:40,objectFit:'contain',borderRadius:8}} alt=""/>
            :null}
          <div style={{width:40,height:40,borderRadius:8,background:card.teamColor||B.primary,display:card.teamLogo?'none':'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#fff',fontFamily:fm}}>{card.teamName?.slice(0,2).toUpperCase()||'??'}</div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:card.side==='home'?B.primary:'#ef4444',fontFamily:fm,letterSpacing:'0.1em'}}>{direction}</div>
            <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{card.teamName}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:isClose?'1fr 1fr':'1fr 1fr',gap:12,marginBottom:16}}>
          <div style={{background:'#1a1a1a',borderRadius:10,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'#555',fontFamily:fm}}>ENTRY</div>
            <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:fm}}>{(card.entryPx*100).toFixed(1)}¢</div>
          </div>
          <div style={{background:'#1a1a1a',borderRadius:10,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'#555',fontFamily:fm}}>LEVERAGE</div>
            <div style={{fontSize:18,fontWeight:800,color:B.primary,fontFamily:fm}}>{card.leverage}x</div>
          </div>
        </div>
        {isClose&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div style={{background:'#1a1a1a',borderRadius:10,padding:'10px 14px'}}>
              <div style={{fontSize:10,color:'#555',fontFamily:fm}}>EXIT</div>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',fontFamily:fm}}>{(card.exitPx*100).toFixed(1)}¢</div>
            </div>
            <div style={{background:card.pnl>=0?B.green+'15':B.red+'15',borderRadius:10,padding:'10px 14px',border:'1px solid '+(card.pnl>=0?B.green+'30':B.red+'30')}}>
              <div style={{fontSize:10,color:'#555',fontFamily:fm}}>P&L</div>
              <div style={{fontSize:18,fontWeight:800,color:pnlColor,fontFamily:fm}}>{card.pnl>=0?'+':''}{fmtUsd(card.pnl)}</div>
            </div>
          </div>
        )}
        <div style={{fontSize:11,color:'#555',fontFamily:fm}}>{card.gameInfo} · {card.gameStatus}</div>
      </div>
      <div onClick={e=>e.stopPropagation()} style={{display:'flex',gap:8,marginTop:16}}>
        <button onClick={()=>capture('copy')} disabled={copying} style={{padding:'10px 20px',fontWeight:700,fontSize:12,border:'1px solid #2a2a2a',cursor:'pointer',fontFamily:fb,borderRadius:10,background:'#111',color:'#fff'}}>
          {copying?'...':'Copy Image'}
        </button>
        <button onClick={()=>capture('download')} disabled={copying} style={{padding:'10px 20px',fontWeight:700,fontSize:12,border:'1px solid #2a2a2a',cursor:'pointer',fontFamily:fb,borderRadius:10,background:'#111',color:'#fff'}}>
          Download
        </button>
        {typeof navigator!=='undefined'&&navigator.share&&(
          <button onClick={()=>capture('share')} disabled={copying} style={{padding:'10px 20px',fontWeight:700,fontSize:12,border:'2px solid '+B.green,cursor:'pointer',fontFamily:fb,borderRadius:10,background:B.primary,color:'#fff'}}>
            Share
          </button>
        )}
        <button onClick={onClose} style={{padding:'10px 20px',fontWeight:700,fontSize:12,border:'1px solid #2a2a2a',cursor:'pointer',fontFamily:fb,borderRadius:10,background:'#111',color:'#666'}}>
          Close
        </button>
      </div>
    </div>
  );
}
