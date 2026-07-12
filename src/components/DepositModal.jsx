/**
 * Deposit / withdrawal "coming soon" modal — opened from the terminal header's Deposit button.
 * Honest state: the platform is paper trading (every account starts with $10,000); real USDC
 * deposits and withdrawals arrive with on-chain settlement.
 */
import { B, fd, fb, fm } from "../lib/theme.js";

export function DepositModal({ balance, onClose }) {
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(2,3,5,0.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 380, background: B.card, border: `1px solid ${B.border}`, borderRadius: 22, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.55)", textAlign: "center", fontFamily: fb }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🏦</div>
        <h2 style={{ margin: "0 0 6px", fontFamily: fd, fontSize: 21, color: B.white, fontWeight: 700 }}>Deposits &amp; withdrawals</h2>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, fontFamily: fm, letterSpacing: "0.1em", color: B.primaryLight, background: B.primary + "1c", padding: "4px 12px", borderRadius: 999, marginBottom: 14 }}>COMING SOON</div>
        <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#9aa1ab", lineHeight: 1.6 }}>
          Parabolic is in paper trading - every account starts with <strong style={{ color: B.white }}>$10,000</strong> of practice funds. Real USDC deposits and withdrawals arrive with on-chain settlement.
        </p>
        {balance != null && (
          <div style={{ background: B.bg, border: `1px solid ${B.border2}`, borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "#666", fontWeight: 700, letterSpacing: "0.08em", fontFamily: fm, marginBottom: 3 }}>YOUR BALANCE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: B.white, fontFamily: fm }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: "13px 0", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: fb, fontWeight: 700, fontSize: 15, background: B.primary, color: "#04130c" }}>Got it</button>
      </div>
    </div>
  );
}
