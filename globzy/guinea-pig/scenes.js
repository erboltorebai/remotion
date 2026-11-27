// Scenes — every cue is timed from words.json. VO = voice offset on the final timeline.
const VO = 0.10, LEAD = 0.07; // visuals land ~2 frames before the word
const WD = window.WORDS.map(w => ({ w: w.w, s: w.s + VO, e: w.e + VO }));
const w = i => WD[i].s - LEAD;
const T = {
  illegal: w(3), one: w(7), pig: w(9),
  where: w(10), today: w(14),
  swiss: w(15), mountains: w(16), choc: w(17), serious: w(20), laws: w(22),
  guinea: w(23), herd: w(26),
  alone: w(28), lonely: w(31), stressed: w(32), sad: w(34),
  so: w(35), y2008: w(37), gov: w(40), stepped: w(41),
  social: w(43), company: w(47), kind: w(51),
  one2: w(52), wrong: w(55), two: w(60),
  weirder: w(64),
  what: w(65), dies: w(71),
  survivor: w(73), alone2: w(77),
  so2: w(78), rent: w(82), rpig: w(85),
  temp: w(87), best: w(88), end: w(93),
  last: w(97), buddy: w(101), back: w(103), home: w(104), herd2: w(107),
  would: w(108), rent2: w(110), friend: w(112), pet: w(115), comments: w(120),
};
const END = WD[WD.length - 1].e + 0.55;
// talking amount for Globzy (mouth = |sin(t*14)| while a word plays)
const talkAt = t => WD.some(x => t >= x.s - .02 && t <= x.e) ? Math.abs(Math.sin(t * 14)) : 0;

// ---------------- scenes ----------------
function sHook(t) {
  room('#ffe3f0', '#ffc6dc', 1330, '#b77a4e');
  // window with Alps
  rr(680, 300, 300, 260, 20, '#9fe0ff'); poly([[690, 550], [780, 400], [870, 550]], '#fff', 5); line(830, 300, 830, 560, INK, 7);
  // cage + lonely pig
  cage(470, 1330, 720, 560, t);
  const b = bounce(t, 0, 0, 5200, .4, 900 * (t > T.one ? 1 : 0) * 0); // idle
  const shock = t > T.illegal;
  const jump = shock ? bounce(t, T.illegal, 0, 5200, .35, 1100) : { h: 0, v: 0, hit: 99, impactV: 0 };
  const s = squash(jump);
  gpig(470, 1270 - jump.h, 1.55, t, { sx: s.sx, sy: s.sy, face: shock ? 'o' : 'smile', eyesO: shock ? { big: true } : {}, chew: !shock, ear: spring(t, T.illegal, .5, 4) });
  if (shock && t - T.illegal < 1.6) for (let i = 0; i < 3; i++) qmark(300 + i * 160, 850 - Math.sin(t * 5 + i) * 10, .55, (i - 1) * .2);
  // "1" counter badge on "one"
  pop(830, 960, prog(t, T.one, .25), () => { ell(0, 0, 90, 90, C.yel); txt('1', 0, 6, 120, '#fff', 14); });
  // police siren and stamp
  if (shock) siren(200, 560, t, 1.1);
  stamp('ILLEGAL', 540, 520, prog(t, T.illegal, .18), C.red, 140);
}

function sSpin(t, t0) {
  space(t);
  const u = t - t0, stop = T.swiss;
  // decelerating spin: angular velocity drops smoothly to 0 at `stop` (integrated, so it's physically continuous)
  const D = stop - t0, k = clamp(u / D);
  const rot = 8 + 1080 * (1 - Math.pow(1 - k, 2.2)) - 1080;
  const wob = spring(t, stop, 22, 2.6, .25);
  const hopY = idleHop(t, .9, 30);
  const sqz = 1 + spring(t, stop, .12, 3, .3);
  globzy(540, 900 - hopY, 300, t, { rot: rot - wob * 0, tilt: 18, talk: talkAt(t), pin: prog(t, stop, .35), sx: 1 / sqz, sy: sqz, armL: [-430, -120 + Math.sin(t * 8) * 30], armR: [430, -120 - Math.sin(t * 8) * 30], eyesO: { lx: Math.sin(t * 9) * .8 } });
  // motion lines while spinning fast
  if (k < .85) for (let i = 0; i < 5; i++) { X.save(); X.globalAlpha = .6 * (1 - k); X.beginPath(); X.arc(540, 900, 360 + i * 22, -1.2 + i * .3 + t * 4, -.6 + i * .3 + t * 4); X.lineWidth = 10; X.strokeStyle = '#fff'; X.stroke(); X.restore(); }
  pop(540, 330, prog(t, stop, .3), () => txt('SWITZERLAND!', 0, 0, 108, C.yel, 18));
  burst(540, 680, 260, prog(t, stop + .05, .5));
  confetti(t, stop, 36, 3);
}

function sAlps(t, t0) {
  alps(t);
  swissFlag(830, 760, 1, t);
  // Globzy drops from the sky onto the Alps with real gravity + bounce (lands on "Mountains")
  const land = T.mountains + .32, drop = .42, b = bounce(t, land - drop, 0.5 * 5200 * drop * drop, 5200, .32);
  const s = squash(b, .00007, .00011);
  globzy(380, 1020 - b.h, 240, t, { rot: 8, talk: talkAt(t), sx: s.sx, sy: s.sy, pin: 1, armL: [-310, -70], armR: [320, 40 + Math.sin(t * 3) * 10] });
  puff(380, 1340, prog(t, land, .5), 1.2);
  // chocolate bar pops
  pop(800, 1180, prog(t, T.choc, .3), () => { X.rotate(.15 + Math.sin(t * 3) * .04); rr(-110, -150, 220, 300, 18, '#7a3d1f'); for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) rr(-90 + i * 95, -130 + j * 92, 80, 76, 10, '#94502b', 4); rr(-118, 40, 236, 120, 12, '#e8333f'); txt('SWISS', 0, 100, 44, '#fff', 8); });
  // judge gavel on "serious"/"laws"
  const gk = prog(t, T.serious, .3);
  pop(560, 560, gk, () => {
    const swing = t < T.laws ? -0.9 + Math.sin(t * 6) * .1 : -0.9 + 1.25 * eo(prog(t, T.laws, .12)) - spring(t, T.laws + .12, .15, 5, .3);
    rr(-150, 60, 300, 70, 14, '#8a5a3c'); // block
    X.save(); X.translate(150, 20); X.rotate(swing); rr(-240, -18, 240, 36, 14, '#a36b44'); rr(-320, -60, 110, 120, 22, '#7a4a2c'); X.restore();
  });
  burst(470, 600, 200, prog(t, T.laws + .1, .4));
}

function sHerd(t, t0) {
  alps(t, true, 1150);
  const cols = [['#e0913c', '#fff6e6'], ['#5a3a2a', '#f2e2c8'], ['#f4f0e6', '#d9883b'], ['#c96f2c', '#fff'], ['#2e2a2a', '#f2c08a']];
  const pos = [[220, 1350, 1], [520, 1300, -1], [820, 1360, -1], [370, 1520, 1], [700, 1530, -1]];
  pos.forEach(([x, y, d], i) => {
    const appear = T.guinea + i * .1;
    const b = bounce(t, appear, 600, 5200, .38);
    const h = t > T.herd ? idleHop(t, .62, 70, i * .17) : 0;
    const s = squash(b, .00006, .0001);
    pop(x, y - b.h - h, prog(t, appear, .2), () => gpig(0, 0, .95, t, { c1: cols[i][0], c2: cols[i][1], dir: d, sx: s.sx, sy: s.sy, face: t > T.herd ? 'open' : 'smile', ph: i, eyesO: t > T.herd && i % 2 ? { closed: true } : {} }));
  });
  if (t > T.herd) for (let i = 0; i < 6; i++) heart(150 + i * 160, 1100 - ((t - T.herd) * 160 + i * 40) % 300, .5 + .1 * Math.sin(t * 4 + i));
}

function sAlone(t, t0) {
  sky('#7c8bb0', '#c9d1e6');
  rr(-100, 1350, W + 200, H, 0, '#7fae7a');
  // spotlight
  X.save(); X.fillStyle = 'rgba(255,255,220,.18)'; X.beginPath(); X.moveTo(440, 0); X.lineTo(640, 0); X.lineTo(820, 1460); X.lineTo(260, 1460); X.fill(); X.restore();
  ell(540, 1450, 260, 40, 'rgba(0,0,0,.15)', 0);
  const stressed = t > T.stressed, sad = t > T.sad;
  const shiv = stressed && !sad ? Math.sin(t * 60) * 6 : 0;
  gpig(540 + shiv, 1390, 1.7, t, { face: sad ? 'sad' : stressed ? 'wavy' : 'flat', brow: t > T.lonely ? 'sad' : null, eyesO: stressed && !sad ? { big: true } : {}, dir: -1 });
  if (stressed && !sad) { sweat(430, 1180, 1.3); sweat(650, 1170, 1); }
  if (sad) { const ty = 1360 + ((t - T.sad) * 220) % 120; X.save(); X.globalAlpha = .9; sweat(400, ty - 110, 1); X.restore(); }
  // rain cloud over the pig (rain drops fall with gravity)
  const ck = prog(t, T.lonely, .3);
  if (ck > 0) {
    pop(540, 820, ck, () => cloud(0, 0, 1.4, '#9aa3b8'));
    for (let i = 0; i < 14; i++) { const ph = hash(i) * .8, u = ((t - T.lonely + ph) % .8); const x = 380 + hash(i + 7) * 320, y = 900 + 0.5 * 3000 * u * u + 600 * u; if (y < 1330) line(x, y, x - 4, y + 34, '#7fd4ff', 8); }
  }
  pop(540, 380, prog(t, T.alone, .25), () => txt('ALONE...', 0, 0, 110, '#cfe6ff', 16));
}

function sLaw(t, t0) {
  sky('#7fd6ff', '#eafaff');
  rr(-100, 1450, W + 200, H, 0, '#62d36f');
  // Federal Palace with legs that "steps in" on "stepped"
  const st = T.stepped;
  const stepK = prog(t, st - .25, .45);
  const bx = lerp(820, 540, eo(stepK)), lift = hop(t, st - .25, .45, 120);
  X.save(); X.translate(bx, 1450 - lift);
  // legs
  const lg = Math.sin(stepK * Math.PI * 2) * 40;
  limb([[-120, -30], [-140 - lg, 40]], C.limb, 22); limb([[120, -30], [140 + lg, 40]], C.limb, 22);
  ell(-150 - lg, 50, 60, 26, C.shoe, 6); ell(150 + lg, 50, 60, 26, C.shoe, 6);
  rr(-300, -380, 600, 360, 10, '#e9dcc4');
  for (let i = 0; i < 6; i++) rr(-260 + i * 92, -330, 46, 280, 8, '#fff6e2', 5);
  poly([[-330, -380], [0, -500], [330, -380]], '#d8c7a6');
  X.beginPath(); X.arc(0, -500, 110, Math.PI, 0); X.closePath(); X.fillStyle = '#5fbf9a'; X.fill(); stroke();
  swissFlag(0, -870, .9, t);
  // building face
  eyes(0, -240, 90, 18, t, { big: true, brow: t > st ? 'mad' : 'up' });
  mouth(0, -150, 120, t > st ? 'flat' : 'smile');
  X.restore();
  if (t > st + .2) puff(bx, 1470, prog(t, st + .2, .5), 1.4);
  pop(250, 520, prog(t, T.y2008, .3), () => { X.rotate(-.12); calendar(0, 0, 1.1, 'SEPT', '2008'); });
  // page flips (ticks) between "2008" and "government"
  for (let i = 0; i < 3; i++) ringFx(250, 520, 220, prog(t, T.y2008 + .3 + i * .25, .3), C.yel);
}

function sRule(t, t0) {
  sky('#ffe7a8', '#ffcf6a'); rays(540, 900, t, 'rgba(255,255,255,.22)');
  // scroll unrolls with a springy overshoot
  const k = prog(t, t0 + .05, .45), open = clamp(eo(k) + spring(t, t0 + .5, .04, 3, .3), 0, 1.05);
  const hgt = 1080 * open;
  X.save(); rr(170, 330, 740, hgt, 10, '#fff4d6'); X.restore();
  rr(130, 290, 820, 70, 35, '#e8b86a'); rr(130, 290 + hgt, 820, 70, 35, '#e8b86a');
  if (open > .55) {
    X.save(); X.beginPath(); X.rect(170, 330, 740, hgt); X.clip();
    txt('SWISS LAW', 540, 450, 78, C.red, 12);
    line(260, 520, 820, 520, INK, 6);
    txt('SOCIAL PETS', 540, 600, 62, '#fff', 12);
    txt('NEED A FRIEND', 540, 680, 62, '#fff', 12);
    X.restore();
    // two-pig icon pops on "company"
    const ck = prog(t, T.company, .3);
    pop(400, 960, ck, () => gpig(0, 0, .9, t, { dir: 1, face: 'smile' }));
    pop(680, 960, prog(t, T.company + .12, .3), () => gpig(0, 0, .9, t, { dir: -1, c1: '#5a3a2a', c2: '#f2e2c8', face: 'smile', ph: 1 }));
    pop(540, 830, prog(t, T.company + .25, .3), () => heart(0, 0, 1.1));
    // check on "kind"
    pop(540, 1230, prog(t, T.kind, .25), () => { ell(0, 0, 90, 90, C.grn); poly([[-45, 0], [-12, 35], [48, -35]], null, 18, false); X.strokeStyle = '#fff'; X.lineWidth = 10; X.stroke(); });
    burst(540, 1230, 220, prog(t, T.kind + .05, .4), C.grn);
  }
}

function sShop(t, t0) {
  room('#c7f0ff', '#9fe0ff', 1250, '#d9a066');
  // shelf + sign
  rr(90, 230, 900, 120, 24, C.yel); txt('PET SHOP', 540, 292, 80, '#fff', 12);
  // counter
  rr(40, 1180, 1000, 360, 20, '#ff9a5a'); rr(20, 1150, 1040, 60, 16, '#ffb27a');
  const wrong = t > T.wrong, two = t > T.two;
  const P = person(310, 1180, 210, t, { shirt: C.pink, hair: '#5a3424', face: wrong && !two ? 'sad' : two ? 'open' : 'smile', brow: wrong && !two ? 'sad' : null, sweat: wrong && !two, armR: [150, 70], armL: [-120, 160], eyesO: two ? { big: true } : {} });
  // pig 1 on counter
  const h1 = hop(t, T.one2, .35, 50);
  gpig(640, 1100 - h1, 1.0, t, { face: wrong && !two ? 'sad' : 'smile', dir: -1, brow: wrong && !two ? 'sad' : null });
  // buzzer X on "wrong"
  const xk = prog(t, T.wrong, .2);
  if (wrong && !two) pop(700, 700, xk, () => { X.rotate(Math.sin(t * 40) * .05 * Math.exp(-(t - T.wrong) * 4)); line(-120, -120, 120, 120, INK, 64); line(120, -120, -120, 120, INK, 64); line(-120, -120, 120, 120, C.red, 44); line(120, -120, -120, 120, C.red, 44); });
  // pig 2 drops in from above on "two" with gravity + bounce
  if (t > T.two - .45) {
    const b = bounce(t, T.two - .45, 0.5 * 5200 * .45 * .45, 5200, .42), s = squash(b, .00008, .00013);
    gpig(860, 1100 - b.h, 1.0, t, { c1: '#5a3a2a', c2: '#f2e2c8', dir: -1, sx: s.sx, sy: s.sy, face: 'open', ph: 2 });
    puff(860, 1150, prog(t, T.two, .45), .8);
  }
  if (two) { pop(760, 760, prog(t, T.two, .25), () => { ell(0, 0, 110, 110, C.grn); txt('2', 0, 8, 150, '#fff', 14); }); confetti(t, T.two, 30, 8); }
}

function sWeird(t, t0) {
  sky('#7b4dff', '#ff5ab4'); rays(540, 960, t * 3, 'rgba(255,255,255,.12)', 18);
  const lean = eo(prog(t, t0, .6));
  const sqz = 1 + spring(t, T.weirder, .1, 3.5, .3);
  globzy(540, 1050 - lean * 40, 330 + lean * 70, t, { rot: 8 + Math.sin(t * 2) * 8, talk: talkAt(t), brow: 'up', pin: 1, sx: 1 / sqz, sy: sqz, armL: [-480, -60], armR: [470, -300 + Math.sin(t * 10) * 20], eyesO: { lx: .6, ly: -.2 } });
  pop(540, 380, prog(t, T.weirder, .25), () => txt('WEIRDER...', 0, 0, 120, C.yel, 18, 'center', -.05));
  for (let i = 0; i < 3; i++) qmark(170 + i * 370, 650 + Math.sin(t * 4 + i) * 20, .6, (i - 1) * .3);
}

function sDies(t, t0) {
  sky('#b9a6ff', '#ffd6f0');
  for (let i = 0; i < 3; i++) cloud(((hash(i + 3) * 1400 + t * 25) % 1500) - 200, 300 + i * 200, .9, '#fff');
  rr(-100, 1400, W + 200, H, 0, '#8fd18a');
  const dk = t - T.dies;
  // the departing pig floats up: buoyancy minus drag → velocity approaches terminal rise speed
  const vt = 520, tau = .35, rise = dk > 0 ? vt * (dk - tau * (1 - Math.exp(-dk / tau))) : 0;
  const sway = dk > 0 ? Math.sin(dk * 3) * 40 : 0;
  gpig(380 + sway, 1330 - rise, 1.1, t, { face: dk > 0 ? 'smile' : 'flat', eyesO: dk > 0 ? { closed: true } : {}, halo: dk > 0, wings: dk > 0 });
  // survivor watches it go
  gpig(720, 1330, 1.1, t, { dir: -1, c1: '#5a3a2a', c2: '#f2e2c8', face: dk > 0 ? 'o' : 'smile', eyesO: dk > 0 ? { big: true, lx: -1 } : {}, ph: 1 });
  if (dk > 0) for (let i = 0; i < 6; i++) star(380 + sway + Math.cos(i + t * 2) * 160, 1300 - rise + Math.sin(i * 2 + t * 2) * 120, 14, '#fff6b0', t, 3);
  pop(540, 420, prog(t, T.what, .3), () => { qmark(0, 0, 1.4); });
}

function sAlone2(t, t0) {
  sky('#3a3560', '#6a5f99');
  for (let i = 0; i < 20; i++) ell(hash(i) * W, hash(i + 4) * 800, 3, 3, '#fff', 0);
  ell(840, 320, 90, 90, '#fff6c8');
  cage(540, 1380, 720, 520, t);
  const shiv = t > T.alone2 ? Math.sin(t * 50) * 5 * Math.exp(-(t - T.alone2) * 2) : 0;
  gpig(540 + shiv, 1320, 1.5, t, { face: 'sad', brow: 'sad', dir: -1 });
  // empty spot where the friend was (dashed outline)
  X.save(); X.setLineDash([22, 18]); ell(300, 1300, 120, 70, null, 6); X.restore();
  // crickets: tiny "chirp" marks
  for (let i = 0; i < 3; i++) if (Math.floor(t * 4 + i) % 3 === 0) txt('chirp', 180 + i * 330, 820 + i * 40, 38, '#cfe6ff', 6);
}

function sRent(t, t0) {
  sky('#ffd54d', '#ff9f43'); rays(540, 700, t, 'rgba(255,255,255,.2)');
  // shop front
  rr(140, 620, 800, 760, 30, '#fff');
  rr(110, 560, 860, 140, 30, C.pink);
  for (let i = 0; i < 8; i++) { X.save(); X.beginPath(); X.arc(160 + i * 109, 700, 54, 0, Math.PI); X.fillStyle = i % 2 ? '#fff' : C.pink; X.fill(); stroke(5); X.restore(); }
  // rental pigs waiting in the shop window, hopping (gravity arcs)
  rr(200, 900, 680, 300, 20, '#bfeaff');
  [['#e0913c', '#fff6e6'], ['#2e2a2a', '#f2c08a'], ['#c96f2c', '#fff']].forEach((c, i) => gpig(320 + i * 220, 1120 - idleHop(t, .7, 40, i * .23), .7, t, { c1: c[0], c2: c[1], dir: i === 2 ? -1 : 1, face: 'smile', ph: i }));
  rr(180, 1180, 720, 60, 14, '#ff9a5a');
  pop(540, 470, prog(t, T.rent, .25), () => { rr(-330, -80, 660, 160, 30, C.yel); txt('RENT-A-PIG', 0, 4, 92, '#fff', 14); });
  // price tag swinging (pendulum)
  if (t > T.rent) { const th = .6 * Math.exp(-(t - T.rent) * 1.6) * Math.cos((t - T.rent) * 6); X.save(); X.translate(820, 700); X.rotate(th); line(0, 0, 0, 120, INK, 6); rr(-80, 120, 160, 100, 18, C.grn); txt('$', 0, 172, 70, '#fff', 10); X.restore(); }
  // coin flies up in a parabola on "rent"
  if (t > T.rent) { const u = t - T.rent; const x = 300 + 500 * u, y = 1000 - 1400 * u + 0.5 * 3200 * u * u; if (u < 1) { ell(x, y, 40 * Math.abs(Math.cos(u * 20)) + 6, 40, C.yel2, 6); } }
  // delivery: pig parachutes down (drag → terminal velocity), lands on "pig"
  const land = T.rpig, fall = 1.1, vT = 900, tauD = .25;
  const u = t - (land - fall);
  if (u > 0) {
    const dist = (uu) => vT * (uu - tauD * (1 - Math.exp(-uu / tauD)));
    const total = dist(fall), y = 1300 - total + dist(Math.min(u, fall));
    const landed = u >= fall, sw = landed ? 0 : Math.sin(u * 5) * .15;
    X.save(); X.translate(540, y); X.rotate(sw);
    if (!landed || u - fall < .3) { const fade = landed ? 1 - (u - fall) / .3 : 1; X.globalAlpha = fade; X.beginPath(); X.arc(0, -300, 210, Math.PI, 0); X.closePath(); X.fillStyle = C.red; X.fill(); stroke(); for (const s of [-1, 1]) line(s * 200, -300, s * 60, -70, INK, 5); X.globalAlpha = 1; }
    const s2 = squash({ v: 0, hit: landed ? u - fall : 99, impactV: 900 });
    gpig(0, 0, 1.1, t, { c1: '#f4f0e6', c2: '#d9883b', sx: s2.sx, sy: s2.sy, face: 'open', ph: 3 });
    X.restore();
    if (landed) puff(540, 1340, prog(t, land, .45), 1);
  }
}

function sBuddy(t, t0) {
  const sunset = prog(t, T.end - .6, .8);
  sky(sunset > 0 ? '#ff9fb7' : '#ffd1e3', sunset > 0 ? '#ffd27a' : '#fff0f6');
  rr(-100, 1400, W + 200, H, 0, '#8fd18a');
  // they snuggle: rental pig slides in with a soft spring
  const k = prog(t, t0, .5), x2 = lerp(980, 640, eo(k)) + spring(t, t0 + .5, 20, 2.5, .3);
  gpig(400, 1310, 1.3, t, { face: 'smile', eyesO: { closed: t > T.best }, c1: '#5a3a2a', c2: '#f2e2c8', ph: 1 });
  gpig(x2, 1320, 1.25, t, { dir: -1, c1: '#f4f0e6', c2: '#d9883b', face: 'smile', eyesO: { closed: t > T.best }, ph: 3 });
  // RENTAL tag on the buddy's neck on "temporary"
  pop(x2 - 40, 1240, prog(t, T.temp, .25), () => { X.rotate(Math.sin(t * 3) * .1); line(0, -30, 0, 0, INK, 5); rr(-90, 0, 180, 70, 14, C.yel); txt('RENTAL', 0, 36, 36, '#fff', 7); });
  if (t > T.best) for (let i = 0; i < 7; i++) { const u = ((t - T.best) * .6 + i / 7) % 1; heart(520 + Math.sin(u * 8 + i) * 120, 1150 - u * 700, .5 + u * .5, C.pink); }
}

function sBack(t, t0) {
  alps(t, true, 1100);
  // home herd on the right
  const cols = [['#e0913c', '#fff6e6'], ['#2e2a2a', '#f2c08a'], ['#c96f2c', '#fff']];
  const arrive = T.home;
  cols.forEach((c, i) => { const h = t > arrive ? idleHop(t, .55, 60, i * .2) : 0; gpig(760 + i * 110, 1250 + (i % 2) * 70 - h, .7, t, { dir: -1, c1: c[0], c2: c[1], face: t > arrive ? 'open' : 'smile', ph: i }); });
  // little wagon rolling down a slope: constant acceleration a = g·sinθ − friction, then brakes
  const s0 = 70, s1 = 620, Tt = arrive - (t0 + .1);
  const k = clamp((t - t0 - .1) / Tt), pos = lerp(s0, s1, k * k * (3 - 2 * k));
  const y = 1000 + (pos - s0) * .42, ang = Math.atan(.42);
  X.save(); X.translate(pos, y); X.rotate(ang * (1 - k));
  rr(-90, -40, 180, 70, 16, C.red);
  for (const wx of [-55, 55]) { X.save(); X.translate(wx, 38); X.rotate(pos / 30); ell(0, 0, 28, 28, '#444', 6); line(-20, 0, 20, 0, '#fff', 5); X.restore(); }
  gpig(0, -80, .75, t, { c1: '#f4f0e6', c2: '#d9883b', face: 'open', ph: 3, ear: Math.sin(t * 12) * .2 });
  // waving paw
  limb([[30, -120], [70 + Math.sin(t * 12) * 20, -190]], '#f4f0e6', 12);
  X.restore();
  line(-100, 1000 - 70 * .42 + 40, 700, 1000 + 630 * .42 + 40, INK, 0);
  pop(540, 380, prog(t, T.home, .25), () => txt('HOME!', 0, 0, 120, C.yel, 16));
  if (t > T.herd2) confetti(t, T.herd2, 30, 5);
}

function sOutro(t, t0) {
  space(t); rays(540, 900, t, 'rgba(255,255,255,.07)');
  const hopY = idleHop(t, 1.1, 40);
  globzy(540, 980 - hopY, 290, t, { rot: 8 + Math.sin(t) * 6, talk: talkAt(t), pin: 1, brow: t > T.rent2 && t < T.pet + .4 ? 'up' : null, armL: [-420, -200 + Math.sin(t * 6) * 20], armR: t > T.comments ? [380, 330] : [430, -80] });
  // pig sitting on Globzy's head
  gpig(560, 650 - hopY, .8, t, { face: 'smile', c1: '#f4f0e6', c2: '#d9883b', ph: 3, ear: spring(t, t0, .4, 3) });
  for (let i = 0; i < 4; i++) pop(140 + (i % 2) * 800, 520 + Math.floor(i / 2) * 380, prog(t, T.would + i * .15, .3), () => qmark(0, Math.sin(t * 4 + i) * 15, .9, (i % 2 ? .2 : -.2)));
  // comment bubbles on "comments"
  pop(540, 1530, prog(t, T.comments, .3), () => { bubble(0, 0, 520, 130, 60, 110); txt('YES! / NO?', 0, 2, 64, C.pink, 10); });
}

const SCENES = [
  [0, sHook], [T.where - .18, sSpin], [T.mountains - .06, sAlps], [T.guinea - .12, sHerd], [T.alone - .12, sAlone],
  [T.so - .12, sLaw], [T.social - .12, sRule], [T.one2 - .12, sShop], [T.weirder - .5, sWeird], [T.what - .12, sDies],
  [T.survivor - .2, sAlone2], [T.so2 - .12, sRent], [T.temp - .5, sBuddy], [T.last - .45, sBack], [T.would - .15, sOutro],
];
// punch-zoom words (extra +5 %), shakes [t, px]
const PUNCH = [T.illegal, T.swiss, T.mountains, T.laws, T.herd, T.stressed, T.stepped, T.kind, T.wrong, T.two, T.weirder, T.dies, T.rent, T.rpig, T.home, T.comments];
const SHAKE = [[T.illegal, 16], [T.mountains + .32, 18], [T.laws, 14], [T.stepped + .2, 18], [T.wrong, 12], [T.two, 10], [T.rpig, 12]];
