"""Voice + synthesized SFX + quiet ambience beds (no music). Output: audio/mix.wav, 48 kHz stereo, -14 LUFS, TP <= -1 dBTP."""
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import butter, sosfilt, resample_poly
SR = 48000
DUR = 1730 / 30
N = int(DUR * SR)
rng = np.random.default_rng(7)
def t_(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def whoosh(d=0.45, f0=500, f1=2600):
    x = noise(d); n = len(x); out = np.zeros(n); k = 6
    for i in range(k):  # swept band
        seg = slice(i * n // k, (i + 1) * n // k); f = f0 + (f1 - f0) * (i + .5) / k
        out[seg] = bp(x, f * .6, f * 1.5)[seg]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2
def thud(f=70, d=0.35):
    t = t_(d); return np.sin(2 * np.pi * (f * (1 + 2 * np.exp(-t * 30))) * t) * np.exp(-t * 14) + lp(noise(d), 300) * np.exp(-t * 25) * .6
def crash(d=0.9):
    t = t_(d); x = bp(noise(d), 200, 5000) * np.exp(-t * 6)
    for k in range(7):
        s = int(rng.uniform(0, d - .1) * SR); c = t_(0.08); x[s:s + len(c)] += np.sin(2 * np.pi * rng.uniform(300, 1400) * c) * np.exp(-c * 60) * .5
    return x + np.pad(thud(60, .4), (0, len(x) - int(.4 * SR)))
def screech(d=0.8, f=1700):
    t = t_(d); ph = 2 * np.pi * np.cumsum(f * (1 - .25 * t / d) * (1 + .012 * np.sin(2 * np.pi * 37 * t))) / SR
    return (np.sign(np.sin(ph)) * .35 + np.sin(ph * 1.51) * .4 + bp(noise(d), 1500, 6000) * .5) * env(len(t), .02, d * .5)
def pop(f=700):
    t = t_(.12); return np.sin(2 * np.pi * f * (1 + 3 * t) * t) * np.exp(-t * 40)
def slurp(d=.35):
    t = t_(d); return bp(noise(d), 900, 2600) * (0.5 + .5 * np.sin(2 * np.pi * 22 * t)) * env(len(t), .05, .1)
def meow():
    t = t_(.5); f = 520 + 380 * np.sin(np.pi * t / .5) ** .7; ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .5 * np.sin(2 * ph) + .3 * np.sin(3 * ph)) * env(len(t), .06, .2)
def snore():
    t = t_(.7); return lp(noise(.7), 500) * (0.5 + .5 * np.sign(np.sin(2 * np.pi * 28 * t))) * env(len(t), .25, .3)
def click():
    t = t_(.03); return bp(noise(.03), 1500, 6000) * np.exp(-t * 200)
def glass():
    t = t_(.5); x = hp(noise(.5), 3000) * np.exp(-t * 14)
    for k in range(8): x += np.sin(2 * np.pi * rng.uniform(2500, 7000) * t) * np.exp(-t * rng.uniform(15, 40)) * .15
    return x
def bed(d, lo, hi, wob=0.3, rate=.4):
    t = t_(d); return bp(noise(d), lo, hi) * (1 - wob + wob * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6))) * env(len(t), .25, .3)
def jet(d=1.9):
    t = t_(d); x = bp(noise(d), 300, 3500) + .3 * np.sin(2 * np.pi * np.cumsum(900 - 350 * t / d) / SR)
    return x * np.sin(np.linspace(0, np.pi, len(t))) ** 1.5
def birds(d):
    x = np.zeros(int(d * SR))
    for k in range(int(d * 2.2)):
        s = int(rng.uniform(0, d - .2) * SR); c = t_(.09); f = rng.uniform(2800, 4600)
        x[s:s + len(c)] += np.sin(2 * np.pi * (f + 900 * np.sin(2 * np.pi * 18 * c)) * c) * np.sin(np.pi * c / .09)
    return x
def pour(d):
    t = t_(d); return bp(noise(d), 1200, 5000) * (.6 + .4 * np.sin(2 * np.pi * 31 * t)) * env(len(t), .1, .2)
def engine(d, f=55):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.01 * t) + lp(noise(d), 220) * .8) * env(len(t), .2, .1)

L = np.zeros(N); R = np.zeros(N); cues = []
def put(x, t, g=1.0, pan=0.0, name=''):
    s = int(t * SR); x = x[:max(0, N - s)] * g
    L[s:s + len(x)] += x * min(1, 1 - pan); R[s:s + len(x)] += x * min(1, 1 + pan)
    if name: cues.append((t, name))
def nrm(x, peak=.5): return x / (np.abs(x).max() + 1e-9) * peak

# --- events (seconds, locked to scenes.ts constants)
def hum(d, f=120): t = t_(d); return (np.sin(2*np.pi*f*t) + .4*np.sin(2*np.pi*f*2*t) + .2*np.sin(2*np.pi*f*3*t)) * env(len(t), .05, .08)
def beep(f=1900, d=.11): t = t_(d); return np.sin(2*np.pi*f*t) * env(len(t), .005, .03)
def powerdown(d=.7): t = t_(d); ph = 2*np.pi*np.cumsum(420*np.exp(-t*4.5)+40)/SR; return (np.sin(ph)+.4*np.sin(2*ph)) * env(len(t), .01, .3)
def clunk(): return thud(95, .22) + np.pad(click(), (0, int(.22*SR)-int(.03*SR)))*2
def alarm(d): t = t_(d); f = 620 + 260*(np.sign(np.sin(2*np.pi*3*t))>0); return np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*.5 * env(len(t), .02, .05)
def whistle(d=.7): t = t_(d); return np.sin(2*np.pi*(2900+60*np.sin(2*np.pi*38*t))*t) * env(len(t), .03, .1)
def kettle(d=1.8): t = t_(d); return (np.sin(2*np.pi*np.cumsum(1800+900*t/d)/SR)*.6 + bp(noise(d), 2500, 7000)*.5) * env(len(t), .6, .3)
def crowd(d): t = t_(d); return bp(noise(d), 400, 2400) * (.6+.4*np.sin(2*np.pi*.9*t)) * env(len(t), .2, .3)
def beat(): return thud(58, .16)
put(nrm(bed(2.3, 100, 600)), 0, .06, name='kitchen room tone'); put(nrm(beep()), 1.05, .5, -.2, 'microwave start beep')
put(nrm(hum(1.25)), 1.1, .3, -.2, 'microwave hum'); put(nrm(whoosh(.5, 300, 2400)), 1.95, .6, name='camera out of the roof')
put(nrm(bed(1.9, 200, 1500, .3, .5)), 2.35, .1, name='evening air'); put(nrm(powerdown()), 3.4, .9, name='lights go out'); put(nrm(clunk()), 3.42, .8)
put(nrm(click()), 5.0, .5, .2, 'one sad kernel tick'); put(nrm(pop(500)), 5.58, .5, name='flash')
put(nrm(crowd(2.9)), 5.6, .2, -.3, 'TV crowd'); put(nrm(whistle(.35)), 7.9, .25, -.3, 'kick-off whistle')
put(nrm(bed(3.9, 200, 1500, .3, .5)), 8.55, .1); put(nrm(whoosh(1.6, 250, 1800)), 9.2, .4, name='rise over the houses')
for k in range(9): put(nrm(beep(1700 + 60*(k % 4))), 11.78 + k*.028, .35, -.8 + k*.2, 'everyone presses start' if k == 0 else '')
put(nrm(hum(.7)), 11.82, .5); put(nrm(whoosh(.3)), 12.42, .4)
put(nrm(hum(2.3)), 12.5, .32, -.2, 'one microwave hum'); put(nrm(bed(.85, 600, 5000, .1, 9)), 14.9, .4, .4, 'hair dryer')
put(nrm(bed(6.1, 80, 500, .3, .3)), 15.75, .28, name='power plant rumble'); put(nrm(bed(6.1, 1500, 6000, .4, .7)), 15.75, .06, name='steam hiss')
put(nrm(thud(45, .5)), 20.3, 1.0, name='"Combined" hit'); put(nrm(hum(1.5, 60)), 20.3, .6, name='overload buzz')
for k in range(5): put(nrm(glass()[:int(.15*SR)]), 20.9 + k*.17, .3, rng.uniform(-.5, .5), 'wire sparks' if k == 0 else '')
put(nrm(pop(900)), 22.15, .6, name='question mark pop'); put(nrm(bed(2, 100, 600)), 21.84, .06)
put(nrm(bed(5.1, 150, 900, .3, .4)), 23.8, .12, name='night crickets bed'); put(nrm(birds(5.0)), 23.8, .03)
put(nrm(hum(2.5, 180)), 25.85, .3, name='pulse travels down the line'); put(nrm(whoosh(2.4, 300, 1600)), 25.9, .35); put(nrm(beep(1200, .2)), 28.35, .4, .3, 'pulse arrives')
put(nrm(bed(6.4, 200, 1200, .3, .4)), 28.9, .08, name='hill night bed')
for k in range(24):
    tt = 29.0 + k*.24*(1 + max(0, k-13)*.09)
    if tt < 35.2: put(nrm(click()), tt, .22, -.2, 'bike chain' if k == 0 else '')
for k in range(14): put(nrm(thud(70 + rng.uniform(-15, 25), .2)), 32.5 + k*.105, .6, -.4 + rng.uniform(-.3, .3), 'friends land on the back' if k == 0 else '')
put(nrm(whoosh(1.2, 600, 2000)), 32.15, .5, -.3); put(nrm(screech(.9, 500)), 34.4, .3, name='pedals groan')
put(nrm(bed(7.3, 100, 500)), 35.3, .08, name='control room tone')
bt = 35.5; k = 0
while bt < 39.1:
    put(nrm(beat()), bt, .7, name='grid heartbeat' if k == 0 else ''); put(nrm(beep(880, .07)), bt, .3); k += 1
    bt += .36 * (1 + max(0, bt - 38.0) * .9)
put(nrm(alarm(3.4)), 39.15, .42, name='alarm'); put(nrm(thud(60)), 39.15, .8)
put(nrm(whoosh(.9, 400, 2000)), 40.3, .4, .5, 'engineer runs'); put(nrm(clunk()), 41.72, 1.1, .5, 'giant switch'); put(nrm(thud(42, .6)), 41.74, 1.0)
for k in range(9): put(nrm(clunk()), 42.8 + k*.2, .7 - k*.03, -.7 + k*.14, 'city blocks switch off' if k == 0 else ''); put(nrm(powerdown(.4)), 42.8 + k*.2, .3, -.7 + k*.14)
put(nrm(bed(1.1, 200, 1500, .3, .5)), 44.95, .08); put(nrm(clunk()), 45.38, .9, name='your house goes dark'); put(nrm(powerdown(.5)), 45.38, .6)
put(nrm(click()), 46.2, .6, name='torch click'); put(nrm(bed(2.1, 100, 500)), 46.05, .05)
put(nrm(crowd(3.2)), 48.15, .2, name='soccer on TV'); put(nrm(slurp(.3)), 49.0, .25, -.3, 'tea sip')
put(nrm(whistle(.75)), 51.38, .5, name='final whistle'); put(nrm(crowd(.8)), 51.4, .35)
for k in range(5): put(nrm(kettle(1.7)), 52.0 + k*.22, .16, -.8 + k*.4, 'kettles boil' if k == 0 else '')
put(nrm(bed(3.6, 100, 500)), 54.1, .06, name='dark kitchen'); put(nrm(bp(noise(.3), 2000, 7000) * env(int(.3*SR), .02, .2)), 56.45, .3, .2, 'bag rustle')
for k in range(3): put(nrm(click()), 56.92 + k*.11, .7, .3, 'kernels hit the floor' if k == 0 else '')

sfx = np.stack([L, R], 1) * 10 ** (-6 / 20)  # user rule: SFX 6 dB under a normal mix
v, sr = sf.read('voice/voice.wav'); assert sr == SR and v.ndim == 1
v = np.pad(v, (0, max(0, N - len(v))))[:N]
meter = pyln.Meter(SR)
v = v * 10 ** ((-15.0 - meter.integrated_loudness(v)) / 20)
mix = np.stack([v, v], 1) + sfx * 0.55
C = 10 ** (-1.3 / 20)
def limit(x, c=C, knee=.6):  # soft-knee peak limiter: linear below knee*c, tanh above
    a = np.abs(x); k = knee * c
    return np.where(a <= k, x, np.sign(x) * (k + (c - k) * np.tanh((a - k) / (c - k))))
for _ in range(6):
    mix = limit(mix * 10 ** ((-14.0 - meter.integrated_loudness(mix)) / 20))
tp = np.abs(resample_poly(mix, 4, 1, axis=0)).max()
if tp > 10 ** (-1 / 20): mix *= 10 ** (-1 / 20) / tp; tp = 10 ** (-1 / 20)
sf.write('audio/mix.wav', mix, SR, subtype='PCM_16'); sf.write('audio/sfx.wav', sfx, SR, subtype='PCM_16')
open('audio/cues.md', 'w').write('# SFX cues\n\n' + '\n'.join(f'- {t:6.2f} s  {n}' for t, n in sorted(cues)) + '\n')
print('LUFS', round(meter.integrated_loudness(mix), 2), 'TP dB', round(20 * np.log10(tp), 2), 'len', len(mix) / SR)
