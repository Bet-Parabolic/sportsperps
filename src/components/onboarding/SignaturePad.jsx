/**
 * Signature pad — web port of the mobile signature-pad.tsx: freehand drawing with pointer
 * events, rendered as SVG paths. Points are distance-filtered and integer-rounded so a full
 * signature serializes compactly to localStorage.
 */
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

const MIN_DIST = 5;   // px between recorded points — keeps the serialized path compact
const MAX_POINTS = 260;

export const SignaturePad = forwardRef(function SignaturePad({ width, height, onChange }, ref) {
  const [paths, setPaths] = useState([]);
  const [live, setLive] = useState("");
  const liveRef = useRef("");
  const pathsRef = useRef([]);
  const last = useRef(null);
  const count = useRef(0);
  const boxRef = useRef(null);

  const setLiveBoth = useCallback((v) => { liveRef.current = v; setLive(v); }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      count.current = 0; pathsRef.current = [];
      setPaths([]); setLiveBoth("");
      onChange(null);
    },
  }));

  const localXY = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e) => {
    e.preventDefault();
    try { boxRef.current.setPointerCapture(e.pointerId); } catch { /* synthetic/untracked pointer */ }
    const { x, y } = localXY(e);
    last.current = { x, y };
    setLiveBoth(`M ${Math.round(x)} ${Math.round(y)}`);
  };
  const onMove = (e) => {
    const l = last.current;
    if (!l || count.current > MAX_POINTS) return;
    const { x, y } = localXY(e);
    const dx = x - l.x, dy = y - l.y;
    if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
    last.current = { x, y };
    count.current += 1;
    setLiveBoth(`${liveRef.current} L ${Math.round(x)} ${Math.round(y)}`);
  };
  const onUp = () => {
    const stroke = liveRef.current;
    last.current = null;
    setLiveBoth("");
    if (!stroke.includes("L")) return; // a tap, not a stroke
    pathsRef.current = [...pathsRef.current, stroke];
    setPaths(pathsRef.current);
    onChange(pathsRef.current.join(" "));
  };

  return (
    <div ref={boxRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ width, height, touchAction: "none", cursor: "crosshair", position: "relative" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[...paths, live].filter(Boolean).map((d, i) => (
          <path key={i} d={d} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
});
