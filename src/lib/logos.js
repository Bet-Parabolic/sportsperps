/* ─── PARABOLIC — twin-parabola brand marks ───
   Mark = two curves diverging from a left origin dot to a green winner endpoint
   and a red loser endpoint. Wordmark = PARABOLIC in display sans.
   D3 design uses: green #1fd182, red #ff5247, platinum #eef1f6
*/

const svg = (body) => "data:image/svg+xml;utf8," + encodeURIComponent(body);

const TWIN_PARABOLA = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
<path d='M16 60 C 58 59, 86 52, 104 18' fill='none' stroke='#1fd182' stroke-width='7' stroke-linecap='round'/>
<path d='M16 60 C 58 61, 86 68, 104 102' fill='none' stroke='#ff5247' stroke-width='7' stroke-linecap='round'/>
<circle cx='16' cy='60' r='5.5' fill='#eef1f6'/>
<circle cx='104' cy='18' r='9' fill='#1fd182'/>
<circle cx='104' cy='102' r='9' fill='#ff5247'/>
</svg>`;

const TWIN_PARABOLA_MONO = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
<path d='M16 60 C 58 59, 86 52, 104 18' fill='none' stroke='#1fd182' stroke-width='7' stroke-linecap='round'/>
<path d='M16 60 C 58 61, 86 68, 104 102' fill='none' stroke='#1fd182' stroke-opacity='0.45' stroke-width='7' stroke-linecap='round'/>
<circle cx='16' cy='60' r='5.5' fill='#eef1f6'/>
<circle cx='104' cy='18' r='9' fill='#1fd182'/>
<circle cx='104' cy='102' r='9' fill='#1fd182' fill-opacity='0.45'/>
</svg>`;

// D3 = knockout on green tile (favicon / social pfp)
const D3_TILE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>
<rect width='240' height='240' rx='32' fill='#1fd182'/>
<g transform='translate(45 45) scale(1.25)'>
<path d='M16 60 C 58 59, 86 52, 104 18' fill='none' stroke='#06281b' stroke-width='8' stroke-linecap='round'/>
<path d='M16 60 C 58 61, 86 68, 104 102' fill='none' stroke='#06281b' stroke-width='8' stroke-linecap='round'/>
<circle cx='16' cy='60' r='6' fill='#06281b'/>
<circle cx='104' cy='18' r='10' fill='#06281b'/>
<circle cx='104' cy='102' r='10' fill='#06281b'/>
</g></svg>`;

const WORDMARK = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 660 110'>
<text x='0' y='80' font-family='Clash Display, Hanken Grotesk, system-ui, sans-serif' font-size='78' font-weight='500' letter-spacing='8' fill='#eef1f6'>PARABOLIC</text>
</svg>`;

export const LOGO_NAV = svg(TWIN_PARABOLA);
export const LOGO_MARK = svg(TWIN_PARABOLA);
export const LOGO_MARK_MONO = svg(TWIN_PARABOLA_MONO);
export const LOGO_TILE = svg(D3_TILE); // D3 — favicon / social pfp
export const LOGO_WORDMARK = svg(WORDMARK);
