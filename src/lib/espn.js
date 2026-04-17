import { clamp } from "./helpers.js";

/* helper — parse a standard ESPN event into a simple shape */
export function parseESPNEvent(ev) {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === "home");
  const away = comp?.competitors?.find(c => c.homeAway === "away");
  const stype = ev.status?.type?.name || "";
  const isLive = stype === "STATUS_IN_PROGRESS" || stype === "STATUS_FIRST_HALF" || stype === "STATUS_SECOND_HALF" || stype === "STATUS_EXTRA_TIME" || stype === "STATUS_OVERTIME";
  const isFinal = stype.includes("FINAL") || stype === "STATUS_FULL_TIME";
  const isHalf = stype === "STATUS_HALFTIME";
  const isDelayed = stype.includes("DELAY") || stype.includes("POSTPONE");
  return {
    id: ev.id, name: ev.name,
    date: ev.date || comp?.date || null,
    isLive: isLive || isHalf, isHalf, isFinal, isDelayed,
    isScheduled: !isLive && !isHalf && !isFinal && !isDelayed,
    detail: ev.status?.type?.detail || ev.status?.type?.shortDetail || "",
    home: { name: home?.team?.displayName||"", abbr: home?.team?.abbreviation||"", logo: home?.team?.logo||"", score: home?.score??null, record: home?.records?.[0]?.summary||"" },
    away: { name: away?.team?.displayName||"", abbr: away?.team?.abbreviation||"", logo: away?.team?.logo||"", score: away?.score??null, record: away?.records?.[0]?.summary||"" },
    _raw: ev,
  };
}

/* Find a backend game matching an ESPN event by ID or team names */
export function findBackendGame(liveGames, espnGame, sportKey) {
  if (!liveGames || !espnGame) return null;
  const espnId = espnGame.id || espnGame._raw?.id;
  const byId = liveGames.find(g => g.espnId === String(espnId) || g.id === sportKey+"_"+espnId);
  if (byId) return byId;
  const homeName = (espnGame.home?.name || "").toLowerCase();
  const awayName = (espnGame.away?.name || "").toLowerCase();
  if (homeName && awayName) {
    return liveGames.find(g =>
      g.league === sportKey &&
      (g.home.name.toLowerCase().includes(homeName) || homeName.includes(g.home.name.toLowerCase())) &&
      (g.away.name.toLowerCase().includes(awayName) || awayName.includes(g.away.name.toLowerCase()))
    );
  }
  return null;
}

/* Convert an ESPN event + sport key into a backend-compatible liveGame object */
export function normalizeEspnToLive(ev, sportKey) {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find(c=>c.homeAway==="home");
  const away = comp?.competitors?.find(c=>c.homeAway==="away");
  if(!home||!away) return null;
  let oraclePrice = 0.5;
  const oddsEntry = comp?.odds?.[0];
  if(oddsEntry?.homeTeamOdds?.moneyLine && oddsEntry?.awayTeamOdds?.moneyLine) {
    const hO = oddsEntry.homeTeamOdds.moneyLine;
    const aO = oddsEntry.awayTeamOdds.moneyLine;
    const ph = hO>0 ? 100/(hO+100) : Math.abs(hO)/(Math.abs(hO)+100);
    const pa = aO>0 ? 100/(aO+100) : Math.abs(aO)/(Math.abs(aO)+100);
    oraclePrice = clamp(ph/(ph+pa), 0.01, 0.99);
  }
  const stype = ev.status?.type?.name||"";
  const status = (stype==="STATUS_IN_PROGRESS"||stype==="STATUS_FIRST_HALF"||stype==="STATUS_SECOND_HALF"||stype==="STATUS_OVERTIME")?"live"
    :stype==="STATUS_HALFTIME"?"halftime":(stype.includes("FINAL")||stype==="STATUS_FULL_TIME")?"final":"scheduled";
  const labelMap = {nhl:"NHL",nfl:"NFL",mlb:"MLB",ucl:"UCL",nba:"NBA",mls:"MLS"};
  return {
    id: sportKey+"_"+ev.id,
    espnId: ev.id,
    league: sportKey,
    leagueDisplay: labelMap[sportKey]||sportKey.toUpperCase(),
    sport: labelMap[sportKey]||"",
    name: ev.name||"",
    shortName: ev.shortName||"",
    status,
    statusDetail: ev.status?.type?.shortDetail||"",
    period: ev.status?.period,
    clock: ev.status?.displayClock,
    home: {
      name: home.team.displayName||"",
      abbreviation: home.team.abbreviation||"",
      logo: home.team.logo||"",
      score: parseFloat(home.score)||0,
      color: home.team.color||"",
      altColor: home.team.alternateColor||home.team.color||"",
    },
    away: {
      name: away.team.displayName||"",
      abbreviation: away.team.abbreviation||"",
      logo: away.team.logo||"",
      score: parseFloat(away.score)||0,
      color: away.team.color||"",
      altColor: away.team.alternateColor||away.team.color||"",
    },
    oracle: {
      indexPrice: oraclePrice,
      markPrice: oraclePrice,
      sources: [{name:"ESPN Odds",price:oraclePrice,weight:35,color:"#f59e0b",ageMs:0,stale:false}],
      confidence: 0.45,
    },
    latestPlay: null,
    _espnKey: sportKey,
  };
}
