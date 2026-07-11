import { useState, useEffect } from "react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { fmtUsd } from "../lib/helpers.js";
import { authToken } from "../lib/auth.js";

export function ProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [trades, setTrades] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tk = `token=${encodeURIComponent(authToken() || "")}`; // own-profile reads are token-gated
    fetch(`${API_URL}/profile/${userId}?${tk}`).then(r=>r.json()).then(d=>{
      if(d.email||d.username){setProfile(d);setEmail(d.email||'');setUsername(d.username||'');}
      setLoading(false);
    }).catch(()=>setLoading(false));
    fetch(`${API_URL}/profile/${userId}/trades?limit=20&${tk}`).then(r=>r.json()).then(d=>setTrades(d.trades||[])).catch(()=>{});
  }, [userId]);

  const saveProfile = async () => {
    if(!email||!username){setError('Both email and username are required');return;}
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/profile/${userId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,username})});
      const data = await res.json();
      if(res.ok){
        setProfile(data);localStorage.setItem('perpdictions_profile',JSON.stringify(data));
        // Refresh trade history after profile creation
        fetch(`${API_URL}/profile/${userId}/trades?limit=20&token=${encodeURIComponent(authToken() || "")}`).then(r=>r.json()).then(d=>setTrades(d.trades||[])).catch(()=>{});
      }
      else setError(data.error||'Failed to save');
    } catch(e){setError(e.message);}
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn .2s'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#0a0a0a',border:'1px solid #1f1f1f',borderRadius:20,width:Math.min(520,window.innerWidth-32),maxHeight:'80vh',overflow:'auto',padding:32}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontFamily:fd,fontSize:22,fontWeight:800,color:'#fff'}}>{profile?.username?`@${profile.username}`:'Create Profile'}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#666',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        {loading ? <div style={{textAlign:'center',padding:40,color:'#555'}}>Loading...</div> : !profile?.username ? (
          <div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#666',fontFamily:fm,display:'block',marginBottom:4}}>USERNAME</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. degen_trader"
                style={{width:'100%',padding:'12px 14px',background:'#111',border:'1px solid #2a2a2a',borderRadius:10,color:'#fff',fontSize:14,fontFamily:fm,outline:'none'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#666',fontFamily:fm,display:'block',marginBottom:4}}>EMAIL</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com"
                style={{width:'100%',padding:'12px 14px',background:'#111',border:'1px solid #2a2a2a',borderRadius:10,color:'#fff',fontSize:14,fontFamily:fm,outline:'none'}}/>
            </div>
            {error&&<div style={{color:B.red,fontSize:12,marginBottom:12,fontFamily:fm}}>{error}</div>}
            <button onClick={saveProfile} disabled={saving} style={{width:'100%',padding:'14px 0',fontWeight:700,fontSize:14,border:'2px solid '+B.green,cursor:'pointer',fontFamily:fb,borderRadius:12,background:B.primary,color:'#fff',opacity:saving?0.5:1}}>
              {saving?'Saving...':'Create Profile'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:24}}>
              {[['Balance',fmtUsd(profile.balance),'#fff'],['Return',profile.returnPct+'%',profile.returnPct>=0?B.green:B.red],
                ['Closed PnL',fmtUsd(profile.closedPnl),profile.closedPnl>=0?B.green:B.red],['Trades',profile.tradeCount,'#fff'],
                ['Volume',fmtUsd(profile.totalVolume),'#fff'],['Open Positions',profile.openPositions,B.primary],
              ].map(([label,val,color])=>(
                <div key={label} style={{background:'#111',borderRadius:12,padding:'14px 16px',border:'1px solid #1f1f1f'}}>
                  <div style={{fontSize:10,color:'#555',fontFamily:fm,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:18,fontWeight:800,color,fontFamily:fm}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              <button style={{flex:1,padding:'12px 0',fontWeight:700,fontSize:13,border:'1px solid #2a2a2a',cursor:'pointer',fontFamily:fb,borderRadius:10,background:'#111',color:'#fff'}}>Deposit (Coming Soon)</button>
              <button style={{flex:1,padding:'12px 0',fontWeight:700,fontSize:13,border:'1px solid #2a2a2a',cursor:'pointer',fontFamily:fb,borderRadius:10,background:'#111',color:'#fff'}}>Withdraw (Coming Soon)</button>
            </div>
            {trades.length>0&&(<div>
              <div style={{fontSize:11,color:'#555',fontWeight:700,fontFamily:fm,marginBottom:8,letterSpacing:'0.08em'}}>TRADE HISTORY</div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {trades.map((t,i)=>(
                  <div key={t.id||i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#111',borderRadius:8,border:'1px solid #1a1a1a',fontSize:11,fontFamily:fm}}>
                    <div>
                      <span style={{color:t.side==='home'?B.primary:'#ef4444',fontWeight:700}}>{t.side.toUpperCase()}</span>
                      <span style={{color:'#555',margin:'0 6px'}}>{t.leverage}x</span>
                      <span style={{color:'#888'}}>{(t.entryPx*100).toFixed(1)}¢ → {t.exitPx!=null?(t.exitPx*100).toFixed(1)+'¢':'—'}</span>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{color:t.pnl>=0?B.green:B.red,fontWeight:700}}>{t.pnl>=0?'+':''}{fmtUsd(t.pnl)}</span>
                      <span style={{color:'#444',fontSize:10}}>{t.closeType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>)}
            <div style={{marginTop:20,paddingTop:12,borderTop:'1px solid #1a1a1a',fontSize:11,color:'#555',fontFamily:fm}}>
              <div>{profile.email}</div>
              <div style={{marginTop:2,color:'#333'}}>ID: {userId.slice(0,8)}...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
