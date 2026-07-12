import { useState, useEffect, useRef } from "react";
import { API_URL } from "./constants.js";
import { subscribeLive, lastMessageAt } from "./liveSocket.js";

/* ─────────────────────────────────────────────────────────────
   useLiveGames - real-time games list over the shared WebSocket.

   Listens to the backend WS via the shared liveSocket:
     { type:"init", games:[...] }       on connect
     { type:"game_update", game:{...} } per live game (~5s push)
   Falls back to a slow REST poll if the socket goes silent
   (Railway idles WS after ~10 min).

   Returns the live games array (same shape as GET /api/games).
   ───────────────────────────────────────────────────────────── */
export function useLiveGames() {
  const [games, setGames] = useState([]);
  const gamesRef = useRef(new Map()); // id -> game, source of truth

  useEffect(() => {
    const publish = () => setGames(Array.from(gamesRef.current.values()));

    // REST fallback / instant initial paint
    const restPoll = async () => {
      try {
        const res = await fetch(`${API_URL}/games`);
        if (!res.ok) return;
        const data = await res.json();
        gamesRef.current = new Map((data.games || []).map((g) => [g.id, g]));
        publish();
      } catch { /* offline - keep last known state */ }
    };

    restPoll();

    const unsub = subscribeLive((msg) => {
      if (msg.type === "init" && Array.isArray(msg.games)) {
        gamesRef.current = new Map(msg.games.map((g) => [g.id, g]));
        publish();
      } else if (msg.type === "game_update" && msg.game?.id) {
        gamesRef.current.set(msg.game.id, msg.game);
        publish();
      }
    });

    // Safety heartbeat: if the socket has been silent > 30s, REST-poll once.
    const heartbeat = setInterval(() => {
      if (Date.now() - lastMessageAt() > 30000) restPoll();
    }, 30000);

    return () => { unsub(); clearInterval(heartbeat); };
  }, []);

  return games;
}
