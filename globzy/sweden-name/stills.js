// node stills.js t1 t2 ... -> stills/t.jpg
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + __dirname + '/index.html'); fs.mkdirSync(__dirname + '/stills', { recursive: true });
  for (const t of process.argv.slice(2)) {
    const d = await p.evaluate(t => { try { draw(+t); return document.getElementById('c').toDataURL('image/jpeg', .8); } catch (e) { return 'ERR ' + e.stack; } }, t);
    if (d.startsWith('ERR')) { console.log(t, d); continue; }
    fs.writeFileSync(`${__dirname}/stills/${t}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
  }
  console.log(errs.join('\n') || 'ok'); await b.close();
})();
