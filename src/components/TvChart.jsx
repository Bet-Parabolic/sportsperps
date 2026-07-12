import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { createChart, AreaSeries, LineSeries, LineStyle, CrosshairMode, ColorType, createSeriesMarkers } from "lightweight-charts";
import { B, fm } from "../lib/theme.js";
import { LOGO_MARK } from "../lib/logos.js";

// Our X is game time (minutes / inning number, may be negative for the 50/50 anchor).
// lightweight-charts is a TIME axis; we map each game-unit → one DAY from a clean UTC
// midnight so the library's day-boundary tick logic lands ticks on whole game-units
// (1st, 2nd … / 10', 20' …). Labels are rendered back through xFmt in tickMarkFormatter.
const TIME_BASE = 1_640_995_200;        // 2022-01-01 00:00:00 UTC
const DAY = 86_400;
const toT = (t) => TIME_BASE + Math.round(t * DAY);
const fromT = (tm) => (tm - TIME_BASE) / DAY;

// TradingView-style win-probability chart with full overlay parity:
// home (green area) + away (red line), current-price/0.5/liq/limit price lines,
// entry + score markers, crosshair tooltip, Y locked 0–100% (still zoomable).
export const TvChart = forwardRef(function TvChart(
  { data, oPrice, liqLines = [], limitOrders = [], entryLines = [], tpLines = [], slLines = [], scoringPlays = [], xTicks = [], homeLabel = "Home", awayLabel = "Away", homeColor = B.green, awayColor = B.red, xFmt, height = 240 },
  ref
) {
  const X_AXIS_H = 18;               // height of our custom evenly-spaced x-axis strip
  const elRef = useRef(null);
  const api = useRef({});           // chart + series handles
  const plRef = useRef([]);          // current price-line handles
  const autoFit = useRef(true);      // follow the full game until the user interacts
  const yRange = useRef([0, 1]);     // Y axis range — default full 0–100%, zoomable via wheel-over-axis
  const scoreRef = useRef([]);       // scoring-play markers: [{ t, price, side, label }]
  const dataTimesRef = useRef([]);   // toT times of the current series points (for snapping markers)
  const layerRef = useRef(null);     // HTML overlay layer for the parabolic-logo scoring dots
  const riskLayerRef = useRef(null); // HTML overlay for TP/SL/LIQ labels (collision-resolved)
  const riskRef = useRef({ liq: [], tp: [], sl: [] }); // prices of the active risk lines
  const lastValsRef = useRef({ h: null, a: null });    // series last values (win-prob axis tags = obstacles)
  const xLayerRef = useRef(null);    // custom x-axis label strip (evenly spaced, no repeats)
  const xTicksRef = useRef(xTicks); xTicksRef.current = xTicks;
  const xFmtRef = useRef(xFmt); xFmtRef.current = xFmt;
  const labelsRef = useRef({ homeLabel, awayLabel }); labelsRef.current = { homeLabel, awayLabel };

  // Draw a Parabolic-logo dot (green = home scored, red = away scored) at each scoring
  // play, anchored on that team's line. Re-run on every pan/zoom/resize so they track.
  const placeScoringLogos = () => {
    const { chart, home } = api.current;
    const layer = layerRef.current;
    if (!chart || !home || !layer) return;
    const ts = chart.timeScale();
    const dts = dataTimesRef.current;
    layer.innerHTML = "";
    if (!dts.length) return;
    const first = dts[0], last = dts[dts.length - 1];
    for (const m of scoreRef.current) {
      const target = toT(m.t);
      if (target < first || target > last) continue;       // scored before/after the charted range
      // lightweight-charts only returns a coordinate for an exact data-point time, so snap to
      // the nearest one (points are dense → sub-pixel error).
      let snapped = first, best = Infinity;
      for (let i = 0; i < dts.length; i++) {
        const d = Math.abs(dts[i] - target);
        if (d < best) { best = d; snapped = dts[i]; }
        else if (dts[i] > target) break;
      }
      const x = ts.timeToCoordinate(snapped);
      const y = home.priceToCoordinate(m.price);
      if (x == null || y == null) continue;
      const col = m.side === "away" ? awayColor : homeColor;
      const dot = document.createElement("div");
      dot.style.cssText =
        "position:absolute;left:" + x + "px;top:" + y + "px;transform:translate(-50%,-50%);" +
        "width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
        "background:" + col + ";border:1.5px solid #0a0a0a;box-shadow:0 0 7px " + col + "cc;z-index:5;pointer-events:none";
      dot.innerHTML = '<img src="' + LOGO_MARK + '" style="width:12px;height:12px;display:block" alt=""/>';
      if (m.label) {
        const tag = document.createElement("div");
        tag.textContent = m.label;
        tag.style.cssText =
          "position:absolute;top:-13px;left:50%;transform:translateX(-50%);font:700 9px " + fm +
          ";color:" + col + ";white-space:nowrap;text-shadow:0 1px 2px #000";
        dot.appendChild(tag);
      }
      layer.appendChild(dot);
    }
  };

  // Our own x-axis: one evenly-spaced label per inning / minute-interval, no repeats. The
  // native time axis is hidden — lightweight-charts can't guarantee even, non-repeating ticks.
  const placeXLabels = () => {
    const { chart } = api.current;
    const layer = xLayerRef.current;
    if (!chart || !layer) return;
    const ts = chart.timeScale();
    const dts = dataTimesRef.current;
    layer.innerHTML = "";
    if (!dts.length) return;
    const first = dts[0], last = dts[dts.length - 1];
    const seen = new Set();
    for (const tk of xTicksRef.current) {
      if (seen.has(tk.label)) continue;          // never repeat a label
      const target = toT(tk.t);
      if (target < first || target > last) continue;
      let snapped = first, best = Infinity;       // snap to nearest data time (timeToCoordinate needs one)
      for (let i = 0; i < dts.length; i++) {
        const d = Math.abs(dts[i] - target);
        if (d < best) { best = d; snapped = dts[i]; }
        else if (dts[i] > target) break;
      }
      const x = ts.timeToCoordinate(snapped);
      if (x == null) continue;
      seen.add(tk.label);
      const lab = document.createElement("div");
      lab.textContent = tk.label;
      lab.style.cssText = "position:absolute;top:3px;left:" + x + "px;transform:translateX(-50%);font:400 10px " + fm + ";color:#888;white-space:nowrap";
      layer.appendChild(lab);
    }
  };

  // TP/SL/LIQ labels as an HTML overlay hugging the price axis. Native price-line titles
  // have no collision logic; here labels are sorted by y and pushed apart so they never
  // overlap each other OR the series' win-probability axis tags.
  const placeRiskLabels = () => {
    const { chart, home } = api.current;
    const layer = riskLayerRef.current, el = elRef.current;
    if (!chart || !home || !layer || !el) return;
    layer.innerHTML = "";
    const items = [];
    const pushI = (price, text, color) => { const y = home.priceToCoordinate(price); if (y != null) items.push({ y, text, color }); };
    riskRef.current.tp.forEach((p) => pushI(p, "TP " + Math.round(p * 100) + "%", "#3b82f6"));
    riskRef.current.sl.forEach((p) => pushI(p, "SL " + Math.round(p * 100) + "%", "#facc15"));
    riskRef.current.liq.forEach((p) => pushI(p, "LIQ " + Math.round(p * 100) + "%", B.red));
    if (!items.length) return;
    // Obstacles: where the home/away last-value tags sit on the axis (win probabilities).
    const obs = [];
    for (const v of [lastValsRef.current.h, lastValsRef.current.a]) {
      if (v == null) continue;
      const y = home.priceToCoordinate(v);
      if (y != null) obs.push(y);
    }
    const GAP = 16;                                   // min vertical separation (label ~13px tall)
    const psw = chart.priceScale("right").width() || 48;
    items.sort((a, b) => a.y - b.y);
    const placed = [];
    for (const it of items) {
      let y = it.y, moved = true, guard = 40;          // guard: hard bound even if a NaN sneaks in
      while (moved && guard-- > 0) {                   // y only ever grows → terminates
        moved = false;
        for (const p of placed) if (Math.abs(y - p) < GAP) { y = p + GAP; moved = true; }
        for (const o of obs) if (Math.abs(y - o) < GAP) { y = o + GAP; moved = true; }
      }
      y = Math.min(y, el.clientHeight - 10);
      placed.push(y);
      const d = document.createElement("div");
      d.textContent = it.text;
      d.style.cssText = "position:absolute;right:" + (psw + 4) + "px;top:" + y + "px;transform:translateY(-50%);font:700 9px " + fm +
        ";color:" + it.color + ";background:#0a0a0ae0;padding:1px 5px;border-radius:4px;border:1px solid " + it.color + "55;white-space:nowrap;pointer-events:none;z-index:6";
      layer.appendChild(d);
    }
  };

  // Apply the current Y range to both series so the shared price scale honors it.
  // rAF-THROTTLED: touch gestures fire ~60–120 moves/sec and a synchronous double
  // applyOptions per move re-lays-out the whole chart each time — on iOS that pegged the
  // main thread and hard-froze the page. One application per animation frame, always
  // reading the LATEST yRange, is visually identical and bounded in cost.
  const yApplyQueued = useRef(false);
  const applyY = () => {
    if (yApplyQueued.current) return;
    yApplyQueued.current = true;
    requestAnimationFrame(() => {
      yApplyQueued.current = false;
      try {
        const prov = () => ({ priceRange: { minValue: yRange.current[0], maxValue: yRange.current[1] } });
        api.current.home?.applyOptions({ autoscaleInfoProvider: prov });
        api.current.away?.applyOptions({ autoscaleInfoProvider: prov });
        placeScoringLogos(); placeXLabels(); placeRiskLabels();
      } catch (e) { /* never let a mid-gesture layout error wedge the gesture state */ }
    });
  };

  useImperativeHandle(ref, () => ({
    fitContent() { autoFit.current = true; yRange.current = [0, 1]; applyY(); api.current.chart?.timeScale().fitContent(); },
    setWindow(win) {
      const { chart, last } = api.current;
      if (!chart || last == null) return;
      autoFit.current = false;
      chart.timeScale().setVisibleRange({ from: toT(last - win), to: toT(last) });
    },
  }), []);

  useEffect(() => {
    const el = elRef.current; if (!el) return;
    const yProv = { autoscaleInfoProvider: () => ({ priceRange: { minValue: yRange.current[0], maxValue: yRange.current[1] } }) };
    const pf = { type: "custom", formatter: (p) => (p * 100).toFixed(1) + "%" };

    const chart = createChart(el, {
      height: height - X_AXIS_H,
      autoSize: false,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#888", fontFamily: fm, attributionLogo: false },
      grid: { vertLines: { color: "#ffffff08" }, horzLines: { color: "#ffffff08" } },
      rightPriceScale: { borderColor: "#1f1f1f", scaleMargins: { top: 0.06, bottom: 0.06 } },
      // Native time axis hidden — we render our own evenly-spaced labels (placeXLabels) so
      // innings/minutes never repeat or skew. Keep fixLeftEdge/Right for pan/zoom anchoring.
      timeScale: { borderColor: "#1f1f1f", visible: false, timeVisible: false, secondsVisible: false, rightOffset: 1, minBarSpacing: 0.05,
        fixLeftEdge: true, fixRightEdge: true },
      localization: { priceFormatter: (p) => (p * 100).toFixed(0) + "%", timeFormatter: (tm) => (xFmtRef.current ? xFmtRef.current(fromT(tm)) : "") },
      crosshair: { mode: CrosshairMode.Normal,
        vertLine: { color: "#ffffff2a", width: 1, style: LineStyle.Solid, labelBackgroundColor: "#1f2733" },
        horzLine: { color: "#ffffff2a", labelBackgroundColor: "#1f2733" } },
      // Mobile: a vertical swipe starting on the chart must scroll the PAGE, not pan the chart —
      // otherwise the 240px chart band makes the whole page feel stuck. Horizontal drag still
      // pans the time axis and pinch still zooms.
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    });

    // Both series show only their last-value axis label (home green %, away red %) — no
    // horizontal dotted price line (that duplicated the current-price tag and cluttered the axis).
    const home = chart.addSeries(AreaSeries, { lineColor: homeColor, topColor: homeColor + "30", bottomColor: homeColor + "04", lineWidth: 2, priceFormat: pf, priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2, crosshairMarkerBorderColor: homeColor, crosshairMarkerBackgroundColor: homeColor, ...yProv });
    // Same lineWidth as home — the old 2px/1px split read as favoring the home side once the
    // lines took on TEAM colors (July 12). Home keeps the soft area fill; strokes are equal.
    const away = chart.addSeries(LineSeries, { color: awayColor, lineWidth: 2, priceFormat: pf, priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2, crosshairMarkerBorderColor: awayColor, crosshairMarkerBackgroundColor: awayColor, ...yProv });
    const markers = createSeriesMarkers(home, []);

    const tip = document.createElement("div");
    tip.style.cssText = "position:absolute;display:none;pointer-events:none;z-index:6;background:#0b0d11;border:1px solid #1f1f1f;border-radius:8px;padding:6px 9px;font-family:" + fm + ";font-size:11px;box-shadow:0 4px 16px #000a;white-space:nowrap";
    el.appendChild(tip);

    // Overlay layer for scoring-play logo dots (positioned in placeScoringLogos).
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5";
    el.appendChild(layer);
    layerRef.current = layer;
    // Overlay layer for the TP/SL/LIQ labels.
    const rlayer = document.createElement("div");
    rlayer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:6";
    el.appendChild(rlayer);
    riskLayerRef.current = rlayer;
    const redraw = () => { placeScoringLogos(); placeXLabels(); placeRiskLabels(); };
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);

    chart.subscribeCrosshairMove((p) => {
      if (!p.time || !p.point || p.point.x < 0 || p.point.y < 0) { tip.style.display = "none"; return; }
      const hv = p.seriesData.get(home);
      const v = hv && (hv.value != null ? hv.value : hv.close);
      if (v == null) { tip.style.display = "none"; return; }
      const { homeLabel, awayLabel } = labelsRef.current;
      tip.innerHTML =
        '<div style="color:#666;margin-bottom:3px">' + (xFmtRef.current ? xFmtRef.current(fromT(p.time)) : "") + "</div>" +
        '<div style="color:' + homeColor + ';font-weight:700">' + homeLabel + " " + (v * 100).toFixed(1) + "%</div>" +
        '<div style="color:' + awayColor + ';font-weight:700">' + awayLabel + " " + ((1 - v) * 100).toFixed(1) + "%</div>";
      tip.style.display = "block";
      const w = tip.offsetWidth, cw = el.clientWidth;
      tip.style.left = Math.min(Math.max(0, p.point.x + 14), cw - w - 4) + "px";
      tip.style.top = Math.max(0, p.point.y - tip.offsetHeight - 10) + "px";
    });

    // Wheel over the right (Y) price scale → zoom Y around the cursor. Elsewhere → let
    // lightweight-charts do its native X zoom. (Capture + stopImmediatePropagation so the
    // library never sees the over-axis wheel — that was scrolling X by mistake.)
    const onWheel = (e) => {
      autoFit.current = false;
      const r = el.getBoundingClientRect();
      const psw = chart.priceScale("right").width() || 48;
      if (e.clientX <= r.right - psw) return;           // not over the Y axis → native X zoom
      e.preventDefault(); e.stopImmediatePropagation();
      const axH = chart.timeScale().height() || 24;
      const plotH = Math.max(1, r.height - axH);
      const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / plotH));   // 0 = top (hi)
      const factor = Math.min(2, Math.max(0.5, Math.exp(e.deltaY * 0.0012)));
      const [lo, hi] = yRange.current; const span = hi - lo;
      const anchor = hi - fy * span;
      const ns = Math.min(1, Math.max(0.02, span * factor));
      let nlo = anchor - (1 - fy) * ns, nhi = anchor + fy * ns;
      if (nlo < 0) { nhi -= nlo; nlo = 0; }
      if (nhi > 1) { nlo -= nhi - 1; nhi = 1; }
      yRange.current = [Math.max(0, +nlo.toFixed(4)), Math.min(1, +nhi.toFixed(4))];
      applyY();
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    const stopAuto = () => { autoFit.current = false; };
    el.addEventListener("pointerdown", stopAuto);

    // Mobile: vertical drag ON the Y axis zooms the Y range around its center — drag up to
    // zoom in, drag down to zoom out (touch parallel of the wheel-over-axis behavior above).
    // Double-tap the axis to reset to the full 0–100% view.
    // While zoomed in, a vertical drag ON THE CHART pans the visible price window (content
    // follows the finger) instead of scrolling the page — otherwise levels that fell outside
    // the zoomed window (e.g. a TP above it) would be unreachable. At full 0–100% the page
    // scrolls exactly as before; horizontal drags always stay with the chart's X pan.
    const yTouch = { active: false, startY: 0, startRange: [0, 1] };
    const panTouch = { active: false, decided: false, take: false, startX: 0, startY: 0, startRange: [0, 1] };
    let lastAxisTap = 0;
    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const r = el.getBoundingClientRect();
      const psw = chart.priceScale("right").width() || 48;
      const t = e.touches[0];
      if (t.clientX > r.right - psw) {
        // On the Y axis → zoom drag; double-tap resets to 0–100%.
        const now = Date.now();
        if (now - lastAxisTap < 300) { yRange.current = [0, 1]; applyY(); lastAxisTap = 0; }
        else lastAxisTap = now;
        yTouch.active = true; yTouch.startY = t.clientY; yTouch.startRange = [...yRange.current];
        autoFit.current = false;
        if (e.cancelable) e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // On the chart, and Y is zoomed in → candidate for a vertical pan. Direction is decided
      // on the first real movement so horizontal X-pans pass through untouched.
      const [lo, hi] = yRange.current;
      if (hi - lo < 0.999) {
        panTouch.active = true; panTouch.decided = false; panTouch.take = false;
        panTouch.startX = t.clientX; panTouch.startY = t.clientY; panTouch.startRange = [lo, hi];
      }
    };
    const onTouchMove = (e) => {
      if (yTouch.active) {
        if (e.cancelable) e.preventDefault();
        e.stopImmediatePropagation();
        const dy = e.touches[0].clientY - yTouch.startY;
        const [lo0, hi0] = yTouch.startRange;
        const ns = Math.min(1, Math.max(0.02, (hi0 - lo0) * Math.exp(dy * 0.006)));
        const c = (lo0 + hi0) / 2;
        let nlo = c - ns / 2, nhi = c + ns / 2;
        if (nlo < 0) { nhi -= nlo; nlo = 0; }
        if (nhi > 1) { nlo -= nhi - 1; nhi = 1; }
        yRange.current = [Math.max(0, +nlo.toFixed(4)), Math.min(1, +nhi.toFixed(4))];
        applyY();
        return;
      }
      if (!panTouch.active) return;
      const t = e.touches[0];
      const dx = t.clientX - panTouch.startX, dy = t.clientY - panTouch.startY;
      if (!panTouch.decided) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;      // too small to call
        panTouch.decided = true;
        panTouch.take = Math.abs(dy) > Math.abs(dx);           // vertical → we pan Y; horizontal → chart pans X
      }
      if (!panTouch.take) return;
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      autoFit.current = false;
      const plotH = Math.max(1, el.clientHeight);
      const [lo0, hi0] = panTouch.startRange;
      const shift = (dy / plotH) * (hi0 - lo0);                // content follows the finger
      let nlo = lo0 + shift, nhi = hi0 + shift;
      if (nlo < 0) { nhi -= nlo; nlo = 0; }
      if (nhi > 1) { nlo -= nhi - 1; nhi = 1; }
      yRange.current = [+nlo.toFixed(4), +nhi.toFixed(4)];
      applyY();
    };
    const onTouchEnd = () => { yTouch.active = false; panTouch.active = false; panTouch.take = false; panTouch.decided = false; };
    el.addEventListener("touchstart", onTouchStart, { passive: false, capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd, { capture: true });
    // iOS cancels touches on system gestures (notification pull, app switch). Without this the
    // zoom/pan state stayed latched: every later touch kept hijacking moves — page felt frozen.
    el.addEventListener("touchcancel", onTouchEnd, { capture: true });

    const ro = new ResizeObserver(() => { chart.applyOptions({ width: el.clientWidth }); redraw(); });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    api.current = { chart, home, away, markers, tip, last: null };

    return () => {
      ro.disconnect();
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw); } catch (e) {}
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("pointerdown", stopAuto);
      el.removeEventListener("touchstart", onTouchStart, { capture: true });
      el.removeEventListener("touchmove", onTouchMove, { capture: true });
      el.removeEventListener("touchend", onTouchEnd, { capture: true });
      el.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      chart.remove();
      try { layer.remove(); } catch (e) {}   // remove imperatively-appended overlays so a
      try { rlayer.remove(); } catch (e) {}
      try { tip.remove(); } catch (e) {}      // re-mount (StrictMode/remount) can't leave a stale, duplicated layer
      layerRef.current = null;
      riskLayerRef.current = null;
      api.current = {};
    };
  }, [height]);

  // data → series + markers
  useEffect(() => {
    const { home, away, markers, chart } = api.current;
    if (!home || !away || !data) return;
    let prev = -Infinity;
    const hd = [], ad = [], mk = [];
    for (const d of data) {
      if (d.ph == null) continue;
      let tm = toT(d.t); if (tm <= prev) tm = prev + 1; prev = tm;
      hd.push({ time: tm, value: d.ph });
      ad.push({ time: tm, value: d.pa != null ? d.pa : 1 - d.ph });
      // Entry is drawn as a horizontal "Entry Price" line (see price-lines effect), not an
      // arrow — only exit markers remain as arrows.
      if (d.mh_marker && d.mh_marker !== "entry") mk.push({ time: tm, position: "belowBar", color: homeColor, shape: "arrowUp" });
      else if (d.ma_marker && d.ma_marker !== "entry") mk.push({ time: tm, position: "aboveBar", color: awayColor, shape: "arrowDown" });
    }
    home.setData(hd); away.setData(ad);
    markers?.setMarkers(mk);
    dataTimesRef.current = hd.map((p) => p.time);

    // Scoring plays come pre-positioned ({ t, price, side, label }) on the same X-scale as
    // `data` — kept as their own list (not one-per-point) so adjacent scores never collide.
    scoreRef.current = scoringPlays;

    lastValsRef.current = { h: hd.length ? hd[hd.length - 1].value : null, a: ad.length ? ad[ad.length - 1].value : null };
    api.current.last = hd.length ? fromT(hd[hd.length - 1].time) : null;
    if (autoFit.current) chart?.timeScale().fitContent();
    placeScoringLogos();
    placeXLabels();
    placeRiskLabels();
  }, [data, scoringPlays, xTicks]);

  // price lines: 0.5 midline (no axis label), liquidations, resting limit orders.
  // Current price is shown by the series' own last-value labels (home green %, away red %),
  // so we don't draw a separate current-price line here (that produced a duplicate axis label).
  useEffect(() => {
    const { home } = api.current;
    if (!home) return;
    plRef.current.forEach((pl) => { try { home.removePriceLine(pl); } catch (e) {} });
    plRef.current = [];
    const add = (price, color, title, style = LineStyle.Dashed, width = 1, axisLabelVisible = true) =>
      plRef.current.push(home.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible, title }));
    add(0.5, "#ffffff1a", "", LineStyle.Dashed, 1, false);   // faint 50% reference, no axis label
    // Open position entry → green dotted "Entry Price" line.
    entryLines.forEach((en) => add(en.entryOnChart, B.green, "Entry Price", LineStyle.Dotted, 1));
    // Liquidation / TP / SL lines: label rendering moved to the placeRiskLabels overlay
    // (native titles can't avoid colliding with each other or the win-prob axis tags).
    liqLines.forEach((ll) => add(ll.liqOnChart, B.red, "", LineStyle.Dashed, 2, false));
    // Resting limit orders → green dotted line at the order price (removed once filled/cancelled).
    limitOrders.forEach((lo) => add(lo.side === "home" ? lo.limitPrice : 1 - lo.limitPrice, B.green, "LIMIT " + (lo.limitPrice * 100).toFixed(0) + "¢", LineStyle.Dotted, 1));
    // Take-profit → blue dotted; stop-loss → yellow dotted (levels already in home-prob terms).
    tpLines.forEach((t) => add(t.priceOnChart, "#3b82f6", "", LineStyle.Dotted, 1, false));
    slLines.forEach((s) => add(s.priceOnChart, "#facc15", "", LineStyle.Dotted, 1, false));
    riskRef.current = {
      liq: liqLines.map((l) => l.liqOnChart),
      tp: tpLines.map((t) => t.priceOnChart),
      sl: slLines.map((s) => s.priceOnChart),
    };
    placeRiskLabels();
  }, [oPrice, liqLines, limitOrders, entryLines, tpLines, slLines]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={elRef} style={{ position: "relative", width: "100%", height: height - X_AXIS_H }} />
      <div ref={xLayerRef} style={{ position: "relative", width: "100%", height: X_AXIS_H, pointerEvents: "none" }} />
    </div>
  );
});
