// Globzy — Sweden baby-name law. Every cue is timed from words.json.
const VO = 0.10, LEAD = 0.07;
const WD = window.WORDS.map(w => ({ w: w.w, s: w.s + VO, e: w.e + VO }));
const w = i => WD[i].s - LEAD;
SWISS[0] = 15; SWISS[1] = 62; // map pin target → Sweden
const T = {
  name0: w(6), baby: w(8), this0: w(9),
  where: w(10), sweden: w(15), meat: w(16), snow: w(17), gov: w(20), checks: w(22), bname: w(24),
  swedish: w(26), send: w(29), tax: w(34), approval: w(37),
  hurt: w(41), kid: w(43), rej1: w(44),
  y1996: w(46), couple: w(48), fined: w(50), time: w(57),
  fought: w(60), this1: w(63),
  im: w(64), try_: w(69), pron1: w(73), albin1: w(74),
  rej2: w(75), fined2: w(80),
  weirder: w(84),
  tried: w(87), letterA: w(91), pron2: w(93), albin2: w(94),
  rej3: w(95), again: w(96),
  meanwhile: w(97), family: w(100), metallica: w(105), won: w(107),
  what: w(108), reject: w(112), comments: w(119),
};
const END = WD[WD.length - 1].e + 0.55;
const talkAt = t => WD.some(x => t >= x.s - .02 && t <= x.e) ? Math.abs(Math.sin(t * 14)) : 0;
const G = 5200; // gravity px/s²

// the couple (dad + mom); o.mood: 'happy'|'worried'|'mad'|'shock'
function couple(x, y, HH, t, o = {}) {
  const m = o.mood || 'happy';
  const face = { happy: 'smile', worried: 'wavy', mad: 'flat', shock: 'o', sad: 'sad' }[m];
  const brow = { happy: null, worried: 'sad', mad: 'mad', shock: 'up', sad: 'sad' }[m];
  const eyesO = m === 'shock' ? { big: true } : {};
  person(x - HH * .75, y, HH, t, { shirt: C.sky, pants: '#3b4a8f', hair: '#6b3e1f', face, brow, eyesO, sweat: m === 'worried', armL: o.armL || null, armR: o.armR || null, walk: o.walk });
  person(x + HH * .75, y, HH * .94, t, { shirt: C.pink, pants: '#6a3a8f', hair: '#f2c14e', face, brow, eyesO, ph: 1.1, sweat: m === 'worried', armL: o.armL2 || null, armR: o.armR2 || null, walk: o.walk });
}
function floorRoom(t) { room('#fff1d6', '#ffe0a8', 1380, '#c98b55'); rr(110, 330, 300, 260, 20, '#9fe0ff'); snowfallClip(110, 330, 300, 260, t); line(260, 330, 260, 590, INK, 7); }
function snowfallClip(x, y, w_, h, t) { X.save(); X.beginPath(); X.rect(x, y, w_, h); X.clip(); for (let i = 0; i < 14; i++) { const fx = x + hash(i) * w_, fy = y + ((hash(i + 3) * h + t * (40 + hash(i + 5) * 40)) % h); ell(fx, fy, 5, 5, '#fff', 0); } X.restore(); }

// ---------------- scenes ----------------
function sHook(t) {
  floorRoom(t);
  // crib + happy parents
  couple(560, 1380, 200, t, { mood: t > T.this0 ? 'happy' : 'happy', armR: [120, 40], armL2: [-120, 40] });
  baby(560, 1180 - idleHop(t, .8, 18), .9, t, { face: t > T.this0 ? 'o' : 'smile' });
  // a pen writes on a paper as they "name" the baby
  pop(880, 600, prog(t, T.name0, .25), () => { paperSheet(0, 0, 230, 290, .1); });
  // the absurd name explodes onto the screen
  const k = prog(t, T.this0 - .02, .35);
  if (k > 0) { X.save(); X.fillStyle = `rgba(36,23,38,${.35 * eo(k)})`; X.fillRect(-100, -100, W + 200, H + 200); X.restore(); bigName(540, 470, t, eo(k)); }
  burst(540, 470, 520, prog(t, T.this0, .45), C.yel, 16);
}

function sSpin(t, t0) {
  space(t);
  const stop = T.sweden, k = clamp((t - t0) / (stop - t0));
  const rot = 15 + 1080 * (1 - Math.pow(1 - k, 2.2)) - 1080;
  const sqz = 1 + spring(t, stop, .12, 3, .3), hopY = idleHop(t, .9, 30);
  const meatK = prog(t, T.meat, .3);
  globzy(meatK > 0 ? 470 : 540, 880 - hopY, 290, t, { rot, tilt: 28, talk: talkAt(t), pin: prog(t, stop, .35), sx: 1 / sqz, sy: sqz, armL: [-420, -130 + Math.sin(t * 8) * 30], armR: meatK > 0 ? [330, 300] : [420, -130 - Math.sin(t * 8) * 30], eyesO: meatK > 0 ? { lx: .8, ly: .6 } : { lx: Math.sin(t * 9) * .8 } });
  if (k < .85) for (let i = 0; i < 5; i++) { X.save(); X.globalAlpha = .6 * (1 - k); X.beginPath(); X.arc(540, 880, 350 + i * 22, -1.2 + i * .3 + t * 4, -.6 + i * .3 + t * 4); X.lineWidth = 10; X.strokeStyle = '#fff'; X.stroke(); X.restore(); }
  pop(540, 320, prog(t, stop, .3), () => txt('SWEDEN!', 0, 0, 130, C.yel, 18));
  burst(540, 680, 260, prog(t, stop + .05, .5));
  pop(820, 1290, meatK, () => { X.rotate(Math.sin(t * 3) * .05); meatballs(0, 0, 1.2, t); });
  confetti(t, stop, 30, 3);
}

function sSnow(t, t0) {
  sky('#a9dcff', '#eef8ff');
  poly([[-200, 1250], [250, 820], [700, 1250]], '#e8f2ff'); poly([[400, 1250], [850, 760], [1300, 1250]], '#dbe9ff');
  rr(-100, 1240, W + 200, H, 0, '#ffffff');
  snowman(860, 1420, 1.1, t);
  // Globzy drops into the snow (gravity + bounce), snow puff on impact
  const land = t0 + .35, drop = .35, b = bounce(t, land - drop, .5 * G * drop * drop, G, .3), s = squash(b, .00007, .00011);
  globzy(380, 1170 - b.h, 220, t, { rot: 15, tilt: 28, talk: talkAt(t), pin: 1, sx: s.sx, sy: s.sy, armL: [-300, -60 - Math.sin(t * 9) * 20], armR: [300, -60 + Math.sin(t * 9) * 20], eyesO: { closed: t - land < .3 && t > land } });
  puff(380, 1430, prog(t, land, .5), 1.2);
  snowfall(t, 50, 2);
}

function sGov(t, t0) {
  sky('#cfe8ff', '#f4faff'); rr(-100, 1400, W + 200, H, 0, '#fff');
  officeBuilding(540, 1400, 1.25, t, 'GOVERNMENT');
  swedenFlag(140, 600, .9, t); swedenFlag(940, 600, .9, t + .4);
  // giant magnifier sweeps over a baby name tag on "checks"
  const mk = prog(t, T.checks, .3);
  pop(540, 1560, prog(t, T.bname, .25), () => { rr(-230, -55, 460, 110, 24, '#fff'); txt('BABY NAME: ???', 0, 4, 52, C.pink, 10); });
  if (mk > 0) { const sx = 540 + Math.sin((t - T.checks) * 3.2) * 260; pop(sx, 1060, mk, () => magnifier(0, 0, 1.6, -.5, t)); }
  snowfall(t, 25, 4);
}

function sSend(t, t0) {
  sky('#bfe6ff', '#f2fbff'); rr(-100, 1450, W + 200, H, 0, '#fff');
  officeBuilding(850, 1450, .72, t, 'TAX AGENCY');
  couple(260, 1450, 175, t, { mood: 'happy', armR: t < T.send ? [110, -40] : [140, -170] });
  // envelope thrown on "send": projectile with v0 tuned to land in the office door at "tax agency"
  const fl = T.tax - T.send + .1, x0 = 430, y0 = 1080, x1 = 850, y1 = 1320;
  if (t < T.send) envelope(x0, y0, .6, -.2, 'NAME');
  else { const u = Math.min(t - T.send, fl), vx = (x1 - x0) / fl, vy = (y1 - y0 - .5 * 3000 * fl * fl) / fl; if (t - T.send < fl + .05) envelope(x0 + vx * u, y0 + vy * u + .5 * 3000 * u * u, .6, u * 9, 'NAME'); }
  ringFx(850, 1320, 200, prog(t, T.send + fl, .4), C.yel);
  // clerk peeks out on "approval" — big question bubble
  pop(820, 640, prog(t, T.approval, .3), () => { bubble(0, 0, 330, 200, -60, 150); txt('APPROVE?', 0, 4, 52, C.red, 9); });
  snowfall(t, 20, 6);
}

function sRule(t, t0) {
  room('#e6e3ff', '#cfc9ff', 1300, '#8f86c9');
  rr(80, 1150, 920, 380, 24, '#b78457'); rr(60, 1120, 960, 60, 16, '#cf9a6a');
  clerk(300, 1150, 200, t, { face: t > T.rej1 ? 'flat' : 'flat', brow: 'mad' });
  paperSheet(700, 1000, 300, 380, -.06);
  txt('NAME', 700, 900, 54, '#fff', 10);
  // the kid it could hurt
  pop(700, 1050, prog(t, T.hurt, .25), () => baby(0, 80, .6, t, { face: 'sad' }));
  const sk = prog(t, T.rej1, .18);
  stamp('REJECTED', 600, 620, sk, C.red, 120);
}

function sYear(t, t0) {
  sky('#ffe1ef', '#ffc2da'); rays(540, 900, t, 'rgba(255,255,255,.2)');
  calendarFlip(540, 860, 1.6, t, T.y1996 - .1);
  pop(540, 1460, prog(t, T.y1996 + 1.25, .3), () => txt('1996', 0, 0, 150, C.yel, 18));
}

function sFine(t, t0) {
  floorRoom(t);
  // wall clock: ticks every second, rings on "time"
  const ring = t > T.time ? Math.sin(t * 60) * .12 * Math.exp(-(t - T.time) * 2) : 0;
  X.save(); X.translate(840, 500); X.rotate(ring); ell(0, 0, 120, 120, '#fff'); const sec = Math.floor(t * 2) / 2; line(0, 0, Math.sin(sec * 1.2) * 85, -Math.cos(sec * 1.2) * 85, INK, 9); line(0, 0, 50, 20, INK, 11); ell(0, 0, 12, 12, INK, 0); X.restore();
  const fined = t > T.fined;
  couple(500, 1380, 200, t, { mood: fined ? 'worried' : 'happy' });
  // a fine ticket falls from the sky (gravity, flutter) and slaps onto the floor
  if (t > T.fined - .45) {
    const b = bounce(t, T.fined - .45, .5 * 3000 * .45 * .45 + 0, 3000, .25), fl = Math.sin(t * 9) * .3 * (b.h > 0 ? 1 : 0);
    fineTicket(540, 1260 - b.h - 520 * 0, 1.2, fl);
  }
  burst(540, 1260, 300, prog(t, T.fined, .4), C.red);
  if (t > T.time) for (let i = 0; i < 4; i++) line(840 + Math.cos(i * 1.6) * 150, 500 + Math.sin(i * 1.6) * 150, 840 + Math.cos(i * 1.6) * 190, 500 + Math.sin(i * 1.6) * 190, INK, 8);
}

function sFight(t, t0) {
  room('#ffd9c2', '#ffb48a', 1450, '#a66a45');
  couple(540, 1450, 180, t, { mood: 'mad', armR: [80, 10 + Math.sin(t * 30) * 20], armL2: [-80, 10 + Math.cos(t * 30) * 20] });
  // furious scribbling: paper flies with pencil marks
  for (let i = 0; i < 4; i++) { const u = ((t * 1.3 + i * .25) % 1); X.save(); X.globalAlpha = 1 - u; paperSheet(540 + (i % 2 ? 1 : -1) * (150 + 330 * u), 1150 - 700 * u + 900 * u * u, 120, 150, u * 6 + i); X.restore(); }
  const k = prog(t, T.this1 - .02, .4);
  if (k > 0) { bigName(540, 430, t, eo(k)); }
  burst(540, 430, 500, prog(t, T.this1, .45), C.yel, 16);
}

function sTry(t, t0) {
  sky('#7b4dff', '#4dc3ff'); rays(540, 1000, t, 'rgba(255,255,255,.1)');
  bigName(540, 430, t, 1);
  const giveUp = t > T.try_, albin = t > T.albin1;
  const wob = giveUp ? 0 : Math.sin(t * 25) * .04;
  X.save(); X.translate(540, 1150); X.rotate(wob); X.translate(-540, -1150);
  globzy(540, 1150, 300, t, { rot: 15, tilt: 28, talk: talkAt(t), pin: 1, brow: giveUp && !albin ? 'up' : null, mood: !giveUp && talkAt(t) < .02 ? 'o' : null, eyesO: !giveUp ? { dizzy: true } : {}, armL: giveUp ? [-430, -200 + Math.sin(t * 14) * 40] : [-300, -260], armR: giveUp ? [430, 150] : [300, -260] });
  X.restore();
  if (!giveUp) for (let i = 0; i < 4; i++) star(540 + Math.cos(t * 6 + i * 1.6) * 330, 760 + Math.sin(t * 6 + i * 1.6) * 60, 22, C.yel, t * 3, 4);
  if (giveUp && !albin) sweat(800, 900, 1.4);
  pop(540, 1600 - 20, prog(t, T.albin1, .3), () => { rr(-260, -80, 520, 150, 30, C.yel); txt('= "ALBIN"', 0, -4, 80, '#fff', 12); });
}

function sRej2(t, t0) {
  room('#e6e3ff', '#cfc9ff', 1300, '#8f86c9');
  rr(80, 1150, 920, 380, 24, '#b78457'); rr(60, 1120, 960, 60, 16, '#cf9a6a');
  const slam = hop(t, T.rej2 - .25, .25, 120);
  clerk(300, 1150, 200, t, { face: 'flat', brow: 'mad', armR: [160, -40 - slam] });
  X.save(); X.translate(700, 1000); X.rotate(-.04); rr(-300, -110, 600, 220, 16, '#fff'); X.restore();
  txt('BRFXXCCXXMNP...', 700, 1000, 54, C.sky, 10);
  stamp('REJECTED', 650, 640, prog(t, T.rej2, .18), C.red, 120);
  // fine flies in with a parabola and the coin rattle on "fined"
  if (t > T.fined2 - .3) { const u = t - (T.fined2 - .3), x = 1200 - 900 * u, y = 300 + -400 * u + .5 * 3000 * u * u; if (u < .5) fineTicket(x, y, .9, u * 8); else fineTicket(750, 1210 + spring(t, T.fined2 + .2, -20, 4), .9, .1); }
}

function sWeird(t, t0) {
  sky('#7b4dff', '#ff5ab4'); rays(540, 960, t * 3, 'rgba(255,255,255,.12)', 18);
  const lean = eo(prog(t, t0, .6)), sqz = 1 + spring(t, T.weirder, .1, 3.5, .3);
  globzy(540, 1050 - lean * 40, 330 + lean * 70, t, { rot: 15 + Math.sin(t * 2) * 8, tilt: 28, talk: talkAt(t), brow: 'up', pin: 1, sx: 1 / sqz, sy: sqz, armL: [-480, -60], armR: [470, -300 + Math.sin(t * 10) * 20], eyesO: { lx: .6, ly: -.2 } });
  pop(540, 380, prog(t, T.weirder, .25), () => txt('WEIRDER...', 0, 0, 120, C.yel, 18, 'center', -.05));
}

function sLetterA(t, t0) {
  room('#fff1d6', '#ffe0a8', 1450, '#c98b55');
  couple(300, 1450, 165, t, { mood: t > T.letterA && t < T.albin2 ? 'shock' : 'happy', armR2: [150, -60] });
  // the giant A drops from above onto the floor (gravity + restitution) on "A"
  if (t > T.letterA - .4) {
    const b = bounce(t, T.letterA - .4, .5 * G * .4 * .4, G, .35), s = squash(b, .00006, .0001);
    X.save(); X.translate(760, 1440 - b.h); X.scale(s.sx, s.sy); letterA(0, -210, 1.05, t); X.restore();
  }
  // awkward silence: crickets + tiny chirps
  const silent = t > T.pron2 + .5 && t < T.albin2;
  if (silent) for (let i = 0; i < 2; i++) if (Math.floor(t * 5 + i) % 3 === 0) txt('chirp', 220 + i * 640, 560, 40, '#a37a3a', 6);
  pop(540, 330, prog(t, T.albin2, .3), () => { rr(-280, -80, 560, 150, 30, C.yel); txt('ALSO "ALBIN"', 0, -4, 70, '#fff', 12); });
}

function sRej3(t, t0) {
  room('#e6e3ff', '#cfc9ff', 1300, '#8f86c9');
  rr(80, 1150, 920, 380, 24, '#b78457'); rr(60, 1120, 960, 60, 16, '#cf9a6a');
  clerk(300, 1150, 200, t, { face: 'flat', brow: 'mad', armR: [160, -40 - hop(t, T.again - .2, .2, 120) - hop(t, T.rej3 - .2, .2, 120)] });
  // the letter A topples over: rigid body rotating about its base corner under gravity (θ'' = (g/L) sin θ)
  const t1 = T.again + .05, u = Math.max(0, t - t1);
  let th = 0.03 * (t > t1 ? 1 : 0); { const kk = 3.4; th = Math.min(Math.PI / 2, th * Math.cosh(kk * u)); }
  X.save(); X.translate(760 - 110, 1150); X.rotate(th); letterA(110, -170, 1, t); X.restore();
  if (th >= Math.PI / 2 - .01) puff(860, 1140, prog(t, t1 + Math.acosh(Math.PI / 2 / .03) / 3.4, .5), 1);
  stamp('REJECTED', 540, 560, prog(t, T.rej3, .18), C.red, 120, -.18);
  stamp('AGAIN!', 600, 820, prog(t, T.again, .18), C.red, 130, .12);
}

function sMetal(t, t0) {
  const rock = t > T.metallica;
  sky(rock ? '#2a1640' : '#ffe9f3', rock ? '#5a2a7a' : '#ffd0e4');
  if (rock) { rays(540, 700, t * 2, 'rgba(255,80,160,.15)', 16); for (let i = 0; i < 2; i++) { X.save(); X.globalAlpha = .25; X.fillStyle = i ? C.sky : C.pink; X.beginPath(); X.moveTo(200 + i * 680, 0); X.lineTo(540 + Math.sin(t * 3 + i) * 200 - 160, 1400); X.lineTo(540 + Math.sin(t * 3 + i) * 200 + 160, 1400); X.fill(); X.restore(); } }
  rr(-100, 1450, W + 200, H, 0, rock ? '#3b2a55' : '#c98b55');
  couple(540, 1450, 170, t, { mood: rock ? 'happy' : 'happy', armR: rock ? [80, -220] : null, armL2: rock ? [-80, -220] : null });
  const bh = rock ? idleHop(t, .45, 40) : 0;
  baby(540, 1560 - bh, 1.35, t, { face: rock ? 'open' : 'smile', guitar: rock, rock });
  pop(540, 470, prog(t, T.metallica, .25), () => txt('METALLICA', 0, 0, 120, C.yel, 18, 'center', -.06));
  stamp('APPROVED', 540, 760, prog(t, T.won, .18), C.grn, 110, .12);
  if (t > T.won) confetti(t, T.won, 40, 9);
}

function sOutro(t, t0) {
  space(t); rays(540, 900, t, 'rgba(255,255,255,.07)');
  const hopY = idleHop(t, 1.1, 40);
  globzy(540, 980 - hopY, 290, t, { rot: 15 + Math.sin(t) * 6, tilt: 28, talk: talkAt(t), pin: 1, brow: t > T.reject && t < T.comments ? 'up' : null, armL: [-420, -200 + Math.sin(t * 6) * 20], armR: t > T.comments ? [380, 330] : [430, -80] });
  const tags = ['BOB?', 'ZYX?', 'KING?', 'Q?'];
  tags.forEach((s, i) => pop(190 + (i % 2) * 700, 470 + Math.floor(i / 2) * 330, prog(t, T.what + i * .15, .3), () => { X.rotate((i % 2 ? .12 : -.12) + Math.sin(t * 3 + i) * .05); rr(-130, -55, 260, 110, 22, '#fff'); txt(s, 0, 2, 60, C.pink, 9); }));
  pop(540, 1530, prog(t, T.comments, .3), () => { bubble(0, 0, 560, 130, 60, 110); txt('YOUR NAME?', 0, 2, 64, C.pink, 10); });
}

const SCENES = [
  [0, sHook], [T.where - .18, sSpin], [T.snow - .1, sSnow], [T.gov - .12, sGov], [T.swedish - .12, sSend],
  [T.hurt - .32, sRule], [T.y1996 - .2, sYear], [T.couple - .3, sFine], [T.fought - .2, sFight], [T.im - .15, sTry],
  [T.rej2 - .12, sRej2], [T.weirder - .5, sWeird], [T.tried - .35, sLetterA], [T.rej3 - .2, sRej3], [T.meanwhile - .12, sMetal],
  [T.what - .15, sOutro],
];
const PUNCH = [T.this0, T.sweden, T.checks, T.send, T.rej1, T.fined, T.this1, T.albin1, T.rej2, T.weirder, T.letterA, T.rej3, T.again, T.metallica, T.won, T.comments];
const SHAKE = [[T.this0, 16], [T.rej1, 14], [T.fined, 12], [T.this1, 16], [T.rej2, 14], [T.letterA, 18], [T.rej3, 14], [T.again, 18], [T.won, 10]];
