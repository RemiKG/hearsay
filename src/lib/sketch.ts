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
