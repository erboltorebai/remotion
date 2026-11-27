// node render.js [workers] -> frames/%05d.jpg (q .92), 30 fps
const { chromium } = require('playwright'); const fs = require('fs');
const N = +(process.argv[2] || 4), FPS = 30;
(async () => {
  fs.rmSync(__dirname + '/frames', { recursive: true, force: true }); fs.mkdirSync(__dirname + '/frames');
  const b = await chromium.launch();
  const p0 = await b.newPage(); await p0.goto('file://' + __dirname + '/index.html');
  const dur = await p0.evaluate(() => window.DURATION); await p0.close();
  const total = Math.ceil(dur * FPS); console.log('frames', total, 'dur', dur.toFixed(3));
  fs.writeFileSync(__dirname + '/duration.txt', String(total / FPS));
  await Promise.all([...Array(N)].map(async (_, k) => {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); await p.goto('file://' + __dirname + '/index.html');
    for (let i = k; i < total; i += N) {
      const d = await p.evaluate(t => { draw(t); return document.getElementById('c').toDataURL('image/jpeg', .92); }, i / FPS);
      fs.writeFileSync(`${__dirname}/frames/${String(i).padStart(5, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    }
  }));
  await b.close(); console.log('done');
})();
