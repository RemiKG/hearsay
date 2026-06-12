// @ts-nocheck
/* Hearsay — "The Living Courtroom Sketch" engine (ported verbatim from the design
   package's _render/lib/sketch.js so the running app is pixel-faithful to the mockups).
   Everything is drawn like a real court artist works: chalky pastel + charcoal on toned
   newsprint. No diffusion, no flat vector fills. The anti-AI signature is (1) charcoal
   HAND lines with real per-point waver + a confident gone-over-twice double stroke, and
   (2) chalky pastel fills eroded by paper tooth so the ground shows through.
   Deterministic (seeded) so a character renders the same on every screen.
   Exposed as the `SK` object; functions return SVG-string fragments. */

const P = {
  paper: '#EAD9BC', paperHi: '#F3E8CF', paperLo: '#DCC7A2', paperEdge: '#CBB489',
  ink: '#2A2420', inkSoft: '#514637', inkFaint: '#8A7A63',
  ochre: '#C8892E', ochreHi: '#E2A94C', ochreDeep: '#9A5F1C', ochreSkin: '#E1AE79',
  slate: '#4A5A6A', slateHi: '#6E8494', slateDeep: '#33414C', slateSkin: '#93A6B2',
  moved: '#7A8B57', parch: '#C9B48C',
};

/* ---------- deterministic RNG (xorshift32) ---------- */
function rng(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); };
}
const R = (r, a, b) => a + (b - a) * r();
const round2 = (n) => Math.round(n * 100) / 100;
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

/* ---------- colour helpers (for hair strands, shading) ---------- */
const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
function toRGB(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toHex(r, g, b) { return '#' + [r, g, b].map((v) => clamp8(v).toString(16).padStart(2, '0')).join(''); }
function shade(hex, amt) { const [r, g, b] = toRGB(hex); const f = amt < 0 ? (1 + amt) : 1, a = amt > 0 ? amt : 0; return toHex(r * f + 255 * a, g * f + 255 * a, b * f + 255 * a); }
const darken = (h, a = 0.22) => shade(h, -a);
const lighten = (h, a = 0.22) => shade(h, a);

/* ---------- SVG filter / pattern defs ---------- */
function defs() {
  return `<defs>
    <filter id="paper" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feFlood flood-color="${P.paper}" result="base"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.55 0.62" numOctaves="2" seed="11" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0" result="g"/>
      <feComponentTransfer in="g" result="grain">
        <feFuncR type="linear" slope="0.16" intercept="0.83"/>
        <feFuncG type="linear" slope="0.16" intercept="0.83"/>
        <feFuncB type="linear" slope="0.16" intercept="0.83"/>
      </feComponentTransfer>
      <feBlend in="base" in2="grain" mode="multiply" result="tooth"/>
      <feComposite in="tooth" in2="SourceGraphic" operator="in"/>
    </filter>

    <filter id="rghF" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.019 0.023" numOctaves="2" seed="3" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="2.3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="rgh" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.017" numOctaves="2" seed="7" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="3.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="rghC" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.010 0.013" numOctaves="2" seed="13" result="w"/>
      <feDisplacementMap in="SourceGraphic" in2="w" scale="6.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <filter id="chalk" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.5 0.55" numOctaves="2" seed="5" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 -0.16" result="mask"/>
      <feComposite in="SourceGraphic" in2="mask" operator="in" result="grained"/>
      <feDisplacementMap in="grained" in2="n" scale="2.0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="chalkS" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.045 0.6" numOctaves="2" seed="9" result="n"/>
      <feColorMatrix in="n" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.8 -0.12" result="mask"/>
      <feComposite in="SourceGraphic" in2="mask" operator="in" result="grained"/>
      <feDisplacementMap in="grained" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <filter id="smudge" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="4.2"/></filter>
    <filter id="smudgeS" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="2.2"/></filter>
  </defs>`;
}

function vignetteGrad(w, h) {
  return `<radialGradient id="vgrad" cx="50%" cy="45%" r="72%">
    <stop offset="0%" stop-color="${P.paper}" stop-opacity="0"/>
    <stop offset="76%" stop-color="${P.paperEdge}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${P.paperEdge}" stop-opacity="0.5"/>
  </radialGradient>`;
}
function flapGrad() {
  return `<linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/><stop offset="49%" stop-color="#fff" stop-opacity="0.03"/>
    <stop offset="51%" stop-color="#000" stop-opacity="0.18"/><stop offset="100%" stop-color="#000" stop-opacity="0.02"/>
  </linearGradient>`;
}

function paper(w, h, opts = {}) {
  const vign = opts.vignette !== false;
  return `<rect x="0" y="0" width="${w}" height="${h}" filter="url(#paper)"/>` +
    (vign ? `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#vgrad)" opacity="0.5"/>` : '');
}

/* ---------- hand-path helpers ---------- */
function wig(pts, amp, r) {
  const p = pts.map((pt, i) => (i === 0 || i === pts.length - 1) ? pt.slice()
    : [pt[0] + (r() - 0.5) * 2 * amp, pt[1] + (r() - 0.5) * 2 * amp]);
  let d = `M ${round2(p[0][0])} ${round2(p[0][1])}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i];
    const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * amp, my = (a[1] + b[1]) / 2 + (r() - 0.5) * amp;
    d += ` Q ${round2(mx)} ${round2(my)} ${round2(b[0])} ${round2(b[1])}`;
  }
  return d;
}
function line(x1, y1, x2, y2, n = 3) { const pts = []; for (let i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); return pts; }
function arcPts(cx, cy, rx, ry, a0, a1, n = 10) { const pts = []; for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); } return pts; }

function stroke(pts, o = {}) {
  const seed = o.seed || 12;
  const w = o.w ?? 3, col = o.col || P.ink, op = o.op ?? 0.92, amp = o.amp ?? 1.6, cap = o.cap || 'round';
  const d1 = wig(pts, amp, rng(seed));
  let s = `<path d="${d1}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round" opacity="${op}"/>`;
  if (o.double) {
    const d2 = wig(pts, amp * 1.5, rng(seed + 101));
    s += `<path d="${d2}" fill="none" stroke="${col}" stroke-width="${(w * 0.72).toFixed(2)}" stroke-linecap="${cap}" stroke-linejoin="round" opacity="${(op * 0.5).toFixed(2)}"/>`;
  }
  return s;
}
function hatch(x, y, w, h, o = {}) {
  const r = rng(o.seed || 4); const col = o.col || P.ink; const n = o.n || 6, ang = o.ang ?? -0.5; let s = '';
  for (let i = 0; i < n; i++) { const gx = x + (i / (n - 1)) * w + (r() - 0.5) * 3, len = h * R(r, 0.6, 1);
    s += stroke(line(gx, y, gx + Math.cos(ang) * len, y + Math.sin(ang) * len, 2), { seed: (o.seed || 4) + i * 7, w: o.w || 1.5, col, op: o.op ?? 0.5, amp: 1 }); }
  return s;
}

function chalk(d, color, o = {}) {
  const streak = o.streak ? 'chalkS' : 'chalk', sm = o.softer ? 'smudge' : 'smudgeS';
  const opTop = o.op ?? 0.92, opSmudge = o.smudge ?? 0.5;
  return `<path d="${d}" fill="${color}" opacity="${opSmudge}" filter="url(#${sm})"/>` +
    `<path d="${d}" fill="${color}" opacity="${opTop}" filter="url(#${streak})"/>`;
}
function blob(cx, cy, rx, ry, seed, wob = 0.14, n = 14) {
  const r = rng(seed); const pts = [];
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, rr = 1 + (r() - 0.5) * 2 * wob;
    pts.push([cx + Math.cos(t) * rx * rr, cy + Math.sin(t) * ry * rr]); }
  let d = `M ${round2(pts[0][0])} ${round2(pts[0][1])}`;
  for (let i = 1; i <= n; i++) { const a = pts[i % n], pr = pts[(i - 1) % n], mx = (pr[0] + a[0]) / 2, my = (pr[1] + a[1]) / 2;
    d += ` Q ${round2(pr[0])} ${round2(pr[1])} ${round2(mx)} ${round2(my)}`; }
  return d + ' Z';
}
function dust(x, y, w, h, seed, n = 60, o = {}) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) { const cx = x + r() * w, cy = y + r() * h, rad = R(r, 0.4, 1.5);
    const col = r() < 0.5 ? P.ink : (o.warm ? P.ochre : P.paperHi);
    s += `<circle cx="${round2(cx)}" cy="${round2(cy)}" r="${round2(rad)}" fill="${col}" opacity="${round2(R(r, 0.05, 0.22))}"/>`; }
  return s;
}

/* ====================================================================== */
function headOutline(hx, hy, rx, ry, jaw) {
  const n = 26, pts = [];
  const taper = jaw === 'square' ? 0.1 : jaw === 'narrow' ? 0.36 : jaw === 'round' ? 0.14 : 0.24;
  const chin = jaw === 'round' ? 1.0 : jaw === 'narrow' ? 1.08 : 1.04;
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI / 2 + (i / n) * Math.PI * 2, cx = Math.cos(t), cy = Math.sin(t);
    let RX = rx; if (cy > 0.12) RX = rx * (1 - taper * ((cy - 0.12) / 0.88));
    pts.push([hx + cx * RX, hy + cy * ry * (cy > 0.6 ? chin : 1)]);
  }
  return pts;
}
function head(cfg = {}) {
  const s = cfg.s ?? 1, x = cfg.x ?? 0, y = cfg.y ?? 0, seed = cfg.seed ?? 21, r = rng(seed);
  const tone = cfg.tone || 'neutral';
  const skin = cfg.skin || (tone === 'cool' ? P.slateSkin : ['#E4B584', '#D9A56A', '#E9C199', '#CE9866', '#DDA872'][Math.floor(r() * 5)]);
  const sideCol = tone === 'cool' ? P.slate : (tone === 'warm' ? P.ochre : P.inkSoft);
  const hairCol = cfg.hairCol || (cfg.gray ? '#BCB29E' : ['#5B4A38', '#6B5335', '#4A3B2E', '#7A6248', '#54453A'][Math.floor(r() * 5)]);
  const tilt = cfg.tilt ?? (r() - 0.5) * 8;
  const hx = 55, hy = 54, rx = 29 * (cfg.wide ? 1.08 : cfg.narrow ? 0.92 : 1), ry = 35 * (cfg.long ? 1.06 : 1);
  const g = [];

  if (cfg.bust !== false) {
    const clothCol = cfg.cloth || (tone === 'cool' ? P.slate : tone === 'warm' ? P.ochreDeep : pick(r, ['#7C6A52', '#6E7B84', '#8A6D4E', '#84756A']));
    const garment = cfg.garment || 'plain';
    g.push(chalk(`M 0 196 L 4 146 Q 17 113 43 106 L 67 106 Q 93 113 106 146 L 110 196 Z`, clothCol, { op: 0.6, smudge: 0.4, streak: true }));
    g.push(stroke([[2, 196], [5, 150], [19, 118], [42, 107]], { seed: seed + 2, w: 2.3, amp: 1.2, double: true }));
    g.push(stroke([[108, 196], [105, 150], [91, 118], [68, 107]], { seed: seed + 3, w: 2.3, amp: 1.2, double: true }));
    if (garment === 'robe' || garment === 'suit') {
      const lap = darken(clothCol, 0.16);
      g.push(chalk(`M 41 106 L 55 152 L 29 178 L 21 120 Z`, lap, { op: 0.5, smudge: 0.3, streak: true }));
      g.push(chalk(`M 69 106 L 55 152 L 81 178 L 89 120 Z`, lap, { op: 0.5, smudge: 0.3, streak: true }));
      g.push(stroke([[43, 107], [53, 150], [30, 178]], { seed: seed + 2, w: 2.0, amp: 1.0, op: 0.8 }));
      g.push(stroke([[67, 107], [57, 150], [80, 178]], { seed: seed + 3, w: 2.0, amp: 1.0, op: 0.8 }));
      g.push(stroke([[45, 106], [55, 128], [65, 106]], { seed: seed + 4, w: 1.9, amp: 0.7 }));
      if (garment === 'suit') g.push(chalk(`M 52 108 L 58 108 L 56.5 142 L 53.5 142 Z`, sideCol, { op: 0.5, smudge: 0.22 }));
    } else if (garment === 'blouse') {
      g.push(stroke(arcPts(55, 108, 15, 8, Math.PI * 0.14, Math.PI * 0.86, 7), { seed: seed + 4, w: 1.9, amp: 0.7 }));
    } else {
      g.push(stroke(arcPts(55, 110, 12, 6, Math.PI * 0.08, Math.PI * 0.92, 7), { seed: seed + 4, w: 1.8, amp: 0.6, op: 0.78 }));
    }
  }
  g.push(stroke([[48, 88], [47, 104]], { seed: seed + 5, w: 2.2, amp: 0.5, op: 0.72 }));
  g.push(stroke([[64, 88], [65, 104]], { seed: seed + 6, w: 2.2, amp: 0.5, op: 0.72 }));

  g.push(chalk(blob(hx, hy + 3, rx * 0.95, ry * 0.99, seed + 7, 0.05, 16), skin, { op: 0.9, smudge: 0.36 }));
  g.push(`<ellipse cx="${hx + 12}" cy="${hy + 13}" rx="8" ry="6" fill="${sideCol}" opacity="0.1" filter="url(#smudge)"/>`);
  if (cfg.cheeks !== false) { const cop = cfg.cheeks === 'rosy' ? 0.24 : 0.13; g.push(`<ellipse cx="${hx - 15}" cy="${hy + 12}" rx="7.5" ry="5" fill="${P.ochre}" opacity="${cop}" filter="url(#smudge)"/><ellipse cx="${hx + 15}" cy="${hy + 12}" rx="7.5" ry="5" fill="${P.ochre}" opacity="${cop}" filter="url(#smudge)"/>`); }
  const shadeCol = tone === 'cool' ? P.slateDeep : '#9A6E44';
  g.push(`<path d="${blob(hx + rx * 0.44, hy + 7, rx * 0.46, ry * 0.8, seed + 70, 0.06, 14)}" fill="${shadeCol}" opacity="0.13" filter="url(#smudge)"/>`);
  g.push(`<path d="M ${hx - 15} ${hy + ry * 0.84} Q ${hx} ${hy + ry * 1.04} ${hx + 15} ${hy + ry * 0.84}" fill="none" stroke="${shadeCol}" stroke-width="4" opacity="0.11" filter="url(#smudge)"/>`);

  g.push(stroke(headOutline(hx, hy, rx, ry, cfg.jaw || 'oval'), { seed: seed + 8, w: 2.4, amp: 1.0, double: true }));

  g.push(hair(hx, hy, rx, ry, cfg.hair || pick(r, ['bun', 'short', 'wavy', 'crop', 'fringe', 'curls', 'side']), hairCol, seed + 9, cfg.gray));

  const bY = hy - 8.5, bA = ({ flat: 0.02, kind: 0.06, soft: 0.04, level: 0.0, up: -0.09, worry: 0.10, arch: -0.15 })[cfg.brow || pick(r, ['flat', 'kind', 'soft'])] ?? 0.03;
  g.push(stroke([[hx - 19, bY - bA * 12], [hx - 12.5, bY - bA * 17], [hx - 7, bY - bA * 3]], { seed: seed + 10, w: 1.9, amp: 0.4, op: 0.72 }));
  g.push(stroke([[hx + 7, bY - bA * 3], [hx + 12.5, bY - bA * 17], [hx + 19, bY - bA * 12]], { seed: seed + 11, w: 1.9, amp: 0.4, op: 0.72 }));

  const gaze = cfg.gaze ?? 0;
  g.push(eye(hx - 11, hy - 1, seed + 12, gaze, cfg.eyes));
  g.push(eye(hx + 11, hy - 1, seed + 13, gaze, cfg.eyes));

  g.push(stroke([[hx - 1, hy + 2], [hx - 4, hy + 13], [hx + 3, hy + 15]], { seed: seed + 14, w: 1.5, amp: 0.7, op: 0.6 }));

  g.push(mouth(hx, hy + 25, cfg.mouth || pick(r, ['neutral', 'set', 'soft', 'speak', 'smile']), seed + 15));

  if (cfg.glasses) g.push(glasses(hx, hy - 1, seed + 16, cfg.glassCol || P.ink));
  if (cfg.extra) g.push(cfg.extra(hx, hy, rx, ry));

  return `<g transform="translate(${x},${y}) rotate(${tilt} ${hx} ${hy}) scale(${s})">${g.join('')}</g>`;
}

function capPath(hx, hy, rx, ry, dip, bulge, seed) {
  const r = rng(seed), j = (v, a) => v + (r() - 0.5) * 2 * a;
  const pts = [
    [hx - rx * 1.03, hy + ry * 0.04], [hx - rx * (0.92 + bulge), hy - ry * 0.60],
    [hx - rx * 0.44, hy - ry * (1.0 + bulge * 0.5)], [hx, hy - ry * (1.05 + bulge * 0.5)],
    [hx + rx * 0.44, hy - ry * (1.0 + bulge * 0.5)], [hx + rx * (0.92 + bulge), hy - ry * 0.60],
    [hx + rx * 1.03, hy + ry * 0.04],
    [hx + rx * 0.52, hy - ry * (dip - 0.05)], [hx + rx * 0.16, hy - ry * dip],
    [hx - rx * 0.16, hy - ry * (dip + 0.02)], [hx - rx * 0.52, hy - ry * (dip - 0.05)],
  ].map((p) => [j(p[0], 1.3), j(p[1], 1.3)]);
  let d = `M ${round2(pts[0][0])} ${round2(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; d += ` Q ${round2(a[0])} ${round2(a[1])} ${round2(mx)} ${round2(my)}`; }
  d += ` Q ${round2(pts[pts.length - 1][0])} ${round2(pts[pts.length - 1][1])} ${round2(pts[0][0])} ${round2(pts[0][1])} Z`;
  return d;
}
function hair(hx, hy, rx, ry, style, col, seed, gray) {
  const r = rng(seed); const g = [];
  const strandCol = darken(col, 0.16), liteCol = lighten(col, 0.22);
  const cap = (d) => `<path d="${d}" fill="${col}" opacity="0.34" filter="url(#smudgeS)"/><path d="${d}" fill="${col}" opacity="0.94" filter="url(#chalk)"/>`;
  const sweep = (n, dip, bulge, sd) => { let s = ''; for (let i = 0; i < n; i++) { const t = i / (n - 1), sx = hx + (t - 0.5) * rx * 1.5, topY = hy - ry * (0.92 + bulge * 0.4), botY = hy - ry * (dip - 0.02); s += stroke([[sx, topY], [sx + (t - 0.5) * 5, (topY + botY) / 2], [hx + (t - 0.5) * rx * 1.05, botY]], { seed: sd + i * 5, w: 1.3, col: strandCol, op: 0.42, amp: 0.9 }); } return s; };
  const hairline = (dip, spread, op) => stroke(arcPts(hx, hy - ry * (dip - 0.5), rx * spread, ry * 0.5, Math.PI * 1.08, Math.PI * 1.92, 9), { seed: seed + 2, w: 1.6, col: strandCol, op: op ?? 0.55, amp: 0.5 });

  if (style === 'bald') {
    g.push(stroke(arcPts(hx, hy - ry * 0.16, rx * 0.98, ry * 0.72, Math.PI * 1.18, Math.PI * 1.5, 5), { seed: seed + 3, w: 1.8, col: strandCol, op: 0.55, amp: 0.6 }));
    g.push(stroke(arcPts(hx, hy - ry * 0.16, rx * 0.98, ry * 0.72, Math.PI * 1.5, Math.PI * 1.82, 5), { seed: seed + 4, w: 1.8, col: strandCol, op: 0.55, amp: 0.6 }));
    g.push(cap(capPath(hx - rx * 0.62, hy + ry * 0.02, rx * 0.5, ry * 0.7, 0.22, -0.1, seed + 7)));
    g.push(cap(capPath(hx + rx * 0.62, hy + ry * 0.02, rx * 0.5, ry * 0.7, 0.22, -0.1, seed + 8)));
  } else if (style === 'thin') {
    g.push(cap(capPath(hx, hy, rx, ry, 0.30, -0.06, seed))); g.push(sweep(9, 0.30, -0.06, seed + 10));
  } else if (style === 'short') {
    g.push(cap(capPath(hx, hy, rx, ry, 0.40, 0.02, seed))); g.push(sweep(8, 0.40, 0.02, seed + 10)); g.push(hairline(0.40, 0.86, 0.5));
  } else if (style === 'crop') {
    g.push(cap(capPath(hx, hy, rx, ry, 0.34, -0.02, seed))); g.push(sweep(10, 0.34, -0.02, seed + 10));
  } else if (style === 'side') {
    g.push(cap(capPath(hx, hy, rx, ry, 0.42, 0.05, seed))); g.push(sweep(7, 0.42, 0.05, seed + 10));
    g.push(stroke([[hx - rx * 0.62, hy - ry * 0.52], [hx + rx * 0.2, hy - ry * 0.40]], { seed: seed + 9, w: 1.6, col: strandCol, op: 0.5, amp: 0.6 }));
  } else if (style === 'wavy') {
    g.push(cap(capPath(hx - 1, hy, rx * 1.04, ry, 0.44, 0.12, seed)));
    g.push(cap(capPath(hx - rx * 0.82, hy + ry * 0.22, rx * 0.36, ry * 0.66, 0.9, 0.0, seed + 5)));
    g.push(cap(capPath(hx + rx * 0.82, hy + ry * 0.22, rx * 0.36, ry * 0.66, 0.9, 0.0, seed + 6)));
    g.push(sweep(8, 0.44, 0.12, seed + 10));
  } else if (style === 'bun') {
    g.push(`<path d="${blob(hx, hy - ry * 0.98, 9, 8, seed + 1, 0.12)}" fill="${col}" opacity="0.92" filter="url(#chalk)"/>`);
    g.push(cap(capPath(hx, hy, rx, ry, 0.42, 0.0, seed))); g.push(sweep(7, 0.42, 0.0, seed + 10)); g.push(hairline(0.42, 0.86, 0.5));
  } else if (style === 'curls') {
    g.push(cap(capPath(hx, hy, rx * 1.02, ry, 0.40, 0.06, seed)));
    for (let i = 0; i < 7; i++) { const a = Math.PI * 1.06 + (i / 6) * Math.PI * 0.88; g.push(`<path d="${blob(hx + Math.cos(a) * rx * 0.9, hy - ry * 0.2 + Math.sin(a) * ry * 0.78, 6.5, 6.5, seed + i, 0.22)}" fill="${col}" opacity="0.9" filter="url(#chalk)"/>`); }
  } else if (style === 'long') {
    g.push(cap(capPath(hx - rx * 0.9, hy + ry * 0.4, rx * 0.34, ry * 1.0, 1.0, 0.0, seed + 5)));
    g.push(cap(capPath(hx + rx * 0.9, hy + ry * 0.4, rx * 0.34, ry * 1.0, 1.0, 0.0, seed + 6)));
    g.push(cap(capPath(hx, hy, rx * 1.02, ry, 0.44, 0.06, seed))); g.push(sweep(8, 0.44, 0.06, seed + 10)); g.push(hairline(0.44, 0.9, 0.5));
  } else {
    g.push(cap(capPath(hx, hy, rx, ry, 0.40, 0.02, seed))); g.push(sweep(8, 0.40, 0.02, seed + 10)); g.push(hairline(0.40, 0.86, 0.5));
  }
  if (gray) { for (let i = 0; i < 5; i++) { const sx = hx + (i / 4 - 0.5) * rx * 1.2; g.push(stroke([[sx, hy - ry * 0.9], [sx, hy - ry * 0.45]], { seed: seed + 30 + i, w: 1.1, col: liteCol, op: 0.5, amp: 0.7 })); } }
  return g.join('');
}
function eye(ex, ey, seed, gaze, kind) {
  if (kind === 'closed') return stroke([[ex - 6.2, ey + 0.6], [ex, ey + 2.3], [ex + 6.2, ey + 0.7]], { seed, w: 1.7, amp: 0.3, op: 0.7 });
  const gx = ex + (gaze || 0) * 2.0;
  let s = '';
  s += stroke([[ex - 6.4, ey - 0.4], [ex - 1, ey - 2.7], [ex + 5.8, ey - 1.2]], { seed, w: 1.9, amp: 0.28, op: 0.9, cap: 'round' });
  s += stroke([[ex - 4.4, ey + 2.7], [ex + 0.6, ey + 3.4], [ex + 4.8, ey + 2.4]], { seed: seed + 21, w: 1.0, amp: 0.2, op: 0.3 });
  s += `<ellipse cx="${round2(gx)}" cy="${round2(ey + 1.5)}" rx="2.3" ry="2.7" fill="${P.ink}" opacity="0.82"/>`;
  s += `<circle cx="${round2(gx - 0.9)}" cy="${round2(ey + 0.4)}" r="0.75" fill="${P.paperHi}" opacity="0.92"/>`;
  return s;
}
function mouth(mx, my, kind, seed) {
  if (kind === 'speak') {
    return chalk(blob(mx, my + 0.5, 6.6, 4.2, seed, 0.16, 10), darken(P.ochre, 0.36), { op: 0.42, smudge: 0.24 }) +
      stroke(arcPts(mx, my - 0.5, 6.9, 4.2, Math.PI * 0.1, Math.PI * 0.9, 6), { seed, w: 1.7, amp: 0.35 });
  }
  const curve = ({ neutral: 1.3, set: -0.3, soft: 2.2, warm: 2.9, smile: 3.7, listen: 1.0 })[kind] ?? 1.3;
  let s = stroke([[mx - 9.5, my], [mx, my + curve], [mx + 9.5, my - 0.3]], { seed, w: 1.9, amp: 0.5, op: 0.86 });
  if (curve >= 2.0) s += `<path d="M ${mx - 7} ${round2(my + curve * 0.5)} Q ${mx} ${round2(my + curve + 1.7)} ${mx + 7} ${round2(my + curve * 0.5)}" fill="none" stroke="${P.ochreDeep}" stroke-width="1.3" opacity="0.2" filter="url(#rghF)"/>`;
  return s;
}
function glasses(hx, hy, seed, col) {
  const lens = (cx) => `<rect x="${cx - 9.5}" y="${hy - 6.5}" width="19" height="14" rx="7" fill="#F6EFDD" opacity="0.14"/>` +
    `<rect x="${cx - 9.5}" y="${hy - 6.5}" width="19" height="14" rx="7" fill="none" stroke="${col}" stroke-width="1.9" opacity="0.9" filter="url(#rghF)"/>` +
    `<path d="M ${cx - 6} ${hy - 4} q 4 -2 8 0" fill="none" stroke="#FBF3E0" stroke-width="1.2" opacity="0.5"/>`;
  return lens(hx - 12) + lens(hx + 12) +
    stroke([[hx - 2.5, hy - 1.5], [hx + 2.5, hy - 1.5]], { seed, w: 1.6, amp: 0.22 }) +
    stroke([[hx - 21.5, hy - 3.5], [hx - 27, hy - 5.5]], { seed: seed + 1, w: 1.5, amp: 0.3, op: 0.55 }) +
    stroke([[hx + 21.5, hy - 3.5], [hx + 27, hy - 5.5]], { seed: seed + 2, w: 1.5, amp: 0.3, op: 0.55 });
}

/* ---------- an empty chair (the Absent) ---------- */
function chair(x, y, s = 1, tone = 'cool') {
  const col = tone === 'cool' ? P.slate : P.ink, g = [];
  g.push(chalk(`M ${x - 26} ${y} L ${x + 26} ${y} L ${x + 22} ${y + 8} L ${x - 22} ${y + 8} Z`, tone === 'cool' ? P.slateSkin : P.paperLo, { op: 0.5, smudge: 0.35 }));
  g.push(stroke([[x - 26, y], [x + 26, y]], { seed: 61, w: 3 * s, col, double: true }));
  g.push(stroke([[x - 24, y + 2], [x - 26, y + 40]], { seed: 62, w: 3 * s, col }));
  g.push(stroke([[x + 24, y + 2], [x + 26, y + 40]], { seed: 63, w: 3 * s, col }));
  g.push(stroke([[x - 22, y], [x - 20, y - 40]], { seed: 64, w: 3 * s, col }));
  g.push(stroke([[x + 22, y], [x + 20, y - 40]], { seed: 65, w: 3 * s, col }));
  g.push(stroke([[x - 21, y - 34], [x + 21, y - 34]], { seed: 66, w: 3 * s, col, double: true }));
  g.push(stroke([[x - 20, y - 20], [x + 20, y - 20]], { seed: 67, w: 2.4 * s, col, op: 0.7 }));
  return `<g>${g.join('')}</g>`;
}

/* ---------- the Clerk's brass hand-bell ---------- */
function bell(x, y, s = 1) {
  const g = [], rw = 13 * s, edge = darken(P.ochre, 0.34);
  const body = `M ${x - rw} ${y} C ${x - rw - 1} ${y - 9 * s} ${x - 8 * s} ${y - 17 * s} ${x - 7 * s} ${y - 23 * s} C ${x - 7 * s} ${y - 28 * s} ${x + 7 * s} ${y - 28 * s} ${x + 7 * s} ${y - 23 * s} C ${x + 8 * s} ${y - 17 * s} ${x + rw + 1} ${y - 9 * s} ${x + rw} ${y} Z`;
  g.push(chalk(body, P.ochre, { op: 0.9, smudge: 0.32 }));
  g.push(`<path d="${body}" fill="none" stroke="${edge}" stroke-width="${2.0 * s}" opacity="0.85" filter="url(#rghF)"/>`);
  g.push(stroke([[x - rw - 1, y], [x, y + 2.4 * s], [x + rw + 1, y]], { seed: 72, w: 2.6 * s, col: edge, double: true }));
  g.push(`<path d="M ${x - 5 * s} ${y - 18 * s} C ${x - 7 * s} ${y - 10 * s} ${x - 7 * s} ${y - 4 * s} ${x - 6 * s} ${y - 1 * s}" fill="none" stroke="#F6E4B8" stroke-width="${1.6 * s}" opacity="0.6"/>`);
  g.push(`<circle cx="${x}" cy="${y - 29 * s}" r="${3.0 * s}" fill="${P.ochre}" filter="url(#rghF)"/>`);
  g.push(`<path d="M ${x - 4 * s} ${y - 31 * s} q ${4 * s} ${-7 * s} ${8 * s} 0" fill="none" stroke="${edge}" stroke-width="${2.2 * s}"/>`);
  g.push(`<circle cx="${x}" cy="${y + 4 * s}" r="${2.4 * s}" fill="${edge}" opacity="0.85"/>`);
  return `<g>${g.join('')}</g>`;
}

/* ---------- THE CLERK — the mascot ---------- */
function clerk(cfg = {}) {
  const x = cfg.x ?? 0, y = cfg.y ?? 0, s = cfg.s ?? 1, seed = cfg.seed ?? 71, pose = cfg.pose || 'preside';
  const g = [];
  const mouthK = pose === 'settle' ? 'soft' : pose === 'ask' ? 'warm' : 'smile';
  const gaze = pose === 'ask' ? 0.7 : 0, tilt = pose === 'ask' ? 4 : 0;
  g.push(head({ x: 0, y: 0, s: 1, seed, skin: '#EBC59D', hair: 'thin', hairCol: '#9C8B72', gray: true,
    glasses: true, glassCol: P.ink, brow: 'kind', mouth: mouthK, cheeks: 'rosy',
    garment: 'blouse', cloth: '#DDCAA6', jaw: 'round', wide: true, gaze, tilt }));
  g.push(chalk(`M 31 129 L 55 152 L 55 196 L 25 196 Z`, P.ochreDeep, { op: 0.5, smudge: 0.3, streak: true }));
  g.push(chalk(`M 79 129 L 55 152 L 55 196 L 85 196 Z`, P.ochreDeep, { op: 0.5, smudge: 0.3, streak: true }));
  g.push(stroke([[31, 129], [55, 152], [79, 129]], { seed: seed + 30, w: 2.0, amp: 0.8, op: 0.82 }));
  g.push(stroke([[55, 152], [55, 194]], { seed: seed + 31, w: 1.6, amp: 0.5, op: 0.5 }));
  for (let i = 0; i < 3; i++) g.push(`<circle cx="55" cy="${164 + i * 11}" r="2.1" fill="${darken(P.ochre, 0.3)}"/>`);
  g.push(chalk(`M 55 127 L 46 122 L 46 133 Z`, P.ochre, { op: 0.85, smudge: 0.2 }));
  g.push(chalk(`M 55 127 L 64 122 L 64 133 Z`, P.ochre, { op: 0.85, smudge: 0.2 }));
  g.push(`<circle cx="55" cy="127" r="2.5" fill="${P.ochreDeep}"/>`);
  const held = (pose === 'ring' || pose === 'ask'), bx = held ? 92 : 84, by = held ? 130 : 160;
  g.push(stroke([[76, 195], [86, 166], [bx + 3, by - 30]], { seed: seed + 40, w: 16, col: '#D6C29C', op: 0.92, cap: 'round' }));
  g.push(bell(bx, by, 1.2));
  g.push(chalk(blob(bx + 2, by - 34, 7, 6, seed + 41, 0.1), '#EBC59D', { op: 0.94, smudge: 0.22 }));
  g.push(stroke(arcPts(bx + 2, by - 34, 6, 4.5, 0.15, Math.PI - 0.15, 4), { seed: seed + 43, w: 1.2, op: 0.4 }));
  if (pose === 'ring') {
    g.push(stroke(arcPts(bx + 20, by - 12, 7, 11, -Math.PI * 0.42, Math.PI * 0.42, 6), { seed: seed + 50, w: 2, col: P.ochre, op: 0.6 }));
    g.push(stroke(arcPts(bx + 27, by - 12, 10, 15, -Math.PI * 0.42, Math.PI * 0.42, 6), { seed: seed + 51, w: 1.6, col: P.ochre, op: 0.38 }));
    g.push(dust(bx - 12, by - 36, 44, 22, seed + 60, 24, { warm: true }));
  }
  return `<g transform="translate(${x},${y}) scale(${s})">${g.join('')}</g>`;
}

/* ---------- the gavel (the Bench object) ---------- */
function gavel(x, y, s = 1, rot = -22) {
  const g = [`<g transform="rotate(${rot} ${x} ${y})">`];
  g.push(chalk(`M ${x - 20} ${y - 12} h 40 v 24 h -40 Z`, P.ochre, { op: 0.92, smudge: 0.4 }));
  g.push(stroke([[x - 20, y - 12], [x + 20, y - 12], [x + 20, y + 12], [x - 20, y + 12], [x - 20, y - 12]], { seed: 81, w: 2.6 * s, double: true }));
  g.push(stroke([[x - 20, y - 4], [x - 20, y + 4]], { seed: 82, w: 2 * s }));
  g.push(stroke([[x + 20, y - 4], [x + 20, y + 4]], { seed: 83, w: 2 * s }));
  g.push(chalk(`M ${x + 18} ${y - 4} h 46 v 8 h -46 Z`, P.ochreDeep, { op: 0.85, smudge: 0.3 }));
  g.push(stroke([[x + 20, y - 4], [x + 66, y - 4], [x + 66, y + 4], [x + 20, y + 4]], { seed: 84, w: 2.2 * s }));
  g.push(`</g>`);
  return g.join('');
}

/* ---------- a juror vote-paddle ---------- */
function paddle(x, y, label, o = {}) {
  const s = o.s ?? 1, col = o.moved ? P.moved : (o.warm ? P.ochre : P.ink), g = [`<g transform="translate(${x},${y}) rotate(${o.rot ?? 0})">`];
  g.push(chalk(blob(0, -6, 16 * s, 20 * s, o.seed || 90, 0.06, 14), P.paperHi, { op: 0.95, smudge: 0.3 }));
  g.push(stroke(arcPts(0, -6, 16 * s, 20 * s, 0, Math.PI * 2, 16), { seed: (o.seed || 90) + 1, w: 2.2 * s, col, double: true }));
  g.push(stroke([[0, 12 * s], [0, 30 * s]], { seed: (o.seed || 90) + 2, w: 3 * s, col }));
  g.push(`<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Baloo2" font-weight="800" font-size="${13 * s}" fill="${col}">${label}</text>`);
  if (o.scratch) g.push(stroke([[-13 * s, -2], [13 * s, -10]], { seed: (o.seed || 90) + 5, w: 2.4 * s, col: P.ink, op: 0.8 }));
  g.push(`</g>`);
  return g.join('');
}

/* ---------- split-flap numerals ---------- */
function splitflap(str, o = {}) {
  const s = o.s ?? 1, cw = 26 * s, ch = 36 * s, gap = 4 * s, chars = String(str).split(''); let x = 0, g = [];
  for (const c of chars) {
    const w = (c === ' ') ? cw * 0.5 : cw;
    if (c !== ' ') g.push(`<g transform="translate(${x},0)">
      <rect x="0" y="0" width="${w}" height="${ch}" rx="${3 * s}" fill="${P.ink}"/>
      <rect x="0" y="0" width="${w}" height="${ch}" rx="${3 * s}" fill="url(#flapGrad)" opacity="0.5"/>
      <line x1="0" y1="${ch / 2}" x2="${w}" y2="${ch / 2}" stroke="#000" stroke-width="${1.2 * s}" opacity="0.55"/>
      <text x="${w / 2}" y="${ch / 2}" text-anchor="middle" dominant-baseline="central" font-family="SpaceMono" font-weight="700" font-size="${22 * s}" fill="${o.col || P.ochreHi}">${c}</text></g>`);
    x += w + gap;
  }
  return `<g transform="translate(${o.x || 0},${o.y || 0})">${g.join('')}</g>`;
}

/* ---------- the wordmark ---------- */
function wordmark(o = {}) {
  const s = o.s ?? 1, w = 540 * s, g = [];
  g.push(quoteMark(54 * s, 60 * s, 20 * s, P.ochre, false, 201));
  g.push(quoteMark(486 * s, 60 * s, 20 * s, P.slate, true, 202));
  g.push(`<g filter="url(#rghF)"><text x="${w / 2}" y="${110 * s}" text-anchor="middle" font-family="Baloo2" font-weight="800" font-size="${92 * s}" fill="${P.ink}" letter-spacing="-1">Hearsay</text></g>`);
  g.push(stroke(line(158 * s, 146 * s, 382 * s, 146 * s, 5), { seed: 205, w: 5 * s, col: P.ochre, amp: 2, double: true }));
  return `<g transform="translate(${o.x || 0},${o.y || 0})">${g.join('')}</g>`;
}
function quoteMark(cx, cy, r, col, closing, seed) {
  const dir = closing ? -1 : 1;
  const drop = (ox) => {
    const x = cx + ox * dir;
    const d = `M ${round2(x)} ${round2(cy - r)} C ${round2(x + 0.64 * r * dir)} ${round2(cy - r)} ${round2(x + 0.8 * r * dir)} ${round2(cy - 0.12 * r)} ${round2(x + 0.4 * r * dir)} ${round2(cy + 0.44 * r)} C ${round2(x + 0.2 * r * dir)} ${round2(cy + 0.82 * r)} ${round2(x - 0.12 * r * dir)} ${round2(cy + 0.9 * r)} ${round2(x - 0.46 * r * dir)} ${round2(cy + 1.2 * r)} C ${round2(x - 0.22 * r * dir)} ${round2(cy + 0.46 * r)} ${round2(x - 0.58 * r * dir)} ${round2(cy + 0.12 * r)} ${round2(x - 0.58 * r * dir)} ${round2(cy - 0.3 * r)} C ${round2(x - 0.58 * r * dir)} ${round2(cy - 0.74 * r)} ${round2(x - 0.3 * r * dir)} ${round2(cy - r)} ${round2(x)} ${round2(cy - r)} Z`;
    return chalk(d, col, { op: 0.92, smudge: 0.3 }) + `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${Math.max(1.5, r * 0.1)}" opacity="0.8" filter="url(#rghF)"/>`;
  };
  return `${drop(0)}${drop(r * 1.2)}`;
}

/* ---------- the logomark: a two-tone "H" ---------- */
function logoH(cx, cy, u, warmCol, coolCol, barCol, lineCol) {
  const rr = (x, y, w, h, r) => `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  const W = u * 1.62, H = u * 2.0, sw = u * 0.5, r = u * 0.15, lx = cx - W / 2, rx = cx + W / 2 - sw, ty = cy - H / 2;
  const stem = (x, col) => { const d = rr(x, ty, sw, H, r); return chalk(d, col, { op: 0.94, smudge: 0.22, streak: true }) + `<path d="${d}" fill="none" stroke="${lineCol}" stroke-width="${u * 0.12}" opacity="0.9" filter="url(#rghF)"/>`; };
  const by = cy - sw * 0.46, bd = rr(lx + sw * 0.5, by, W - sw, sw * 0.94, r * 0.7);
  const bar = chalk(bd, barCol, { op: 0.9, smudge: 0.22, streak: true }) + `<path d="${bd}" fill="none" stroke="${lineCol}" stroke-width="${u * 0.1}" opacity="0.88" filter="url(#rghF)"/>`;
  return stem(lx, warmCol) + stem(rx, coolCol) + bar;
}

/* ---------- exhibit stamp ---------- */
function stamp(x, y, label, o = {}) {
  const s = o.s ?? 1, col = o.col || P.ochreDeep, w = (o.w || 120) * s, h = 34 * s;
  return `<g transform="translate(${x},${y}) rotate(${o.rot ?? -6})" opacity="0.9">
    <rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="none" stroke="${col}" stroke-width="${2.4 * s}" filter="url(#rgh)"/>
    <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="3" fill="none" stroke="${col}" stroke-width="${1 * s}" opacity="0.6" filter="url(#rghF)"/>
    <text x="${w / 2}" y="${h / 2 + 1}" text-anchor="middle" dominant-baseline="central" font-family="Baloo2" font-weight="700" font-size="${13 * s}" fill="${col}" letter-spacing="0.5">${label}</text></g>`;
}

/* ---------- assemble a full SVG board ---------- */
function board(w, h, inner, o = {}) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${defs().replace('</defs>', `${vignetteGrad(w, h)}${flapGrad()}</defs>`)}
    ${paper(w, h, o)}
    ${inner}
  </svg>`;
}

export const SK = {
  P, rng, R, darken, lighten, shade, defs, vignetteGrad, flapGrad, paper, wig, line, arcPts, stroke, hatch, chalk, blob, dust,
  headOutline, head, hair, capPath, eye, mouth, glasses, chair, bell, clerk, gavel, paddle, splitflap, wordmark, quoteMark, logoH, stamp, board,
};
export type SKType = typeof SK;
