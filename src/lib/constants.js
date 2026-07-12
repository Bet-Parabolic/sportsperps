/* ─── Backend API ─── */
export const API_URL = "https://perpdictions-backend-production.up.railway.app/api";

/* ─── Google OAuth client id (GIS). Set VITE_GOOGLE_CLIENT_ID in Vercel env; empty = the
   Sign-up-with-Google button falls back to a coming-soon toast. Must match the backend's
   GOOGLE_CLIENT_ID (Railway) - the ID token audience is verified server-side. ─── */
export const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
/* WebSocket — derived from API_URL: https→wss, /api→/ws */
export const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api$/, "/ws");

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
