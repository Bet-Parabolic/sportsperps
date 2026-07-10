import { Component } from "react";

/* App-level error boundary — without it, any uncaught render error white-screens the whole app
   with no way back (the worst case on a phone mid-match). Renders a branded fallback with a
   reload button instead, and logs the error to the console for debugging. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#06070a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 34 }}>⚠️</div>
        <div style={{ color: "#eef1f6", fontSize: 17, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ color: "#8a93a6", fontSize: 13, maxWidth: 340, lineHeight: 1.6 }}>
          A part of the app crashed. Reloading usually fixes it — your balance and positions are safe on the server.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 6, padding: "12px 32px", borderRadius: 12, border: "none", cursor: "pointer", background: "#1fd182", color: "#04130c", fontWeight: 800, fontSize: 14 }}>
          Reload
        </button>
      </div>
    );
  }
}
