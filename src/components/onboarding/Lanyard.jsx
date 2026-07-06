/**
 * Lanyard strap for the member card — web port of the mobile lanyard.tsx: a sport-colored
 * strap with a diagonal sheen, the sport emoji printed on it, and a black clip buckle.
 */
import { sportByKey } from "../../lib/onboarding.js";

export function Lanyard({ sport, width = 46, height = 170 }) {
  const def = sportByKey(sport);
  const color = def?.strap ?? "#1c1c1c";
  const buckleH = Math.min(34, height * 0.22);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* strap */}
      <div style={{ flex: 1, width, borderRadius: 4, overflow: "hidden", background: color, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "18%", height: "26%", background: "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)" }} />
        {def && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "55%", textAlign: "center" }}>
            <span style={{ fontSize: width * 0.42 }}>{def.emoji}</span>
          </div>
        )}
      </div>
      {/* buckle */}
      <div style={{ width: width * 0.7, height: buckleH, marginTop: -2, borderRadius: 5, background: "#0c0c0c", border: "1px solid #222" }} />
    </div>
  );
}
