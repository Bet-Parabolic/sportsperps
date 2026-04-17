import { B, fd, fm } from "../../lib/theme.js";
import { GAMES, PROC_GAMES } from "../../lib/games.js";

export function DemosPage({ onSelectGame, currentGameId }) {
  return (
    <div style={{flex:1,overflow:"auto",background:"#0a0a0a",padding:"32px 40px"}}>
      {/* Header */}
      <div style={{marginBottom:32}}>
        <div style={{fontSize:11,fontWeight:700,color:B.primary,letterSpacing:"0.12em",fontFamily:fm,marginBottom:8}}>DEMO GAMES</div>
        <h2 style={{fontFamily:fd,fontSize:28,fontWeight:800,letterSpacing:"-0.03em",color:"#fff",marginBottom:8}}>
          Championship Replays
        </h2>
        <p style={{fontSize:13,color:"#666",lineHeight:1.6,maxWidth:480}}>
          Replay real championship moments with the full trading engine. Live win probability, leverage, liquidations — all simulated.
        </p>
      </div>

      {/* Game cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {PROC_GAMES.map((g) => {
          const isCurrent = g.id === currentGameId;
          const finalPlay = g.raw[g.raw.length - 1];
          const homeScore = finalPlay[2];
          const awayScore = finalPlay[3];
          const homeWon = homeScore > awayScore;

          return (
            <div
              key={g.id}
              onClick={() => onSelectGame(g)}
              style={{
                background: isCurrent ? B.primary+"10" : "#111",
                border: "1px solid " + (isCurrent ? B.primary+"40" : "#1f1f1f"),
                borderRadius: 16,
                padding: "24px 28px",
                cursor: "pointer",
                transition: "all .15s",
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Sport emoji */}
              <div style={{fontSize:40,flexShrink:0,width:56,textAlign:"center"}}>{g.emoji}</div>

              {/* Game info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:700,color:B.primary,fontFamily:fm,letterSpacing:"0.08em"}}>{g.sport}</span>
                  <span style={{fontSize:11,color:"#555",fontFamily:fm}}>·</span>
                  <span style={{fontSize:11,color:"#555",fontFamily:fm}}>{g.subtitle}</span>
                  {isCurrent && (
                    <span style={{fontSize:10,fontWeight:700,color:B.primary,fontFamily:fm,padding:"2px 8px",background:B.primary+"15",borderRadius:6,letterSpacing:"0.06em"}}>
                      VIEWING NOW
                    </span>
                  )}
                </div>
                <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:4,fontFamily:fd}}>
                  {g.label}
                </div>
                <div style={{fontSize:12,color:"#666",lineHeight:1.5}}>{g.tagline}</div>
              </div>

              {/* Score */}
              <div style={{flexShrink:0,textAlign:"right"}}>
                {/* Home team */}
                <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,color:homeWon?"#fff":"#777"}}>{g.home.logo} {g.home.name}</span>
                  <span style={{fontSize:22,fontWeight:800,fontFamily:fm,color:homeWon?"#fff":"#666",minWidth:36,textAlign:"right"}}>{homeScore}</span>
                </div>
                {/* Away team */}
                <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
                  <span style={{fontSize:13,fontWeight:600,color:!homeWon?"#fff":"#777"}}>{g.away.logo} {g.away.name}</span>
                  <span style={{fontSize:22,fontWeight:800,fontFamily:fm,color:!homeWon?"#fff":"#666",minWidth:36,textAlign:"right"}}>{awayScore}</span>
                </div>
                <div style={{marginTop:6,fontSize:10,color:"#555",fontFamily:fm}}>FINAL</div>
              </div>

              {/* Arrow */}
              <div style={{flexShrink:0,color:isCurrent?B.primary:"#333",fontSize:18}}>›</div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{marginTop:32,padding:"16px 20px",background:"#111",borderRadius:12,border:"1px solid #1a1a1a"}}>
        <div style={{fontSize:12,color:"#555",lineHeight:1.7}}>
          <span style={{color:"#888",fontWeight:600}}>How demos work: </span>
          Each game replays at adjustable speed (1×–50×). Win probability updates in real time from a simulated multi-oracle engine. You can open leveraged positions, get liquidated, and settle at the final result — all with $10,000 in virtual funds.
        </div>
      </div>
    </div>
  );
}
