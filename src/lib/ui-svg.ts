// @ts-nocheck
/* Hearsay — screen-chrome kit (ported from _render/lib/ui.js). Draws sketched (wobbly)
   cards, ochre-washed buttons, the reporter's ribbon, speech drawn into the scene, the
   split-flap bench board, the rounds/token gauge — all on the same paper as the art, so
   the interface and the sketch are one surface. Returns SVG-string fragments. Depends on SK. */
import { SK } from './sketch';

const P = SK.P;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function roundRect(x, y, w, h, r) {
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}
function panel(x, y, w, h, o = {}) {
  const fill = o.fill || P.paperHi, r = o.r ?? 14, sw = o.sw ?? 2.2, stroke = o.stroke || P.ink;
  const d = roundRect(x, y, w, h, r);
  let s = '';
  if (o.shadow !== false) s += `<path d="${roundRect(x + 3, y + 6, w, h, r)}" fill="${P.ink}" opacity="0.1" filter="url(#smudge)"/>`;
  s += `<path d="${d}" fill="${fill}"/>`;
  s += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${o.strokeOp ?? 0.82}" filter="url(#rghF)"/>`;
  if (o.accent) s += `<path d="${roundRect(x, y, w, 6, r)}" fill="${o.accent}" opacity="0.9"/>`;
  return s;
}
function field(x, y, w, h, o = {}) {
  return panel(x, y, w, h, Object.assign({ fill: o.fill || P.paperLo, sw: 1.8, strokeOp: 0.5, shadow: false, r: o.r ?? 10 }, o));
}
function btn(x, y, w, h, label, o = {}) {
  const primary = o.primary, fill = primary ? P.ochre : (o.fill || P.paperHi), tcol = primary ? '#3A2A12' : (o.tcol || P.ink);
  const d = roundRect(x, y, w, h, o.r ?? h / 2);
  let s = `<path d="${roundRect(x + 2, y + 4, w, h, o.r ?? h / 2)}" fill="${P.ink}" opacity="0.1" filter="url(#smudge)"/>`;
  s += `<path d="${d}" fill="${fill}"/>`;
  s += `<path d="${d}" fill="none" stroke="${primary ? P.ochreDeep : P.ink}" stroke-width="2.2" opacity="0.8" filter="url(#rghF)"/>`;
  s += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Baloo2" font-weight="${primary ? 700 : 600}" font-size="${o.fs || 19}" fill="${tcol}">${esc(label)}</text>`;
  return s;
}
function chip(x, y, label, o = {}) {
  const w = o.w || (12 + String(label).length * 8.4), h = o.h || 30, col = o.col || P.ink;
  let s = `<path d="${roundRect(x, y, w, h, 7)}" fill="${o.fill || P.paper}"/>`;
  s += `<path d="${roundRect(x, y, w, h, 7)}" fill="none" stroke="${col}" stroke-width="1.7" opacity="0.7" filter="url(#rghF)"/>`;
  if (o.dot) s += `<circle cx="${x + 12}" cy="${y + h / 2}" r="4" fill="${o.dot}"/>`;
  s += `<text x="${x + (o.dot ? 22 : w / 2)}" y="${y + h / 2 + 1}" text-anchor="${o.dot ? 'start' : 'middle'}" dominant-baseline="central" font-family="Figtree" font-weight="600" font-size="${o.fs || 13}" fill="${col}">${esc(label)}</text>`;
  return s;
}
const T = {
  disp: (x, y, t, o = {}) => `<text x="${x}" y="${y}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} font-family="Baloo2" font-weight="${o.w || 700}" font-size="${o.fs || 34}" fill="${o.fill || P.ink}" letter-spacing="${o.ls ?? -0.5}">${esc(t)}</text>`,
  hand: (x, y, t, o = {}) => `<text x="${x}" y="${y}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} font-family="Caveat" font-weight="${o.w || 600}" font-size="${o.fs || 26}" fill="${o.fill || P.inkSoft}">${esc(t)}</text>`,
  ui: (x, y, t, o = {}) => `<text x="${x}" y="${y}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} font-family="Figtree" font-weight="${o.w || 400}" font-size="${o.fs || 15}" fill="${o.fill || P.ink}" opacity="${o.op ?? 1}" letter-spacing="${o.ls ?? 0}">${esc(t)}</text>`,
  mono: (x, y, t, o = {}) => `<text x="${x}" y="${y}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} font-family="SpaceMono" font-weight="${o.w || 700}" font-size="${o.fs || 15}" fill="${o.fill || P.ink}" letter-spacing="${o.ls ?? 0}">${esc(t)}</text>`,
  eyebrow: (x, y, t, o = {}) => `<text x="${x}" y="${y}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} font-family="Figtree" font-weight="700" font-size="${o.fs || 12}" fill="${o.fill || P.inkFaint}" letter-spacing="2.5">${esc(String(t).toUpperCase())}</text>`,
};
function para(x, y, t, o = {}) {
  const max = o.max || 40, lh = o.lh || 22, words = String(t).split(' '); let line = '', lines = [];
  for (const w of words) { if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += ' ' + w; }
  if (line.trim()) lines.push(line.trim());
  return lines.map((ln, i) => T.ui(x, y + i * lh, ln, o)).join('');
}
function topbar(w, o = {}) {
  let s = panel(-20, -20, w + 40, 76, { r: 0, shadow: false, fill: P.paper, strokeOp: 0 });
  s += `<line x1="0" y1="56" x2="${w}" y2="56" stroke="${P.ink}" stroke-width="1.5" opacity="0.25"/>`;
  s += SK.logoH(40, 28, 11, P.ochre, P.slate, P.ink, P.ink);
  s += `<g filter="url(#rghF)">${T.disp(66, 44, 'Hearsay', { fs: 30 })}</g>`;
  if (o.case) s += T.hand(w / 2, 40, o.case, { anchor: 'middle', fs: 24, fill: P.inkSoft });
  if (o.nav) { let nx = w - 30; for (let i = o.nav.length - 1; i >= 0; i--) { const t = o.nav[i], active = i === o.active; const tw = 12 + t.length * 8; nx -= tw + 14; s += active ? chip(nx, 20, t, { col: P.ochreDeep, fill: P.paperHi }) : T.ui(nx + tw / 2, 36, t, { anchor: 'middle', fill: P.inkSoft, w: 600 }); } }
  return s;
}
function speech(x, y, w, h, o = {}) {
  const warm = o.side === 'warm', cool = o.side === 'cool';
  const tint = warm ? P.ochre : cool ? P.slate : P.inkSoft;
  const d = roundRect(x, y, w, h, 16);
  let s = `<path d="${d}" fill="${tint}" opacity="0.09"/>`;
  s += `<path d="${d}" fill="none" stroke="${tint}" stroke-width="2" opacity="0.55" filter="url(#rghF)"/>`;
  if (o.tail) { const tx = o.tail === 'left' ? x + 26 : x + w - 26; s += `<path d="M ${tx - 8} ${y + h} q 4 12 12 18 q -14 -2 -22 -14 Z" fill="${tint}" opacity="0.09"/><path d="M ${tx - 8} ${y + h} q 4 12 12 18" fill="none" stroke="${tint}" stroke-width="2" opacity="0.5" filter="url(#rghF)"/>`; }
  if (o.who) s += `<g>${chip(x + 16, y - 15, o.who, { col: tint, fill: P.paperHi, dot: tint })}</g>`;
  return s;
}
function ribbon(x, y, w, h, entries, o = {}) {
  let s = panel(x, y, w, h, { fill: P.paperHi });
  for (let i = 0; i < 7; i++) s += `<line x1="${x + 12}" y1="${y + 54 + i * ((h - 60) / 7)}" x2="${x + w - 12}" y2="${y + 54 + i * ((h - 60) / 7)}" stroke="${P.parch}" stroke-width="1" opacity="0.6"/>`;
  s += T.eyebrow(x + 16, y + 26, 'court record', { fill: P.inkFaint });
  s += `<circle cx="${x + w - 22}" cy="${y + 22}" r="4" fill="${P.ochre}"/>`;
  let cy = y + 52;
  for (const e of entries) {
    const tint = e.side === 'warm' ? P.ochreDeep : e.side === 'cool' ? P.slateDeep : e.side === 'moved' ? P.moved : P.inkSoft;
    s += `<text x="${x + 16}" y="${cy}" font-family="Caveat" font-weight="700" font-size="15" fill="${tint}">${esc(e.who)}</text>`;
    const lines = wrap(e.text, o.max || 30);
    lines.forEach((ln, i) => { s += `<text x="${x + 16}" y="${cy + 18 + i * 17}" font-family="Caveat" font-weight="500" font-size="16" fill="${P.ink}" opacity="0.9">${esc(ln)}</text>`; });
    cy += 20 + lines.length * 17 + 10;
  }
  return s;
}
function wrap(t, max) { const words = String(t).split(' '); let line = '', lines = []; for (const w of words) { if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) lines.push(line.trim()); return lines; }
function gauge(x, y, rows, o = {}) {
  const w = o.w || 200, h = 30 + rows.length * 30;
  let s = panel(x, y, w, h, { fill: P.paperHi });
  s += T.eyebrow(x + 14, y + 24, o.title || 'proceeding', {});
  rows.forEach((r, i) => {
    s += T.ui(x + 14, y + 48 + i * 28, r[0], { fs: 13, fill: P.inkSoft });
    s += T.mono(x + w - 14, y + 48 + i * 28, r[1], { anchor: 'end', fs: 15, fill: r[2] || P.ink });
  });
  return s;
}
function benchBoard(x, y, verdict, split, o = {}) {
  const s2 = o.s ?? 1;
  let s = `<g transform="translate(${x},${y})">`;
  s += SK.stroke([[30, 78], [26, 128]], { seed: 501, w: 4 * s2, col: P.ink });
  s += SK.stroke([[250, 78], [254, 128]], { seed: 502, w: 4 * s2, col: P.ink });
  s += `<path d="${roundRect(0, 0, 280, 84, 10)}" fill="${P.ink}"/>`;
  s += `<path d="${roundRect(0, 0, 280, 84, 10)}" fill="none" stroke="${P.ochreDeep}" stroke-width="2.5" opacity="0.7"/>`;
  s += `<g transform="translate(24,24)">${SK.splitflap(verdict, { s: 1.35, col: P.ochreHi })}</g>`;
  s += `<g transform="translate(190,24)">${SK.splitflap(split, { s: 1.35, col: P.paperHi })}</g>`;
  s += `</g>`;
  return s;
}
function versusBar(x, y, w, label, court, solo, o = {}) {
  const bw = w, unit = bw / 100;
  let s = T.ui(x, y - 8, label, { fs: 14, fill: P.inkSoft, w: 600 });
  s += `<path d="${roundRect(x, y, Math.max(6, court * unit), 20, 6)}" fill="${P.ochre}" opacity="0.9"/>`;
  s += `<path d="${roundRect(x, y, Math.max(6, court * unit), 20, 6)}" fill="none" stroke="${P.ochreDeep}" stroke-width="1.6" opacity="0.7" filter="url(#rghF)"/>`;
  s += T.mono(x + court * unit + 8, y + 15, o.courtLabel || (court + '%'), { fs: 14, fill: P.ochreDeep });
  s += `<text x="${x + w + 54}" y="${y + 15}" font-family="Caveat" font-size="16" fill="${P.ochreDeep}">court</text>`;
  s += `<path d="${roundRect(x, y + 28, Math.max(6, solo * unit), 20, 6)}" fill="${P.slate}" opacity="0.55"/>`;
  s += `<path d="${roundRect(x, y + 28, Math.max(6, solo * unit), 20, 6)}" fill="none" stroke="${P.slateDeep}" stroke-width="1.6" opacity="0.6" filter="url(#rghF)"/>`;
  s += T.mono(x + solo * unit + 8, y + 43, o.soloLabel || (solo + '%'), { fs: 14, fill: P.slateDeep });
  s += `<text x="${x + w + 54}" y="${y + 43}" font-family="Caveat" font-size="16" fill="${P.slateDeep}">solo AI</text>`;
  return s;
}

export const UI = { esc, roundRect, panel, field, btn, chip, T, para, topbar, speech, ribbon, wrap, gauge, benchBoard, versusBar };
