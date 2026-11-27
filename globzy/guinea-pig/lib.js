// Globzy drawing kit — flat storybook canvas, thick plum ink.
const INK = '#241726', LW = 7;
const C = {
  yel: '#ffe14d', yel2: '#ffd23f', red: '#ff3d4d', pink: '#ff4d6d', sky: '#4dc3ff', grn: '#3ddc84',
  globe: '#35a0ff', land: '#5fd16f', limb: '#ffcf4a', shoe: '#ff6a4d', white: '#ffffff', tongue: '#ff7a9a',
};
const cv = document.getElementById('c'), X = cv.getContext('2d');
const W = 1080, H = 1920;
const TAU = Math.PI * 2;

// ---------- math / easing ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const eo = k => { k = clamp(k); return 1 - Math.pow(1 - k, 3); };
const back = k => { k = clamp(k); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const prog = (t, a, d) => clamp((t - a) / d);
// deterministic hash noise
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- physics ----------
// Damped spring response to a step at t0: returns offset that starts at `amp` and settles to 0.
function spring(t, t0, amp, freq = 3.2, zeta = 0.22) {
  const u = t - t0; if (u < 0) return 0;
  const w = TAU * freq;
  return amp * Math.exp(-zeta * w * u) * Math.cos(w * Math.sqrt(1 - zeta * zeta) * u);
}
// Ball dropped (or thrown up with v0) under gravity g (px/s^2), restitution e.
// Returns {h: height above ground (>=0), v: vertical velocity (px/s, + = up), hit: seconds since last impact, impactV}.
function bounce(t, t0, h0, g = 5200, e = 0.45, v0 = 0) {
  let u = t - t0; if (u < 0) return { h: h0, v: v0, hit: 99, impactV: 0 };
  // first flight: h = h0 + v0 u - g u^2/2  → time to ground
  let tf = (v0 + Math.sqrt(v0 * v0 + 2 * g * h0)) / g;
  let vImp = v0 - g * tf; // negative
  if (u < tf) return { h: h0 + v0 * u - 0.5 * g * u * u, v: v0 - g * u, hit: 99, impactV: 0 };
  u -= tf; let vUp = -vImp * e, sinceHit = u, lastImp = -vImp;
  for (let i = 0; i < 12 && vUp > 60; i++) {
    const fl = 2 * vUp / g;
    if (u < fl) return { h: vUp * u - 0.5 * g * u * u, v: vUp - g * u, hit: u, impactV: lastImp };
    u -= fl; lastImp = vUp; vUp *= e; sinceHit = u;
  }
  return { h: 0, v: 0, hit: sinceHit, impactV: lastImp };
}
// squash/stretch from a bounce state — volume preserving (sx = 1/sqrt(sy)... area: sx*sy = 1)
function squash(b, k = 0.00009, imp = 0.00012) {
  let sy = 1 + clamp(Math.abs(b.v) * k, 0, 0.28);
  if (b.hit < 0.4) sy -= clamp(b.impactV * imp, 0, 0.35) * Math.exp(-b.hit * 12) * Math.cos(b.hit * 28);
  return { sx: 1 / sy, sy };
}
// Parabolic jump between t0..t0+d with height h.
const hop = (t, t0, d, h) => { const u = (t - t0) / d; return u < 0 || u > 1 ? 0 : 4 * h * u * (1 - u); };
// periodic idle hop with real gravity arc
function idleHop(t, period, h, phase = 0) { const u = ((t + phase) % period) / period; const air = 0.55; return u < air ? 4 * h * (u / air) * (1 - u / air) : 0; }

// ---------- primitives ----------
function stroke(lw = LW) { X.lineWidth = lw; X.strokeStyle = INK; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); }
function ell(x, y, rx, ry, fill, lw = LW, rot = 0) { X.beginPath(); X.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); if (fill) { X.fillStyle = fill; X.fill(); } if (lw) stroke(lw); }
function rr(x, y, w, h, r, fill, lw = LW) { X.beginPath(); X.roundRect(x, y, w, h, r); if (fill) { X.fillStyle = fill; X.fill(); } if (lw) stroke(lw); }
function poly(pts, fill, lw = LW, close = true) { X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); if (close) X.closePath(); if (fill) { X.fillStyle = fill; X.fill(); } if (lw) stroke(lw); }
function line(x1, y1, x2, y2, col = INK, lw = LW) { X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.lineWidth = lw; X.strokeStyle = col; X.lineCap = 'round'; X.stroke(); }
// limb: ink line + thinner coloured line on top
function limb(pts, col, w = 16) {
  for (const [c, lw] of [[INK, w + 12], [col, w]]) { X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.lineWidth = lw; X.strokeStyle = c; X.lineCap = 'round'; X.lineJoin = 'round'; X.stroke(); }
}
function txt(s, x, y, size, fill = '#fff', lw = 14, align = 'center', rot = 0) {
  X.save(); X.translate(x, y); X.rotate(rot);
  X.font = `900 ${size}px "Arial Black","DejaVu Sans",sans-serif`; X.textAlign = align; X.textBaseline = 'middle';
  X.lineJoin = 'round'; X.lineWidth = lw; X.strokeStyle = INK; X.strokeText(s, 0, 0); X.fillStyle = fill; X.fillText(s, 0, 0); X.restore();
}
function pop(x, y, k, fn) { if (k <= 0) return; X.save(); X.translate(x, y); const s = back(k); X.scale(s, s); fn(); X.restore(); }
function star(x, y, r, fill = C.yel, rot = 0, lw = 5) { const p = []; for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr_ = i % 2 ? r * .45 : r; p.push([x + Math.cos(a) * rr_, y + Math.sin(a) * rr_]); } poly(p, fill, lw); }
function cloud(x, y, s, fill = '#fff') { X.save(); X.translate(x, y); X.scale(s, s); X.beginPath(); X.arc(-60, 10, 45, 0, TAU); X.arc(0, -15, 60, 0, TAU); X.arc(60, 8, 45, 0, TAU); X.rect(-60, 10, 120, 45); X.fillStyle = INK; X.save(); X.lineWidth = LW * 2 / s; X.strokeStyle = INK; X.stroke(); X.restore(); X.fillStyle = fill; X.fill(); X.restore(); }
function burst(x, y, r, k, col = C.yel, n = 12) { if (k <= 0 || k >= 1) return; const a0 = eo(k); X.save(); X.globalAlpha = 1 - k; for (let i = 0; i < n; i++) { const a = i / n * TAU; line(x + Math.cos(a) * r * a0 * .5, y + Math.sin(a) * r * a0 * .5, x + Math.cos(a) * r * a0, y + Math.sin(a) * r * a0, col, 12); } X.restore(); }
function ringFx(x, y, r, k, col = '#fff') { if (k <= 0 || k >= 1) return; X.save(); X.globalAlpha = 1 - k; X.beginPath(); X.arc(x, y, r * eo(k), 0, TAU); X.lineWidth = 14 * (1 - k) + 2; X.strokeStyle = col; X.stroke(); X.restore(); }
function rays(x, y, t, col = 'rgba(255,255,255,.18)', n = 14, r = 2400) { X.save(); X.translate(x, y); X.rotate(t * .15); X.fillStyle = col; for (let i = 0; i < n; i++) { const a = i / n * TAU; X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, r, a, a + Math.PI / n); X.closePath(); X.fill(); } X.restore(); }
function puff(x, y, k, s = 1) { if (k <= 0 || k >= 1) return; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3, d = 40 + 90 * eo(k); X.save(); X.globalAlpha = 1 - k; ell(x + Math.cos(a) * d * s, y + Math.sin(a) * d * .5 * s - 30 * k, 34 * s * (1 - k * .5), 30 * s * (1 - k * .5), '#fff', 5); X.restore(); } }
function confetti(t, t0, n = 40, seed = 1) { const u = t - t0; if (u < 0 || u > 3) return; const cols = [C.yel, C.pink, C.sky, C.grn, C.red]; for (let i = 0; i < n; i++) { const vx = (hash(i + seed) - .5) * 1400, vy = -900 - hash(i * 3 + seed) * 900; const x = 540 + vx * u, y = 900 + vy * u + 0.5 * 2400 * u * u; X.save(); X.translate(x, y); X.rotate(u * 8 + i); X.fillStyle = cols[i % 5]; X.fillRect(-10, -16, 20, 32); X.lineWidth = 3; X.strokeStyle = INK; X.strokeRect(-10, -16, 20, 32); X.restore(); } }
function bubble(x, y, w, h, tx, ty, fill = '#fff') { X.beginPath(); X.roundRect(x - w / 2, y - h / 2, w, h, 40); X.moveTo(x - 40, y + h / 2 - 2); X.lineTo(tx, ty); X.lineTo(x + 30, y + h / 2 - 2); X.fillStyle = fill; X.fill(); stroke(); X.fillStyle = fill; X.fillRect(x - 36, y + h / 2 - 12, 62, 12); }
function stamp(word, x, y, k, col = C.red, size = 150, rot = -0.18) {
  if (k <= 0) return; const s = k < 1 ? lerp(2.6, 1, eo(k)) : 1; X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s); X.globalAlpha = clamp(k * 3);
  X.font = `900 ${size}px "Arial Black","DejaVu Sans",sans-serif`; const w = X.measureText(word).width + 80, h = size * 1.25;
  X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, 22); X.fillStyle = '#fff'; X.fill(); X.lineWidth = 16; X.strokeStyle = col; X.stroke(); X.lineWidth = 6; X.strokeStyle = INK; X.beginPath(); X.roundRect(-w / 2 - 9, -h / 2 - 9, w + 18, h + 18, 28); X.stroke();
  X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = col; X.fillText(word, 0, 6); X.lineWidth = 5; X.strokeStyle = INK; X.strokeText(word, 0, 6); X.restore();
}
function siren(x, y, t, s = 1) { X.save(); X.translate(x, y); X.scale(s, s); const on = Math.floor(t * 6) % 2; if (on) { X.save(); X.globalAlpha = .35; X.fillStyle = C.red; X.beginPath(); X.moveTo(0, -40); X.arc(0, -40, 260, -Math.PI * .95 + Math.sin(t * 9) * .3, -Math.PI * .65 + Math.sin(t * 9) * .3); X.fill(); X.restore(); } rr(-70, 10, 140, 34, 10, '#7a7a8c'); X.beginPath(); X.moveTo(-55, 12); X.lineTo(-55, -40); X.arc(0, -40, 55, Math.PI, 0); X.lineTo(55, 12); X.closePath(); X.fillStyle = on ? '#ff5a66' : '#c8202e'; X.fill(); stroke(); ell(-20, -45, 12, 20, 'rgba(255,255,255,.7)', 0); X.restore(); }
function heart(x, y, s, fill = C.pink) { X.save(); X.translate(x, y); X.scale(s, s); X.beginPath(); X.moveTo(0, 30); X.bezierCurveTo(-60, -10, -40, -60, 0, -30); X.bezierCurveTo(40, -60, 60, -10, 0, 30); X.fillStyle = fill; X.fill(); X.lineWidth = LW / s; X.strokeStyle = INK; X.lineJoin = 'round'; X.stroke(); X.restore(); }
function qmark(x, y, s, rot = 0, fill = C.yel) { txt('?', x, y, 130 * s, fill, 14, 'center', rot); }
function calendar(x, y, s, top, big, k = 1) { X.save(); X.translate(x, y); X.scale(s, s); rr(-120, -110, 240, 230, 26, '#fff'); X.save(); X.beginPath(); X.roundRect(-120, -110, 240, 70, [26, 26, 0, 0]); X.fillStyle = C.red; X.fill(); stroke(); X.restore(); txt(top, 0, -75, 40, '#fff', 8); txt(big, 0, 40, 92, C.yel, 12); line(-60, -125, -60, -95, INK, 12); line(60, -125, 60, -95, INK, 12); X.restore(); }
function sweat(x, y, s = 1) { X.save(); X.translate(x, y); X.scale(s, s); X.beginPath(); X.moveTo(0, -26); X.quadraticCurveTo(18, 4, 0, 14); X.quadraticCurveTo(-18, 4, 0, -26); X.fillStyle = '#7fd4ff'; X.fill(); stroke(4); X.restore(); }

// ---------- faces ----------
function blinkK(t, ph = 0) { const u = (t + ph) % 2.3; return u < 0.12 ? Math.abs(Math.cos(u / 0.12 * Math.PI)) * .9 + .1 : 1; }
function eyes(x, y, sp, r, t, o = {}) {
  const ph = o.ph || 0, b = o.closed ? 0.12 : blinkK(t, ph);
  for (const s of [-1, 1]) {
    const ex = x + s * sp;
    if (o.star) { star(ex, y, r * 1.5, C.yel, t * 2, 4); continue; }
    if (o.dizzy) { X.save(); X.beginPath(); for (let a = 0; a < 14; a += .3) { const rr_ = a * r * .09; X.lineTo(ex + Math.cos(a + t * 8 * s) * rr_, y + Math.sin(a + t * 8 * s) * rr_); } X.lineWidth = 5; X.strokeStyle = INK; X.stroke(); X.restore(); continue; }
    if (o.big) { ell(ex, y, r * 1.6, r * 1.9 * b, '#fff', 5); ell(ex + (o.lx || 0) * r * .4, y + (o.ly || 0) * r * .4, r * .55, r * .65 * b, INK, 0); continue; }
    ell(ex + (o.lx || 0) * r * .3, y + (o.ly || 0) * r * .3, r * .62, r * b, INK, 0);
  }
  if (o.brow) {
    for (const s of [-1, 1]) { const bx = x + s * sp, by = y - r * 1.9; const tilt = o.brow === 'mad' ? s * .35 : o.brow === 'sad' ? -s * .35 : 0; const lift = o.brow === 'up' ? -r * .6 : 0; X.save(); X.translate(bx, by + lift); X.rotate(tilt); line(-r * .9, 0, r * .9, 0, INK, 6); X.restore(); }
  }
}
function mouth(x, y, w, type, t = 0) {
  X.save(); X.lineWidth = 6; X.strokeStyle = INK; X.lineCap = 'round';
  if (type === 'smile') { X.beginPath(); X.arc(x, y - w * .35, w * .6, .2 * Math.PI, .8 * Math.PI); X.stroke(); }
  else if (type === 'sad') { X.beginPath(); X.arc(x, y + w * .45, w * .5, 1.2 * Math.PI, 1.8 * Math.PI); X.stroke(); }
  else if (type === 'flat') line(x - w * .35, y, x + w * .35, y, INK, 6);
  else if (type === 'wavy') { X.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; X.lineTo(x - w * .4 + u * w * .8, y + Math.sin(u * TAU * 2 + t * 10) * w * .06); } X.stroke(); }
  else if (type === 'o') ell(x, y, w * .18, w * .24, INK, 0);
  else if (type === 'open' || typeof type === 'number') {
    const k = typeof type === 'number' ? type : 1; const h = w * (.12 + .38 * k);
    X.beginPath(); X.moveTo(x - w * .4, y - h * .2); X.quadraticCurveTo(x, y - h * .35, x + w * .4, y - h * .2); X.quadraticCurveTo(x, y + h * 1.4, x - w * .4, y - h * .2); X.fillStyle = '#5a1f2e'; X.fill();
    X.save(); X.clip(); ell(x, y + h * .9, w * .25, h * .5, C.tongue, 0); X.restore(); X.stroke();
  }
  X.restore();
}

// ---------- Globzy ----------
// Simplified continents [lon, lat]
const CONT = [
  [[-165, 65], [-140, 70], [-95, 72], [-75, 62], [-55, 50], [-80, 30], [-82, 9], [-100, 18], [-118, 32], [-125, 48], [-150, 58]], // N America
  [[-80, 8], [-60, 10], [-35, -7], [-40, -22], [-58, -38], [-70, -55], [-75, -40], [-72, -15], [-80, -2]], // S America
  [[-10, 36], [-9, 44], [-2, 49], [5, 54], [10, 58], [25, 70], [40, 66], [45, 55], [40, 42], [28, 40], [18, 40], [12, 44], [5, 43]], // Europe
  [[-17, 21], [-10, 35], [10, 37], [33, 31], [43, 12], [51, 11], [40, -15], [32, -30], [20, -35], [12, -18], [9, 2], [-8, 5]], // Africa
  [[45, 55], [60, 70], [100, 76], [140, 72], [175, 66], [160, 58], [140, 45], [122, 30], [108, 20], [100, 8], [80, 8], [72, 22], [58, 25], [48, 30], [40, 42]], // Asia
  [[113, -22], [130, -12], [142, -11], [153, -27], [146, -39], [130, -32], [115, -34]], // Australia
  [[-50, 60], [-25, 70], [-20, 82], [-60, 82], [-72, 77]], // Greenland
];
const SWISS = [8.2, 46.8];
function proj(lon, lat, rot, tilt, R) {
  const L = (lon - rot) * Math.PI / 180, P = lat * Math.PI / 180, T = tilt * Math.PI / 180;
  const x = Math.cos(P) * Math.sin(L), y0 = Math.sin(P), z0 = Math.cos(P) * Math.cos(L);
  const y = y0 * Math.cos(T) - z0 * Math.sin(T), z = y0 * Math.sin(T) + z0 * Math.cos(T);
  return { x: x * R, y: -y * R, z };
}
// o: {rot, tilt, talk(0..1), mood, look:[lx,ly], arms:{l:[x,y],r:[x,y]} relative, legs:bool, sx, sy, pin(0..1), eyesO}
function globzy(x, y, R, t, o = {}) {
  const rot = o.rot ?? 0, tilt = o.tilt ?? 20, sx = o.sx || 1, sy = o.sy || 1;
  X.save(); X.translate(x, y);
  // legs (behind body)
  if (o.legs !== false) {
    const wk = o.walk ? Math.sin(t * 10) * 30 : 0, lg = o.legLift || 0;
    for (const s of [-1, 1]) { const fx = s * R * .38 + s * wk * .4 * (s > 0 ? 1 : -1), fy = R * 1.0 * sy + R * .42 - (s > 0 ? lg : 0); limb([[s * R * .3, R * .8 * sy], [fx, fy]], C.limb, 18); ell(fx + s * 16, fy + 8, 38, 22, C.shoe, 6); }
  }
  // arms
  const al = o.armL || [-R * 1.45, R * .15], ar = o.armR || [R * 1.45, R * .15];
  limb([[-R * .85 * sx, R * .2], [(-R * 1.15 + al[0]) / 2 * sx, (R * .35 + al[1]) / 2 + 12], [al[0] * sx, al[1]]], C.limb, 18); ell(al[0] * sx, al[1], 20, 20, INK, 0);
  limb([[R * .85 * sx, R * .2], [(R * 1.15 + ar[0]) / 2 * sx, (R * .35 + ar[1]) / 2 + 12], [ar[0] * sx, ar[1]]], C.limb, 18); ell(ar[0] * sx, ar[1], 20, 20, INK, 0);
  X.scale(sx, sy);
  // sphere
  X.beginPath(); X.arc(0, 0, R, 0, TAU); X.fillStyle = C.globe; X.fill();
  X.save(); X.clip();
  for (const poly_ of CONT) {
    const pts = poly_.map(([lo, la]) => proj(lo, la, rot, tilt, R)); if (pts.every(p => p.z < 0)) continue;
    X.beginPath(); pts.forEach((p, i) => { let px = p.x, py = p.y; if (p.z < 0) { const m = Math.hypot(px, py) || 1; px = px / m * R * 1.02; py = py / m * R * 1.02; } i ? X.lineTo(px, py) : X.moveTo(px, py); }); X.closePath(); X.fillStyle = C.land; X.fill(); X.lineWidth = 4.5; X.strokeStyle = INK; X.lineJoin = 'round'; X.stroke();
  }
  // shading
  const g = X.createRadialGradient(-R * .4, -R * .45, R * .05, -R * .2, -R * .2, R * 1.15); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(.85, 'rgba(10,20,80,0)'); g.addColorStop(1, 'rgba(10,20,80,.35)'); X.fillStyle = g; X.fillRect(-R, -R, 2 * R, 2 * R);
  X.restore();
  X.beginPath(); X.arc(0, 0, R, 0, TAU); stroke(LW + 1);
  // pin on Switzerland
  if (o.pin > 0) { const p = proj(SWISS[0], SWISS[1], rot, tilt, R); if (p.z > 0) pin(p.x, p.y, o.pin, R / 330); }
  // face (fixed on front)
  const lk = o.look || [0, 0]; const fy = R * .02;
  eyes(0, fy - R * .12, R * .3, R * .14, t, Object.assign({ big: true, lx: lk[0], ly: lk[1], brow: o.brow }, o.eyesO || {}));
  const talk = o.talk ?? 0;
  if (o.mood === 'sad') mouth(0, fy + R * .38, R * .5, 'sad'); else if (o.mood === 'o') mouth(0, fy + R * .36, R * .5, 'o'); else mouth(0, fy + R * .3, R * .55, talk > 0.02 ? talk : (o.mood === 'flat' ? 'flat' : 'smile'));
  X.restore();
}
function pin(x, y, k, s = 1) { if (k <= 0) return; const dy = (1 - eo(k)) * -260; X.save(); X.translate(x, y + dy * s); X.scale(s * back(k), s * back(k)); X.beginPath(); X.moveTo(0, 0); X.bezierCurveTo(-46, -60, -46, -110, 0, -110); X.bezierCurveTo(46, -110, 46, -60, 0, 0); X.fillStyle = C.red; X.fill(); stroke(6); ell(0, -75, 16, 16, '#fff', 5); X.restore(); }

// ---------- Guinea pig ----------
// o: {c1 body colour, c2 patch, face:'smile'|'sad'|'o'|'flat'|'open', eyesO, dir(1 right/-1 left), sx, sy, halo, chew}
function gpig(x, y, s, t, o = {}) {
  const dir = o.dir || 1, c1 = o.c1 || '#e0913c', c2 = o.c2 || '#fff6e6', sx = (o.sx || 1), sy = (o.sy || 1);
  X.save(); X.translate(x, y); X.scale(s * dir * sx, s * sy);
  const br = 1 + Math.sin(t * 5 + (o.ph || 0)) * .025; // breathing
  // feet
  for (const fx of [-55, -25, 40, 70]) ell(fx, 52, 16, 10, '#f3a3a3', 5);
  // body
  X.save(); X.scale(br, 1 / br);
  X.beginPath(); X.ellipse(0, 0, 110, 68, 0, 0, TAU); X.fillStyle = c1; X.fill();
  X.save(); X.clip(); ell(80, 5, 70, 80, c2, 0); ell(-60, -40, 40, 30, o.c3 || '#7a4a24', 0); X.restore();
  X.beginPath(); X.ellipse(0, 0, 110, 68, 0, 0, TAU); stroke();
  X.restore();
  // ear (jiggles with spring offset)
  const ej = o.ear || 0;
  X.save(); X.translate(50, -55); X.rotate(-.3 + ej); ell(0, -8, 22, 16, '#f2a9a0', 5); X.restore();
  // face — un-flip text-like elements are symmetric so dir flip is fine
  const eo_ = Object.assign({}, o.eyesO || {});
  if (eo_.big) { ell(70, -18, 17, 20, '#fff', 5); ell(72 + (eo_.lx || 0) * 5, -16, 8, 10, INK, 0); }
  else if (eo_.star) star(70, -18, 22, C.yel, t * 2, 4);
  else if (eo_.dizzy) { X.beginPath(); for (let a = 0; a < 12; a += .3) X.lineTo(70 + Math.cos(a + t * 9) * a * 1.4, -18 + Math.sin(a + t * 9) * a * 1.4); X.lineWidth = 4; X.strokeStyle = INK; X.stroke(); }
  else if (eo_.closed) { X.beginPath(); X.arc(70, -20, 10, 0.1 * Math.PI, .9 * Math.PI); X.lineWidth = 5; X.strokeStyle = INK; X.stroke(); }
  else ell(70, -18, 9, 12 * blinkK(t, o.ph || 0), INK, 0);
  if (o.brow === 'sad') { X.save(); X.translate(66, -40); X.rotate(.4); line(-12, 0, 12, 0, INK, 5); X.restore(); }
  if (o.brow === 'mad') { X.save(); X.translate(66, -40); X.rotate(-.4); line(-12, 0, 12, 0, INK, 5); X.restore(); }
  // nose & mouth
  const ch = o.chew ? Math.sin(t * 22) * 2 : 0;
  ell(104, 2 + ch, 9, 7, '#ff8fa3', 4);
  const f = o.face || 'smile';
  if (f === 'smile') { X.beginPath(); X.arc(96, 12 + ch, 8, .1 * Math.PI, .9 * Math.PI); X.lineWidth = 4; X.strokeStyle = INK; X.stroke(); }
  else if (f === 'sad') { X.beginPath(); X.arc(96, 24, 7, 1.15 * Math.PI, 1.85 * Math.PI); X.lineWidth = 4; X.strokeStyle = INK; X.stroke(); }
  else if (f === 'o') ell(96, 20, 6, 8, INK, 0);
  else if (f === 'open') { X.beginPath(); X.arc(94, 14, 11, 0, Math.PI); X.closePath(); X.fillStyle = '#5a1f2e'; X.fill(); X.lineWidth = 4; X.strokeStyle = INK; X.stroke(); }
  // whiskers
  X.lineWidth = 2.5; X.strokeStyle = INK; for (const a of [-.15, .1]) { X.beginPath(); X.moveTo(108, 6); X.lineTo(140, 6 + a * 60); X.stroke(); }
  if (o.halo) { X.save(); X.globalAlpha = .95; X.beginPath(); X.ellipse(30, -98 + Math.sin(t * 4) * 4, 40, 12, 0, 0, TAU); X.lineWidth = 12; X.strokeStyle = C.yel; X.stroke(); X.lineWidth = 3; X.strokeStyle = INK; X.stroke(); X.restore(); }
  if (o.wings) { const fl = Math.sin(t * 16) * .35; for (const s2 of [-1]) { X.save(); X.translate(-10, -50); X.rotate(-.5 + fl); X.beginPath(); X.ellipse(-30, -30, 50, 26, -.6, 0, TAU); X.fillStyle = '#fff'; X.fill(); stroke(5); X.restore(); } }
  X.restore();
}

// ---------- People ----------
// o: {skin, shirt, pants, hair, face, brow, eyesO, armL:[x,y], armR:[x,y] (relative to shoulders), walk(bool), hold}
function person(x, y, HH, t, o = {}) {
  // y = feet position. Body ≈3 head heights.
  const skin = o.skin || '#f4c19a', shirt = o.shirt || C.sky, pants = o.pants || '#3b4a8f';
  const bob = o.walk ? Math.abs(Math.sin(t * 9)) * HH * .05 : Math.sin(t * 3 + (o.ph || 0)) * HH * .012;
  const sw = o.walk ? Math.sin(t * 9) * .5 : 0;
  X.save(); X.translate(x, y - bob);
  const hip = -HH * 1.2, sh = -HH * 2.35, hy = -HH * 3.0;
  // legs
  for (const s of [-1, 1]) { const a = s * sw; const fx = s * HH * .18 + Math.sin(a) * HH * 1.1, fy = -Math.cos(a) * HH * .05; limb([[s * HH * .16, hip], [fx, fy - 10]], pants, 22); ell(fx + HH * .1, fy - 4, HH * .2, HH * .1, '#3a2a30', 5); }
  // torso
  rr(-HH * .42, sh - HH * .05, HH * .84, HH * 1.3, HH * .25, shirt);
  // arms
  const aL = o.armL || [-HH * .55 - Math.sin(sw) * HH * .3, HH * .95], aR = o.armR || [HH * .55 + Math.sin(sw) * HH * .3, HH * .95];
  for (const [s, a] of [[-1, aL], [1, aR]]) { limb([[s * HH * .36, sh + HH * .15], [s * HH * .36 + a[0] * .55, sh + HH * .15 + a[1] * .5 + HH * .08], [s * HH * .36 + a[0], sh + HH * .15 + a[1]]], shirt, 18); ell(s * HH * .36 + a[0], sh + HH * .15 + a[1], 13, 13, INK, 0); }
  // head (bean)
  ell(0, hy, HH * .53, HH * .5, skin);
  if (o.hair) { X.save(); X.beginPath(); X.ellipse(0, hy, HH * .53, HH * .5, 0, Math.PI * 1.02, Math.PI * 1.98); X.closePath(); X.fillStyle = o.hair; X.fill(); stroke(5); X.restore(); }
  eyes(0, hy + HH * .04, HH * .18, HH * .08, t, Object.assign({ ph: o.ph || 0, brow: o.brow }, o.eyesO || {}));
  mouth(0, hy + HH * .26, HH * .34, o.face || 'smile', t);
  if (o.sweat) sweat(HH * .5, hy - HH * .25, .9);
  X.restore();
  return { hand: (s) => [x + s * HH * .36 + (s < 0 ? aL : aR)[0], y - bob + sh + HH * .15 + (s < 0 ? aL : aR)[1]] };
}

// ---------- backgrounds ----------
function sky(top, bot) { const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); X.fillStyle = g; X.fillRect(-200, -200, W + 400, H + 400); }
function space(t) { sky('#1b1240', '#3b2a7a'); rays(540, 800, t, 'rgba(255,255,255,.05)'); for (let i = 0; i < 70; i++) { const x = hash(i) * 1300 - 110, y = hash(i + 50) * 2100 - 90, tw = .5 + .5 * Math.sin(t * 3 + i); X.globalAlpha = .4 + .6 * tw; if (i % 7 === 0) star(x, y, 10 + 6 * tw, '#fff6b0', 0, 3); else ell(x, y, 3 + 2 * tw, 3 + 2 * tw, '#fff', 0); X.globalAlpha = 1; } }
function alps(t, snow = true, base = 1250) {
  sky('#6fd0ff', '#d9f6ff');
  for (let i = 0; i < 3; i++) cloud(((hash(i) * 1400 + t * (18 + i * 8)) % 1500) - 200, 260 + i * 150, .8 + hash(i + 9) * .5);
  const mts = [[-100, 900, '#9db7e8'], [250, 760, '#8aa6dd'], [620, 820, '#9db7e8'], [980, 700, '#8aa6dd']];
  for (const [mx, peak, col] of mts) { poly([[mx - 420, base], [mx, peak], [mx + 420, base]], col); if (snow) poly([[mx - 120, peak + (base - peak) * .28], [mx, peak], [mx + 120, peak + (base - peak) * .28], [mx + 50, peak + (base - peak) * .22], [mx, peak + (base - peak) * .3], [mx - 50, peak + (base - peak) * .22]], '#fff', 5); }
  X.beginPath(); X.moveTo(-200, base - 40); for (let x = -200; x <= W + 200; x += 60) X.lineTo(x, base - 40 + Math.sin(x * .01) * 30); X.lineTo(W + 200, H + 200); X.lineTo(-200, H + 200); X.closePath(); X.fillStyle = '#62d36f'; X.fill(); stroke();
}
function room(wall = '#ffe9c2', wall2 = '#ffd79a', floorY = 1400, floor = '#c98b55') { sky(wall, wall2); X.fillStyle = 'rgba(255,255,255,.25)'; for (let x = -40; x < W + 80; x += 120) X.fillRect(x, 0, 50, floorY); rr(-100, floorY, W + 200, H, 0, floor); line(-100, floorY, W + 100, floorY, INK, LW); }
function swissFlag(x, y, s, t) { X.save(); X.translate(x, y); X.scale(s, s); line(0, 0, 0, 260, INK, 16); line(0, 0, 0, 260, '#b7b7c8', 8); X.beginPath(); for (let i = 0; i <= 10; i++) { const u = i / 10; X.lineTo(u * 160, Math.sin(u * 5 - t * 6) * 8 * u); } for (let i = 10; i >= 0; i--) { const u = i / 10; X.lineTo(u * 160, 140 + Math.sin(u * 5 - t * 6) * 8 * u); } X.closePath(); X.fillStyle = C.red; X.fill(); stroke(6); X.fillStyle = '#fff'; X.fillRect(65, 30, 30, 80); X.fillRect(40, 55, 80, 30); X.restore(); }
function cage(x, y, w, h, t) { rr(x - w / 2, y - h, w, h, 30, 'rgba(255,255,255,.0)', 0); X.save(); for (let i = 0; i <= 10; i++) line(x - w / 2 + i * w / 10, y - h + 20, x - w / 2 + i * w / 10, y, '#8b8fa8', 6); X.restore(); rr(x - w / 2, y - 30, w, 50, 14, '#4dc3ff'); X.beginPath(); X.roundRect(x - w / 2, y - h, w, h + 20, 30); stroke(); line(x - w / 2, y - h + 30, x + w / 2, y - h + 30, INK, 8); }
