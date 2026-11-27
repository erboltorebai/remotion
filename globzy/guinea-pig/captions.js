// Word-by-word karaoke captions, phrases of 2-4 words.
const PHRASES = (() => {
  const out = []; let cur = [];
  WD.forEach((x, i) => {
    cur.push(x);
    const punct = /[.,!?…]$/.test(x.w), next = WD[i + 1];
    const gap = next ? next.s - x.e : 9;
    const nextEnds = next && /[.,!?]$/.test(next.w) && cur.length < 5;
    if ((cur.length >= 4 && !nextEnds) || (punct && cur.length >= 2) || (gap > .35 && cur.length >= 1) || !next || (punct && /[.!?]$/.test(x.w))) { out.push(cur); cur = []; }
  });
  return out.map((ws, i, a) => ({ ws, s: ws[0].s, e: a[i + 1] ? Math.min(a[i + 1][0].s, ws[ws.length - 1].e + .5) : ws[ws.length - 1].e + .5 }));
})();
function captions(t) {
  const ph = PHRASES.find(p => t >= p.s - .03 && t < p.e); if (!ph) return;
  const words = ph.ws.map(x => x.w.toUpperCase().replace(/[.,…]+$/, ''));
  let size = 58; const font = s => `900 ${s}px "Arial Black","DejaVu Sans",sans-serif`;
  // layout into max 2 lines within 960 px
  let lines;
  for (;;) {
    X.font = font(size); const sp = X.measureText(' ').width; lines = [[]]; let lw = 0;
    words.forEach((wd, i) => { const ww = X.measureText(wd).width; if (lw + ww > 960 && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += ww + sp; });
    if (lines.length <= 2 || size < 36) break; size -= 4;
  }
  const k = back(prog(t, ph.s - .03, .13)), sc = lerp(.75, 1, k);
  X.save(); X.translate(540, 1765); X.scale(sc, sc); X.font = font(size); X.textBaseline = 'middle'; X.textAlign = 'left'; X.lineJoin = 'round';
  const sp = X.measureText(' ').width, lh = size * 1.15;
  lines.forEach((ln, li) => {
    const widths = ln.map(i => X.measureText(words[i]).width), tot = widths.reduce((a, b) => a + b, 0) + sp * (ln.length - 1);
    let x = -tot / 2; const y = (li - (lines.length - 1) / 2) * lh;
    ln.forEach((i, j) => {
      const wobj = ph.ws[i], active = t >= wobj.s - .03 && (t < wobj.e + .05 || i === ph.ws.length - 1);
      const isCur = active && (i === ph.ws.length - 1 ? t >= wobj.s - .03 : t < (ph.ws[i + 1]?.s ?? 99) - .03);
      X.lineWidth = 14; X.strokeStyle = INK; X.fillStyle = INK;
      X.strokeText(words[i], x + 3, y + 3); X.fillText(words[i], x + 3, y + 3);
      X.strokeText(words[i], x, y); X.fillStyle = isCur ? C.yel : '#fff'; X.fillText(words[i], x, y);
      x += widths[j] + sp;
    });
  });
  X.restore();
}
