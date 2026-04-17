import { B, fd, fm } from "../../lib/theme.js";

export function SkeletonCard(){return(
  <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"20px 24px",animation:"pulse 1.5s infinite"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
      <div style={{width:60,height:12,background:"#1a1a1a",borderRadius:6}}/>
      <div style={{width:30,height:12,background:"#1a1a1a",borderRadius:6}}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[0,1].map(i=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:6,background:"#1a1a1a"}}/>
          <div style={{width:100+i*20,height:14,background:"#1a1a1a",borderRadius:6}}/>
        </div>
        <div style={{width:30,height:24,background:"#1a1a1a",borderRadius:6}}/>
      </div>))}
    </div>
  </div>
);}

export function SportPageShell({ title, subtitle, emoji, liveCount, loading, error, noGamesMsg, children }) {
  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      <div style={{marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm}}>{subtitle}</div>
          {liveCount>0&&<span style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm,padding:"2px 8px",background:B.green+"15",borderRadius:6,letterSpacing:"0.06em",animation:"pulse 2s infinite"}}>{liveCount} LIVE</span>}
        </div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>{title}</h2>
        {loading&&<p style={{fontSize:13,color:"#666"}}>Loading games…</p>}
        {error&&<p style={{fontSize:13,color:"#ef4444"}}>Could not reach ESPN — try again shortly.</p>}
      </div>
      {loading&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>{[0,1,2,3].map(i=><SkeletonCard key={i}/>)}</div>}
      {!loading&&!error&&children}
    </div>
  );
}

export function SectionHeader({ label, color }) {
  return <div style={{fontSize:11,fontWeight:700,color:color||"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:12}}>{label}</div>;
}

export function EmptyState({ emoji, sport, scheduledGames=[] }) {
  const next = scheduledGames.sort((a,b)=>new Date(a.date||a.detail||0)-new Date(b.date||b.detail||0))[0];
  return (
    <div style={{textAlign:"center",padding:"60px 0"}}>
      <div style={{fontSize:36,marginBottom:12}}>{emoji}</div>
      <div style={{fontSize:14,color:"#555",marginBottom:next?8:0}}>No live {sport} games right now.</div>
      {next&&<div style={{fontSize:12,color:"#888",marginTop:4}}>
        Next: <span style={{color:"#fff",fontWeight:600}}>{next.home?.name||next.home?.abbr} vs {next.away?.name||next.away?.abbr}</span>
        {next.detail&&<span style={{color:"#666"}}> · {next.detail}</span>}
      </div>}
    </div>
  );
}

export function Grid({ children }) {
  return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",gap:12,marginBottom:32}}>{children}</div>;
}
