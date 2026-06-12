import { useState, useEffect } from "react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";

export function LandingPage({ onLaunch, onDocs }) {
  const [vis, setVis] = useState(false);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => { setTimeout(() => setVis(true), 50); }, []);
  useEffect(() => { const iv = setInterval(() => setTick(t => t+1), 2000); return () => clearInterval(iv); }, []);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const R = "#1fd182", T = "#1fd182", TL = "#52e0a3";
  const logoGrad = "linear-gradient(90deg, #1fd182, #52e0a3, #b8f5d6, #eef1f6, #5ce1ff, #00d4ff)";
  const a = (d) => ({
    opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });

  // Animated terminal preview values
  const liveProb = 58.2 + Math.sin(tick * 0.5) * 2.1;
  const awayProb = 100 - liveProb;
  const oraclePolymarket = (liveProb + Math.sin(tick * 0.7) * 0.4).toFixed(1);
  const oracleKalshi = (liveProb + Math.cos(tick * 0.6) * 0.3).toFixed(1);
  const oracleBooks = (liveProb + Math.sin(tick * 0.8) * 0.5).toFixed(1);
  const oracleEspn = (liveProb + Math.cos(tick * 0.4) * 0.6).toFixed(1);

  return (
    <div style={{background:"#030303",minHeight:"100vh",fontFamily:fb,color:"#fff",overflow:"hidden",position:"relative"}}>
      {/* Background — flowing lines + ambient glows */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <svg viewBox="0 0 1440 900" style={{width:"100%",height:"100%",position:"absolute"}} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gW" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1fd182" stopOpacity="0.07"/><stop offset="50%" stopColor="#52e0a3" stopOpacity="0.04"/><stop offset="100%" stopColor="#52e0a3" stopOpacity="0"/></linearGradient>
            <linearGradient id="gC" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#52e0a3" stopOpacity="0.05"/><stop offset="50%" stopColor="#1fd182" stopOpacity="0.03"/><stop offset="100%" stopColor="#52e0a3" stopOpacity="0"/></linearGradient>
            <linearGradient id="gM" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stopColor="#1fd182" stopOpacity="0"/><stop offset="30%" stopColor="#52e0a3" stopOpacity="0.04"/><stop offset="70%" stopColor="#5ce1ff" stopOpacity="0.04"/><stop offset="100%" stopColor="#00b8d4" stopOpacity="0"/></linearGradient>
            <radialGradient id="rR" cx="25%" cy="30%" r="40%"><stop offset="0%" stopColor="#1fd182" stopOpacity="0.06"/><stop offset="100%" stopColor="#1fd182" stopOpacity="0"/></radialGradient>
            <radialGradient id="rT" cx="75%" cy="60%" r="40%"><stop offset="0%" stopColor="#52e0a3" stopOpacity="0.04"/><stop offset="100%" stopColor="#52e0a3" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#rR)"/>
          <rect width="1440" height="900" fill="url(#rT)"/>
          <path d="M-100,200 C200,150 450,300 720,180 S1100,250 1540,120" fill="none" stroke="url(#gW)" strokeWidth="2"/>
          <path d="M-100,280 C250,230 400,380 700,260 S1050,330 1540,200" fill="none" stroke="url(#gW)" strokeWidth="1.2"/>
          <path d="M-100,550 C200,520 500,620 800,530 S1100,600 1540,490" fill="none" stroke="url(#gC)" strokeWidth="2"/>
          <path d="M-100,650 C300,630 550,710 850,620 S1150,680 1540,590" fill="none" stroke="url(#gC)" strokeWidth="1"/>
          <path d="M-100,400 C300,350 550,500 800,380 S1100,450 1540,320" fill="none" stroke="url(#gM)" strokeWidth="1.5"/>
        </svg>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* CENTERED LOGO AT TOP — no nav bar */}
        <div style={{...a(0),display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:isMobile?"24px 16px 0":"40px 32px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:0,cursor:"pointer"}} onClick={onLaunch}>
            <img src={LOGO_NAV} style={{height:isMobile?96:160,width:"auto"}} alt="Parabolic mark"/>
            <img src={LOGO_WORDMARK} style={{height:isMobile?28:46,width:"auto",marginLeft:isMobile?6:12}} alt="Parabolic"/>
          </div>
        </div>

        {/* HERO */}
        <section style={{maxWidth:900,margin:"0 auto",padding:isMobile?"32px 20px 24px":"56px 32px 40px",textAlign:"center"}}>
          <div style={{...a(0.05),marginBottom:isMobile?14:20}}>
            <span style={{fontSize:isMobile?11:13,fontWeight:600,color:T,display:"inline-flex",alignItems:"center",gap:8,padding:isMobile?"5px 12px":"6px 16px",background:T+"10",borderRadius:20,border:"1px solid "+T+"20"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:T,display:"inline-block",animation:"pulse 2s infinite"}}/>
              Leveraged Sports Markets
            </span>
          </div>
          <h1 style={{...a(0.1),fontFamily:fd,fontSize:isMobile?38:72,fontWeight:800,lineHeight:1.0,letterSpacing:"-0.01em",wordSpacing:"0.12em",margin:isMobile?"0 0 16px":"0 0 24px"}}>
            Leveraged sports<br/>
            <span style={{color:R}}>perpetuals.</span>
          </h1>
          <p style={{...a(0.15),fontSize:isMobile?15:18,lineHeight:1.7,color:"#888",maxWidth:560,margin:isMobile?"0 auto 24px":"0 auto 36px",fontWeight:400}}>
            Trade live win probability with up to 10x leverage. Multi-oracle pricing. Trustless settlement. No counterparty risk.
          </p>
          <div style={{...a(0.2),display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onLaunch} style={{padding:isMobile?"12px 28px":"14px 36px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:isMobile?14:15,background:`linear-gradient(135deg, ${R}, ${TL})`,color:"#fff",borderRadius:12}}>
              Launch App
            </button>
            <button onClick={onDocs} style={{padding:isMobile?"12px 28px":"14px 36px",border:"1px solid #2a2a2a",cursor:"pointer",fontFamily:fb,fontWeight:600,fontSize:isMobile?14:15,background:"transparent",color:"#888",borderRadius:12}}>
              Read Docs
            </button>
          </div>
        </section>

        {/* TERMINAL PREVIEW — accurate trading experience */}
        <div style={{...a(0.25),maxWidth:isMobile?"100%":960,margin:"0 auto",padding:isMobile?"0 12px 60px":"0 32px 80px"}}>
          <div style={{background:"#0a0a0a",border:"1px solid #1f1f1f",borderRadius:isMobile?14:20,overflow:"hidden",boxShadow:"0 30px 80px rgba(254,66,2,0.08)"}}>
            {/* Terminal header */}
            <div style={{padding:isMobile?"10px 14px":"12px 20px",borderBottom:"1px solid #1f1f1f",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#080808"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{display:"flex",gap:5}}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:"#ff5f56",display:"inline-block"}}/>
                  <span style={{width:9,height:9,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/>
                  <span style={{width:9,height:9,borderRadius:"50%",background:"#27c93f",display:"inline-block"}}/>
                </div>
                <span style={{color:"#666",fontWeight:600,fontSize:11,fontFamily:fm,letterSpacing:"0.05em"}}>parabolic terminal · NFL Super Bowl LIX</span>
              </div>
              <span style={{color:B.green,fontSize:10,display:"flex",alignItems:"center",gap:6,fontFamily:fm,fontWeight:700,letterSpacing:"0.06em"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 1.5s infinite"}}/>LIVE
              </span>
            </div>

            {/* Scoreboard strip */}
            <div style={{padding:isMobile?"12px 14px":"14px 20px",borderBottom:"1px solid #1a1a1a",display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:12,background:"#070707"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <img src="https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" alt="PHI" style={{width:isMobile?28:34,height:isMobile?28:34,borderRadius:6,objectFit:"contain"}}/>
                <div>
                  <div style={{fontSize:isMobile?13:14,fontWeight:800,color:"#fff"}}>PHI</div>
                  <div style={{fontSize:9,color:"#666",fontFamily:fm}}>Eagles</div>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:isMobile?22:26,fontWeight:900,color:"#fff",fontFamily:fm,lineHeight:1}}>24 <span style={{color:"#333",fontSize:14}}>—</span> 0</div>
                <div style={{fontSize:9,color:B.green,fontWeight:700,marginTop:3,fontFamily:fm,letterSpacing:"0.08em"}}>Q3 · 14:32</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:isMobile?13:14,fontWeight:800,color:"#aaa"}}>KC</div>
                  <div style={{fontSize:9,color:"#666",fontFamily:fm}}>Chiefs</div>
                </div>
                <img src="https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" alt="KC" style={{width:isMobile?28:34,height:isMobile?28:34,borderRadius:6,objectFit:"contain"}}/>
              </div>
            </div>

            {/* Main grid: chart left, orderbook + wager right */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.6fr 1fr",gap:0}}>
              {/* CHART */}
              <div style={{padding:isMobile?"14px":"18px 20px",borderRight:isMobile?"none":"1px solid #1a1a1a",borderBottom:isMobile?"1px solid #1a1a1a":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:11,color:"#888",fontWeight:600}}>Win Probability</span>
                  <div style={{display:"flex",gap:12}}>
                    <span style={{fontSize:11,fontFamily:fm,fontWeight:700,color:B.green}}>● {liveProb.toFixed(1)}% PHI</span>
                    <span style={{fontSize:11,fontFamily:fm,fontWeight:700,color:B.red}}>● {awayProb.toFixed(1)}% KC</span>
                  </div>
                </div>
                <div style={{height:isMobile?140:180,background:"#050505",borderRadius:10,position:"relative",overflow:"hidden",border:"1px solid #141414"}}>
                  <svg viewBox="0 0 400 180" preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
                    {/* Grid lines */}
                    {[36,72,108,144].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="2 4"/>)}
                    {/* PHI win prob area */}
                    <defs>
                      <linearGradient id="phiArea" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M0,90 L20,82 L40,76 L60,68 L80,55 L100,48 L120,42 L140,38 L160,32 L180,28 L200,30 L220,26 L240,22 L260,20 L280,24 L300,18 L320,22 L340,16 L360,18 L380,20 L400,18 L400,180 L0,180 Z" fill="url(#phiArea)"/>
                    <path d="M0,90 L20,82 L40,76 L60,68 L80,55 L100,48 L120,42 L140,38 L160,32 L180,28 L200,30 L220,26 L240,22 L260,20 L280,24 L300,18 L320,22 L340,16 L360,18 L380,20 L400,18" fill="none" stroke="#22c55e" strokeWidth="2"/>
                    {/* KC win prob */}
                    <path d="M0,90 L20,98 L40,104 L60,112 L80,125 L100,132 L120,138 L140,142 L160,148 L180,152 L200,150 L220,154 L240,158 L260,160 L280,156 L300,162 L320,158 L340,164 L360,162 L380,160 L400,162" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7"/>
                    {/* Entry marker */}
                    <g>
                      <circle cx="100" cy="48" r="5" fill="#059669" stroke="#22c55e" strokeWidth="2"/>
                      <rect x="108" y="35" width="48" height="14" rx="3" fill="#000" stroke="#22c55e" strokeWidth="1"/>
                      <text x="132" y="45" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="900" fontFamily="ui-monospace,monospace">IN 52¢</text>
                    </g>
                    {/* Scoring play marker */}
                    <g>
                      <circle cx="200" cy="30" r="3" fill="#52e0a3"/>
                      <text x="200" y="14" textAnchor="middle" fill="#52e0a3" fontSize="8" fontWeight="700" fontFamily="ui-monospace,monospace">⚡ TD</text>
                    </g>
                    {/* Liquidation reference line */}
                    <line x1="0" y1="120" x2="400" y2="120" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.4"/>
                    <rect x="8" y="113" width="58" height="14" rx="3" fill="#000" stroke="#ef4444" strokeWidth="1"/>
                    <text x="37" y="123" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="900" fontFamily="ui-monospace,monospace">LIQ 42¢</text>
                  </svg>
                  <div style={{position:"absolute",bottom:6,left:10,right:10,display:"flex",justifyContent:"space-between",fontSize:9,color:"#444",fontFamily:fm}}>
                    <span>Q1</span><span>Q2</span><span>HALF</span><span>Q3</span>
                  </div>
                </div>
                {/* Oracle source breakdown */}
                <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap",fontSize:9,fontFamily:fm}}>
                  <span style={{color:"#666"}}>ORACLE</span>
                  <span style={{color:"#818cf8"}}>● Polymarket {oraclePolymarket}%</span>
                  <span style={{color:"#fbbf24"}}>● Kalshi {oracleKalshi}%</span>
                  <span style={{color:"#fbbf24"}}>● Books {oracleBooks}%</span>
                  <span style={{color:B.pink}}>● ESPN {oracleEspn}%</span>
                </div>
              </div>

              {/* RIGHT SIDE: orderbook preview + wager */}
              <div style={{display:"flex",flexDirection:"column"}}>
                {/* Mini orderbook */}
                <div style={{padding:isMobile?"14px":"16px 20px",borderBottom:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:"0.06em",marginBottom:8,fontFamily:fm}}>ORDERBOOK</div>
                  <div style={{fontFamily:fm,fontSize:11}}>
                    {[{p:60.5,s:142,side:"ask"},{p:59.8,s:88,side:"ask"},{p:59.2,s:215,side:"ask"}].map((o,i)=>(
                      <div key={"a"+i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",height:18,alignItems:"center",position:"relative"}}>
                        <div style={{position:"absolute",right:0,top:0,bottom:0,background:"#ef444425",width:`${o.s/3}%`,borderRadius:2}}/>
                        <span style={{color:"#ff7a8c",fontWeight:800,position:"relative",zIndex:1}}>{o.p}¢</span>
                        <span style={{color:"#aaa",textAlign:"right",fontSize:10,position:"relative",zIndex:1}}>{o.s}</span>
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid #2a2a2a",borderBottom:"1px solid #2a2a2a",margin:"4px 0",padding:"4px 0",display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#fff",fontWeight:900}}>{liveProb.toFixed(1)}¢</span>
                      <span style={{color:"#666",fontSize:9}}>mid · 0.6¢ spread</span>
                    </div>
                    {[{p:58.2,s:198,side:"bid"},{p:57.6,s:120,side:"bid"},{p:57.0,s:165,side:"bid"}].map((o,i)=>(
                      <div key={"b"+i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",height:18,alignItems:"center",position:"relative"}}>
                        <div style={{position:"absolute",left:0,top:0,bottom:0,background:"#22c55e25",width:`${o.s/3}%`,borderRadius:2}}/>
                        <span style={{color:"#5fe88c",fontWeight:800,position:"relative",zIndex:1}}>{o.p}¢</span>
                        <span style={{color:"#aaa",textAlign:"right",fontSize:10,position:"relative",zIndex:1}}>{o.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Wager panel */}
                <div style={{padding:isMobile?"14px":"16px 20px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:10,color:"#666",fontWeight:700,letterSpacing:"0.06em",fontFamily:fm}}>WAGER</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{background:"#050505",borderRadius:8,padding:"8px 10px",border:"1px solid #1a1a1a"}}>
                      <div style={{fontSize:9,color:"#555",marginBottom:1}}>Margin</div>
                      <div style={{fontSize:14,fontWeight:800,fontFamily:fm,color:"#fff"}}>$1,000</div>
                    </div>
                    <div style={{background:"#050505",borderRadius:8,padding:"8px 10px",border:"1px solid #1a1a1a"}}>
                      <div style={{fontSize:9,color:"#555",marginBottom:1}}>Leverage</div>
                      <div style={{fontSize:14,fontWeight:800,fontFamily:fm,color:T}}>5<span style={{color:"#555",fontSize:11}}>×</span></div>
                    </div>
                  </div>
                  <div style={{background:T+"10",border:"1px solid "+T+"30",borderRadius:8,padding:"7px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#888",marginBottom:2}}>
                      <span>If PHI wins</span><span style={{color:B.green,fontWeight:800,fontSize:12}}>+$3,620</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#666"}}>
                      <span>Liquidation</span><span style={{color:B.red,fontFamily:fm,fontWeight:700}}>42.0¢ · 28% away</span>
                    </div>
                  </div>
                  <button style={{padding:"10px 0",background:`linear-gradient(135deg, ${B.green}, ${B.greenLight})`,color:"#000",fontWeight:800,fontSize:13,border:"none",borderRadius:8,cursor:"pointer",fontFamily:fb,letterSpacing:"0.02em"}}>
                    Buy PHI · 1,923 shares
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom strip: market stats */}
            <div style={{padding:isMobile?"10px 14px":"12px 20px",borderTop:"1px solid #1a1a1a",background:"#070707",display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:isMobile?8:14,fontFamily:fm}}>
              {[
                {l:"Mark",v:`${liveProb.toFixed(1)}¢`,c:"#fff"},
                {l:"Volume 24h",v:"$84.2K",c:"#fff"},
                {l:"Open Interest",v:"$12.5K",c:"#fff"},
                {l:"Funding/hr",v:"+0.012%",c:B.green}
              ].map((s,i)=>(
                <div key={i}>
                  <div style={{fontSize:9,color:"#555",marginBottom:2,letterSpacing:"0.04em"}}>{s.l}</div>
                  <div style={{fontSize:isMobile?12:13,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats ticker */}
        <div style={{...a(0.3),borderTop:"1px solid #1a1a1a",borderBottom:"1px solid #1a1a1a",overflow:"hidden"}}>
          <div style={{display:"flex",animation:"scroll 20s linear infinite"}}>
            {[...Array(2)].map((_,ri) => (
              <div key={ri} style={{display:"flex",flexShrink:0}}>
                {[{l:"Total Addressable Market",v:"$2.4T"},{l:"Max Leverage",v:"10×"},{l:"Oracle Sources",v:"5"},{l:"Price Updates",v:"<1s"},{l:"Settlement",v:"Trustless"},{l:"Counterparty Risk",v:"Zero"},{l:"Liquidation Engine",v:"Real-Time"}].map((s,i) => (
                  <div key={i} style={{padding:"16px 36px",display:"flex",alignItems:"center",gap:10,whiteSpace:"nowrap",borderRight:"1px solid #1a1a1a"}}>
                    <span style={{fontSize:12,color:"#555",fontWeight:500}}>{s.l}</span>
                    <span style={{fontSize:14,color:"#fff",fontWeight:700,fontFamily:fm}}>{s.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS — with visuals */}
        <section style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"60px 16px":"100px 32px"}}>
          <div style={{...a(0.35),textAlign:"center",marginBottom:isMobile?40:72}}>
            <span style={{fontSize:isMobile?36:70,fontWeight:800,letterSpacing:"-0.01em",wordSpacing:"0.1em",color:R}}>How it works</span>
            <h2 style={{fontFamily:fd,fontSize:isMobile?20:30,fontWeight:700,letterSpacing:"-0.01em",wordSpacing:"0.1em",marginTop:12,lineHeight:1.1,color:"#fff"}}>Three steps. Zero complexity.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:isMobile?20:24}}>
            {/* STEP 1 — Pick a Side */}
            <div style={{...a(0.4),background:"#0a0a0a",borderRadius:18,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"28px 24px",display:"flex",flexDirection:"column"}}>
              <div style={{height:isMobile?140:180,background:"#050505",borderRadius:12,marginBottom:18,padding:14,display:"flex",flexDirection:"column",justifyContent:"center",gap:10,border:"1px solid #1a1a1a"}}>
                <div style={{fontSize:9,color:"#555",fontWeight:700,letterSpacing:"0.08em",fontFamily:fm}}>SELECT YOUR SIDE</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#22c55e15",border:"2px solid #22c55e",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                    <img src="https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" alt="PHI" style={{width:32,height:32,objectFit:"contain",marginBottom:4}}/>
                    <div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>PHI</div>
                    <div style={{fontSize:10,color:"#22c55e",fontFamily:fm,fontWeight:700,marginTop:2}}>58.2¢</div>
                  </div>
                  <div style={{background:"#1a1a1a",border:"2px solid #2a2a2a",borderRadius:10,padding:"12px 8px",textAlign:"center",opacity:0.6}}>
                    <img src="https://a.espncdn.com/i/teamlogos/nfl/500/kc.png" alt="KC" style={{width:32,height:32,objectFit:"contain",marginBottom:4,opacity:0.5}}/>
                    <div style={{fontSize:13,fontWeight:800,color:"#888"}}>KC</div>
                    <div style={{fontSize:10,color:"#666",fontFamily:fm,fontWeight:700,marginTop:2}}>41.8¢</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#444",fontFamily:fm}}>
                  <span>← BUY PHI to LONG</span><span>BUY KC to SHORT →</span>
                </div>
              </div>
              <div style={{fontSize:isMobile?32:42,fontWeight:800,color:R,lineHeight:1,marginBottom:10,fontFamily:fm}}>01</div>
              <h3 style={{fontFamily:fd,fontSize:isMobile?17:20,fontWeight:700,marginBottom:8,color:"#fff"}}>Pick a Side</h3>
              <p style={{fontSize:isMobile?13:14,lineHeight:1.6,color:"#888"}}>Select the team you believe wins. You're trading their live win probability as a perpetual future.</p>
            </div>

            {/* STEP 2 — Set Leverage */}
            <div style={{...a(0.45),background:"#0a0a0a",borderRadius:18,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"28px 24px",display:"flex",flexDirection:"column"}}>
              <div style={{height:isMobile?140:180,background:"#050505",borderRadius:12,marginBottom:18,padding:14,display:"flex",flexDirection:"column",justifyContent:"center",gap:14,border:"1px solid #1a1a1a"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontSize:9,color:"#555",fontWeight:700,letterSpacing:"0.08em",fontFamily:fm}}>LEVERAGE</span>
                  <span style={{fontSize:24,fontWeight:900,color:"#52e0a3",fontFamily:fm,lineHeight:1}}>5<span style={{fontSize:14,color:"#666"}}>×</span></span>
                </div>
                {/* Slider */}
                <div style={{position:"relative",height:6,background:"#1a1a1a",borderRadius:3}}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:"45%",borderRadius:3,background:"linear-gradient(90deg, #1fd182, #52e0a3)"}}/>
                  <div style={{position:"absolute",left:"45%",top:-5,width:16,height:16,borderRadius:"50%",background:"#52e0a3",border:"2px solid #fff",transform:"translateX(-50%)",boxShadow:"0 0 12px #52e0a380"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#555",fontFamily:fm}}>
                  <span>1×</span><span>3×</span><span>5×</span><span>7×</span><span>10×</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {[2,3,5,10].map(v=>(
                    <span key={v} style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:10,fontWeight:700,fontFamily:fm,background:v===5?"#52e0a320":"#0a0a0a",color:v===5?"#52e0a3":"#666",borderRadius:5,border:"1px solid "+(v===5?"#52e0a340":"#1a1a1a")}}>{v}×</span>
                  ))}
                </div>
              </div>
              <div style={{fontSize:isMobile?32:42,fontWeight:800,color:"#52e0a3",lineHeight:1,marginBottom:10,fontFamily:fm}}>02</div>
              <h3 style={{fontFamily:fd,fontSize:isMobile?17:20,fontWeight:700,marginBottom:8,color:"#fff"}}>Set Leverage</h3>
              <p style={{fontSize:isMobile?13:14,lineHeight:1.6,color:"#888"}}>1× to 10×. Higher leverage amplifies gains and losses. Dynamic liquidation engine protects the pool.</p>
            </div>

            {/* STEP 3 — Trade Live */}
            <div style={{...a(0.5),background:"#0a0a0a",borderRadius:18,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"28px 24px",display:"flex",flexDirection:"column"}}>
              <div style={{height:isMobile?140:180,background:"#050505",borderRadius:12,marginBottom:18,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between",border:"1px solid #1a1a1a",position:"relative",overflow:"hidden"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:9,color:"#555",fontWeight:700,letterSpacing:"0.08em",fontFamily:fm}}>POSITION P&L</span>
                  <span style={{fontSize:9,color:B.green,fontWeight:700,fontFamily:fm,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:B.green,display:"inline-block",animation:"pulse 1.5s infinite"}}/>LIVE
                  </span>
                </div>
                <svg viewBox="0 0 240 80" preserveAspectRatio="none" style={{width:"100%",height:50}}>
                  <defs>
                    <linearGradient id="pnlArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,55 L20,52 L40,48 L60,42 L80,40 L100,35 L120,28 L140,25 L160,20 L180,18 L200,15 L220,12 L240,10 L240,80 L0,80 Z" fill="url(#pnlArea)"/>
                  <path d="M0,55 L20,52 L40,48 L60,42 L80,40 L100,35 L120,28 L140,25 L160,20 L180,18 L200,15 L220,12 L240,10" fill="none" stroke="#22c55e" strokeWidth="2"/>
                  <circle cx="240" cy="10" r="4" fill="#22c55e" stroke="#fff" strokeWidth="1.5"/>
                </svg>
                <div>
                  <div style={{fontSize:24,fontWeight:900,color:B.green,fontFamily:fm,lineHeight:1}}>+$1,847</div>
                  <div style={{fontSize:10,color:B.green,fontWeight:700,fontFamily:fm,marginTop:2}}>+184.7% return</div>
                </div>
              </div>
              <div style={{fontSize:isMobile?32:42,fontWeight:800,color:T,lineHeight:1,marginBottom:10,fontFamily:fm}}>03</div>
              <h3 style={{fontFamily:fd,fontSize:isMobile?17:20,fontWeight:700,marginBottom:8,color:"#fff"}}>Trade Live</h3>
              <p style={{fontSize:isMobile?13:14,lineHeight:1.6,color:"#888"}}>Watch the game. Your position moves with real-time oracle prices. Close anytime or ride to settlement.</p>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section style={{maxWidth:1100,margin:"0 auto",padding:isMobile?"0 16px 60px":"0 32px 100px"}}>
          <div style={{...a(0.55),textAlign:"center",marginBottom:isMobile?32:64}}>
            <span style={{fontSize:isMobile?36:70,fontWeight:800,letterSpacing:"-0.01em",wordSpacing:"0.1em",color:R}}>Architecture</span>
            <h2 style={{fontFamily:fd,fontSize:isMobile?20:30,fontWeight:700,letterSpacing:"-0.01em",wordSpacing:"0.1em",marginTop:12,lineHeight:1.1,color:"#fff"}}>DeFi-grade infrastructure.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?12:16}}>
            {[{title:"Multi-Oracle Consensus",desc:"Weighted median across Polymarket, Kalshi, sportsbooks, ESPN and our internal model. Manipulation-resistant fair price discovery.",icon:"◉",c:R},{title:"Perpetual Futures",desc:"Continuous price exposure to win probability. Not a binary bet — trade in, trade out at any point during the live game.",icon:"∞",c:"#52e0a3"},{title:"Liquidation Engine",desc:"Real-time mark-to-market. Dynamic max leverage based on oracle confidence. Automatic liquidation protects the pool.",icon:"⚡",c:TL},{title:"Trustless Settlement",desc:"Every trade, funding payment, and liquidation settles trustlessly. Transparent, verifiable, zero counterparty risk.",icon:"◆",c:T}].map((f,i) => (
              <div key={f.title} style={{...a(0.6+i*0.05),background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"32px 28px"}}>
                <div style={{fontSize:isMobile?20:24,color:f.c,marginBottom:isMobile?12:16}}>{f.icon}</div>
                <h4 style={{fontFamily:fd,fontSize:isMobile?15:16,fontWeight:700,marginBottom:10}}>{f.title}</h4>
                <p style={{fontSize:isMobile?13:14,lineHeight:1.7,color:"#888",fontWeight:400}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{...a(0.7),padding:isMobile?"40px 16px":"80px 32px",textAlign:"center"}}>
          <div style={{maxWidth:700,margin:"0 auto",padding:isMobile?"40px 20px":"60px 40px",background:"#0a0a0a",borderRadius:isMobile?16:24,border:"1px solid #1f1f1f",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-50%",left:"-20%",width:"140%",height:"200%",background:`radial-gradient(ellipse at 30% 50%, ${R}08 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, ${T}08 0%, transparent 50%)`,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <h2 style={{fontFamily:fd,fontSize:isMobile?32:48,fontWeight:800,letterSpacing:"-0.01em",wordSpacing:"0.1em",marginBottom:14}}>
                See it <span style={{color:R}}>live.</span>
              </h2>
              <p style={{fontSize:isMobile?14:16,color:"#888",marginBottom:isMobile?24:32,fontWeight:400}}>Replay real championship games with the full trading engine.</p>
              <button onClick={onLaunch} style={{padding:isMobile?"14px 36px":"16px 48px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:isMobile?14:16,background:`linear-gradient(135deg, ${R}, ${TL})`,color:"#fff",borderRadius:12}}>
                Launch App →
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{borderTop:"1px solid #1a1a1a",padding:isMobile?"20px 16px":"24px 48px",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:"center",gap:isMobile?12:0}}>
          <span style={{fontSize:isMobile?12:13,color:"#444",display:"flex",alignItems:"center",gap:10}}><img src={LOGO_NAV} style={{height:isMobile?24:32,width:"auto",opacity:0.55}} alt=""/>© 2026 Parabolic</span>
          <a href="https://x.com/parabolic" target="_blank" rel="noopener noreferrer" aria-label="Follow @parabolic on X"
            style={{display:"flex",alignItems:"center",justifyContent:"center",width:isMobile?32:36,height:isMobile?32:36,borderRadius:8,background:"transparent",border:"1px solid #2a2a2a",cursor:"pointer",transition:"all .15s",color:"#888"}}
            onMouseOver={(e)=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="#444";}}
            onMouseOut={(e)=>{e.currentTarget.style.color="#888";e.currentTarget.style.borderColor="#2a2a2a";}}>
            {/* Official X logo */}
            <svg viewBox="0 0 24 24" width={isMobile?14:16} height={isMobile?14:16} fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </footer>
      </div>
    </div>
  );
}
