import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Home, Ticket, Newspaper, Trophy } from "lucide-react";
import { B, fb, fd, fm } from "../lib/theme.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { API_URL } from "../lib/constants.js";
import { getAuth, authToken, currentUserId } from "../lib/auth.js";
import { VerifyModal } from "./VerifyModal.jsx";
import { ProfilePage } from "./ProfilePage.jsx";
import { ActiveBetsPage } from "./ActiveBetsPage.jsx";
import { NewsPage } from "./NewsPage.jsx";
import { useLiveGames } from "../lib/useLiveGames.js";
import { loadCard } from "../lib/onboarding.js";
import { AvatarCircle } from "./onboarding/MemberCard.jsx";
import stadiumBg from "../assets/worldcup/stadium.jpg";
import fifa26 from "../assets/worldcup/fifa26.png";
import laurelImg from "../assets/worldcup/laurel.svg";
import laurelPodium from "../assets/worldcup/laurel-podium.svg";
import lanyardImg from "../assets/worldcup/lanyard.png";

const LiveTradingApp = lazy(() => import("../trading/LiveTradingApp.jsx").then(m => ({ default: m.LiveTradingApp })));
const OnboardingFlow = lazy(() => import("./onboarding/OnboardingFlow.jsx").then(m => ({ default: m.OnboardingFlow })));

// ═══════════════════════════════════════════════════════════════════════════
// /worldcup — the World Cup Trading Competition app (Figma: World-Cup-Web-App 142-18663 home,
// 142-17611 rail, 142-17156 leaderboard). Same backend + SAME ACCOUNTS as the main app.
// ═══════════════════════════════════════════════════════════════════════════

const ESPN_WC = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260704-20260721";
const GOLD = "#ffad0a";
const GREEN = "#5ed87e";

function parseMatch(e) {
  const c = e.competitions?.[0] || {};
  const side = (ha) => {
    const t = (c.competitors || []).find((x) => x.homeAway === ha) || {};
    return {
      name: t.team?.shortDisplayName || t.team?.displayName || t.team?.abbreviation || "TBD",
      abbr: t.team?.abbreviation || "?",
      logo: t.team?.logo || null,
      score: t.score != null ? +t.score : null,
      winner: e.status?.type?.state === "post" ? t.winner === true : null,
      tbd: !t.team?.logo, // placeholder slot (QFW1 etc.) until the round resolves
    };
  };
  return {
    espnId: e.id, backendId: `wcup_${e.id}`, date: new Date(e.date),
    state: e.status?.type?.state, detail: e.status?.type?.shortDetail || "",
    minute: e.status?.displayClock || null,
    note: (c.notes || [])[0]?.headline || null,
    home: side("home"), away: side("away"),
  };
}

function classifyRounds(matches) {
  const sorted = [...matches].sort((a, b) => a.date - b.date);
  const r16 = sorted.filter((m) => m.date < new Date("2026-07-08T00:00:00Z"));
  const qf = sorted.filter((m) => m.date >= new Date("2026-07-08T00:00:00Z") && m.date < new Date("2026-07-13T00:00:00Z"));
  const sf = sorted.filter((m) => m.date >= new Date("2026-07-13T00:00:00Z") && m.date < new Date("2026-07-17T00:00:00Z"));
  const rest = sorted.filter((m) => m.date >= new Date("2026-07-17T00:00:00Z"));
  return { r16, qf, sf, third: rest.length > 1 ? rest[0] : null, final: rest.length ? rest[rest.length - 1] : null };
}

function feedersFor(qfMatch, r16) {
  const inQf = (abbr) => abbr && (qfMatch.home.abbr === abbr || qfMatch.away.abbr === abbr);
  const winnerAbbr = (m) => (m.home.winner ? m.home.abbr : m.away.winner ? m.away.abbr : null);
  return r16.filter((m) => inQf(winnerAbbr(m)));
}

const fmtWhen = (d) => {
  const now = new Date();
  const today = d.toDateString() === now.toDateString();
  const tomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return today ? `Today, ${time}` : tomorrow ? `Tomorrow, ${time}` : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/* ── circular flag: ESPN country pngs carry transparent padding, so scale the image up inside
   an overflow-hidden circle — no black letterbox (Figma glossy flag badges) ── */
function FlagCircle({ src, size, dim = false, border = true }) {
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#1c1d21", border: border ? "1px solid rgba(255,255,255,0.14)" : "none", boxShadow: "inset 0 2px 3px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.4)", opacity: dim ? 0.38 : 1 }}>
      {src && <img src={src} alt="" style={{ position: "absolute", left: "-24%", top: "-24%", width: "148%", height: "148%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(120% 90% at 30% 15%, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%)" }} />
    </div>
  );
}

/* ── team chip: circular flag when known, clean dark "?" for unresolved slots ── */
function TeamSlot({ t, size = 32, dim = false }) {
  if (t?.tbd || !t?.logo) {
    return (
      <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", background: "#232323", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06)" }}>
        <img src={laurelImg} alt="" style={{ position: "absolute", inset: "10%", width: "80%", height: "80%", objectFit: "contain", opacity: 0.22 }} />
        <span style={{ fontFamily: fb, fontWeight: 600, fontSize: size * 0.36, color: "#9a9a9a", position: "relative" }}>?</span>
      </div>
    );
  }
  return <FlagCircle src={t.logo} size={size} dim={dim} />;
}

/* win-% chip under a team once the oracle prices the matchup */
const Pct = ({ p, home }) => p == null ? null : (
  <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 10, color: home ? B.primary : "#ff5247" }}>
    {Math.round((home ? p : 1 - p) * 100)}%
  </span>
);

/* ── round chip label (FINAL / SEMI-FINAL 1 / 3RD PLACE) ── */
const RoundChip = ({ children, gold = false }) => (
  <div style={{ padding: "5px 11px", borderRadius: 48, background: gold ? "linear-gradient(90deg,#4a3d14,#2b2612)" : "#191b1f", border: `1px solid ${gold ? "rgba(255,229,113,0.35)" : "rgba(255,255,255,0.07)"}` }}>
    <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 9, letterSpacing: "0.18em", color: gold ? "#ffe571" : "#bcbcbc" }}>{children}</span>
  </div>
);

/* ── center-column round cards (FINAL gold glass / semis / 3rd place) — Figma 142-18797 ── */
function RoundCard({ m, label, onOpen, gold = false, prob = null }) {
  const live = m?.state === "in";
  const done = m?.state === "post";
  const showProb = prob != null && !done && m && !m.home.tbd && !m.away.tbd;
  return (
    <div onClick={() => m && onOpen?.(m)} style={{
      borderRadius: 20, padding: "14px 12px", cursor: m ? "pointer" : "default", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      background: gold ? "linear-gradient(180deg, rgba(255,229,113,0.10), rgba(30,28,20,0.6)), #232323" : "rgba(28,29,33,0.85)",
      border: `1px solid ${live ? B.primary + "66" : gold ? "rgba(255,229,113,0.22)" : "rgba(255,255,255,0.05)"}`,
      boxShadow: gold ? "inset 0 1px 1px rgba(255,255,255,0.12), inset 0 0 18px rgba(255,238,160,0.10), 0 3px 2px -2px rgba(0,0,0,0.25)" : "inset 0 1px 1px rgba(255,255,255,0.05), 0 3px 2px -2px rgba(0,0,0,0.25)",
    }}>
      <RoundChip gold={gold}>{live ? "● LIVE" : label}</RoundChip>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: gold ? 10 : 16 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamSlot t={m?.home} size={gold ? 48 : 32} dim={done && m?.home.winner === false} />
          {m?.home && !m.home.tbd && <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 11, color: done && m.home.winner === false ? "#666" : done && m.home.winner ? GREEN : "#fff" }}>{m.home.abbr}{m.state !== "pre" && m.home.score != null ? ` ${m.home.score}` : ""}</span>}
          {showProb && <Pct p={prob} home />}
        </div>
        {gold && <img src={fifa26} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamSlot t={m?.away} size={gold ? 48 : 32} dim={done && m?.away.winner === false} />
          {m?.away && !m.away.tbd && <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 11, color: done && m.away.winner === false ? "#666" : done && m.away.winner ? GREEN : "#fff" }}>{m.away.abbr}{m.state !== "pre" && m.away.score != null ? ` ${m.away.score}` : ""}</span>}
          {showProb && <Pct p={prob} />}
        </div>
      </div>
      <span style={{ fontFamily: fb, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
        {m ? (done ? (m.note || "Full time") : live ? "Trade now →" : fmtWhen(m.date)) : "TBD"}
      </span>
    </div>
  );
}

/* R16 wing node: one finished game as a compact vertical pair */
function WingPair({ m, onOpen }) {
  const Row = ({ t }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, opacity: m.state === "post" && t.winner === false ? 0.35 : 1 }}>
      <TeamSlot t={t} size={30} />
      <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 9.5, color: m.state === "post" && t.winner ? GREEN : "#99a" }}>{t.abbr}{t.score != null && m.state !== "pre" ? ` ${t.score}` : ""}</span>
    </div>
  );
  return (
    <div onClick={() => onOpen?.(m)} title={`${m.away.name} vs ${m.home.name}${m.note ? " — " + m.note : ""}`}
      style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "10px 8px", borderRadius: 16, background: "rgba(23,24,28,0.8)", border: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
      <Row t={m.home} />
      <Row t={m.away} />
    </div>
  );
}

/* QF card in the wings: two flags side by side + date */
function QfCard({ m, onOpen, prob = null }) {
  const live = m?.state === "in";
  const done = m?.state === "post";
  const showProb = prob != null && !done && !m.home.tbd && !m.away.tbd;
  const Col = ({ t, home }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: done && t.winner === false ? 0.4 : 1 }}>
      <TeamSlot t={t} size={30} />
      <span style={{ fontFamily: fm, fontWeight: 800, fontSize: 11, color: done && t.winner ? GREEN : "#fff" }}>{t.abbr}{t.score != null && m.state !== "pre" ? ` ${t.score}` : ""}</span>
      {showProb && <Pct p={prob} home={home} />}
    </div>
  );
  return (
    <div onClick={() => onOpen?.(m)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 10px", borderRadius: 18, background: "rgba(30,31,36,0.9)", border: `1px solid ${live ? B.primary + "66" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", gap: 18 }}><Col t={m.home} home /><Col t={m.away} /></div>
      <span style={{ fontFamily: fb, fontSize: 11, color: live ? "#ff5247" : "#8a93a6", fontWeight: 600 }}>{live ? "● LIVE — Trade" : done ? "Full time" : fmtWhen(m.date).split(",")[0]}</span>
    </div>
  );
}

/* Bracket — symmetric wings converging on the gold FINAL card (Figma home layout) */
function Bracket({ matches, onOpen, isMobile, probs = {} }) {
  const { r16, qf, sf, third, final } = classifyRounds(matches);
  const leftQf = qf.slice(0, 2), rightQf = qf.slice(2, 4);
  const leftR16 = leftQf.flatMap((q) => feedersFor(q, r16));
  const rightR16 = rightQf.flatMap((q) => feedersFor(q, r16));

  if (isMobile) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        {final && <RoundCard m={final} label="FINAL" gold onOpen={onOpen} prob={probs[final.backendId]} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {sf[0] && <RoundCard m={sf[0]} label="SEMI-FINAL 1" onOpen={onOpen} prob={probs[sf[0].backendId]} />}
          {sf[1] && <RoundCard m={sf[1]} label="SEMI-FINAL 2" onOpen={onOpen} prob={probs[sf[1].backendId]} />}
        </div>
        {third && <RoundCard m={third} label="3RD PLACE" onOpen={onOpen} prob={probs[third.backendId]} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {qf.map((m) => <QfCard key={m.espnId} m={m} onOpen={onOpen} prob={probs[m.backendId]} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {r16.map((m) => <WingPair key={m.espnId} m={m} onOpen={onOpen} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "84px 128px 1fr 128px 84px", columnGap: 30, alignItems: "stretch", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 12 }}>
        {leftR16.slice(0, 4).map((m) => <WingPair key={m.espnId} m={m} onOpen={onOpen} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 12 }}>
        {leftQf.map((m) => <QfCard key={m.espnId} m={m} onOpen={onOpen} prob={probs[m.backendId]} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 8px" }}>
        <div style={{ width: "min(346px, 100%)" }}>{final && <RoundCard m={final} label="FINAL" gold onOpen={onOpen} prob={probs[final.backendId]} />}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, width: "100%", maxWidth: 430 }}>
          {sf[0] ? <RoundCard m={sf[0]} label="SEMI-FINAL 1" onOpen={onOpen} prob={probs[sf[0].backendId]} /> : <div />}
          {sf[1] ? <RoundCard m={sf[1]} label="SEMI-FINAL 2" onOpen={onOpen} prob={probs[sf[1].backendId]} /> : <div />}
        </div>
        <div style={{ width: "min(240px, 100%)" }}>{third && <RoundCard m={third} label="3RD PLACE" onOpen={onOpen} prob={probs[third.backendId]} />}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 12 }}>
        {rightQf.map((m) => <QfCard key={m.espnId} m={m} onOpen={onOpen} prob={probs[m.backendId]} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 12 }}>
        {rightR16.slice(0, 4).map((m) => <WingPair key={m.espnId} m={m} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

/* ── left nav rail (Figma 142-17611): icons + live capsule ── */
function WCRail({ tab, onTab, liveWc, onOpenLive }) {
  const items = [["home", Home], ["bets", Ticket], ["news", Newspaper], ["leaderboard", Trophy]];
  return (
    <div style={{ width: 64, flexShrink: 0, background: "#050505", borderRight: "1px solid #131313", display: "flex", flexDirection: "column", alignItems: "center", height: "100%", padding: "22px 12px 20px", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {items.map(([key, Icon]) => (
          <button key={key} onClick={() => onTab(key)} title={key} style={{ width: 36, height: 36, borderRadius: 12, border: "none", cursor: "pointer", background: tab === key ? "rgba(255,255,255,0.08)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={20} color={tab === key ? "#fff" : "#63676e"} strokeWidth={2} />
          </button>
        ))}
      </div>
      {liveWc.length > 0 && (
        <div onClick={() => onOpenLive(liveWc[0])} title={`${liveWc.length} live match${liveWc.length > 1 ? "es" : ""} — trade now`}
          style={{ width: 36, borderRadius: 9999, padding: "10px 3px 8px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
            background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), rgba(34,34,34,0.95)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04), inset 0 0 0 0.5px rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: 24, background: "#46dc63", boxShadow: "0 0 2px 0.5px rgba(143,250,163,0.15), 0 0 5px 1px rgba(70,220,99,0.25), 0 0 11px 2px rgba(70,220,99,0.45)" }} />
            <span style={{ fontFamily: fb, fontWeight: 500, fontSize: 12, color: "#fff" }}>{liveWc.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {liveWc.slice(0, 3).flatMap((g) => [g.home?.logo, g.away?.logo]).filter(Boolean).slice(0, 3).map((logo, i) => (
              <div key={i} style={{ marginTop: i ? -5 : 0 }}><FlagCircle src={logo} size={18} /></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── circular NEXT MATCH countdown (Figma 142-18690) ── */
function CountdownRing({ nextMatch, cdStr }) {
  if (!nextMatch) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <div style={{ position: "relative", width: 208, height: 208, marginBottom: -66 }}>
        <svg width="208" height="208" viewBox="0 0 208 208" style={{ position: "absolute", inset: 0 }}>
          <circle cx="104" cy="104" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <defs><path id="wc-arc" d="M 28 104 A 76 76 0 0 1 180 104" fill="none" /></defs>
          <text style={{ fontFamily: fm, fontWeight: 700, fontSize: 12.5, letterSpacing: "0.3em", fill: "#fff" }}>
            <textPath href="#wc-arc" startOffset="50%" textAnchor="middle">{nextMatch.away.abbr} VS {nextMatch.home.abbr}</textPath>
          </text>
        </svg>
        <img src={fifa26} alt="FIFA World Cup 26" style={{ position: "absolute", left: "50%", top: 96, transform: "translate(-50%,-50%)", width: 74, objectFit: "contain" }} />
        <div style={{ position: "absolute", left: -4, top: 86 }}><FlagCircle src={nextMatch.away.logo} size={36} /></div>
        <div style={{ position: "absolute", right: -4, top: 86 }}><FlagCircle src={nextMatch.home.logo} size={36} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", zIndex: 1 }}>
        <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 17, letterSpacing: "0.05em", color: "#fff" }}>NEXT MATCH</span>
        <div style={{ background: GOLD, padding: "8px 18px", display: "inline-block" }}>
          <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 21, letterSpacing: "0.04em", color: "#000", whiteSpace: "nowrap", textTransform: "uppercase" }}>{cdStr}</span>
        </div>
      </div>
    </div>
  );
}

export function WorldCupPage() {
  const [tab, setTab] = useState("home");
  const [meta, setMeta] = useState(null);
  const [bracket, setBracket] = useState([]);
  const [probs, setProbs] = useState({});
  const [lb, setLb] = useState([]);
  const [auth, setAuth] = useState(getAuth);
  const [joined, setJoined] = useState(null);
  const [wcBalance, setWcBalance] = useState(null);
  const [standing, setStanding] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [joinErr, setJoinErr] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [memberCard] = useState(() => loadCard());
  const liveGames = useLiveGames();
  const wcLive = liveGames.filter((g) => g.league === "wcup" && (g.status === "live" || g.status === "halftime"));
  const userId = auth?.userId || currentUserId();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  const refresh = useCallback(async () => {
    try {
      const [m, l, e, g] = await Promise.all([
        fetch(`${API_URL}/event`).then(r => r.json()),
        fetch(`${API_URL}/event/leaderboard?limit=50`).then(r => r.json()),
        fetch(ESPN_WC).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/games`).then(r => r.json()).catch(() => null),
      ]);
      setMeta(m); setLb(l.leaderboard || []);
      if (e?.events) setBracket(e.events.map(parseMatch));
      const games = g?.games || (Array.isArray(g) ? g : []);
      const p = {};
      for (const gm of games) {
        if (gm?.id?.startsWith?.("wcup_") && gm.oracle?.indexPrice != null && gm.oracle.confidence > 0) p[gm.id] = gm.oracle.indexPrice;
      }
      setProbs(p);
      if (auth?.userId) {
        const eb = await fetch(`${API_URL}/event/balance/${auth.userId}`);
        if (eb.status === 404) { setJoined(false); setWcBalance(null); setStanding(null); }
        else if (eb.ok) {
          const d = await eb.json();
          setJoined(true); setWcBalance(d.balance);
          const st = await fetch(`${API_URL}/event/standing/${auth.userId}`).then(r => r.ok ? r.json() : null).catch(() => null);
          setStanding(st);
        }
      } else { setJoined(false); }
    } catch { /* keep last */ }
  }, [auth?.userId]);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 30_000); return () => clearInterval(iv); }, [refresh]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { document.title = "Parabolic · World Cup Trading Competition"; }, []);

  const join = useCallback(async () => {
    setJoinErr("");
    if (!getAuth()) { setShowOnboard(true); return; }
    try {
      const res = await fetch(`${API_URL}/event/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getAuth().userId, token: authToken() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.joined) { setJoined(true); setWcBalance(d.worldCupCash); refresh(); return; }
      if (res.status === 403 && /verify/i.test(d.error || "")) { setShowVerify(true); return; }
      if (res.status === 401) { setShowOnboard(true); return; }
      setJoinErr(d.error || "Could not join right now");
    } catch { setJoinErr("Network error — try again"); }
  }, [refresh]);

  const nextMatch = bracket.filter((m) => m.state === "pre" && !m.home.tbd).sort((a, b) => a.date - b.date)[0]
    || bracket.filter((m) => m.state === "pre").sort((a, b) => a.date - b.date)[0];
  const liveMatch = bracket.find((m) => m.state === "in");
  const cd = nextMatch ? Math.max(0, nextMatch.date - now) : null;
  const cdStr = cd != null ? `${Math.floor(cd / 86400000)}d ${Math.floor(cd / 3600000) % 24}h ${Math.floor(cd / 60000) % 60}m ${Math.floor(cd / 1000) % 60}s` : null;

  const openMatch = async (m) => {
    try {
      const r = await fetch(`${API_URL}/games/${m.backendId}`);
      if (!r.ok) return;
      const full = await r.json();
      setActiveGame(full.game || full);
    } catch { /* ignore */ }
  };
  const openGame = async (g) => {
    try { const full = await fetch(`${API_URL}/games/${g.id}`).then(r => r.json()); setActiveGame(full.game || full); }
    catch { setActiveGame(g); }
  };

  if (activeGame) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000" }} />}>
        <LiveTradingApp
          game={activeGame}
          onBack={() => { setActiveGame(null); refresh(); }}
          liveGames={wcLive}
          onNavTo={(t) => { setActiveGame(null); setTab(["home", "bets", "news", "leaderboard"].includes(t) ? t : "home"); refresh(); }}
          onTrade={(g) => openGame(g)}
          onOnboard={() => { setActiveGame(null); setShowOnboard(true); }}
        />
      </Suspense>
    );
  }

  /* ── HOME (Figma 142-18663) ── */
  const HomeTab = () => (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: isMobile ? 520 : 640, overflow: "hidden", pointerEvents: "none" }}>
        <img src={stadiumBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 76%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(4,5,7,0.4) 0%, rgba(4,5,7,0.16) 32%, rgba(4,5,7,0.3) 62%, rgba(6,7,10,0.82) 86%, #06070a 99%)" }} />
      </div>

      <div style={{ position: "relative", padding: isMobile ? "60px 16px 60px" : "64px 40px 80px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? 14 : 18 }}>
          <CountdownRing nextMatch={liveMatch || nextMatch} cdStr={liveMatch ? "LIVE NOW" : cdStr || "—"} />
        </div>

        <div style={{ textAlign: "center", maxWidth: 1253, margin: "0 auto" }}>
          <h1 style={{ fontFamily: fd, fontWeight: 800, textTransform: "uppercase", color: "#fff", fontSize: isMobile ? 40 : "min(5.4vw, 74px)", lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0, textShadow: "0 4px 30px rgba(0,0,0,0.55)" }}>
            The World Cup<br />Trading Competition
          </h1>
          <p style={{ fontFamily: fb, color: "rgba(255,255,255,0.88)", fontSize: isMobile ? 13.5 : 15, lineHeight: 1.5, maxWidth: 640, margin: "16px auto 0", textShadow: "0 2px 14px rgba(0,0,0,0.6)" }}>
            $10,000 World Cup Cash per entrant, trade live win probability through the bracket.<br />
            Cash prizes $1,000 · $500 · $250
          </p>

          {meta?.live && (joined
            ? <div style={{ marginTop: 20, display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {standing && [["RANK", `#${standing.rank}`], ["WC CASH", `$${Math.round(wcBalance ?? standing.equity).toLocaleString()}`], ["ROI", `${standing.roiPct >= 0 ? "+" : ""}${standing.roiPct}%`]].map(([k, v]) => (
                  <div key={k} style={{ padding: "10px 20px", borderRadius: 14, background: "rgba(20,21,25,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontFamily: fm, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", color: "#8a93a6" }}>{k}</div>
                    <div style={{ fontFamily: fd, fontWeight: 800, fontSize: 20, color: k === "ROI" ? (standing.roiPct >= 0 ? GREEN : "#ff5247") : "#fff" }}>{v}</div>
                  </div>
                ))}
              </div>
            : <div style={{ marginTop: 20 }}>
                <button onClick={join} style={{ padding: "13px 22px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fb, fontWeight: 700, fontSize: 15, background: "#fff", color: "#0a0a0a", boxShadow: "0 10px 34px rgba(255,255,255,0.15)" }}>
                  Join Championship &amp; Get $10,000
                </button>
                {joinErr && <div style={{ color: "#ff5247", fontSize: 13, marginTop: 12 }}>{joinErr}</div>}
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5, marginTop: 12, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>One entry per person — email + phone verification keeps the prizes fair.</div>
              </div>)}
        </div>

        <div style={{ marginTop: isMobile ? 40 : 56 }}>
          {bracket.length > 0 && <Bracket matches={bracket} onOpen={openMatch} isMobile={isMobile} probs={probs} />}
        </div>

        <p style={{ textAlign: "center", color: "#4a4f58", fontSize: 11.5, lineHeight: 1.8, maxWidth: 780, margin: "70px auto 0" }}>
          World Cup Cash is competition play money, fully separate from your Parabolic paper balance. Your account here IS your
          Parabolic account — same login everywhere. Prizes require verified identity; accounts showing manipulation may be voided.
        </p>
      </div>
    </div>
  );

  /* ── LEADERBOARD (Figma 142-17156) ── */
  const LeaderboardTab = () => {
    const me = lb.find((e) => e.userId === userId);
    const top3 = lb.slice(0, 3);
    const rest = lb.slice(3, 12);
    const medal = (rank) => rank === 1
      ? "linear-gradient(180deg,#cf7b0e,#9f5a00)" : rank === 2
      ? "linear-gradient(180deg,#9aa0a8,#5c6167)" : "linear-gradient(180deg,#a06a3c,#6d4426)";
    const Podium = ({ e, big = false }) => e ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 120, marginTop: big ? 0 : 24 }}>
        <div style={{ position: "relative", width: 84, height: 92 }}>
          <img src={laurelPodium} alt="" style={{ position: "absolute", left: 0, top: 0, width: 84, height: 76, objectFit: "contain", filter: e.rank === 1 ? "none" : "grayscale(0.7) brightness(1.05)" }} />
          <div style={{ position: "absolute", left: 10, top: 5, width: 64, height: 64, borderRadius: "50%", border: "3px solid #131313", background: "#23262c", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {e.userId === userId && memberCard?.avatar
              ? <AvatarCircle avatar={memberCard.avatar} size={58} />
              : <span style={{ fontFamily: fd, fontWeight: 800, fontSize: 24, color: "#cfd4dc" }}>{(e.username || "?").charAt(0).toUpperCase()}</span>}
          </div>
          <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", background: "#131313", borderRadius: 40, padding: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: medal(e.rank), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.17)" }}>
              <span style={{ fontFamily: fb, fontWeight: 700, fontSize: 11, color: "#281a03" }}>{e.rank}</span>
            </div>
          </div>
        </div>
        <span style={{ fontFamily: fb, fontWeight: 500, fontSize: 15, color: "#fff" }}>{e.username || e.userId.slice(0, 8)}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          <span style={{ fontFamily: fb, fontWeight: 600, fontSize: 16, color: e.roiPct >= 0 ? GREEN : "#ff5247" }}>{e.roiPct >= 0 ? "+" : ""}{e.roiPct}%</span>
          <span style={{ fontFamily: fb, fontWeight: 500, fontSize: 12, color: "#b6b6b6" }}>{e.trades} trades</span>
        </div>
      </div>
    ) : <div style={{ width: 120 }} />;

    return (
      <div style={{ position: "relative", minHeight: "100%" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <img src={stadiumBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.32 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,7,10,0.25), rgba(6,7,10,0.85) 60%, #06070a)" }} />
        </div>
        <div style={{ position: "relative", padding: isMobile ? "56px 14px 60px" : "56px 24px 70px" }}>
          <div style={{ fontFamily: fb, fontWeight: 600, fontSize: 14, color: "#fff", padding: "10px 8px 22px" }}>Leaderboard</div>

          {me && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -8 }}>
              <img src={lanyardImg} alt="" style={{ width: 250, height: 146, objectFit: "contain", marginBottom: -12 }} />
              <div style={{ width: 339, maxWidth: "92vw", height: 191, borderRadius: 20, position: "relative", background: "#141414", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 6, borderRadius: 15, border: "1px solid rgba(255,255,255,0.07)" }} />
                <img src={LOGO_WORDMARK} alt="Parabolic" style={{ position: "absolute", left: 24, top: 24, height: 17 }} />
                <div style={{ position: "absolute", right: 24, top: 20, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.1)" }}>
                  <span style={{ fontFamily: fm, fontWeight: 700, fontSize: 11, color: "#fff", letterSpacing: "0.06em" }}>{me.rank}</span>
                </div>
                <div style={{ position: "absolute", left: 24, bottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#23262c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {memberCard?.avatar ? <AvatarCircle avatar={memberCard.avatar} size={40} /> : <span style={{ fontSize: 18 }}>👤</span>}
                  </div>
                  <span style={{ fontFamily: fd, fontWeight: 700, fontSize: 19, color: "#fff" }}>{me.username || "you"}</span>
                </div>
                <div style={{ position: "absolute", right: 24, bottom: 26, textAlign: "right" }}>
                  <div style={{ fontFamily: fb, fontWeight: 700, fontSize: 17, color: me.roiPct >= 0 ? GREEN : "#ff5247" }}>{me.roiPct >= 0 ? "+" : ""}{me.roiPct}%</div>
                  <div style={{ fontFamily: fb, fontSize: 13, color: "#cfd4dc" }}>{me.trades} trades</div>
                </div>
              </div>
            </div>
          )}

          {top3.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 14 : 60, marginTop: me ? 56 : 30 }}>
              <Podium e={top3[1]} />
              <Podium e={top3[0]} big />
              <Podium e={top3[2]} />
            </div>
          )}
          {lb.length === 0 && (
            <div style={{ textAlign: "center", color: "#8a93a6", fontSize: 13, padding: "60px 0" }}>
              {meta?.live ? "No entrants yet — be first on the board." : "The board opens with the competition."}
            </div>
          )}

          {rest.length > 0 && (
            <div style={{ maxWidth: 560, margin: "38px auto 0" }}>
              {rest.map((e) => {
                const isMe = e.userId === userId;
                return (
                  <div key={e.userId} style={{ display: "flex", alignItems: "center", gap: 14, height: 62, borderBottom: "1px solid rgba(255,255,255,0.06)", background: isMe ? "rgba(94,216,126,0.05)" : "transparent", borderRadius: isMe ? 10 : 0, padding: "0 10px" }}>
                    <span style={{ fontFamily: fb, fontWeight: 500, fontSize: 14, color: "#8a93a6", width: 22 }}>{e.rank}</span>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#23262c", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {isMe && memberCard?.avatar ? <AvatarCircle avatar={memberCard.avatar} size={28} /> : <span style={{ fontFamily: fd, fontWeight: 700, fontSize: 12, color: "#cfd4dc" }}>{(e.username || "?").charAt(0).toUpperCase()}</span>}
                    </div>
                    <span style={{ fontFamily: fb, fontWeight: 600, fontSize: 14.5, color: isMe ? GREEN : "#fff", flex: 1 }}>{e.username || e.userId.slice(0, 8)}{isMe ? " (you)" : ""}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: fb, fontWeight: 600, fontSize: 14.5, color: e.roiPct >= 0 ? GREEN : "#ff5247" }}>{e.roiPct >= 0 ? "+" : ""}{e.roiPct}%</div>
                      <div style={{ fontFamily: fb, fontSize: 12, color: "#8a93a6" }}>{e.trades} trades</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const navItems = [["home", Home], ["bets", Ticket], ["news", Newspaper], ["leaderboard", Trophy]];

  return (
    <div style={{ height: "100vh", background: "#06070a", fontFamily: fb, color: "#eef1f6", display: "flex", overflow: "hidden" }}>
      {!isMobile && (
        <WCRail tab={tab} onTab={setTab} liveWc={wcLive} onOpenLive={openGame} />
      )}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: isMobile ? 68 : 0, position: "relative" }}>
          {/* header overlays the tab content (Figma: wordmark + auth pills float on the stadium hero) */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 64, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 16px" : "0 40px" }}>
            <img src={LOGO_WORDMARK} alt="Parabolic" style={{ height: 22 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {joined && wcBalance != null && (
                <div style={{ padding: "6px 14px", borderRadius: 999, background: "rgba(94,216,126,0.1)", border: `1px solid ${GREEN}44`, backdropFilter: "blur(6px)" }}>
                  <span style={{ fontFamily: fm, fontWeight: 800, fontSize: 13, color: "#fff" }}>${wcBalance.toLocaleString(undefined, { minimumFractionDigits: isMobile ? 0 : 2 })}</span>
                </div>
              )}
              {auth
                ? <button onClick={() => setShowProfile(true)} title="My profile" style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", overflow: "hidden", background: "#1a1d22", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    {memberCard?.avatar ? <AvatarCircle avatar={memberCard.avatar} size={34} /> : <span style={{ fontSize: 14 }}>👤</span>}
                  </button>
                : <>
                    <button onClick={() => setShowOnboard(true)} style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: fb, fontWeight: 600, fontSize: 13, cursor: "pointer", backdropFilter: "blur(6px)" }}>Login</button>
                    <button onClick={() => setShowOnboard(true)} style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: "#fff", color: "#0a0a0a", fontFamily: fb, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Create account</button>
                  </>}
            </div>
          </div>
          {tab === "home" && <HomeTab />}
          {tab === "bets" && <div style={{ padding: isMobile ? "64px 4px 10px" : "64px 16px 10px" }}><ActiveBetsPage eventOnly liveGames={wcLive} onTrade={openGame} /></div>}
          {tab === "news" && <div style={{ paddingTop: 56 }}><NewsPage /></div>}
          {tab === "leaderboard" && <LeaderboardTab />}
        </div>
      </div>

      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#050505", borderTop: "1px solid #131313", display: "flex", height: 56, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map(([key, Icon]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={tab === key ? "#fff" : "#5a6170"} />
            </button>
          ))}
        </div>
      )}

      {showProfile && (
        <ProfilePage worldcup userId={auth?.userId}
          onClose={() => { setShowProfile(false); refresh(); }}
          onLoggedOut={() => setShowProfile(false)} />
      )}
      {showOnboard && (
        <Suspense fallback={<div style={{ position: "fixed", inset: 0, zIndex: 800, background: "#050505" }} />}>
          <OnboardingFlow worldcup
            onGuest={() => setShowOnboard(false)}
            onDone={() => {
              setShowOnboard(false);
              const a = getAuth();
              setAuth(a);
              if (a) setTimeout(() => join(), 250);
              refresh();
            }} />
        </Suspense>
      )}
      {showVerify && auth && (
        <VerifyModal userId={auth.userId}
          onClose={() => setShowVerify(false)}
          onVerified={() => { setShowVerify(false); join(); }} />
      )}
    </div>
  );
}
