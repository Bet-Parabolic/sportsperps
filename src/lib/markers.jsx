import { B } from "./theme.js";

/* Render a small price tag next to a marker, attached to the chart at (cx, cy) */
export function PriceTag({cx, cy, color, bg, text, above=true}){
  const w = text.length * 5.5 + 10;
  const h = 14;
  const ty = above ? cy - 14 : cy + 14;
  return (
    <g>
      <rect x={cx + 8} y={ty - h/2} width={w} height={h} rx={3} fill={bg||"#000"} stroke={color} strokeWidth={1}/>
      <text x={cx + 8 + w/2} y={ty + 3} textAnchor="middle" fill={color} fontSize={9} fontWeight="900" fontFamily="ui-monospace,monospace">{text}</text>
    </g>
  );
}

export function HomeMarkerDot({cx,cy,payload}){
  if(!payload||!payload.mh_marker||cx==null||cy==null)return null;
  const m=payload.mh_marker;
  const px = payload.mh_val ? (payload.mh_val*100).toFixed(1)+"¢" : "";
  if(m==="entry")return(<g>
    <circle cx={cx} cy={cy} r={6} fill="#059669" stroke={B.primary} strokeWidth={2}/>
    <PriceTag cx={cx} cy={cy} color={B.primary} bg="#000" text={"IN " + px} above={true}/>
  </g>);
  if(m==="exit-win")return(<g>
    <polygon points={`${cx},${cy-8} ${cx-6},${cy+4} ${cx+6},${cy+4}`} fill={B.primary}/>
    <PriceTag cx={cx} cy={cy} color={B.primary} bg="#000" text={"OUT " + px} above={true}/>
  </g>);
  if(m==="exit-loss")return(<g>
    <polygon points={`${cx},${cy+8} ${cx-6},${cy-4} ${cx+6},${cy-4}`} fill={B.pink}/>
    <PriceTag cx={cx} cy={cy} color={B.pink} bg="#000" text={"OUT " + px} above={false}/>
  </g>);
  if(m==="liquidated")return(<g>
    <rect x={cx-7} y={cy-7} width={14} height={14} rx={3} fill="#dc2626" stroke="#fca5a5" strokeWidth={2}/>
    <text x={cx} y={cy+4} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="900">X</text>
    <PriceTag cx={cx} cy={cy} color="#dc2626" bg="#000" text={"LIQ " + px} above={true}/>
  </g>);
  if(m==="settle")return(<g>
    <circle cx={cx} cy={cy} r={9} fill="rgba(255,159,28,0.12)" stroke={B.primary} strokeWidth={2}/>
    <text x={cx} y={cy+4} textAnchor="middle" fontSize={11} fill={B.primary} fontWeight="900">W</text>
  </g>);
  return null;
}

export function AwayMarkerDot({cx,cy,payload}){
  if(!payload||!payload.ma_marker||cx==null||cy==null)return null;
  const m=payload.ma_marker;
  const px = payload.ma_val ? ((1-payload.ma_val)*100).toFixed(1)+"¢" : "";
  if(m==="entry")return(<g>
    <circle cx={cx} cy={cy} r={6} fill="#be123c" stroke={B.pink} strokeWidth={2}/>
    <PriceTag cx={cx} cy={cy} color={B.pink} bg="#000" text={"IN " + px} above={true}/>
  </g>);
  if(m==="exit-win")return(<g>
    <polygon points={`${cx},${cy-8} ${cx-6},${cy+4} ${cx+6},${cy+4}`} fill={B.primary}/>
    <PriceTag cx={cx} cy={cy} color={B.primary} bg="#000" text={"OUT " + px} above={true}/>
  </g>);
  if(m==="exit-loss")return(<g>
    <polygon points={`${cx},${cy+8} ${cx-6},${cy-4} ${cx+6},${cy-4}`} fill={B.pink}/>
    <PriceTag cx={cx} cy={cy} color={B.pink} bg="#000" text={"OUT " + px} above={false}/>
  </g>);
  if(m==="liquidated")return(<g>
    <rect x={cx-7} y={cy-7} width={14} height={14} rx={3} fill="#dc2626" stroke="#fca5a5" strokeWidth={2}/>
    <text x={cx} y={cy+4} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="900">X</text>
    <PriceTag cx={cx} cy={cy} color="#dc2626" bg="#000" text={"LIQ " + px} above={true}/>
  </g>);
  return null;
}
