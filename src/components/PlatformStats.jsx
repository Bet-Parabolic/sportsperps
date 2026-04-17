import { useState, useEffect } from "react";
import { B, fm } from "../lib/theme.js";
import { API_URL } from "../lib/constants.js";

export function PlatformStats({ delay={} }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const fetchStats = () => fetch(`${API_URL}/stats`).then(r=>r.json()).then(setStats).catch(()=>{});
    fetchStats();
    const iv = setInterval(fetchStats, 30000);
    return () => clearInterval(iv);
  }, []);

  if (!stats) return null;
  const items = [
    { label: 'Total Volume', value: '$'+stats.totalVolume.toLocaleString(), color: '#fff' },
    { label: 'Open Interest', value: '$'+stats.openInterest.toLocaleString(), color: B.primary },
    { label: 'Live Markets', value: stats.liveMarkets.toString(), color: stats.liveMarkets > 0 ? B.green : '#666' },
    { label: 'Traders', value: stats.activeTraders.toString(), color: '#fff' },
    { label: 'Vault TVL', value: '$'+stats.vaultBalance.toLocaleString(), color: B.primary },
  ];

  return (
    <div style={{...delay,maxWidth:720,margin:'0 auto',padding:'0 32px 40px'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        {items.map(({label,value,color})=>(
          <div key={label} style={{textAlign:'center',flex:'1 1 100px'}}>
            <div style={{fontSize:22,fontWeight:800,color,fontFamily:fm}}>{value}</div>
            <div style={{fontSize:10,color:'#555',fontWeight:600,letterSpacing:'0.08em',fontFamily:fm,marginTop:2}}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
