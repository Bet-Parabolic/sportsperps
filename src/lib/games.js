/* ═══════════════════════════════════════════════════════════
   DEMO GAME DATASETS
   ═══════════════════════════════════════════════════════════ */

export const GAMES = [
  {
    id: "nfl-sb59", sport: "NFL", label: "Super Bowl LIX",
    subtitle: "Feb 9, 2025 · New Orleans", tagline: "Eagles deny Chiefs three-peat — 40-22 blowout",
    emoji: "🏈",
    home: { name: "Eagles", short: "PHI", logo: "🦅", light: "#22c55e" },
    away: { name: "Chiefs", short: "KC", logo: "🏹", light: "#ff2d6f" },
    xTick: v => {const q=Math.floor(v/15)+1;const mInQ=15-(v%15);const m=Math.floor(mInQ);const s=Math.round((mInQ-m)*60);if(v>=60)return"FINAL";if(v%15===0&&v>0)return"Q"+Math.min(q,4);return m+":"+(s<10?"0":"")+s;},
    periodLabel: q => q===0?"HALF":"Q"+q, playsLabel: "SCORING PLAYS",
    raw: [
      [0,.58,0,0,1,"15:00","Kickoff — Eagles receive",false],[2,.62,3,0,1,"11:45","⚡ PHI FG — Elliott 36yd",true],
      [4,.64,3,0,1,"8:30","KC 3-and-out, Mahomes sacked",false],[6,.72,10,0,1,"5:15","⚡ PHI TD — Hurts 1yd tush push!",true],
      [8,.74,10,0,1,"2:30","KC punt, Eagles D dominates",false],[10,.76,13,0,1,"0:30","⚡ PHI FG — Elliott 48yd",true],
      [12,.78,13,0,2,"13:00","KC 3-and-out again",false],[14,.82,13,0,2,"10:30","Mahomes INT! Baun picks it!",false],
      [16,.87,20,0,2,"8:00","⚡ PHI TD — Hurts 18yd to A.J. Brown!",true],[18,.85,20,0,2,"5:30","KC drives to midfield, punt",false],
      [20,.84,20,0,2,"3:45","PHI short drive",false],[22,.92,24,0,2,"2:00","⚡ PHI Pick-6! DeJean birthday INT!",true],
      [24,.90,24,0,2,"0:30","KC incomplete, end of half",false],[26,.90,24,0,0,"HALF","HALFTIME — Eagles dominate 24-0",false],
      [28,.91,24,0,3,"13:00","PHI receives, drives",false],[30,.93,27,0,3,"10:00","⚡ PHI FG — Elliott 33yd",true],
      [32,.92,27,0,3,"7:30","KC finally moves the ball",false],[34,.95,34,0,3,"5:00","⚡ PHI TD — Hurts 46yd to Smith!",true],
      [36,.92,34,0,3,"3:00","KC drives into PHI territory",false],[38,.88,34,8,3,"0:45","⚡ KC TD — Hopkins 7yd + 2pt!",true],
      [40,.89,34,8,4,"14:00","Q4 — PHI up 26",false],[42,.91,37,8,4,"11:00","⚡ PHI FG — Elliott 29yd",true],
      [44,.90,37,8,4,"8:30","KC drives deep",false],[46,.86,37,16,4,"6:00","⚡ KC TD — Worthy 50yd + 2pt!",true],
      [48,.89,37,16,4,"4:00","PHI running clock",false],[50,.93,40,16,4,"2:30","⚡ PHI FG — Elliott 26yd record!",true],
      [52,.91,40,16,4,"1:30","KC hurry-up",false],[54,.90,40,22,4,"0:40","⚡ KC TD — Worthy 2yd",true],
      [56,.94,40,22,4,"0:30","Onside kick — PHI recovers!",false],[58,.97,40,22,4,"0:10","PHI victory formation",false],
      [60,1.0,40,22,4,"FINAL","🏆 EAGLES WIN 40-22!!",true],
    ],
  },
  {
    id: "mlb-ws7", sport: "MLB", label: "World Series Game 7",
    subtitle: "Nov 1, 2025 · Toronto", tagline: "Dodgers' 11th-inning comeback — back-to-back champs",
    emoji: "⚾",
    home: { name: "Dodgers", short: "LAD", logo: "🔵", light: "#60a5fa" },
    away: { name: "Blue Jays", short: "TOR", logo: "🐦", light: "#00d4ff" },
    xTick: v => { if(v>=55)return"11th"; if(v>=50)return"10th"; const i=Math.floor(v/5.5)+1; return i<=9?i+"":"EX"; },
    periodLabel: q => q===0?"MID":"INN "+q, playsLabel: "KEY PLAYS",
    raw: [
      [0,.48,0,0,1,"Top 1","First pitch — Ohtani on the mound",false],[3,.46,0,0,1,"Bot 1","Scoreless 1st",false],
      [5,.45,0,0,2,"Top 2","LAD goes down in order",false],[8,.43,0,0,2,"Bot 2","TOR singles, stranded",false],
      [11,.42,0,0,3,"Top 3","LAD pop out",false],[13,.26,0,3,3,"Bot 3","⚡ TOR 3-run HR! Bichette!",true],
      [16,.28,0,3,4,"Top 4","LAD double play",false],[19,.26,0,3,4,"Bot 4","TOR stranded",false],
      [22,.32,1,3,5,"Top 5","⚡ LAD HR — Ohtani!",true],[25,.30,1,3,5,"Bot 5","TOR 1-2-3",false],
      [27,.33,1,3,6,"Top 6","LAD corners",false],[28,.36,2,3,6,"Top 6","⚡ LAD sac fly — 2-3!",true],
      [30,.30,2,4,6,"Bot 6","⚡ TOR RBI double!",true],[33,.28,2,4,7,"Top 7","LAD double play",false],
      [36,.27,2,4,7,"Bot 7","Yesavage 1-2-3",false],[38,.26,2,4,8,"Top 8","LAD rally...",false],
      [39,.40,3,4,8,"Top 8","⚡ LAD HR! Muncy!",true],[41,.38,3,4,8,"Bot 8","TOR quiet",false],
      [43,.35,3,4,9,"Top 9","Last chance...",false],[44,.32,3,4,9,"Top 9","One out...",false],
      [45,.58,4,4,9,"Top 9","⚡⚡ ROJAS TIES IT! 4-4!!",true],[47,.54,4,4,9,"Bot 9","Yamamoto enters",false],
      [48,.56,4,4,9,"Bot 9","Yamamoto escapes!",false],[50,.52,4,4,10,"Top 10","No run",false],
      [52,.46,4,4,10,"Bot 10","TOR loads bases... escapes!",false],[54,.55,4,4,11,"Top 11","Smith vs Bieber...",false],
      [55,.84,5,4,11,"Top 11","⚡⚡ SMITH HR!! 5-4!!",true],[57,.80,5,4,11,"Bot 11","Yamamoto closing...",false],
      [58,.72,5,4,11,"Bot 11","Guerrero doubles!",false],[59,.88,5,4,11,"Bot 11","DOUBLE PLAY!! OVER!!",false],
      [60,1.0,5,4,11,"FINAL","🏆 DODGERS WIN 5-4!!",true],
    ],
  },
  {
    id: "nba-fin1", sport: "NBA", label: "NBA Finals Game 1",
    subtitle: "Jun 5, 2025 · OKC", tagline: "Haliburton 0.3s buzzer-beater stuns Thunder",
    emoji: "🏀",
    home: { name: "Pacers", short: "IND", logo: "🏎️", light: "#fbbf24" },
    away: { name: "Thunder", short: "OKC", logo: "⚡", light: "#60a5fa" },
    xTick: v => {const q=Math.floor(v/15)+1;const mInQ=12-(v%15)*(12/15);const m=Math.floor(Math.max(0,mInQ));const s=Math.round(Math.max(0,(mInQ-m)*60));if(v>=60)return"FINAL";if(v%15===0&&v>0)return"Q"+Math.min(q,4);return m+":"+(s<10?"0":"")+s;},
    periodLabel: q => q===0?"HALF":"Q"+q, playsLabel: "KEY PLAYS",
    raw: [
      [0,.30,0,0,1,"12:00","Tip-off",false],[2,.26,4,10,1,"9:30","⚡ OKC 10-4 run",true],
      [4,.22,10,18,1,"6:45","⚡ SGA three! OKC up 8",true],[6,.26,18,22,1,"4:00","⚡ IND Siakam and-1!",true],
      [8,.24,22,28,1,"1:30","⚡ OKC Williams jumper",true],[10,.23,24,31,1,"0:00","End Q1 — OKC 31-24",false],
      [12,.20,28,38,2,"9:00","⚡ SGA step-back! Up 10",true],[14,.16,32,45,2,"6:30","⚡ OKC Holmgren block!",true],
      [16,.20,40,49,2,"4:00","⚡ IND Mathurin three!",true],[18,.18,44,55,2,"1:30","⚡ OKC Caruso steal",true],
      [20,.20,48,57,2,"0:00","End Q2 — OKC 57-48",false],[22,.20,48,57,0,"HALF","HALFTIME — Thunder +9",false],
      [24,.15,52,64,3,"9:30","⚡ OKC 7-0 run! Up 12",true],[26,.12,54,70,3,"7:00","⚡ SGA floater! Up 16!",true],
      [28,.18,62,74,3,"4:30","⚡ IND 8-0 run!",true],[30,.22,68,78,3,"2:00","⚡ IND Mathurin three!",true],
      [32,.25,75,83,3,"0:00","End Q3 — OKC 83-75",false],[34,.30,80,87,4,"10:30","⚡ IND Turner dunk!",true],
      [36,.35,86,90,4,"8:00","⚡ IND Mathurin! Within 4!",true],[38,.30,88,95,4,"6:30","⚡ OKC SGA and-1",true],
      [40,.42,95,98,4,"5:00","⚡ IND 7-0 run! Tied 98!",true],[42,.45,98,98,4,"4:15","Pacers rolling!",false],
      [44,.35,100,105,4,"3:00","⚡ OKC SGA 7 straight!",true],[46,.42,105,107,4,"2:00","⚡ IND Haliburton! -2!",true],
      [48,.38,107,110,4,"1:15","⚡ OKC Williams three! +3!",true],[50,.45,110,110,4,"0:45","⚡ IND Siakam ties!",true],
      [52,.48,110,110,4,"0:30","SGA blocked by Turner!",false],[54,.50,110,110,4,"0:15","OKC timeout...",false],
      [56,.48,110,110,4,"0:05","SGA misses!",false],[58,.65,110,110,4,"0:03","IND timeout...",false],
      [59,.95,111,110,4,"0:00","⚡⚡ HALIBURTON!! 0.3s!! IND WINS!!",true],
      [60,1.0,111,110,4,"FINAL","🏆 PACERS 111-110!!",true],
    ],
  },
  {
    id: "wc-ned-jpn", sport: "Soccer", label: "World Cup Round of 16",
    subtitle: "Jun 28, 2026 · New York", tagline: "Netherlands roar back from 2-0 down to stun Japan",
    emoji: "⚽",
    home: { name: "Netherlands", short: "NED", logo: "🇳🇱", light: "#f97316" },
    away: { name: "Japan", short: "JPN", logo: "🇯🇵", light: "#3b82f6" },
    xTick: v => { if(v>=60)return"FT"; const m=Math.round(v*1.5); return m+"'"; },
    periodLabel: q => q===0?"HT":q===1?"1H":"2H", playsLabel: "KEY MOMENTS",
    raw: [
      [0,.70,0,0,1,"1'","Kick-off — Oranje the favorites",false],[4,.68,0,0,1,"9'","Depay drags an effort wide",false],
      [8,.50,0,1,1,"19'","⚡ JPN GOAL — Mitoma slots it!",true],[12,.46,0,1,1,"28'","Netherlands chase the equalizer",false],
      [16,.31,0,2,1,"39'","⚡ JPN GOAL — Kubo curls it in!",true],[20,.30,0,2,1,"45'+1","Japan see out the half",false],
      [22,.30,0,2,0,"HT","HALFTIME — Japan stun Oranje 2-0",false],[24,.34,0,2,2,"48'","Netherlands come out flying",false],
      [28,.48,1,2,2,"56'","⚡ NED GOAL — Gakpo heads home!",true],[32,.53,1,2,2,"64'","Oranje pour forward",false],
      [36,.67,2,2,2,"72'","⚡ NED GOAL — Depay levels it!",true],[40,.64,2,2,2,"78'","End to end at MetLife",false],
      [44,.58,2,2,2,"83'","Verbruggen denies Kamada!",false],[48,.73,2,2,2,"88'","Netherlands win a corner...",false],
      [52,.91,3,2,2,"90'","⚡⚡ WEGHORST WINNER!! 3-2!!",true],[56,.93,3,2,2,"90+3'","Japan throw bodies forward",false],
      [58,.97,3,2,2,"90+6'","Verbruggen claims the cross",false],
      [60,1.0,3,2,2,"FT","🏆 NETHERLANDS WIN 3-2!!",true],
    ],
  },
];

export function processGame(g) {
  const plays = g.raw.map(([t,p,hs,as,q,c,e,sc]) => ({t,p,hs,as,q,c,e,scoring:sc}));
  return { ...g, plays, scoringPlays: plays.filter(p => p.scoring && p.e.includes("⚡")) };
}
export const PROC_GAMES = GAMES.map(processGame);



export const BOX = {
  "nfl-sb59": {
    qtr:[{q:"Q1",h:7,a:0},{q:"Q2",h:17,a:0},{q:"Q3",h:10,a:6},{q:"Q4",h:6,a:16}],
    team:[["1st Downs","22","11"],["Total Yards","345","306"],["Pass Yds","210","226"],["Rush Yds","135","49"],["Turnovers","1","3"],["Sacks-Yds","2-11","6-31"],["Penalties","5-35","3-20"],["3rd Down","6/11","3/12"],["Possession","34:12","25:48"]],
    pass:{h:[["J. Hurts","17/22","221","2","1"],["K. Pickett","0/1","0","0","0"]],a:[["P. Mahomes","21/32","257","3","2"]]},
    rush:{h:[["J. Hurts","11","72","1"],["S. Barkley","25","57","0"],["K. Gainwell","6","10","0"]],a:[["P. Mahomes","4","25","0"],["K. Hunt","3","9","0"],["I. Pacheco","3","7","0"]]},
    rec:{h:[["D. Smith","4","69","1"],["S. Barkley","6","40","0"],["A.J. Brown","5","43","1"],["J. Dotson","2","42","0"],["D. Goedert","2","27","0"]],a:[["X. Worthy","8","157","2"],["T. Kelce","4","39","0"],["D. Hopkins","6","21","1"],["JuJu Smith-S.","1","15","0"]]},
    def:{h:[["J. Sweat","6","2.5","0"],["M. Williams","4","2.0","0"],["Z. Baun","7","0","1"],["C. DeJean","4","0","1"],["O. Burks","5","0","0"]],a:[["D. Tranquill","11","0","0"],["N. Bolton","10","0","0"],["J. Reid","9","0","0"]]},
    passH:["Name","C/A","Yds","TD","INT"],rushH:["Name","Att","Yds","TD"],recH:["Name","Rec","Yds","TD"],defH:["Name","Tkl","Sck","INT"]
  },
  "mlb-ws7": {
    qtr:[{q:"1",h:0,a:0},{q:"2",h:0,a:0},{q:"3",h:0,a:3},{q:"4",h:0,a:0},{q:"5",h:1,a:0},{q:"6",h:1,a:1},{q:"7",h:0,a:0},{q:"8",h:1,a:0},{q:"9",h:1,a:0},{q:"10",h:0,a:0},{q:"11",h:1,a:0}],
    team:[["Hits","9","7"],["Errors","0","1"],["LOB","8","11"],["HRs","4","1"]],
    pass:{h:[["S. Ohtani","4.1 IP","3 ER","6 K",""],["Y. Yamamoto","2.2 IP","0 ER","3 K","W"]],a:[["M. Scherzer","4.1 IP","1 ER","3 K",""],["T. Yesavage","2.0 IP","1 ER","4 K","L"]]},
    rush:{h:[["W. Smith","5 AB","2 H","2 HR"],["S. Ohtani","5 AB","1 H","1 HR"],["M. Muncy","4 AB","1 H","1 HR"],["M. Rojas","4 AB","1 H","1 HR"]],a:[["B. Bichette","4 AB","1 H","1 HR"],["A. Giménez","3 AB","1 H","1 2B"],["V. Guerrero Jr.","5 AB","2 H","1 2B"]]},
    rec:{h:[],a:[]},def:{h:[],a:[]},
    passH:["Pitcher","IP","ERA","K","Dec"],rushH:["Batter","AB","H","XBH"],recH:[],defH:[]
  },
  "nba-fin1": {
    qtr:[{q:"Q1",h:24,a:31},{q:"Q2",h:24,a:26},{q:"Q3",h:27,a:26},{q:"Q4",h:36,a:27}],
    team:[["FG%","45.9%","44.3%"],["3PT%","35.7%","32.4%"],["FT%","78.6%","81.3%"],["Rebounds","44","41"],["Assists","26","28"],["Steals","9","5"],["Blocks","4","6"],["Turnovers","14","16"]],
    pass:{h:[["T. Haliburton","22 pts","8 reb","10 ast","GW"],["B. Mathurin","27 pts","3 reb","2 ast",""],["P. Siakam","20 pts","7 reb","4 ast",""],["M. Turner","18 pts","11 reb","2 blk",""]],a:[["S. Gilgeous-Alexander","38 pts","5 reb","8 ast",""],["J. Williams","19 pts","8 reb","5 ast",""],["C. Holmgren","15 pts","12 reb","5 blk",""],["A. Caruso","12 pts","3 reb","4 stl",""]]},
    rush:{h:[],a:[]},rec:{h:[],a:[]},def:{h:[],a:[]},
    passH:["Player","PTS","REB","AST","Note"],rushH:[],recH:[],defH:[]
  },
  "wc-ned-jpn": {
    qtr:[{q:"1H",h:0,a:2},{q:"2H",h:3,a:0}],
    team:[["Possession","58%","42%"],["Shots","17","9"],["On Target","8","5"],["Corners","7","3"],["Fouls","11","14"],["Offsides","2","1"],["Saves","3","5"]],
    pass:{h:[["C. Gakpo","56'","Header",""],["M. Depay","72'","Right foot",""],["W. Weghorst","90'","Left foot","GW"]],a:[["K. Mitoma","19'","Left foot",""],["T. Kubo","39'","Curler",""]]},
    rush:{h:[],a:[]},rec:{h:[],a:[]},def:{h:[],a:[]},
    passH:["Scorer","Min","Type","Note"],rushH:[],recH:[],defH:[]
  }
};
