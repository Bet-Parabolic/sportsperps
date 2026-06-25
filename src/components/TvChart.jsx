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
  { data, oPrice, liqLines = [], limitOrders = [], entryLines = [], scoringPlays = [], xTicks = [], homeLabel = "Home", awayLabel = "Away", xFmt, height = 240 },
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
      const col = m.side === "away" ? B.red : B.green;
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

  // Apply the current Y range to both series so the shared price scale honors it.
  const applyY = () => {
    const prov = () => ({ priceRange: { minValue: yRange.current[0], maxValue: yRange.current[1] } });
    api.current.home?.applyOptions({ autoscaleInfoProvider: prov });
    api.current.away?.applyOptions({ autoscaleInfoProvider: prov });
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
    });

    // Both series show only their last-value axis label (home green %, away red %) — no
    // horizontal dotted price line (that duplicated the current-price tag and cluttered the axis).
    const home = chart.addSeries(AreaSeries, { lineColor: B.green, topColor: B.green + "30", bottomColor: B.green + "04", lineWidth: 2, priceFormat: pf, priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2, crosshairMarkerBorderColor: B.green, crosshairMarkerBackgroundColor: B.green, ...yProv });
    const away = chart.addSeries(LineSeries, { color: B.red, lineWidth: 1, priceFormat: pf, priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 5, crosshairMarkerBorderWidth: 2, crosshairMarkerBorderColor: B.red, crosshairMarkerBackgroundColor: B.red, ...yProv });
    const markers = createSeriesMarkers(home, []);

    const tip = document.createElement("div");
    tip.style.cssText = "position:absolute;display:none;pointer-events:none;z-index:6;background:#0b0d11;border:1px solid #1f1f1f;border-radius:8px;padding:6px 9px;font-family:" + fm + ";font-size:11px;box-shadow:0 4px 16px #000a;white-space:nowrap";
    el.appendChild(tip);

    // Overlay layer for scoring-play logo dots (positioned in placeScoringLogos).
    const layer = document.createElement("div");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5";
    el.appendChild(layer);
    layerRef.current = layer;
    const redraw = () => { placeScoringLogos(); placeXLabels(); };
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);

    chart.subscribeCrosshairMove((p) => {
      if (!p.time || !p.point || p.point.x < 0 || p.point.y < 0) { tip.style.display = "none"; return; }
      const hv = p.seriesData.get(home);
      const v = hv && (hv.value != null ? hv.value : hv.close);
      if (v == null) { tip.style.display = "none"; return; }
      const { homeLabel, awayLabel } = labelsRef.current;
      tip.innerHTML =
        '<div style="color:#666;margin-bottom:3px">' + (xFmtRef.current ? xFmtRef.current(fromT(p.time)) : "") + "</div>" +
        '<div style="color:' + B.green + ';font-weight:700">' + homeLabel + " " + (v * 100).toFixed(1) + "%</div>" +
        '<div style="color:' + B.red + ';font-weight:700">' + awayLabel + " " + ((1 - v) * 100).toFixed(1) + "%</div>";
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

    const ro = new ResizeObserver(() => { chart.applyOptions({ width: el.clientWidth }); redraw(); });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    api.current = { chart, home, away, markers, tip, last: null };

    return () => {
      ro.disconnect();
      try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw); } catch (e) {}
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("pointerdown", stopAuto);
      chart.remove();
      layerRef.current = null;
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
      if (d.mh_marker && d.mh_marker !== "entry") mk.push({ time: tm, position: "belowBar", color: B.green, shape: "arrowUp" });
      else if (d.ma_marker && d.ma_marker !== "entry") mk.push({ time: tm, position: "aboveBar", color: B.red, shape: "arrowDown" });
    }
    home.setData(hd); away.setData(ad);
    markers?.setMarkers(mk);
    dataTimesRef.current = hd.map((p) => p.time);

    // Scoring plays come pre-positioned ({ t, price, side, label }) on the same X-scale as
    // `data` — kept as their own list (not one-per-point) so adjacent scores never collide.
    scoreRef.current = scoringPlays;

    api.current.last = hd.length ? fromT(hd[hd.length - 1].time) : null;
    if (autoFit.current) chart?.timeScale().fitContent();
    placeScoringLogos();
    placeXLabels();
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
    // Liquidation: one label = the win % level that triggers it (matches the line's position
    // on the chart's win-prob axis — no separate, conflicting axis tag).
    liqLines.forEach((ll) => add(ll.liqOnChart, B.red, "LIQ " + Math.round(ll.liqOnChart * 100) + "%", LineStyle.Dashed, 2, false));
    // Resting limit orders → green dotted line at the order price (removed once filled/cancelled).
    limitOrders.forEach((lo) => add(lo.side === "home" ? lo.limitPrice : 1 - lo.limitPrice, B.green, "LIMIT " + (lo.limitPrice * 100).toFixed(0) + "¢", LineStyle.Dotted, 1));
  }, [oPrice, liqLines, limitOrders, entryLines]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={elRef} style={{ position: "relative", width: "100%", height: height - X_AXIS_H }} />
      <div ref={xLayerRef} style={{ position: "relative", width: "100%", height: X_AXIS_H, pointerEvents: "none" }} />
    </div>
  );
});
