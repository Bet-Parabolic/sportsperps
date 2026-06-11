/* ─── Backend API ─── */
export const API_URL = "https://perpdictions-backend-production.up.railway.app/api";

/* ─── ESPN scoreboard sources for sidebar / sport tabs ─── */
export const ESPN_SOURCES = [
  {key:"nfl", url:"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",          emoji:"🏈", label:"NFL"},
  {key:"mlb", url:"https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",          emoji:"⚾", label:"MLB"},
  {key:"nhl", url:"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",            emoji:"🏒", label:"NHL"},
  {key:"wcup", url:"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",   emoji:"🏆", label:"World Cup"},
  {key:"ufc", url:"https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard",               emoji:"🥊", label:"UFC"},
];

/* ─── ESPN status names that count as live ─── */
export const LIVE_STATUS = ["STATUS_IN_PROGRESS","STATUS_FIRST_HALF","STATUS_SECOND_HALF","STATUS_HALFTIME","STATUS_EXTRA_TIME","STATUS_OVERTIME"];
