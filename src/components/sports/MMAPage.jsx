import { B, fd, fm } from "../../lib/theme.js";
import { SportPageShell } from "../../components/shared/SportPageShell.jsx";

export function MMAPage({ data={events:[],loading:true,error:false} }) {
  // UFC events: each "event" is a fight card; competitors are fighters
  const events = data.events.map(ev => {
    const stype = ev.status?.type?.name || "";
    const isLive = stype === "STATUS_IN_PROGRESS";
    const isFinal = stype.includes("FINAL");
    const isScheduled = !isLive && !isFinal;
    const bouts = (ev.competitions || []).map(bout => {
      const f1 = bout.competitors?.[0];
      const f2 = bout.competitors?.[1];
      const bStatus = bout.status?.type?.name || "";
      return {
        id: bout.id,
        isMain: bout.type?.text === "Main Event" || bout.order === 0,
        isFinal: bStatus.includes("FINAL"),
        isLive: bStatus === "STATUS_IN_PROGRESS",
        detail: bout.status?.type?.detail || "",
        weightclass: bout.type?.text || "",
        f1: { name: f1?.athlete?.displayName || f1?.team?.displayName || "TBD", logo: f1?.athlete?.headshot?.href || f1?.team?.logo || "", record: f1?.records?.[0]?.summary || f1?.athlete?.record || "", winner: f1?.winner },
        f2: { name: f2?.athlete?.displayName || f2?.team?.displayName || "TBD", logo: f2?.athlete?.headshot?.href || f2?.team?.logo || "", record: f2?.records?.[0]?.summary || f2?.athlete?.record || "", winner: f2?.winner },
        result: bout.status?.type?.description || "",
      };
    });
    return { id: ev.id, name: ev.name, date: ev.date, isLive, isFinal, isScheduled, bouts };
  });

  const liveCount = events.filter(e=>e.isLive).length;

  return (
    <SportPageShell title="UFC" subtitle="MMA" emoji="🥊" liveCount={liveCount} loading={data.loading} error={data.error}>
      {!data.loading&&!data.error&&events.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:36,marginBottom:12}}>🥊</div>
          <div style={{fontSize:14,color:"#555"}}>No UFC events scheduled.</div>
        </div>
      )}
      {events.map(ev=>(
        <div key={ev.id} style={{marginBottom:40}}>
          {/* Event header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",fontFamily:fd,letterSpacing:"-0.02em"}}>{ev.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                {ev.isLive&&<span style={{width:7,height:7,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 2s infinite"}}/>}
                <span style={{fontSize:11,fontWeight:700,color:ev.isLive?B.green:ev.isFinal?"#555":"#666",fontFamily:fm,letterSpacing:"0.08em"}}>
                  {ev.isLive?"LIVE":ev.isFinal?"FINAL":"UPCOMING"}
                </span>
              </div>
            </div>
          </div>
          {/* Bouts */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ev.bouts.length===0&&(
              <div style={{background:"#111",border:"1px solid #1f1f1f",borderRadius:16,padding:"24px",textAlign:"center",color:"#444",fontSize:13}}>
                Fight card details not yet available
              </div>
            )}
            {ev.bouts.map((bout,bi)=>(
              <div key={bout.id||bi} style={{background:bout.isMain?"#1a1a0a":"#111",border:"1px solid "+(bout.isMain?B.primary+"30":"#1f1f1f"),borderRadius:16,padding:"18px 24px"}}>
                {bout.weightclass&&<div style={{fontSize:10,fontWeight:700,color:bout.isMain?B.primary:"#555",letterSpacing:"0.1em",fontFamily:fm,marginBottom:10}}>{bout.weightclass}{bout.isMain?" · MAIN EVENT":""}</div>}
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* Fighter 1 */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    {bout.f1.logo?<img src={bout.f1.logo} style={{width:48,height:48,borderRadius:8,objectFit:"cover"}} alt=""/>
                      :<div style={{width:48,height:48,borderRadius:8,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥊</div>}
                    <div style={{fontSize:13,fontWeight:700,color:bout.f1.winner?"#fff":"#aaa",textAlign:"center"}}>{bout.f1.name}</div>
                    {bout.f1.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{bout.f1.record}</div>}
                    {bout.f1.winner&&<div style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>WIN</div>}
                  </div>
                  {/* VS */}
                  <div style={{flexShrink:0,textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:800,color:"#444",fontFamily:fm}}>VS</div>
                    {bout.detail&&<div style={{fontSize:10,color:"#555",fontFamily:fm,marginTop:4}}>{bout.detail}</div>}
                    {bout.result&&bout.isFinal&&<div style={{fontSize:10,color:"#666",fontFamily:fm,marginTop:2}}>{bout.result}</div>}
                  </div>
                  {/* Fighter 2 */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    {bout.f2.logo?<img src={bout.f2.logo} style={{width:48,height:48,borderRadius:8,objectFit:"cover"}} alt=""/>
                      :<div style={{width:48,height:48,borderRadius:8,background:"#222",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥊</div>}
                    <div style={{fontSize:13,fontWeight:700,color:bout.f2.winner?"#fff":"#aaa",textAlign:"center"}}>{bout.f2.name}</div>
                    {bout.f2.record&&<div style={{fontSize:10,color:"#555",fontFamily:fm}}>{bout.f2.record}</div>}
                    {bout.f2.winner&&<div style={{fontSize:10,fontWeight:700,color:B.green,fontFamily:fm}}>WIN</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </SportPageShell>
  );
}
