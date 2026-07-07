/**
 * Sports news page (nav-rail newspaper icon) — honest coming-soon state until the feed ships.
 */
import { Newspaper } from "lucide-react";
import { B, fd, fm } from "../lib/theme.js";

export function NewsPage() {
  return (
    <div style={{ flex: 1, overflow: "auto", background: "#0a0a0a", padding: "32px 40px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Newspaper size={18} color={B.primary} />
        <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, letterSpacing: "0.12em", fontFamily: fm }}>NEWS</div>
      </div>
      <h2 style={{ fontFamily: fd, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", marginBottom: 6 }}>Sports news</h2>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>📰</div>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, fontFamily: fm, letterSpacing: "0.1em", color: B.primaryLight, background: B.primary + "1c", padding: "4px 12px", borderRadius: 999, marginBottom: 12 }}>COMING SOON</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: fd }}>A market-moving news feed</div>
          <div style={{ fontSize: 13, color: "#8a8f98", lineHeight: 1.6 }}>Injury reports, lineup changes, and momentum stories for the games you're trading — surfaced next to the price they move.</div>
        </div>
      </div>
    </div>
  );
}
