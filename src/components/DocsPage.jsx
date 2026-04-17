import { useState, useEffect } from "react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { clamp } from "../lib/helpers.js";
import { LOGO_NAV, LOGO_WORDMARK } from "../lib/logos.js";

export function DocsPage({ onBack, onLaunch }) {
  const [vis, setVis] = useState(false);
  const [activeSection, setActiveSection] = useState("intro");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showNav, setShowNav] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 50); window.scrollTo(0,0); }, []);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const a = (d) => ({ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(16px)", transition:`all 0.6s cubic-bezier(0.16,1,0.3,1) ${d}s` });

  const T = "#fe4202", TL = "#ff6b2b", R = "#fe4202";
  const logoGrad = "linear-gradient(90deg, #ff1744, #ff6b2b, #ff9f1c, #ffffff, #5ce1ff, #00b8d4)";

  const sections = [
    {id:"intro",label:"Introduction"},
    {id:"overview",label:"Overview"},
    {id:"how",label:"How It Works"},
    {id:"architecture",label:"System Architecture"},
    {id:"orderbook",label:"Offchain Orderbook"},
    {id:"oracle",label:"Oracle System"},
    {id:"funding",label:"Funding Rates"},
    {id:"margin",label:"Margin & Leverage"},
    {id:"risk",label:"Risk Management"},
    {id:"lifecycle",label:"Market Lifecycle"},
    {id:"fees",label:"Fees"},
    {id:"liquidity",label:"Liquidity & Vaults"},
    {id:"vaultrisk",label:"Vault Risk Mgmt"},
    {id:"feebuffer",label:"Fee Buffer & Safety"},
    {id:"userincentives",label:"LP Incentives"},
    {id:"settlement",label:"Settlement"},
    {id:"custody",label:"Self-Custody"},
    {id:"competitive",label:"Competitive"},
    {id:"faq",label:"FAQ"},
  ];

  const S = ({id,children}) => (<section id={id} style={{marginBottom:isMobile?40:64,scrollMarginTop:isMobile?80:100}}>{children}</section>);
  const H = ({children}) => (<h2 style={{fontFamily:fd,fontSize:isMobile?24:32,fontWeight:800,marginBottom:isMobile?14:20,color:"#fff"}}>{children}</h2>);
  const P = ({children}) => (<p style={{fontSize:isMobile?14:15,lineHeight:1.8,color:"#999",marginBottom:16}}>{children}</p>);
  const Card = ({children}) => (<div style={{background:"#111",borderRadius:isMobile?12:16,border:"1px solid #1f1f1f",padding:isMobile?"16px 16px":"24px 28px",marginBottom:16}}>{children}</div>);
  const Label = ({children}) => (<span style={{fontSize:isMobile?11:12,fontWeight:700,color:T,letterSpacing:"0.06em",display:"block",marginBottom:8}}>{children}</span>);
  const Code = ({children}) => (<div style={{background:"#0a0a0a",borderRadius:10,padding:isMobile?12:16,fontFamily:fm,fontSize:isMobile?11:13,color:TL,lineHeight:1.6,overflowX:"auto",marginTop:8,marginBottom:8}}>{children}</div>);
  const Row = ({items}) => (<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":`repeat(${items.length},1fr)`,gap:12,marginTop:12}}>{items.map((it,i)=>(
    <div key={i} style={{background:"#0a0a0a",borderRadius:12,padding:isMobile?12:16,...(it.hl?{border:"1px solid "+T+"30",background:T+"08"}:{border:"1px solid #1a1a1a"})}}>{it.content}</div>
  ))}</div>);

  return (
    <div style={{background:"#030303",minHeight:"100vh",fontFamily:fb,color:"#fff"}}>
      <div style={{...a(0),padding:isMobile?"10px 12px":"16px 32px",display:"flex",justifyContent:"center",position:"fixed",top:0,left:0,right:0,zIndex:20}}>
        <nav style={{width:"100%",maxWidth:900,padding:isMobile?"8px 14px":"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0a0a0aee",backdropFilter:"blur(20px)",borderRadius:isMobile?12:16,border:"1px solid #1f1f1f"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}} onClick={onBack}>
            <img src={LOGO_NAV} style={{height:isMobile?80:130,width:"auto",margin:isMobile?"-20px 0":"-30px 0",marginRight:isMobile?-6:-10}} alt="Perpdictions"/>
            {!isMobile&&<img src={LOGO_WORDMARK} style={{height:28,width:"auto"}} alt="Perpdictions"/>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<button onClick={()=>setShowNav(n=>!n)} style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:fb}}>{showNav?"Close":"Sections"}</button>}
            <span style={{fontSize:isMobile?12:14,color:B.primary,fontWeight:600,padding:"6px 14px",cursor:"pointer"}} onClick={onBack}>Home</span>
            {!isMobile&&<button onClick={onLaunch} style={{padding:"9px 22px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:13,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:10}}>Launch App</button>}
          </div>
        </nav>
      </div>

      {/* Mobile section nav dropdown */}
      {isMobile&&showNav&&(
        <div style={{position:"fixed",top:60,left:0,right:0,zIndex:19,padding:"8px 12px",background:"#0a0a0aee",backdropFilter:"blur(20px)",borderBottom:"1px solid #1f1f1f",maxHeight:"60vh",overflowY:"auto"}}>
          {sections.map(s=>(
            <a key={s.id} href={"#"+s.id} onClick={(e)=>{e.preventDefault();setActiveSection(s.id);setShowNav(false);document.getElementById(s.id)?.scrollIntoView({behavior:"smooth",block:"start"});}}
              style={{display:"block",padding:"10px 16px",fontSize:13,fontWeight:activeSection===s.id?600:400,color:activeSection===s.id?T:"#888",
                borderLeft:activeSection===s.id?"2px solid "+T:"2px solid transparent",textDecoration:"none",borderRadius:"0 6px 6px 0",
                background:activeSection===s.id?T+"08":"transparent",cursor:"pointer"}}>{s.label}</a>
          ))}
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:isMobile?"80px 16px 0":"100px 32px 0",display:"flex",gap:isMobile?0:48}}>
        {!isMobile&&<div style={{...a(0.05),width:200,flexShrink:0,position:"sticky",top:88,alignSelf:"flex-start",maxHeight:"calc(100vh - 120px)",overflow:"auto"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#555",marginBottom:16}}>Documentation</div>
          {sections.map(s=>(
            <a key={s.id} href={"#"+s.id} onClick={(e)=>{e.preventDefault();setActiveSection(s.id);document.getElementById(s.id)?.scrollIntoView({behavior:"smooth",block:"start"});}}
              style={{display:"block",padding:"7px 12px",fontSize:12,fontWeight:activeSection===s.id?600:400,color:activeSection===s.id?T:"#666",
                borderLeft:activeSection===s.id?"2px solid "+T:"2px solid transparent",textDecoration:"none",marginBottom:1,borderRadius:"0 6px 6px 0",
                background:activeSection===s.id?T+"08":"transparent",cursor:"pointer"}}>{s.label}</a>
          ))}
        </div>}

        <div style={{...a(0.1),flex:1,minWidth:0}}>
          <div style={{marginBottom:isMobile?32:64}}>
            <h1 style={{fontFamily:fd,fontSize:isMobile?32:48,fontWeight:800,letterSpacing:"-0.03em",marginBottom:12}}>
              <span style={{background:logoGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Documentation</span>
            </h1>
            <P>The complete technical reference for Perpdictions — from product mechanics to infrastructure, risk management, and settlement.</P>
          </div>

          {/* INTRODUCTION */}
          <S id="intro">
            <H>Introduction</H>
            <P>To understand Perpdictions, you need to understand two concepts that already exist — and how combining them creates something entirely new.</P>
            <Card>
              <Label>WHAT ARE PERPETUAL FUTURES?</Label>
              <P>Perpetual futures ("perps") are the most traded financial instrument in crypto — over $150 billion in daily volume and $61.8 trillion in annual volume in 2025. They account for roughly 75% of all crypto trading activity. A perpetual future is a contract that lets you speculate on the price of an asset with leverage, without ever owning the asset itself.</P>
              <P>The key innovation: unlike traditional futures that expire on a fixed date, perps have no expiry. You can hold a position indefinitely, entering and exiting whenever you want. Two mechanisms make this work:</P>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,marginBottom:16}}>
                <div style={{background:"#0a0a0a",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:TL,marginBottom:6}}>Funding Rates</div>
                  <div style={{fontSize:13,color:"#888",lineHeight:1.7}}>A periodic payment exchanged between long and short holders that keeps the perp price tethered to the real asset price. When the perp trades above spot, longs pay shorts. When below, shorts pay longs. This continuous rebalancing replaces the expiration mechanism of traditional futures.</div>
                </div>
                <div style={{background:"#0a0a0a",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:TL,marginBottom:6}}>Liquidations</div>
                  <div style={{fontSize:13,color:"#888",lineHeight:1.7}}>Because leverage amplifies both gains and losses, exchanges automatically close ("liquidate") positions when margin falls below a maintenance threshold. A 10x leveraged position faces liquidation on a ~10% adverse move. An insurance fund covers any shortfall.</div>
                </div>
              </div>
              <div style={{background:"#0a0a0a",borderRadius:12,padding:20}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:10}}>Simple example:</div>
                <div style={{fontSize:14,color:"#999",lineHeight:1.8}}>Bitcoin is at $60,000. You open a 10x long with $6,000 margin = $60,000 exposure. Bitcoin up 5% → $3,000 profit (50% return). Bitcoin down 5% → $3,000 loss. Down ~10% → liquidated, margin wiped out.</div>
              </div>
            </Card>
            <Card>
              <Label>WHAT IS A PREDICTION MARKET?</Label>
              <P>Prediction markets let you trade on real-world event outcomes. Platforms like Polymarket and Kalshi host markets where shares pay $1.00 if an event happens, $0.00 if not. The share price represents consensus probability.</P>
              <Row items={[
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:6}}>Strengths</div><div style={{fontSize:13,color:"#888",lineHeight:1.7}}>Real-money price discovery. Transparent odds. Trade in and out before resolution.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:R,marginBottom:6}}>Limitations</div><div style={{fontSize:13,color:"#888",lineHeight:1.7}}>No leverage — need $5,800 for a $10K position at 58%. Limited live in-game trading. Capital inefficient.</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>PERPDICTIONS: THE COMBINATION</Label>
              <P>Perpdictions applies the perpetual futures model to prediction markets. Instead of flat shares, you open leveraged positions on a team's live win probability or an event's likelihood — the underlying asset is "Eagles win probability" instead of "Bitcoin price."</P>
              <div style={{marginTop:16,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"10px 12px",color:"#666",fontWeight:600}}>Feature</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:"#888"}}>Sportsbooks</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:"#888"}}>Prediction Mkts</th>
                    <th style={{textAlign:"center",padding:"10px 12px",color:T,fontWeight:700}}>Perpdictions</th>
                  </tr></thead>
                  <tbody>{[["Leverage","❌","❌","✅ Up to 10x"],["Live trading","❌ Pre-game","⚠️ Limited","✅ Continuous"],["Exit anytime","❌ Locked","✅","✅"],["Self-custody","❌","✅","✅"],["Transparent pricing","❌ Opaque","✅","✅ Multi-oracle"],["Capital efficiency","❌ Full amt","❌ Full amt","✅ Leveraged"]].map(([f,s,p,pd],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a"}}>
                      <td style={{padding:"10px 12px",color:"#ccc",fontWeight:600}}>{f}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:s.startsWith("❌")?"#ef4444":"#888"}}>{s}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:p.startsWith("❌")?"#ef4444":p.startsWith("✅")?"#22c55e":"#ff9f1c"}}>{p}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",color:T,fontWeight:600}}>{pd}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            </Card>
            <Card>
              <Label>WHO IS THIS FOR?</Label>
              <Row items={[
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Sports Bettors</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Better odds, exit positions, leverage, transparent multi-source pricing.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Prediction Traders</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Leverage amplifies conviction. Live in-game trading. On-chain verifiability.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>DeFi Traders</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Familiar perps UX applied to previously untradeable markets — sports, politics, events become tradeable assets.</div></>}
              ]}/>
            </Card>
          </S>

          {/* OVERVIEW */}
          <S id="overview">
            <H>Overview</H>
            <P>Perpdictions is a leveraged sports prediction market where users trade perpetual futures contracts on live win probability. Trade in and out during live games, settle on-chain at game conclusion.</P>
            <Row items={[{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>10x</div><div style={{fontSize:12,color:"#666"}}>Max Leverage</div></>},{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>{"<1s"}</div><div style={{fontSize:12,color:"#666"}}>Price Updates</div></>},{content:<><div style={{fontSize:28,fontWeight:800,color:T,fontFamily:fm,marginBottom:4}}>$0</div><div style={{fontSize:12,color:"#666"}}>Counterparty Risk</div></>}]}/>
          </S>

          {/* HOW IT WORKS */}
          <S id="how">
            <H>How It Works</H>
            <P>A contract tracks the win probability of a team (price $0.00–$1.00). At game end, contracts settle at $1.00 (win) or $0.00 (loss).</P>
            <Card>
              <Label>EXAMPLE TRADE</Label>
              <P>Eagles at $0.58 (58%). Long $1,000 at 5x = $5,000 exposure.</P>
              <Row items={[
                {content:<><div style={{fontSize:12,color:"#22c55e",fontWeight:700,marginBottom:4}}>Probability → 70%</div><div style={{fontSize:24,fontWeight:800,color:"#22c55e",fontFamily:fm}}>+$1,034</div><div style={{fontSize:11,color:"#666",marginTop:4}}>103.4% ROI</div></>},
                {content:<><div style={{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:4}}>Probability → 40%</div><div style={{fontSize:24,fontWeight:800,color:"#ef4444",fontFamily:fm}}>-$1,552</div><div style={{fontSize:11,color:"#666",marginTop:4}}>Liquidation risk ~46%</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>KEY PROPERTIES</Label>
              {["Binary terminal settlement — contracts settle at exactly $0 or $1","Bounded price — probability constrained 0–1, affects liquidation math","Convexity near extremes — moves become more violent near 0% or 100%","Time decay — probability converges faster as game progresses","Discrete event risk — single plays can move probability 20%+ instantly"].map((s,i)=>(
                <div key={i} style={{padding:"8px 14px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:8,fontSize:13,color:"#888",marginBottom:2}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* SYSTEM ARCHITECTURE */}
          <S id="architecture">
            <H>System Architecture</H>
            <P>Perpdictions uses a hybrid offchain/onchain architecture. Low-latency operations (order matching, risk checks, oracle aggregation) run offchain for speed. Fund custody, settlement, and insurance run on-chain on Base for trustlessness.</P>
            <Card>
              <Label>THREE-LAYER STACK</Label>
              {[{l:"User Layer",d:"Web app + embedded wallet (Privy). Fiat onramp via MoonPay/Stripe → USDC on Base.",c:T},{l:"Offchain Engine",d:"Matching engine, risk engine, oracle aggregator, orderbook manager, API gateway. Sub-100ms latency. Batched settlements every ~10 seconds.",c:"#ff9f1c"},{l:"Onchain (Base)",d:"Vault contract (fund custody), Clearinghouse (positions/margin), Settlement contract (final payouts), Insurance Fund, Oracle Registry.",c:R}].map((layer,i)=>(
                <div key={i} style={{display:"flex",gap:16,padding:"14px 16px",background:"#0a0a0a",borderRadius:10,marginBottom:8,alignItems:"center"}}>
                  <div style={{width:48,textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:28,fontWeight:800,color:layer.c,fontFamily:fm}}>{i+1}</div>
                  </div>
                  <div><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:2}}>{layer.l}</div><div style={{fontSize:12,color:"#888",lineHeight:1.6}}>{layer.d}</div></div>
                </div>
              ))}
            </Card>
            <Card>
              <Label>SMART CONTRACTS (BASE)</Label>
              {[{n:"Vault",d:"Holds all user USDC. Only the Clearinghouse can move funds between accounts."},{n:"Clearinghouse",d:"Core accounting — positions, margin balances, realized P&L. Processes batched trade settlements atomically."},{n:"Insurance Fund",d:"USDC pool absorbing liquidation deficits. Funded by 20% of fees + liquidation surplus."},{n:"Settlement",d:"Reads final oracle price at game end. Distributes funds: winners get $1, losers get $0."},{n:"Oracle Registry",d:"Stores latest oracle prices, approved data sources, and game metadata."}].map((c,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",background:"#0a0a0a",borderRadius:8,marginBottom:4,alignItems:"flex-start"}}>
                  <span style={{fontSize:12,fontWeight:700,color:T,fontFamily:fm,flexShrink:0,width:90}}>{c.n}</span>
                  <span style={{fontSize:12,color:"#888"}}>{c.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* OFFCHAIN ORDERBOOK */}
          <S id="orderbook">
            <H>Offchain Orderbook</H>
            <P>A central limit order book (CLOB) maintained offchain for sub-100ms performance. Sports events move fast — a single NFL play can shift probability 15% in under 3 seconds.</P>
            <Card>
              <Label>ORDER TYPES</Label>
              <Row items={[
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Limit</div><div style={{fontSize:11,color:"#888"}}>Specify price + size. Rests on book until filled.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Market</div><div style={{fontSize:11,color:"#888"}}>Execute immediately at best price. Walks the book.</div></>},
                {content:<><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Reduce-Only</div><div style={{fontSize:11,color:"#888"}}>Can only reduce a position. Used for stop-losses.</div></>}
              ]}/>
            </Card>
            <Card>
              <Label>MATCHING FLOW</Label>
              {["User signs order intent with embedded wallet","API Gateway validates signature + margin","Matching Engine checks risk via Risk Engine","Match found → trade executed, positions updated","Trade added to settlement batch queue","Every ~10s, batch submitted on-chain to Clearinghouse"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <P>Why offchain? On-chain orderbooks on Base would add ~2s latency, gas per order, and MEV/frontrunning risk. Mitigation: all trades published to append-only log + periodic Merkle root commitments on-chain.</P>
          </S>

          {/* ORACLE */}
          <S id="oracle">
            <H>Oracle System</H>
            <P>Custom multi-source oracle using weighted median (more manipulation-resistant than weighted average).</P>
            <Card>
              <Label>DATA SOURCES</Label>
              {[{tier:"Tier 1",name:"Prediction Markets",src:"Polymarket, Kalshi",w:"55%",d:"Direct probability pricing"},{tier:"Tier 2",name:"Sportsbooks",src:"DraftKings, FanDuel, Pinnacle",w:"35%",d:"Moneylines → implied probability"},{tier:"Tier 3",name:"Models",src:"ESPN, Internal",w:"10%",d:"Sanity checks + tiebreakers"}].map(s=>(
                <div key={s.tier} style={{display:"flex",gap:16,padding:"12px 16px",background:"#0a0a0a",borderRadius:10,marginBottom:6,alignItems:"center"}}>
                  <div style={{width:48,textAlign:"center",flexShrink:0}}><div style={{fontSize:11,color:T,fontWeight:700}}>{s.tier}</div><div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:fm}}>{s.w}</div></div>
                  <div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{s.name} <span style={{color:"#666",fontWeight:400,fontSize:11}}>({s.src})</span></div><div style={{fontSize:12,color:"#888"}}>{s.d}</div></div>
                </div>
              ))}
            </Card>
            <Card>
              <Label>MARK PRICE VS INDEX PRICE</Label>
              <P>Index Price = raw weighted median (true consensus). Mark Price = dampened version for liquidations — prevents flash spikes from triggering mass liquidations.</P>
              <Code>Mark Price = 0.7 × Index Price + 0.3 × 5-second EMA of Index Price</Code>
            </Card>
            <Card>
              <Label>SAFETY MECHANISMS</Label>
              {["Staleness filter — sources not updated in 30s drop to zero weight","Deviation cap — source deviating 10%+ from median is excluded","Smoothing — 3-second EMA prevents flash spikes","Safe mode — 3+ sources fail: prices freeze, max leverage → 2x","Total failure — all sources down 60s+: trading halted"].map((s,i)=>(
                <div key={i} style={{fontSize:12,color:"#888",padding:"6px 0",borderBottom:i<4?"1px solid #1a1a1a":"none"}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* FUNDING RATES */}
          <S id="funding">
            <H>Funding Rates</H>
            <P>Funding keeps the perp price anchored to the oracle. Without it, one-sided sentiment causes the orderbook price to drift from fair value.</P>
            <Card>
              <Label>MECHANISM</Label>
              <P>Every 15 minutes during live games (faster than crypto's 8-hour standard, because sports prices move faster):</P>
              <Code>Funding Rate = clamp( VWAP_mid_price - Oracle_Index_Price, -0.5%, +0.5% )</Code>
              <P>If perp trades above oracle → longs pay shorts. Below oracle → shorts pay longs. Capped at ±0.5% per interval.</P>
              <Row items={[
                {content:<><div style={{fontSize:12,color:T,fontWeight:700,marginBottom:4}}>Live Games</div><div style={{fontSize:12,color:"#888"}}>15-minute intervals. Fast enough to compensate LPs, not so fast it discourages traders.</div></>},
                {content:<><div style={{fontSize:12,color:"#ff9f1c",fontWeight:700,marginBottom:4}}>Pre-Game</div><div style={{fontSize:12,color:"#888"}}>1-hour intervals. Prices more stable before kickoff. Uses pre-game sportsbook lines.</div></>}
              ]}/>
            </Card>
          </S>

          {/* MARGIN & LEVERAGE */}
          <S id="margin">
            <H>Margin & Leverage</H>
            <P>Isolated margin per position. Dynamic max leverage based on probability level.</P>
            <Card>
              <Label>DYNAMIC LEVERAGE</Label>
              <Row items={[{range:"20–80%",lev:"10x",color:"#22c55e"},{range:"10–20%",lev:"5x",color:TL},{range:"5–10%",lev:"3x",color:"#ff9f1c"},{range:"<5%/>95%",lev:"2x",color:R}].map(l=>({content:<><div style={{fontSize:24,fontWeight:800,color:l.color,fontFamily:fm,textAlign:"center",marginBottom:4}}>{l.lev}</div><div style={{fontSize:11,color:"#666",textAlign:"center"}}>{l.range}</div></>}))}/>
            </Card>
            <Card>
              <Label>MARGIN MATH</Label>
              {[["Initial Margin","IM = Notional ÷ Leverage"],["Maintenance Margin","MM = 50% of IM"],["Liquidation (Long)","Liq = Entry × (1 - 1/Leverage × MM_Ratio)"]].map(([l,f])=>(
                <div key={l} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <div style={{fontSize:12,color:"#666",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,color:TL,fontFamily:fm}}>{f}</div>
                </div>
              ))}
            </Card>
          </S>

          {/* RISK MANAGEMENT */}
          <S id="risk">
            <H>Risk Management</H>
            <P>Three layers protect platform solvency. The insurance fund exclusively covers liquidation deficits — it is never used for vault market making losses.</P>
            {[{n:"1",t:"Liquidation Engine",d:"Runs every 100ms. When margin falls below maintenance, position is taken over and closed on the orderbook. Partial liquidation for large positions.",c:T},{n:"2",t:"Insurance Fund",d:"Absorbs liquidation deficits. Funded by 20% of fees (non-negotiable) + liquidation surplus + 10% of vault excess profits. Target: 5% of total OI.",c:"#ff9f1c"},{n:"3",t:"Auto-Deleveraging",d:"Last resort when insurance fund is empty. Force-closes most profitable opposing positions. Extremely rare — minimized by conservative leverage and adequate insurance sizing.",c:R}].map(r=>(
              <Card key={r.n}><div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:r.c+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18,fontWeight:800,color:r.c,fontFamily:fm}}>{r.n}</span></div>
                <div><div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>{r.t}</div><div style={{fontSize:14,color:"#888",lineHeight:1.7}}>{r.d}</div></div>
              </div></Card>
            ))}
            <Card>
              <Label>POSITION LIMITS</Label>
              {["No single user >10% of OI on one side","Total OI cannot exceed 20x insurance fund balance","One-sided OI >70% triggers liquidity rebalancing alerts"].map((s,i)=>(
                <div key={i} style={{fontSize:13,color:"#888",padding:"6px 0",borderBottom:i<2?"1px solid #1a1a1a":"none"}}>{s}</div>
              ))}
            </Card>
          </S>

          {/* MARKET LIFECYCLE */}
          <S id="lifecycle">
            <H>Market Lifecycle</H>
            <P>Each game market progresses through six states.</P>
            <Card>
              {[{s:"Pre-Game",d:"Opens 24-72h before. Oracle uses pre-game lines. Full trading, 1h funding intervals.",c:T},{s:"Live",d:"Game started. Live oracle feeds. 15-min funding. Dynamic leverage adjustments.",c:"#22c55e"},{s:"Halftime",d:"Trading continues, oracle stable. Good window to adjust positions.",c:"#ff9f1c"},{s:"Final Minutes",d:"Last 5 min. Max leverage reduced 50%. Wider liquidation buffers. Vault begins unwinding.",c:R},{s:"Settlement Countdown",d:"Game over. No new positions. 30-min delay for stat corrections. Existing positions can close.",c:"#888"},{s:"Settled",d:"Settlement contract executes on-chain. Winners → $1.00, losers → $0.00. Funds distributed. Market archived.",c:"#fff"}].map((st,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 14px",borderBottom:i<5?"1px solid #1a1a1a":"none",alignItems:"flex-start"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:st.c,marginTop:6,flexShrink:0}}/>
                  <div><span style={{fontSize:13,fontWeight:700,color:st.c}}>{st.s}</span><span style={{fontSize:12,color:"#888"}}> — {st.d}</span></div>
                </div>
              ))}
            </Card>
          </S>

          {/* FEES */}
          <S id="fees">
            <H>Fees</H>
            <Card>
              <Label>TRADING FEES</Label>
              <Row items={[{type:"Maker",rate:"0–2 bps",note:"Free at base, rebates at higher tiers"},{type:"Taker",rate:"5 bps",note:"Flat, no volume discounts"},{type:"Settlement",rate:"3 bps",note:"At game conclusion"},{type:"Liquidation",rate:"5 bps",note:"On liquidated notional"}].map(f=>({content:<><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{f.type}</span><span style={{fontSize:14,fontWeight:800,color:T,fontFamily:fm}}>{f.rate}</span></div><div style={{fontSize:11,color:"#666"}}>{f.note}</div></>}))}/>
            </Card>
            <Card>
              <Label>FEE DISTRIBUTION</Label>
              <Row items={[{label:"Insurance Fund",pct:"20%",color:R},{label:"Protocol Treasury",pct:"55%",color:"#fff"},{label:"Liquidity Incentives",pct:"25%",color:T}].map(d=>({content:<><div style={{fontSize:22,fontWeight:800,color:d.color,fontFamily:fm,textAlign:"center"}}>{d.pct}</div><div style={{fontSize:11,color:"#666",textAlign:"center",marginTop:4}}>{d.label}</div></>}))}/>
            </Card>
            <P>Taker fees are flat — takers extract liquidity and should pay for it. Makers trade free or earn rebates. See LP Incentives for details.</P>
          </S>

          {/* LIQUIDITY & VAULTS */}
          <S id="liquidity">
            <H>Liquidity & Market Making Vault</H>
            <P>Perpdictions bootstraps liquidity through a protocol-owned MM vault. Anyone deposits USDC, the algorithm market-makes, depositors share 80% of profits.</P>
            <Card>
              <Label>VAULT ALGORITHM</Label>
              {["Quotes around oracle — bid at oracle - spread/2, ask at oracle + spread/2 (1% default)","Dynamic spread — widens 2x on 3% oracle moves, 3x on 8%+ (scoring plays)","Inventory management — asymmetric quoting when skewed, scaling from 2x to 5x adjustment","Game-phase awareness — tighter mid-game, wider at start/end/after scoring events","Terminal convergence — reduces exposure in final 10 min, flat by final 2 min","Multi-market allocation — more capital to high-volume games"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>DEPOSITOR INCENTIVES</Label>
              {[{t:"Profit Share",d:"80% of vault profits to depositors, 20% to protocol."},{t:"Early Boost",d:"Up to 1.5x multiplier in month 1, tapering to 1.0x after 6 months."},{t:"Lockup Tiers",d:"80% base → 85% (7d) → 90% (30d) → 95% (90d lockup)."},{t:"Vault Points",d:"Points = Deposit × Time × Lockup Multiplier. Potential future token claim."}].map(it=>(
                <div key={it.t} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{it.t}</span><span style={{fontSize:12,color:"#888"}}> — {it.d}</span>
                </div>
              ))}
            </Card>
            <P>Protocol seeds $500K-$1M at launch. A DMM partnership is a stretch goal, not a blocker — the vault handles all liquidity at 1-2% spreads, still far better than sportsbook vig.</P>
          </S>

          {/* VAULT RISK MANAGEMENT */}
          <S id="vaultrisk">
            <H>Vault Risk Management</H>
            <P>Seven layers protect vault depositors from directional losses during blowout games.</P>
            <Card>
              {[{n:"1",t:"Dynamic Spread",d:"Convex spread scaling: 1% base → 5% at 75% inventory. Volatility + time adjustments.",c:T},{n:"2",t:"Funding Capture",d:"One-sided flow = high funding income to the vault. Natural hedge — funding is highest exactly when vault risk is highest.",c:TL},{n:"3",t:"Inventory Caps",d:"20% net, 40% gross per game. 60% total across all games. Enforced at matching engine level.",c:"#ff9f1c"},{n:"4",t:"Terminal Convergence",d:"Reduce at 10 min, reduce-only at 5 min, stop at 2 min. Eliminates 60-70% of blowout losses.",c:R},{n:"5",t:"Circuit Breaker",d:"3% game loss → stop quoting. 5% → full halt. Prevents single-game spirals.",c:"#ef4444"},{n:"6",t:"Portfolio Mgmt",d:"5% daily drawdown → 50% size cut. 8% → halt all. Prevents correlated multi-game losses.",c:"#888"},{n:"7",t:"Watermark",d:"10% drawdown from ATH → 50% size + 2x spread until recovery to 5%.Protects from losing streaks.",c:"#666"}].map(r=>(
                <div key={r.n} style={{display:"flex",gap:12,padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:r.c+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:13,fontWeight:800,color:r.c,fontFamily:fm}}>{r.n}</span></div>
                  <div><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{r.t}</span><span style={{fontSize:12,color:"#888"}}> — {r.d}</span></div>
                </div>
              ))}
            </Card>
          </S>

          {/* FEE BUFFER & SAFETY */}
          <S id="feebuffer">
            <H>Market Fee Buffer & Insurance Separation</H>
            <P>Trading fees are pooled per-market during live games, then redirected to cover vault losses before flowing to the treasury — without touching the insurance fund.</P>
            <Card>
              <Label>DAILY SETTLEMENT WATERFALL</Label>
              {["All games settle — each game's fee buffer calculated","Vault net P&L across all games calculated","If net positive → buffers distribute normally (20% insurance, 55% treasury, 25% liquidity)","If net negative → buffers pooled. Up to 80% covers vault loss. 20% always → insurance fund","Remaining vault deficit (if any) hits depositors","Insurance fund is NEVER touched for vault losses"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:i===5?R+"20":T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:i===5?R:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:i===5?"#ef4444":"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>SEPARATION PRINCIPLE</Label>
              <P>The insurance fund and vault are separate pools. One-way valve: vault contributes 10% of excess profits to insurance during good months. Fee buffer softens vault losses. But the insurance fund's core balance is never at risk from vault trading.</P>
            </Card>
          </S>

          {/* LP INCENTIVES */}
          <S id="userincentives">
            <H>User Liquidity Incentives</H>
            <P>External users who provide offsetting liquidity directly reduce vault risk. Perpdictions rewards this behavior with targeted incentives.</P>
            <Card>
              <Label>CONTRARIAN MAKER REBATES</Label>
              <P>When the vault is skewed, users who post orders that would reduce vault inventory earn enhanced rebates:</P>
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"8px",color:"#666"}}>Vault Skew</th>
                    <th style={{textAlign:"right",padding:"8px",color:"#666"}}>Contrarian Rebate</th>
                  </tr></thead>
                  <tbody>{[["0–25%","0 bps (no skew)"],["25–50%","-1.0 bps (paid to make)"],["50–75%","-2.0 bps"],["75–100%","-3.0 bps"]].map(([s,r],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a"}}>
                      <td style={{padding:"8px",color:"#ccc"}}>{s}</td>
                      <td style={{padding:"8px",textAlign:"right",color:T,fontWeight:600}}>{r}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
            <Card>
              <Label>ADDITIONAL INCENTIVES</Label>
              {[{t:"Inventory Offset Bonus",d:"0.01%/day on positions that offset vault inventory. Active only when skew >40%. Turns off when balanced."},{t:"Priority Settlement",d:"Contrarian LPs get funds distributed first at game end."},{t:"Virtuous Cycle",d:"Skew triggers incentives → LPs provide offset → risk decreases → incentives decrease → equilibrium."}].map(it=>(
                <div key={it.t} style={{padding:"10px 14px",background:"#0a0a0a",borderRadius:10,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{it.t}</span><span style={{fontSize:12,color:"#888"}}> — {it.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* SETTLEMENT */}
          <S id="settlement">
            <H>Settlement</H>
            <P>On-chain via smart contracts on Base. 30-minute delay post-game for stat corrections.</P>
            <Card>
              <Label>SETTLEMENT FLOW</Label>
              {["Game clock hits zero","30-minute settlement delay","Oracle confirms final result on-chain","Settlement contract executes","Winners → $1.00, losers → $0.00","Funds distributed to wallets"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"6px 12px",background:i%2===0?"#0a0a0a":"transparent",borderRadius:6}}>
                  <span style={{width:20,height:20,borderRadius:6,background:T+"15",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:800,color:T,fontFamily:fm}}>{i+1}</span>
                  <span style={{fontSize:12,color:"#ccc"}}>{s}</span>
                </div>
              ))}
            </Card>
            <Card>
              <Label>EDGE CASES</Label>
              {[{t:"Overtime",d:"Market continues. Oracle updates. Settlement after final result."},{t:"Postponed",d:"Trading halted, positions frozen. Rescheduled within 48h → reopens. Otherwise closes at last price."},{t:"Disputed",d:"Settlement extends up to 72 hours. Governance committee determines outcome."}].map(e=>(
                <div key={e.t} style={{padding:"8px 14px",background:"#0a0a0a",borderRadius:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{e.t}</span><span style={{fontSize:13,color:"#888"}}> — {e.d}</span>
                </div>
              ))}
            </Card>
          </S>

          {/* SELF-CUSTODY */}
          <S id="custody">
            <H>Self-Custody</H>
            <P>Your funds, your keys. Embedded wallets via Privy — real Ethereum wallets on Base. Export anytime.</P>
            <Card>
              <Row items={[
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Crypto Users</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Connect existing wallet or use embedded wallet. Deposit USDC directly to vault on Base.</div></>},
                {content:<><div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Fiat Users</div><div style={{fontSize:12,color:"#888",lineHeight:1.7}}>Deposit USD via card/bank. Converted to USDC on Base automatically. You custody the funds.</div></>}
              ]}/>
            </Card>
          </S>

          {/* COMPETITIVE */}
          <S id="competitive">
            <H>Competitive Landscape</H>
            <Card>
              <div style={{overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:fm,fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid #2a2a2a"}}>
                    <th style={{textAlign:"left",padding:"10px",color:"#666"}}>Platform</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Leverage</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Live Trading</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Settlement</th>
                    <th style={{textAlign:"center",padding:"10px",color:"#666"}}>Self-Custody</th>
                  </tr></thead>
                  <tbody>{[["Perpdictions","Up to 10x","Yes (in-game)","On-chain","Yes",true],["Polymarket","None (1x)","Limited","On-chain","Yes",false],["Kalshi","None (1x)","Limited","Centralized","No",false],["Sportsbooks","None","Pre-game only","Centralized","No",false]].map(([p,lev,live,set,cust,hl],i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1a1a1a",background:hl?T+"08":"transparent"}}>
                      <td style={{padding:"10px",color:hl?T:"#fff",fontWeight:700}}>{p}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{lev}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{live}</td>
                      <td style={{padding:"10px",textAlign:"center",color:hl?T:"#888"}}>{set}</td>
                      <td style={{padding:"10px",textAlign:"center",color:cust==="Yes"?"#22c55e":"#ef4444"}}>{cust}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          </S>

          {/* FAQ */}
          <S id="faq">
            <H>FAQ</H>
            {[{q:"What happens in overtime?",a:"Markets continue. Oracle updates. Settlement after final result."},{q:"Game postponed or cancelled?",a:"Postponed + rescheduled within 48h → reopens. Cancelled → closes at last oracle price."},{q:"Can a single play liquidate me?",a:"Mark price smoothing prevents flash liquidations. Only sustained moves trigger liquidation."},{q:"How fast are withdrawals?",a:"10-minute delay from vault, then USDC in your wallet instantly."},{q:"What sports are supported?",a:"Launch: NFL, NBA, MLB. Expanding to NHL, soccer, MMA based on oracle availability."},{q:"Where are my funds?",a:"Smart contracts on Base (Coinbase L2). You custody via embedded wallet. Perpdictions never holds your keys."}].map((item,i)=>(
              <Card key={i}><div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:8}}>{item.q}</div><div style={{fontSize:14,color:"#888",lineHeight:1.7}}>{item.a}</div></Card>
            ))}
          </S>

          <div style={{textAlign:"center",padding:"40px 0 80px"}}>
            <button onClick={onLaunch} style={{padding:"16px 48px",border:"none",cursor:"pointer",fontFamily:fb,fontWeight:700,fontSize:16,background:`linear-gradient(135deg, ${R}, ${T})`,color:"#fff",borderRadius:12}}>Try the Demo →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
