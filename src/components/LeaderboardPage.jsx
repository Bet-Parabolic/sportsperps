import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";
import { fmtUsd } from "../lib/helpers.js";

export function LeaderboardPage({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLb = () => fetch(`${API_URL}/leaderboard?limit=50`).then(r=>r.json()).then(d=>{setData(d.leaderboard||[]);setLoading(false);}).catch(()=>setLoading(false));
    fetchLb();
    const iv = setInterval(fetchLb, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{flex:1,overflow:'auto',background:'#0a0a0a',padding:'32px 40px'}}>
      <div style={{marginBottom:32}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <Trophy size={18} color={B.primary}/>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:'0.12em',fontFamily:fm}}>LEADERBOARD</div>
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:'-0.03em',color:'#fff',marginBottom:8}}>Top Traders</h2>
        <p style={{fontSize:13,color:'#666',lineHeight:1.6}}>Ranked by return % on initial $10,000 balance.</p>
      </div>

      {loading?<div style={{textAlign:'center',padding:60,color:'#555'}}>Loading leaderboard...</div>:
      data.length===0?<div style={{textAlign:'center',padding:60,color:'#555'}}>No trades yet. Be the first!</div>:(
        <div style={{borderRadius:16,border:'1px solid #1f1f1f',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'50px 1fr 100px 100px 80px 100px',padding:'12px 16px',background:'#111',borderBottom:'1px solid #1a1a1a',fontSize:10,fontWeight:700,color:'#555',fontFamily:fm,letterSpacing:'0.06em'}}>
            <div>RANK</div><div>TRADER</div><div style={{textAlign:'right'}}>RETURN</div><div style={{textAlign:'right'}}>PNL</div><div style={{textAlign:'right'}}>TRADES</div><div style={{textAlign:'right'}}>VOLUME</div>
          </div>
          {data.map((entry,i)=>{
            const isMe = entry.userId===userId;
            return (
              <div key={entry.userId} style={{display:'grid',gridTemplateColumns:'50px 1fr 100px 100px 80px 100px',padding:'12px 16px',borderBottom:'1px solid #1a1a1a',fontSize:12,fontFamily:fm,
                background:isMe?B.primary+'10':'transparent',borderLeft:isMe?'3px solid '+B.primary:'3px solid transparent'}}>
                <div style={{fontWeight:800,color:i<3?'#fff':'#888'}}>{entry.rank||i+1}</div>
                <div style={{fontWeight:600,color:isMe?B.primary:'#fff'}}>{entry.username||entry.userId.slice(0,8)+'...'}{isMe&&' (you)'}</div>
                <div style={{textAlign:'right',fontWeight:700,color:entry.returnPct>=0?B.green:B.red}}>{entry.returnPct>=0?'+':''}{entry.returnPct}%</div>
                <div style={{textAlign:'right',color:entry.closedPnl>=0?B.green:B.red}}>{fmtUsd(entry.closedPnl)}</div>
                <div style={{textAlign:'right',color:'#888'}}>{entry.tradeCount}</div>
                <div style={{textAlign:'right',color:'#888'}}>{fmtUsd(entry.totalVolume)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
