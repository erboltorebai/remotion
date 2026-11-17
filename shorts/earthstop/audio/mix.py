"""Voice + synthesized SFX + quiet ambience beds (no music). Output: audio/mix.wav, 48 kHz stereo, -14 LUFS, TP <= -1 dBTP."""
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import butter, sosfilt, resample_poly
SR = 48000
DUR = 1725 / 30
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

# --- events (seconds, locked to story.ts / scenes.ts constants)
put(nrm(screech(.55, 1400)), .40, .8, name='globe brake screech'); put(nrm(thud(55)), .42, 1, name='globe stop thud')
put(nrm(crash()), 2.28, 1.1, .2, 'Dave through wall (hook)'); put(nrm(whoosh(.9, 400, 3000)), 2.3, .9, .5, 'Dave flies east')
put(nrm(whoosh(.35)), 4.15, .5, name='whip to hole'); put(nrm(pop(500)), 5.18, .5, name='flash')
put(nrm(birds(5.4)), 5.25, .12, name='kitchen birds bed'); put(nrm(bed(5.4, 100, 600)), 5.25, .06)
put(nrm(pour(3.4)), 5.95, .28, -.2, 'coffee pour'); put(nrm(whoosh(.9, 300, 2500)), 9.5, .7, name='camera leaves through roof')
put(nrm(bed(6.1, 250, 2200, .25, 1.3)), 10.7, .32, name='speed rush bed'); put(nrm(jet()), 13.95, .75, name='jet falls behind')
for k in range(3): put(nrm(pop(180 + 40 * k)), 15.8 + k * .3, .5, .4 - k * .4, 'sound waves' if k == 0 else '')
put(nrm(slurp()), 16.95, .35, name='sip'); put(nrm(pop(900)), 17.53, .6, name='question mark pop')
put(nrm(birds(5)), 16.8, .1); put(nrm(bed(2.7, 300, 1800, .2, 2)), 19.0, .14, name='soft speed bed')
put(nrm(slurp(.3)), 19.22, .3); put(nrm(meow()), 21.12, .4, .3, 'cat')
put(nrm(whoosh(.3)), 21.5, .4)
put(nrm(engine(5.2)), 21.75, .3, name='bus engine bed'); put(nrm(bed(5.2, 200, 1500, .2, 3)), 21.75, .1)
put(nrm(slurp()), 24.52, .35, name='sip on bus'); put(nrm(snore()), 24.86, .45, -.3, 'snore')
put(nrm(screech(1.45, 1900)), 26.9, .8, name='bus brakes'); put(nrm(thud(80)), 26.9, .7)
put(nrm(whoosh(.6, 500, 3000)), 28.45, .7, name='Dave flies down the aisle')
put(nrm(thud(90, .3)), 29.03, 1.1, name='splat on windshield'); put(nrm(glass()), 29.05, .6, name='glass crack'); put(nrm(pop(500)), 29.34, .4)
put(nrm(engine(.85, 40)), 29.36, .35, name='Earth spin hum'); put(nrm(screech(.7, 1200)), 30.1, .9, name='Earth brakes'); put(nrm(thud(45, .5)), 30.14, 1.1)
put(nrm(thud(60)), 31.25, 1.0, name='kitchen jolt'); put(nrm(bp(noise(.8), 500, 4000) * env(int(.8 * SR), .05, .6)), 31.27, .3, name='rattle')
put(nrm(whoosh(.95, 300, 2400)), 32.28, .7, .3, 'Dave slides east'); put(nrm(crash()), 33.2, 1.1, .5, 'through the kitchen wall')
for i, tt in enumerate([34.2, 34.72, 35.12]): put(nrm(whoosh(.4, 600 + 200 * i, 3000)), tt - .03, .7, .4, ['coffee', 'cat', 'couch'][i] + ' flies out'); put(nrm(pop(400 - 60 * i)), tt, .5)
put(nrm(meow()), 34.74, .4, .4); put(nrm(crash(1.1)), 35.88, 1.1, name='most of the kitchen')
put(nrm(bed(4.6, 150, 1800, .45, 1.1)), 36.4, .5, name='hurricane wind bed'); put(nrm(bed(4.6, 700, 3500, .6, 2.3)), 36.4, .22)
for tt in [37.2, 37.7, 38.12, 38.54, 38.96]: put(nrm(crash(.5)), tt, .5, rng.uniform(-.5, .5), 'roofs / mailbox rip off' if tt == 37.2 else '')
put(nrm(lp(noise(4.0), 400) * env(int(4 * SR), .5, .3)), 40.9, .5, name='ocean rumble bed'); put(nrm(bed(4.0, 500, 4000, .5, .9)), 40.9, .18)
for k in range(11): put(nrm(thud(50, .3)), 41.0 + (k + .5) * np.pi / 9, .75, -.3, 'wave footsteps' if k == 0 else '')
put(nrm(whoosh(.8, 300, 2000)), 44.85, .6, name='dive to the pole')
put(nrm(bed(11.8, 300, 1400, .5, .25)), 45.7, .14, name='polar wind bed')
for i, tt in enumerate([51.95, 52.3, 52.6, 52.9]): put(nrm(whoosh(.7, 500, 2500)), tt, .22, -.6 + i * .4, 'the world flies past, far away' if i == 0 else '')
put(nrm(slurp(.45)), 53.5, .35, -.2, 'cocoa sip')
for k in range(16): put(nrm(click()), 54.7 + k * .105 + rng.uniform(-.02, .02), .3, .2, 'typing' if k == 0 else '')
put(nrm(click()), 56.62, .4)

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
