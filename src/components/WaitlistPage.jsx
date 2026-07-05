import { useState, useEffect } from "react";
import { fb, fd } from "../lib/theme.js";
import { LOGO_WORDMARK } from "../lib/logos.js";
import { WaitlistForm } from "./WaitlistForm.jsx";

// Dedicated /waitlist route — branded full page wrapping the shared WaitlistForm.
export function WaitlistPage() {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, []);
  const T = "#1fd182";

  return (
    <div style={{ background: "#030303", minHeight: "100vh", fontFamily: fb, color: "#fff", position: "relative", overflow: "hidden" }}>
      {/* ambient background — matches the landing page */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <svg viewBox="0 0 1440 900" style={{ width: "100%", height: "100%", position: "absolute" }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="wR" cx="30%" cy="20%" r="45%"><stop offset="0%" stopColor="#1fd182" stopOpacity="0.08" /><stop offset="100%" stopColor="#1fd182" stopOpacity="0" /></radialGradient>
            <radialGradient id="wT" cx="72%" cy="78%" r="45%"><stop offset="0%" stopColor="#52e0a3" stopOpacity="0.05" /><stop offset="100%" stopColor="#52e0a3" stopOpacity="0" /></radialGradient>
            <linearGradient id="wM" x1="0%" y1="50%" x2="100%" y2="50%"><stop offset="0%" stopColor="#1fd182" stopOpacity="0" /><stop offset="40%" stopColor="#52e0a3" stopOpacity="0.05" /><stop offset="100%" stopColor="#5ce1ff" stopOpacity="0" /></linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#wR)" />
          <rect width="1440" height="900" fill="url(#wT)" />
          <path d="M-100,320 C300,270 550,420 850,300 S1150,370 1540,240" fill="none" stroke="url(#wM)" strokeWidth="1.5" />
          <path d="M-100,560 C250,520 500,620 800,540 S1100,600 1540,500" fill="none" stroke="url(#wM)" strokeWidth="1" />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "flex-start", padding: "40px 16px 56px" }}>
        {/* logo → home */}
        <a href="https://parabolic.gg" style={{ display: "inline-flex", marginBottom: 30, opacity: vis ? 1 : 0, transition: "opacity .8s" }}>
          <img src={LOGO_WORDMARK} alt="Parabolic" style={{ height: 46, width: "auto" }} />
        </a>

        {/* heading */}
        <div style={{ textAlign: "center", maxWidth: 520, marginBottom: 26,
          opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all .8s cubic-bezier(0.16,1,0.3,1) .08s" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T, display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", background: T + "10", borderRadius: 20, border: "1px solid " + T + "20", marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T, display: "inline-block", animation: "pulse 2s infinite" }} />
            Early Access
          </span>
          <h1 style={{ fontFamily: fd, fontSize: 40, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>
            Join the <span style={{ color: T }}>waitlist</span>
          </h1>
        </div>

        {/* form card */}
        <div style={{ width: "100%", maxWidth: 460, opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(20px)", transition: "all .8s cubic-bezier(0.16,1,0.3,1) .16s" }}>
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
