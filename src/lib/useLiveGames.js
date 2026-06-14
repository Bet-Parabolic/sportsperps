import { useState, useEffect, useRef } from "react";
import { API_URL, WS_URL } from "./constants.js";

/* ─────────────────────────────────────────────────────────────
   useLiveGames — real-time games list over WebSocket.

   Replaces the old 15s REST poll. Listens to the backend WS:
     { type:"init", games:[...] }      on connect
     { type:"game_update", game:{...} } per live game (~5s push)
   Falls back to a slow REST poll if the socket drops or goes
   silent (Railway idles WS after ~10 min). Reconnects with
   exponential backoff.

   Returns the live games array (same shape as GET /api/games).
   ───────────────────────────────────────────────────────────── */
export function useLiveGames() {
  const [games, setGames] = useState([]);
  const gamesRef = useRef(new Map());      // id -> game, the source of truth
  const wsRef = useRef(null);
  const backoffRef = useRef(1000);
  const lastMsgRef = useRef(0);
  const reconnectTimer = useRef(null);
  const closedRef = useRef(false);         // true once the component unmounts

  useEffect(() => {
    closedRef.current = false;

    const publish = () => setGames(Array.from(gamesRef.current.values()));

    const upsert = (game) => {
      if (!game?.id) return;
      gamesRef.current.set(game.id, game);
    };

    // REST fallback / initial paint — also used when the socket is down
    const restPoll = async () => {
      try {
        const res = await fetch(`${API_URL}/games`);
        if (!res.ok) return;
        const data = await res.json();
        gamesRef.current = new Map((data.games || []).map((g) => [g.id, g]));
        publish();
      } catch { /* offline — keep last known state */ }
    };

    const connect = () => {
      if (closedRef.current) return;
      let ws;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => { backoffRef.current = 1000; lastMsgRef.current = Date.now(); };

      ws.onmessage = (ev) => {
        lastMsgRef.current = Date.now();
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "init" && Array.isArray(msg.games)) {
          gamesRef.current = new Map(msg.games.map((g) => [g.id, g]));
          publish();
        } else if (msg.type === "game_update" && msg.game) {
          upsert(msg.game);
          publish();
        }
        // liquidation / settlement broadcasts are consumed per-game in
        // LiveTradingApp; ignored here (Phase B will route them).
      };

      ws.onclose = () => { if (!closedRef.current) scheduleReconnect(); };
      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      clearTimeout(reconnectTimer.current);
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, 30000); // cap 30s
      reconnectTimer.current = setTimeout(connect, delay);
    };

    // Initial REST paint (instant), then open the socket.
    restPoll();
    connect();

    // Safety heartbeat: if the socket has been silent > 30s, REST-poll once.
    const heartbeat = setInterval(() => {
      if (Date.now() - lastMsgRef.current > 30000) restPoll();
    }, 30000);

    return () => {
      closedRef.current = true;
      clearTimeout(reconnectTimer.current);
      clearInterval(heartbeat);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, []);

  return games;
}
