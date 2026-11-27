// Props for the Sweden-name short. Needs lib.js loaded first (shares its globals).
const BLUE = '#1f6fd1', SYEL = '#ffd23f';

function swedenFlag(x, y, s, t) {
  X.save(); X.translate(x - 90 * s, y - 130 * s); X.scale(s, s);
  const wv = u => Math.sin(u * 5 - t * 6) * 8 * u, F = 180, Hh = 140;
  line(0, 0, 0, 260, INK, 16); line(0, 0, 0, 260, '#b7b7c8', 8); ell(0, -4, 12, 12, SYEL, 5);
  const strip = (u0, u1, y0, y1) => { const p = []; for (let i = 0; i <= 6; i++) { const u = u0 + (u1 - u0) * i / 6; p.push([u * F, y0 + wv(u)]); } for (let i = 6; i >= 0; i--) { const u = u0 + (u1 - u0) * i / 6; p.push([u * F, y1 + wv(u)]); } return p; };
  poly(strip(0, 1, 0, Hh), BLUE, 6);
  poly(strip(0, 1, 55, 85), SYEL, 0); poly(strip(.27, .42, 0, Hh), SYEL, 0);
  poly(strip(0, 1, 0, Hh), null, 6);
  X.restore();
}

function meatballs(x, y, s, t) {
  X.save(); X.translate(x, y); X.scale(s, s);
  ell(0, 40, 130, 52, '#fff'); ell(0, 36, 96, 34, '#e8f2ff', 4);
  const pos = [[-60, 20, 34], [0, 12, 36], [62, 22, 34], [-28, 46, 32], [34, 48, 32]];
  for (const [mx, my, r] of pos) { ell(mx, my - 10, r, r, '#9a5a30'); ell(mx - r * .35, my - 10 - r * .35, r * .22, r * .16, '#c88455', 0, -.6); }
  for (const [dx, dy] of [[-98, 40], [-92, 56], [90, 44], [100, 58], [4, 66]]) ell(dx, dy, 8, 8, C.red, 4);
  for (let k = 0; k < 3; k++) { X.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; X.lineTo(-40 + k * 40 + Math.sin(u * 6 + t * 4 + k) * 10, -40 - u * 80); } X.lineWidth = 12; X.strokeStyle = INK; X.lineCap = 'round'; X.stroke(); X.lineWidth = 5; X.strokeStyle = '#fff'; X.stroke(); }
  X.restore();
}

function snowman(x, y, s, t) {
  X.save(); X.translate(x, y); X.scale(s, s);
  const tw = [[[-60, -150], [-150, -205], [-150, -205]], [[60, -150], [150, -200], [150, -200]]];
  for (const [a, b] of tw) { limb([a, b], '#7a4a24', 8); limb([[b[0] * .85 + a[0] * .15, b[1] * .85 + a[1] * .15], [b[0] * 1.1, b[1] - 25]], '#7a4a24', 6); }
  ell(0, -90, 95, 90, '#fff'); ell(0, -215, 65, 62, '#fff');
  rr(-52, -168, 104, 24, 12, C.red); rr(26, -150, 24, 50, 8, C.red);
  for (const by of [-120, -75]) ell(0, by, 9, 9, INK, 0);
  const b = blinkK(t, .7);
  for (const sx of [-1, 1]) ell(sx * 24, -228, 8, 9 * b, INK, 0);
  poly([[-4, -214], [62, -204], [-4, -192]], '#ff8a2b', 6);
  for (let i = 0; i < 5; i++) { const a = .25 * Math.PI + i * .13 * Math.PI; ell(Math.cos(a) * 26, -190 + Math.sin(a) * 6 + (i - 2) * (i - 2) * 1.2, 4, 4, INK, 0); }
  ell(-42, -205, 11, 7, 'rgba(255,90,110,.45)', 0); ell(42, -205, 11, 7, 'rgba(255,90,110,.45)', 0);
  X.restore();
}

function snowfall(t, n = 40, seed = 1) {
  X.save();
  for (let i = 0; i < n; i++) {
    const r = 5 + hash(i * 5 + seed) * 8, sp = 70 + hash(i + seed * 3) * 90 + r * 6;
    const px = hash(i * 3 + seed * 7) * 1200 - 60 + Math.sin(t * .8 + i * 1.7) * 30;
    const py = ((hash(i * 7 + seed * 13) * 2100 + t * sp) % 2100) - 90;
    ell(px, py, r, r, '#fff', 3);
  }
  X.restore();
}

function officeBuilding(x, y, s, t, label) {
  X.save(); X.translate(x, y); X.scale(s, s);
  rr(-300, -460, 600, 460, 10, '#d8c9a8');
  poly([[-330, -460], [0, -580], [330, -460]], '#b8a888');
  rr(-300, -450, 600, 90, 8, '#2f4f8f');
  const lab = label || 'SKATTEVERKET'; X.font = '900 100px "Arial Black","DejaVu Sans",sans-serif';
  const fs = Math.min(64, 100 * 540 / X.measureText(lab).width); txt(lab, 0, -405, fs, '#fff', 10);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { if (c === 1 || c === 2) { if (r === 1) continue; } const wx = -255 + c * 135, wy = -330 + r * 130, lit = (Math.floor(t * .7 + c * 3 + r) % 5) === 0; rr(wx, wy, 90, 100, 8, lit ? '#ffe98a' : '#9fd8ff'); line(wx + 45, wy, wx + 45, wy + 100, INK, 5); line(wx, wy + 50, wx + 90, wy + 50, INK, 5); }
  rr(-65, -170, 130, 170, [60, 60, 0, 0], '#7a4a24'); line(0, -170, 0, 0, INK, 5); ell(-18, -85, 8, 8, SYEL, 4); ell(18, -85, 8, 8, SYEL, 4);
  rr(-85, -10, 170, 14, 4, '#9a9aa8'); rr(-320, -6, 640, 18, 6, '#8a8a98');
  X.restore();
}

function clerk(x, y, HH, t, o = {}) {
  person(x, y, HH, t, Object.assign({ shirt: '#7b8196', pants: '#5d6277', face: 'flat', brow: 'mad', hair: '#4a3a3a' }, o));
  const bob = o.walk ? Math.abs(Math.sin(t * 9)) * HH * .05 : Math.sin(t * 3 + (o.ph || 0)) * HH * .012, hy = -HH * 3.0;
  X.save(); X.translate(x, y - bob);
  poly([[-.2, -2.4], [0, -2.05], [.2, -2.4]].map(p => [p[0] * HH, p[1] * HH]), '#fff', 5);
  poly([[-.07, -2.2], [.07, -2.2], [.12, -1.5], [0, -1.35], [-.12, -1.5]].map(p => [p[0] * HH, p[1] * HH]), C.red, 5);
  ell(0, -2.2 * HH, HH * .07, HH * .06, '#d62a3a', 4);
  const ey = hy + HH * .04, gr = HH * .15;
  line(-HH * .18 + gr, ey, HH * .18 - gr, ey, INK, 5);
  for (const sg of [-1, 1]) ell(sg * HH * .18, ey, gr, gr, 'rgba(200,235,255,.35)', 5);
  X.restore();
}

function magnifier(x, y, s, rot, t) {
  X.save(); X.translate(x, y); X.rotate(rot); const k = s * (1 + Math.sin(t * 3) * .02); X.scale(k, k);
  limb([[0, 30], [0, 100]], '#7a4a24', 22);
  rr(-16, 28, 32, 16, 6, '#9a9aa8');
  ell(0, -40, 70, 70, 'rgba(160,225,255,.55)', 14);
  X.beginPath(); X.arc(0, -40, 70, 0, TAU); X.lineWidth = 6; X.strokeStyle = '#c8c8d8'; X.stroke();
  X.beginPath(); X.arc(0, -40, 70, 0, TAU); X.lineWidth = 3; X.strokeStyle = INK; X.stroke();
  X.beginPath(); X.arc(0, -40, 48, Math.PI * 1.05, Math.PI * 1.45); X.lineWidth = 12; X.lineCap = 'round'; X.strokeStyle = '#fff'; X.stroke();
  ell(-34, -8, 6, 6, '#fff', 0);
  X.restore();
}

function envelope(x, y, s, rot, label) {
  X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s);
  rr(-120, -80, 240, 160, 12, '#fff');
  line(-118, 76, -30, 0, '#b8b8c8', 4); line(118, 76, 30, 0, '#b8b8c8', 4);
  poly([[-120, -78], [0, 18], [120, -78]], '#f0f0f8', 6);
  heart(0, 12, .62, C.red);
  if (label) txt(label, 0, 52, 30, INK, 1);
  X.restore();
}

function paperSheet(x, y, w, h, rot) {
  X.save(); X.translate(x, y); X.rotate(rot || 0);
  rr(-w / 2, -h / 2, w, h, 8, '#fff');
  rr(-w / 2 + w * .08, -h / 2 + h * .07, w * .84, h * .1, 5, BLUE, 5);
  for (let i = 0; i < 7; i++) line(-w / 2 + w * .1, -h / 2 + h * (.28 + i * .09), -w / 2 + w * (i % 3 === 2 ? .55 : .88), -h / 2 + h * (.28 + i * .09), '#b0b0bc', Math.max(4, h * .018));
  ell(w * .28, h * .36, w * .1, w * .1, null, 5); X.save(); X.globalAlpha = .9; ell(w * .28, h * .36, w * .1, w * .1, 'rgba(255,61,77,.25)', 0); X.restore();
  X.restore();
}

function baby(x, y, s, t, o = {}) {
  X.save(); X.translate(x, y); X.scale(s, s);
  const skin = '#ffd9b8', rock = o.rock, pv = [0, -110];
  for (const sg of [-1, 1]) { ell(sg * 62, -20, 40, 24, skin); ell(sg * 92, -20, 22, 17, skin, 5); }
  ell(0, -72, 86, 68, '#4da3ff');
  ell(0, -50, 20, 6, 'rgba(255,255,255,.4)', 0);
  const hx = 100, hy = -150, hand = rock ? [hx, -200] : [88, -60];
  const arms = [[-1, o.guitar ? [-62, -52] : [-92, -60]], [1, rock ? [92, -205] : o.guitar ? [92, -78] : [92, -60]]];
  for (const [sg, a] of arms) { limb([[sg * 70, -100], [sg * (a[0] === -62 ? 74 : Math.abs(a[0]) + 6), (-100 + a[1]) / 2], a], '#4da3ff', 18); ell(a[0], a[1], 14, 14, skin, 6); }
  if (o.guitar) {
    X.save(); X.translate(-4, -40); X.rotate(-.35);
    limb([[10, -8], [120, -80]], '#7a4a24', 12); rr(112, -100, 28, 22, 5, '#333', 5);
    poly([[-58, -30], [-14, -6], [10, -34], [34, 18], [-10, 40], [-50, 24]], C.red, 6);
    ell(-8, 6, 9, 9, '#ffe14d', 4); line(-26, 0, 20, 10, '#ddd', 4);
    X.restore();
  }
  X.save(); X.translate(pv[0], pv[1]); if (rock) X.rotate(Math.sin(t * 14) * .15); X.translate(0, 110 - 110 + (rock ? 0 : Math.sin(t * 3) * 1.5));
  ell(0, -62, 94, 82, skin);
  X.beginPath(); X.moveTo(0, -142); X.bezierCurveTo(-12, -178, 26, -184, 22, -160); X.bezierCurveTo(18, -150, 6, -158, 12, -166); X.lineWidth = 7; X.strokeStyle = INK; X.lineCap = 'round'; X.stroke();
  const b = blinkK(t, .4);
  for (const sg of [-1, 1]) { ell(sg * 34, -64, 8, 10 * b, INK, 0); ell(sg * 56, -34, 14, 9, 'rgba(255,100,120,.4)', 0); }
  mouth(0, -32, 36, o.face || 'smile', t);
  X.restore();
  if (rock) { const [hx2, hy2] = [92, -205]; for (const dx of [-8, 8]) limb([[hx2 + dx, hy2 - 8], [hx2 + dx * 1.5, hy2 - 30]], skin, 8); }
  X.restore();
}

function bigName(x, y, t, k) {
  const NAME = 'BRFXXCCXXMNPCCCCLLLMMNPRXVCLMNCKSSQLBB11116', N = NAME.length;
  const lines = [NAME.slice(0, 15), NAME.slice(15, 29), NAME.slice(29)];
  X.save(); X.translate(x, y + Math.sin(t * 2) * 4);
  X.font = '900 100px "Arial Black","DejaVu Sans",sans-serif';
  const fs = Math.min(100, 100 * 850 / Math.max(...lines.map(l => X.measureText(l).width))), lh = fs * 1.2, Ht = lh * 3 + 70;
  rr(-480, -Ht / 2, 960, Ht, 18, '#fffdf4');
  X.save(); X.beginPath(); X.roundRect(-480, -Ht / 2, 960, 26, [18, 18, 0, 0]); X.fillStyle = C.red; X.fill(); stroke(); X.restore();
  X.font = `900 ${fs}px "Arial Black","DejaVu Sans",sans-serif`;
  let idx = 0;
  lines.forEach((l, li) => {
    const ws = [...l].map(ch => X.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0); let cx = -tot / 2;
    [...l].forEach((ch, i) => {
      const p = clamp(k * (N + 4) - idx, 0, 1); idx++;
      if (p > 0) { X.save(); X.translate(cx + ws[i] / 2, (li - 1) * lh + 14); const sc = back(p); X.scale(sc, sc); X.rotate(Math.sin(t * 5 + idx) * .03); txt(ch, 0, 0, fs, /\d/.test(ch) ? C.sky : C.red, 10); X.restore(); }
      cx += ws[i];
    });
  });
  X.restore();
}

function letterA(x, y, s, t) {
  X.save(); X.translate(x, y); X.rotate(Math.sin(t * 3) * .04); const k = s * (1 + Math.sin(t * 4.5) * .02); X.scale(k, k);
  txt('A', 8, 10, 560, INK, 0); txt('A', 0, 0, 560, C.yel, 26);
  X.restore();
}

function fineTicket(x, y, s, rot) {
  X.save(); X.translate(x, y); X.rotate(rot || 0); X.scale(s, s);
  rr(-190, -120, 380, 240, 22, '#fff');
  X.beginPath(); X.roundRect(-172, -102, 344, 204, 14); X.lineWidth = 12; X.strokeStyle = C.red; X.stroke();
  txt('FINE', 0, -42, 110, C.red, 12);
  X.setLineDash([10, 10]); line(-150, 20, 150, 20, '#b0b0bc', 4); X.setLineDash([]);
  txt('5000 KR', 0, 68, 62, INK, 2);
  X.restore();
}

function calendarFlip(x, y, s, t, t0) {
  const yrs = [1991, 1992, 1993, 1994, 1995, 1996], g = 3000;
  const page = (yr) => { rr(-130, -120, 260, 250, 16, '#fff'); X.save(); X.beginPath(); X.roundRect(-130, -120, 260, 66, [16, 16, 0, 0]); X.fillStyle = C.red; X.fill(); stroke(); X.restore(); txt('YEAR', 0, -88, 34, '#fff', 8); txt(String(yr), 0, 30, 82, C.yel, 12); };
  X.save(); X.translate(x, y); X.scale(s, s);
  rr(-142, -132, 284, 274, 20, '#c98b55');
  const torn = i => t - (t0 + .25 * i);
  const top = yrs.findIndex((_, i) => torn(i) < 0);
  if (top >= 0) { X.save(); X.translate(0, 0); page(yrs[top]); X.restore(); } else txt('?', 0, 10, 140, C.yel, 14);
  for (let i = 0; i < yrs.length; i++) {
    const u = torn(i); if (u < 0) continue;
    const py = .5 * g * u * u, hs = hash(i + 3);
    if (py > 2400) continue;
    X.save(); X.translate((hs - .5) * 500 * u, py - 40 * Math.min(u * 6, 1) * (1 - Math.min(u * 6, 1)) * 0); X.rotate((hs - .4) * 7 * u); page(yrs[i]); X.restore();
  }
  for (const sx of [-70, 70]) { ell(sx, -132, 10, 14, '#9a9aa8', 5); }
  X.restore();
}
