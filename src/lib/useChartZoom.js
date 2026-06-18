import { useRef, useState, useMemo, useEffect, useCallback } from "react";

/* ───────────────────────────────────────────────────────────────────────────
   Trading-terminal zoom/pan for a recharts numeric-X chart.
   - Scroll wheel        → zoom X (time) around the cursor
   - Shift+wheel / wheel over the Y-axis strip → zoom Y around the cursor
   - Drag the plot body   → pan X (content follows the cursor)
   - Drag the X-axis strip → zoom X around center
   - Drag the Y-axis strip → zoom Y around center
   The math lives in pure helpers below so it can be unit-tested.
   ─────────────────────────────────────────────────────────────────────────── */

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Zoom a [a,b] range by `factor` (>1 = zoom out) about `frac` (0..1 across the
// range), clamped to the full [lo,hi] extent. Min span = 2% of full.
export function zoomRange([a, b], factor, frac, [lo, hi]) {
  const span = b - a, anchor = a + frac * span, full = hi - lo;
  const ns = Math.max(full * 0.02, Math.min(full, span * factor));
  let na = anchor - frac * ns, nb = anchor + (1 - frac) * ns;
  if (na < lo) { nb += lo - na; na = lo; }
  if (nb > hi) { na -= nb - hi; nb = hi; }
  return [Math.max(lo, na), Math.min(hi, nb)];
}

// Pan a [a,b] range by `deltaFrac` of its own span, clamped to [lo,hi].
export function panRange([a, b], deltaFrac, [lo, hi]) {
  const span = b - a;
  let na = a + deltaFrac * span, nb = b + deltaFrac * span;
  if (na < lo) { nb += lo - na; na = lo; }
  if (nb > hi) { na -= nb - hi; nb = hi; }
  return [Math.max(lo, na), Math.min(hi, nb)];
}

// Zoom a Y [lo,hi] (0..1 prob axis) by factor about `frac` from the TOP (frac 0
// = top = hi). Clamped to [0,1], min span 1%.
export function zoomY([lo, hi], factor, frac) {
  const span = hi - lo, anchor = hi - frac * span;
  const ns = Math.max(0.01, Math.min(1, span * factor));
  let nlo = anchor - (1 - frac) * ns, nhi = anchor + frac * ns;
  if (nlo < 0) { nhi -= nlo; nlo = 0; }
  if (nhi > 1) { nlo -= nhi - 1; nhi = 1; }
  return [Math.max(0, +nlo.toFixed(4)), Math.min(1, +nhi.toFixed(4))];
}

const isFull = ([a, b], [lo, hi]) => a <= lo + 1e-6 && b >= hi - 1e-6;

export function useChartZoom(data, opts = {}) {
  const {
    xKey = "t", yKeys = ["ph", "pa"], padFrac = 0.22,
    insets = { left: 8, right: 44, top: 8, bottom: 22 },
    lockY = false,        // true = Y axis fixed to full [0,1], Y zoom disabled
    clampMin = null,      // default-view lower X bound (e.g. 0 = kickoff) — hides earlier (pregame) data unless it's all that exists
  } = opts;
  const ref = useRef(null);
  const [xDom, setXDom] = useState(null);   // null = auto (full extent, follows new data)
  const [yMan, setYMan] = useState(null);   // null = auto-scale to visible window

  const ext = useMemo(() => {
    if (!data.length) return null;
    let a = Infinity, b = -Infinity;
    for (const d of data) { const x = d[xKey]; if (x < a) a = x; if (x > b) b = x; }
    return a < b ? [a, b] : [a, a + 1];
  }, [data, xKey]);

  const xDomain = xDom
    || (ext ? ((clampMin != null && ext[1] > clampMin) ? [Math.max(ext[0], clampMin), ext[1]] : ext) : [0, 1]);

  const yDomain = useMemo(() => {
    if (lockY) return [0, 1];
    if (yMan) return yMan;
    let lo = 1, hi = 0, any = false;
    for (const d of data) {
      const x = d[xKey]; if (x < xDomain[0] || x > xDomain[1]) continue;
      for (const k of yKeys) { const v = d[k]; if (v == null) continue; any = true; if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    if (!any || hi <= lo) return [0, 1];
    const pad = Math.max(0.015, (hi - lo) * padFrac);
    return [Math.max(0, +(lo - pad).toFixed(4)), Math.min(1, +(hi + pad).toFixed(4))];
  }, [data, xKey, yKeys, xDomain[0], xDomain[1], yMan, padFrac, lockY]);

  // Live snapshot for native/window listeners (avoids re-binding on every render).
  const st = useRef({});
  st.current = { ext, xDom, yDomain };

  // Wheel zoom — native non-passive listener so we can preventDefault (stops the
  // surrounding terminal from scrolling while zooming the chart).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onWheel = (e) => {
      const { ext, xDom, yDomain } = st.current; if (!ext) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const overY = e.clientX > r.right - insets.right;
      if (!lockY && (e.shiftKey || overY)) {
        const fy = clamp01((e.clientY - (r.top + insets.top)) / (r.height - insets.top - insets.bottom));
        setYMan(zoomY(yDomain, factor, fy));
      } else {
        const fx = clamp01((e.clientX - (r.left + insets.left)) / (r.width - insets.left - insets.right));
        const nd = zoomRange(xDom || ext, factor, fx, ext);
        setXDom(isFull(nd, ext) ? null : nd);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [insets.left, insets.right, insets.top, insets.bottom, lockY]);

  // Drag — pan plot / zoom an axis strip. window listeners so drag continues
  // even if the cursor leaves the chart.
  const onMouseDown = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const { ext } = st.current; if (!ext) return;
    const r = el.getBoundingClientRect();
    const mode = (!lockY && e.clientX > r.right - insets.right) ? "y"
      : e.clientY > r.bottom - insets.bottom ? "x" : "pan";
    const start = { x: e.clientX, y: e.clientY, xDom: st.current.xDom || ext, yDom: st.current.yDomain };
    const W = r.width - insets.left - insets.right, H = r.height - insets.top - insets.bottom;
    const move = (ev) => {
      const dxF = (ev.clientX - start.x) / W, dyF = (ev.clientY - start.y) / H;
      if (mode === "pan") { const nd = panRange(start.xDom, -dxF, ext); setXDom(isFull(nd, ext) ? null : nd); }
      else if (mode === "x") { const nd = zoomRange(start.xDom, 1 - dxF, 0.5, ext); setXDom(isFull(nd, ext) ? null : nd); }
      else { setYMan(zoomY(start.yDom, 1 + dyF, 0.5)); }
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    e.preventDefault();
  }, [insets.left, insets.right, insets.top, insets.bottom]);

  const reset = useCallback(() => { setXDom(null); setYMan(null); }, []);
  // Snapshot a trailing window of `win` x-units (e.g. minutes); null = full.
  const setWindow = useCallback((win) => {
    const { ext } = st.current; if (!ext) return;
    setYMan(null);
    if (win == null) { setXDom(null); return; }
    setXDom([Math.max(ext[0], ext[1] - win), ext[1]]);
  }, []);

  return {
    ref, xDomain, yDomain,
    isZoomed: !!xDom || !!yMan,
    reset, setWindow,
    bind: { onMouseDown },
  };
}
