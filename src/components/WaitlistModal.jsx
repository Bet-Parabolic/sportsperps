import { useEffect } from "react";
import { WaitlistForm } from "./WaitlistForm.jsx";

// Overlay wrapper around the shared WaitlistForm. Used by the landing-page "Join Waitlist" button.
// The dedicated /waitlist route uses WaitlistPage instead.
export function WaitlistModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <WaitlistForm onClose={onClose} />
    </div>
  );
}
