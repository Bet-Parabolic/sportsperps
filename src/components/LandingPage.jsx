import { useState, useEffect } from "react";
import { fb, fd, fm } from "../lib/theme.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";
import { PlatformStats } from "./PlatformStats.jsx";

export function LandingPage({ onLaunch, onDocs }) {
  const [vis, setVis] = useState(false);
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => { setTimeout(() => setVis(true), 50); }, []);
  useEffect(() => { const iv = setInterval(() => setTick(t => t+1), 2000); return () => clearInterval(iv); }, []);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  // Brand palette: orange → warm → amber → white → ice → cyan
  const R = "#fe4202", T = "#fe4202", TL = "#ff6b2b";
  const logoGrad = "linear-gradient(90deg, #fe4202, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00d4ff)";
  const a = (d) => ({
    opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${d}s`,
  });
  const liveProb = 58.2 + Math.sin(tick * 0.5) * 2.1;

  return (
    <div style={{background:"#030303",minHeight:"100vh",fontFamily:fb,color:"#fff",overflow:"hidden",position:"relative"}}>
      {/* Background — flowing lines in red/teal + ambient glows */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <svg viewBox="0 0 1440 900" style={{width:"100%",height:"100%",position:"absolute"}} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gW" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0.07"/><stop offset="50%" stopColor="#ff6b2b" stopOpacity="0.04"/><stop offset="100%" stopColor="#ff9f1c" stopOpacity="0"/></linearGradient>
            <linearGradient id="gC" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ff9f1c" stopOpacity="0.05"/><stop offset="50%" stopColor="#fe4202" stopOpacity="0.03"/><stop offset="100%" stopColor="#ff6b2b" stopOpacity="0"/></linearGradient>
            <linearGradient id="gM" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0"/><stop offset="30%" stopColor="#ff6b2b" stopOpacity="0.04"/><stop offset="70%" stopColor="#5ce1ff" stopOpacity="0.04"/><stop offset="100%" stopColor="#00b8d4" stopOpacity="0"/></linearGradient>
            <linearGradient id="gF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fff" stopOpacity="0.02"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/></linearGradient>
            <radialGradient id="rR" cx="25%" cy="30%" r="40%"><stop offset="0%" stopColor="#ff1744" stopOpacity="0.06"/><stop offset="100%" stopColor="#ff1744" stopOpacity="0"/></radialGradient>
            <radialGradient id="rT" cx="75%" cy="60%" r="40%"><stop offset="0%" stopColor="#ff6b2b" stopOpacity="0.04"/><stop offset="100%" stopColor="#ff6b2b" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#rR)"/>
          <rect width="1440" height="900" fill="url(#rT)"/>
          <path d="M-100,200 C200,150 450,300 720,180 S1100,250 1540,120" fill="none" stroke="url(#gW)" strokeWidth="2"/>
          <path d="M-100,280 C250,230 400,380 700,260 S1050,330 1540,200" fill="none" stroke="url(#gW)" strokeWidth="1.2"/>
          <path d="M-100,120 C300,80 500,200 800,100 S1200,170 1540,50" fill="none" stroke="url(#gW)" strokeWidth="0.8"/>
          <path d="M-100,550 C200,520 500,620 800,530 S1100,600 1540,490" fill="none" stroke="url(#gC)" strokeWidth="2"/>
          <path d="M-100,650 C300,630 550,710 850,620 S1150,680 1540,590" fill="none" stroke="url(#gC)" strokeWidth="1"/>
          <path d="M-100,750 C250,730 450,790 750,720 S1050,770 1540,680" fill="none" stroke="url(#gC)" strokeWidth="0.7"/>
          <path d="M-100,400 C300,350 550,500 800,380 S1100,450 1540,320" fill="none" stroke="url(#gM)" strokeWidth="1.5"/>
          <path d="M-100,470 C350,440 600,540 900,440 S1200,510 1540,400" fill="none" stroke="url(#gM)" strokeWidth="1"/>
          <path d="M0,-50 C250,100 500,250 750,350 S1100,500 1440,650" fill="none" stroke="url(#gF)" strokeWidth="0.5"/>
          <path d="M300,-50 C450,80 650,200 900,300 S1200,430 1440,550" fill="none" stroke="url(#gF)" strokeWidth="0.4"/>
        </svg>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        {/* NAV */}
        <div style={{...a(0),padding:isMobile?"10px 12px":"16px 32px",display:"flex",justifyContent:"center"}}>
          <nav style={{width:"100%",maxWidth:900,padding:isMobile?"8px 16px":"8px 28px",display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",background:"#0a0a0acc",backdropFilter:"blur(20px)",borderRadius:isMobile?12:16,border:"1px solid #1f1f1f"}}>
            {/* LEFT — pd emblem */}
            <div style={{display:"flex",alignItems:"center",justifySelf:"start",marginLeft:isMobile?-10:-30}}>
              <img src={LOGO_NAV} style={{height:isMobile?100:252,width:"auto",margin:isMobile?"-28px 0":"-80px 0",marginLeft:isMobile?-16:-45,marginRight:isMobile?-16:-48}} alt="Perpdictions"/>
            </div>
            {/* CENTER — wordmark */}
            <img src={LOGO_WORDMARK} style={{height:isMobile?24:54,width:"auto",justifySelf:"center"}} alt="Perpdictions"/>
            {/* RIGHT — Launch App */}
            <button onClick={onLaunch} style={{padding:isMobile?"10px 20px":"12px 30px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:isMobile?14:18,background:`linear-gradient(135deg, ${R}, #ff6b2b)`,color:"#fff",borderRadius:10,justifySelf:"end"}}>
              Launch App
            </button>
          </nav>
        </div>

        {/* HERO */}
        <section style={{maxWidth:900,margin:"0 auto",padding:isMobile?"40px 20px 24px":"80px 32px 40px",textAlign:"center"}}>
          <div style={{...a(0.05),marginBottom:isMobile?14:20}}>
            <span style={{fontSize:isMobile?11:13,fontWeight:600,color:T,display:"inline-flex",alignItems:"center",gap:8,padding:isMobile?"5px 12px":"6px 16px",background:T+"10",borderRadius:20,border:"1px solid "+T+"20"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:T,display:"inline-block",animation:"pulse 2s infinite"}}/>
              Leveraged Sports Markets
            </span>
          </div>
          <h1 style={{...a(0.1),fontFamily:fd,fontSize:isMobile?38:72,fontWeight:800,lineHeight:1.0,letterSpacing:"-0.04em",margin:isMobile?"0 0 16px":"0 0 24px"}}>
            Leveraged sports<br/>
            <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>perpetuals.</span>
          </h1>
          <p style={{...a(0.15),fontSize:isMobile?15:18,lineHeight:1.7,color:"#888",maxWidth:560,margin:isMobile?"0 auto 24px":"0 auto 36px",fontWeight:400}}>
            Trade live win probability with up to 10x leverage. Multi-oracle pricing. Trustless settlement. No counterparty risk.
          </p>
          <div style={{...a(0.2),display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onLaunch} style={{padding:isMobile?"12px 28px":"14px 36px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:isMobile?14:15,background:`linear-gradient(135deg, ${R}, #ff6b2b)`,color:"#fff",borderRadius:12}}>
              Try Demo
            </button>
            <button onClick={onDocs} style={{padding:isMobile?"12px 28px":"14px 36px",border:"1px solid #2a2a2a",cursor:"pointer",fontFamily:fb,fontWeight:600,fontSize:isMobile?14:15,background:"transparent",color:"#888",borderRadius:12}}>
              Read Docs
            </button>
          </div>
        </section>

        {/* LIVE PLATFORM STATS */}
        <PlatformStats delay={a(0.22)}/>

        {/* TERMINAL PREVIEW */}
        <div style={{...a(0.25),maxWidth:680,margin:"0 auto",padding:isMobile?"0 12px 40px":"0 32px 60px"}}>
          <div style={{background:"#0a0a0a",border:"1px solid #1f1f1f",borderRadius:20,overflow:"hidden"}}>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #1f1f1f",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#666",fontWeight:600,fontSize:12}}>Perpdictions terminal</span>
              <span style={{color:T,fontSize:11,display:"flex",alignItems:"center",gap:6,fontFamily:fm}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:T,display:"inline-block"}}/>LIVE
              </span>
            </div>
            <div style={{padding:"20px 24px"}}>
              <div style={{fontSize:12,color:"#555",marginBottom:14}}>NFL · Super Bowl LIX</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
                <div>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>🦅 Eagles Win</div>
                  <div style={{fontSize:40,fontWeight:800,color:"#22c55e",lineHeight:1,fontFamily:fm}}>{liveProb.toFixed(1)}<span style={{fontSize:16,color:"#666"}}>%</span></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>🏹 Chiefs Win</div>
                  <div style={{fontSize:40,fontWeight:800,color:"#ef4444",lineHeight:1,fontFamily:fm}}>{(100-liveProb).toFixed(1)}<span style={{fontSize:16,color:"#666"}}>%</span></div>
                </div>
              </div>
              <div style={{height:80,background:"#050505",borderRadius:12,marginBottom:16,position:"relative",overflow:"hidden",border:"1px solid #1a1a1a"}}>
                <svg viewBox="0 0 300 80" style={{width:"100%",height:"100%"}}>
                  <path d="M0,40 Q30,35 60,38 T120,30 T180,25 T240,20 T300,18" fill="none" stroke={R} strokeWidth="2" opacity="0.8"/>
                  <path d="M0,40 Q30,45 60,42 T120,50 T180,55 T240,60 T300,62" fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.6"/>
                </svg>
                <div style={{position:"absolute",bottom:4,right:10,fontSize:10,color:"#444"}}>Q1 → Q4</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:"#050505",borderRadius:10,padding:"10px 14px",border:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:11,color:"#555",marginBottom:2}}>Bet Amount</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:fm}}>$1,000</div>
                </div>
                <div style={{background:"#050505",borderRadius:10,padding:"10px 14px",border:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:11,color:"#555",marginBottom:2}}>Leverage</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:fm}}>5<span style={{color:"#555"}}>x</span></div>
                </div>
              </div>
              <div style={{background:T+"10",border:"1px solid "+T+"20",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#888",fontSize:13}}>If Eagles Win</span>
                <span style={{color:TL,fontWeight:800,fontSize:15}}>+$3,620</span>
              </div>
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

        {/* How it works */}
        <section style={{maxWidth:1100,margin:"0 auto",padding:isMobile?"60px 16px":"100px 32px"}}>
          <div style={{...a(0.35),textAlign:"center",marginBottom:isMobile?32:64}}>
            <span style={{fontSize:isMobile?36:70,fontWeight:800,letterSpacing:"-0.03em",background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>How it works</span>
            <h2 style={{fontFamily:fd,fontSize:isMobile?20:30,fontWeight:700,letterSpacing:"-0.03em",marginTop:12,lineHeight:1.1,color:"#fff"}}>Three steps. Zero complexity.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:16}}>
            {[{n:"01",title:"Pick a Side",desc:"Select the team you believe wins. You're trading their win probability as a perpetual future.",c:R},{n:"02",title:"Set Leverage",desc:"1x to 10x. Higher leverage amplifies gains and losses. Dynamic liquidation engine protects the pool.",c:"#ff9f1c"},{n:"03",title:"Trade Live",desc:"Watch the game. Your position moves with real-time oracle prices. Close anytime or ride to settlement.",c:T}].map((s,i) => (
              <div key={s.n} style={{...a(0.4+i*0.05),background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"36px 28px"}}>
                <div style={{fontSize:isMobile?36:48,fontWeight:800,color:s.c,lineHeight:1,marginBottom:isMobile?14:20,fontFamily:fm}}>{s.n}</div>
                <h3 style={{fontFamily:fd,fontSize:isMobile?16:18,fontWeight:700,marginBottom:10,color:s.c}}>{s.title}</h3>
                <p style={{fontSize:isMobile?13:14,lineHeight:1.7,color:"#888",fontWeight:400}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section style={{maxWidth:1100,margin:"0 auto",padding:isMobile?"0 16px 60px":"0 32px 100px"}}>
          <div style={{...a(0.45),textAlign:"center",marginBottom:isMobile?32:64}}>
            <span style={{fontSize:isMobile?36:70,fontWeight:800,letterSpacing:"-0.03em",background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Architecture</span>
            <h2 style={{fontFamily:fd,fontSize:isMobile?20:30,fontWeight:700,letterSpacing:"-0.03em",marginTop:12,lineHeight:1.1,color:"#fff"}}>DeFi-grade infrastructure.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?12:16}}>
            {[{title:"Multi-Oracle Consensus",desc:"Weighted median across Polymarket, Kalshi, sportsbooks, ESPN and our internal model. Manipulation-resistant fair price discovery.",icon:"◉",c:R},{title:"Perpetual Futures",desc:"Continuous price exposure to win probability. Not a binary bet — trade in, trade out at any point during the live game.",icon:"∞",c:"#ff9f1c"},{title:"Liquidation Engine",desc:"Real-time mark-to-market. Dynamic max leverage based on oracle confidence. Automatic liquidation protects the pool.",icon:"⚡",c:TL},{title:"Trustless Settlement",desc:"Every trade, funding payment, and liquidation settles trustlessly. Transparent, verifiable, zero counterparty risk.",icon:"◆",c:T}].map((f,i) => (
              <div key={f.title} style={{...a(0.5+i*0.05),background:"#0a0a0a",borderRadius:16,border:"1px solid #1f1f1f",padding:isMobile?"24px 20px":"32px 28px"}}>
                <div style={{fontSize:isMobile?20:24,color:f.c,marginBottom:isMobile?12:16}}>{f.icon}</div>
                <h4 style={{fontFamily:fd,fontSize:isMobile?15:16,fontWeight:700,marginBottom:10}}>{f.title}</h4>
                <p style={{fontSize:isMobile?13:14,lineHeight:1.7,color:"#888",fontWeight:400}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{...a(0.6),padding:isMobile?"40px 16px":"80px 32px",textAlign:"center"}}>
          <div style={{maxWidth:700,margin:"0 auto",padding:isMobile?"40px 20px":"60px 40px",background:"#0a0a0a",borderRadius:isMobile?16:24,border:"1px solid #1f1f1f",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"-50%",left:"-20%",width:"140%",height:"200%",background:`radial-gradient(ellipse at 30% 50%, ${R}08 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, ${T}08 0%, transparent 50%)`,pointerEvents:"none"}}/>
            <div style={{position:"relative"}}>
              <h2 style={{fontFamily:fd,fontSize:isMobile?32:48,fontWeight:800,letterSpacing:"-0.03em",marginBottom:14}}>
                See it <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>live.</span>
              </h2>
              <p style={{fontSize:isMobile?14:16,color:"#888",marginBottom:isMobile?24:32,fontWeight:400}}>Replay real championship games with the full trading engine.</p>
              <button onClick={onLaunch} style={{padding:isMobile?"14px 36px":"16px 48px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:isMobile?14:16,background:`linear-gradient(135deg, ${R}, #ff6b2b)`,color:"#fff",borderRadius:12}}>
                Launch Demo →
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{borderTop:"1px solid #1a1a1a",padding:isMobile?"20px 16px":"24px 48px",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:"center",gap:isMobile?12:0}}>
          <span style={{fontSize:isMobile?12:13,color:"#444",display:"flex",alignItems:"center",gap:8}}><img src={LOGO_NAV} style={{height:isMobile?32:64,width:"auto",opacity:0.5,margin:isMobile?"-8px 0":0}} alt=""/>© 2026 Perpdictions</span>
          <div style={{display:"flex",gap:isMobile?16:24}}>
            {["Twitter","Discord","GitHub","Docs"].map(t => (<span key={t} style={{fontSize:isMobile?12:13,color:"#555",cursor:"pointer"}}>{t}</span>))}
          </div>
        </footer>
      </div>
    </div>
  );
}
