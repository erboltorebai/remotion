#!/usr/bin/env python3
"""Audio pipeline for the guinea-pig cartoon short.

Usage: python3 audio.py voice.wav cues.json out_mix.wav

Voice chain + synthesized SFX + soft generated music -> stereo 48 kHz 16-bit WAV.
Only numpy, scipy and soundfile are used. Fully deterministic (fixed seeds).
"""
import json
import sys
from fractions import Fraction

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, resample_poly, sosfilt, lfilter

FS = 48000
SEED = 1234
VOICE_PEAK = 0.8
SFX_BUS_PEAK = 0.34
MUSIC_BELOW_SPEECH_DB = 19.0
DUCK_DB = 6.0
FINAL_PEAK = 0.95

SFX_POINT = ["whoosh", "pop", "ding", "sparkle", "boing", "stamp", "buzzer",
             "kaching", "harp", "tick", "squeak"]
SFX_RANGE = ["crickets", "riser", "siren"]
SFX_ALL = SFX_POINT + SFX_RANGE


# ----------------------------------------------------------------- helpers
def tvec(dur):
    return np.arange(int(round(dur * FS))) / FS


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=FS, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=FS, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=FS, output="sos"), x)


def shelf(x, f0, gain_db, kind):
    """RBJ cookbook shelf (S=1)."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / FS
    c, s = np.cos(w0), np.sin(w0)
    alpha = s / 2 * np.sqrt(2)
    sa = 2 * np.sqrt(A) * alpha
    if kind == "low":
        b = [A * ((A + 1) - (A - 1) * c + sa), 2 * A * ((A - 1) - (A + 1) * c),
             A * ((A + 1) - (A - 1) * c - sa)]
        a = [(A + 1) + (A - 1) * c + sa, -2 * ((A - 1) + (A + 1) * c),
             (A + 1) + (A - 1) * c - sa]
    else:
        b = [A * ((A + 1) + (A - 1) * c + sa), -2 * A * ((A - 1) + (A + 1) * c),
             A * ((A + 1) + (A - 1) * c - sa)]
        a = [(A + 1) - (A - 1) * c + sa, 2 * ((A - 1) - (A + 1) * c),
             (A + 1) - (A - 1) * c - sa]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def svf_bandpass(x, fc, q):
    """Chamberlin state-variable band-pass with per-sample cutoff array."""
    f = 2 * np.sin(np.pi * np.clip(fc, 20, FS / 7) / FS)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        low += f[i] * band
        high = x[i] - low - damp * band
        band += f[i] * high
        out[i] = band
    return out


def ramp_env(n, attack, release):
    env = np.ones(n)
    a, r = min(int(attack * FS), n), min(int(release * FS), n)
    if a > 0:
        env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if r > 0:
        env[n - r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return env


def phase_from_freq(freq):
    return 2 * np.pi * np.cumsum(freq) / FS


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) if len(x) else 0.0
    return x * (peak / m) if m > 0 else x


def soft_limit(x, ceiling, knee_start):
    """Identity below knee_start, tanh-compressed above, never exceeds ceiling."""
    a = np.abs(x)
    over = a > knee_start
    span = ceiling - knee_start
    y = a.copy()
    y[over] = knee_start + span * np.tanh((a[over] - knee_start) / span)
    return np.sign(x) * y


def polyblep_saw(freq, n, phase0):
    dt = freq / FS
    t = (phase0 + dt * np.arange(n)) % 1.0
    y = 2 * t - 1
    m = t < dt
    x = t[m] / dt
    y[m] -= x + x - x * x - 1
    m = t > 1 - dt
    x = (t[m] - 1) / dt
    y[m] -= x * x + x + x + 1
    return y


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------- voice
def load_voice(path):
    x, sr = sf.read(path, always_2d=True, dtype="float64")
    x = x.mean(axis=1)
    if sr != FS:
        fr = Fraction(FS, sr).limit_denominator(1000)
        x = resample_poly(x, fr.numerator, fr.denominator)
    return x


def process_voice(x):
    if len(x) == 0 or np.max(np.abs(x)) == 0:
        return x
    x = hp(x - np.mean(x), 70)
    x = shelf(x, 3000, 3.0, "high")     # presence
    x = shelf(x, 200, 1.5, "low")       # warmth
    x = norm(x, 1.0)

    # Compressor: 3:1, 6 dB soft knee, 5 ms attack, 80 ms release (1 ms blocks).
    hop = 48
    nb = int(np.ceil(len(x) / hop))
    pad = np.zeros(nb * hop)
    pad[:len(x)] = x
    lvl = 10 * np.log10(np.mean(pad.reshape(nb, hop) ** 2, axis=1) + 1e-12)
    active = lvl > lvl.max() - 40
    thr = (10 * np.log10(np.mean(10 ** (lvl[active] / 10))) if active.any() else -20) - 4
    ratio, knee = 3.0, 6.0
    over = lvl - thr
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 / ratio - 1),
                           (1 / ratio - 1) * (over + knee / 2) ** 2 / (2 * knee)))
    ca = np.exp(-1 / (0.005 * FS / hop))
    cr = np.exp(-1 / (0.080 * FS / hop))
    g = np.empty(nb)
    s = 0.0
    for i in range(nb):
        c = ca if gr[i] < s else cr
        s = c * s + (1 - c) * gr[i]
        g[i] = s
    gs = np.interp(np.arange(len(x)), np.arange(nb) * hop + hop / 2, g)
    x = x * 10 ** (gs / 20)

    x = norm(x, 1.0)
    x = np.tanh(1.3 * x) / np.tanh(1.3)   # soft tanh limiter
    return norm(x, VOICE_PEAK)


# --------------------------------------------------------------------- SFX
def sfx_whoosh(rng):
    t = tvec(0.35)
    n = len(t)
    pk = 0.15
    fc = np.where(t < pk, 500 + 2300 * (t / pk) ** 1.5,
                  2800 - 2000 * ((t - pk) / (0.35 - pk)))
    y = svf_bandpass(rng.standard_normal(n), fc, 1.6)
    env = np.where(t < pk, (t / pk) ** 2, np.exp(-(t - pk) / 0.06))
    y = lp(y * env * ramp_env(n, 0, 0.02), 6000)
    return norm(y, 0.7), -pk


def sfx_pop(rng):
    t = tvec(0.07)
    f = 950 * np.exp(-t / 0.025) + 300
    y = np.sin(phase_from_freq(f)) * np.exp(-t / 0.02) * ramp_env(len(t), 0.002, 0.01)
    return norm(y, 0.8), 0.0


def sfx_ding(rng):
    t = tvec(0.9)
    f0 = 1046.5
    y = np.zeros_like(t)
    # bell partials; fundamental rings out over ~0.8 s
    for ratio, amp, dec in [(1, 1, 0.27), (2.0, 0.35, 0.17), (2.76, 0.25, 0.12),
                            (4.07, 0.1, 0.08), (5.4, 0.05, 0.05)]:
        y += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / dec)
    y *= ramp_env(len(t), 0.002, 0.1)
    return norm(y, 0.55), 0.0


def sfx_sparkle(rng):
    t = tvec(0.5)
    y = np.zeros_like(t)
    for k in range(6):
        st = k * 0.04 + rng.uniform(0, 0.012)
        f = rng.uniform(2600, 5200)
        tt = t - st
        m = tt >= 0
        y[m] += (0.85 ** k) * np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] / 0.09) \
            * np.minimum(tt[m] / 0.002, 1)
    y = lp(y * ramp_env(len(t), 0, 0.05), 7000)
    return norm(y, 0.42), 0.0


def sfx_boing(rng):
    t = tvec(0.4)
    base = 340 * (1 - 0.55 * t / 0.4)
    vib = 1 + 0.09 * np.exp(-t / 0.25) * np.sin(2 * np.pi * 13 * t)
    y = np.sin(phase_from_freq(base * vib))
    y = (y + 0.15 * np.sin(2 * phase_from_freq(base * vib))) * np.exp(-t / 0.18)
    y *= ramp_env(len(t), 0.004, 0.04)
    return norm(y, 0.7), 0.0


def sfx_stamp(rng):
    t = tvec(0.35)
    f = 60 + 40 * np.exp(-t / 0.03)
    thud = np.sin(phase_from_freq(f)) * np.exp(-t / 0.09)
    nz = rng.standard_normal(len(t)) * np.exp(-t / 0.012)
    nz = lp(nz, 2200) * 0.6
    y = (thud + nz) * ramp_env(len(t), 0.001, 0.05)
    return norm(lp(y, 5000), 0.9), 0.0


def sfx_buzzer(rng):
    t = tvec(0.45)
    y = np.zeros_like(t)
    for f in (110.0, 116.0):
        for h in range(1, 40, 2):  # band-limited square
            if f * h > 3000:
                break
            y += np.sin(2 * np.pi * f * h * t) / h
    y = lp(y, 1400, 4) * ramp_env(len(t), 0.01, 0.05)
    return norm(y, 0.45), 0.0


def sfx_kaching(rng):
    t = tvec(0.9)
    n = len(t)
    y = np.zeros(n)
    # "ka": short mechanical click
    ka = bp(rng.standard_normal(n), 900, 2500) * np.exp(-t / 0.008)
    y += 0.5 * ka
    # "ching": metallic inharmonic partials
    st = 0.07
    tt = t - st
    m = tt >= 0
    for f, a, d in [(2093, 1.0, 0.5), (3135, 0.6, 0.35), (4186, 0.45, 0.3),
                    (5274, 0.3, 0.2), (2637, 0.5, 0.4)]:
        y[m] += a * np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] / d) * np.minimum(tt[m] / 0.002, 1)
    # coin rattles
    for _ in range(9):
        cs = rng.uniform(0.12, 0.55)
        f = rng.uniform(3000, 6500)
        tc = t - cs
        mc = tc >= 0
        y[mc] += rng.uniform(0.15, 0.35) * np.sin(2 * np.pi * f * tc[mc]) * np.exp(-tc[mc] / 0.025)
    y = lp(y * ramp_env(n, 0.001, 0.1), 8000)
    return norm(y, 0.6), 0.0


def sfx_harp(rng):
    notes = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]  # C major pentatonic up
    t = tvec(1.0 + 1.4)
    y = np.zeros_like(t)
    for k, m in enumerate(notes):
        st = k * 0.09
        tt = t - st
        msk = tt >= 0
        f = midi_hz(m)
        tone = (np.sin(2 * np.pi * f * tt[msk]) + 0.4 * np.sin(4 * np.pi * f * tt[msk]) * np.exp(-tt[msk] / 0.25)
                + 0.15 * np.sin(6 * np.pi * f * tt[msk]) * np.exp(-tt[msk] / 0.12))
        y[msk] += tone * np.exp(-tt[msk] / 0.6) * np.minimum(tt[msk] / 0.003, 1) * (0.8 + 0.2 * k / 10)
    y = y * ramp_env(len(t), 0, 0.3)
    return norm(lp(y, 6000), 0.6), 0.0


def sfx_tick(rng):
    t = tvec(0.03)
    y = bp(rng.standard_normal(len(t)), 2000, 5000) * np.exp(-t / 0.002)
    y += 0.5 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.004)
    return norm(y * ramp_env(len(t), 0.0005, 0.005), 0.45), 0.0


def sfx_squeak(rng):
    """Guinea-pig wheek: two quick rising-falling chirps."""
    parts = []
    for k, (dur, top) in enumerate([(0.11, 2500), (0.13, 2750)]):
        t = tvec(dur)
        u = t / dur
        contour = 1500 + (top - 1500) * np.sin(np.pi * u ** 0.7) - 250 * u
        f = contour * (1 + 0.02 * np.sin(2 * np.pi * 38 * t))
        ph = phase_from_freq(f)
        tone = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
        env = np.sin(np.pi * u) ** 0.8
        parts.append(tone * env)
        if k == 0:
            parts.append(np.zeros(int(0.035 * FS)))
    y = np.concatenate(parts)
    y = lp(y, 7000) + 0.01 * lp(rng.standard_normal(len(y)), 4000) * np.abs(y)
    return norm(y, 0.55), 0.0


def sfx_crickets(rng, dur):
    t = tvec(dur)
    n = len(t)
    y = np.zeros(n)
    pos = rng.uniform(0, 0.2)
    while pos < dur - 0.15:
        f = 4500 * rng.uniform(0.97, 1.03)
        npulse = rng.integers(3, 5)
        for p in range(npulse):
            s = pos + p * 0.03
            tt = t - s
            m = (tt >= 0) & (tt < 0.022)
            y[m] += np.sin(2 * np.pi * f * tt[m]) * np.sin(np.pi * tt[m] / 0.022) ** 2
        pos += rng.uniform(0.45, 0.75)
    y *= ramp_env(n, 0.2, 0.3)
    return norm(y, 0.3), 0.0


def sfx_riser(rng, dur):
    t = tvec(dur)
    n = len(t)
    u = t / dur
    fc = 300 * (12 ** u)
    nz = svf_bandpass(rng.standard_normal(n), fc, 2.0)
    sine = np.sin(phase_from_freq(180 * (5 ** u))) * 0.5
    env = u ** 2
    y = (norm(nz) * 0.7 + sine) * env * ramp_env(n, 0.02, 0.025)
    return norm(lp(y, 7000), 0.55), -dur


def sfx_siren(rng, dur):
    t = tvec(dur)
    n = len(t)
    # two-tone wail: smooth glide between 640 Hz and 900 Hz
    lfo = 0.5 - 0.5 * np.cos(2 * np.pi * 1.1 * t)
    lfo = lfo ** 0.6
    f = 640 + 260 * lfo
    ph = phase_from_freq(f)
    y = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    y = lp(y, 2500, 4) * ramp_env(n, 0.08, 0.15)
    return norm(y, 0.4), 0.0


SFX_FUNCS = {
    "whoosh": sfx_whoosh, "pop": sfx_pop, "ding": sfx_ding, "sparkle": sfx_sparkle,
    "boing": sfx_boing, "stamp": sfx_stamp, "buzzer": sfx_buzzer, "kaching": sfx_kaching,
    "harp": sfx_harp, "tick": sfx_tick, "squeak": sfx_squeak,
    "crickets": sfx_crickets, "riser": sfx_riser, "siren": sfx_siren,
}


def build_sfx(cues, n):
    """Returns (stereo bus normalised to SFX_BUS_PEAK, per-type peak dict)."""
    bus = np.zeros((n, 2))
    per_type = {}
    for ti, name in enumerate(SFX_ALL):
        events = cues.get(name) or []
        layer = np.zeros((n, 2))
        for ei, ev in enumerate(events):
            rng = np.random.default_rng([SEED, ti, ei])
            if name in SFX_RANGE:
                t0, dur = float(ev[0]), float(ev[1])
                if dur <= 0:
                    continue
                y, off = SFX_FUNCS[name](rng, dur)
            else:
                t0 = float(ev)
                y, off = SFX_FUNCS[name](rng)
            pan = rng.uniform(-0.12, 0.12)
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            gl, gr = gl * np.sqrt(2), gr * np.sqrt(2)
            s = int(round((t0 + off) * FS))
            a, b = max(s, 0), min(s + len(y), n)
            if b <= a:
                continue
            seg = y[a - s:b - s]
            layer[a:b, 0] += seg * gl
            layer[a:b, 1] += seg * gr
        if events:
            per_type[name] = float(np.max(np.abs(layer)))
        bus += layer
    peak = np.max(np.abs(bus)) if n else 0.0
    gain = SFX_BUS_PEAK / peak if peak > 0 else 1.0
    return bus * gain, {k: v * gain for k, v in per_type.items()}


# ------------------------------------------------------------------- music
BPM = 84
BEAT = 60.0 / BPM
BAR = 4 * BEAT
# F major: I - vi - IV - V  (F, Dm, Bb, C)
CHORDS = [[53, 57, 60], [53, 57, 62], [53, 58, 62], [52, 55, 60]]
BASS = [41, 38, 34, 36]
MELODY = [
    [[(0, 84), (2, 81), (3, 79)], [(0, 77), (2, 81)], [(0, 82), (1.5, 81), (2, 77)], [(0, 79), (2, 76), (3, 79)]],
    [[(0, 77), (1, 81), (2, 84)], [(0, 86), (2, 84)], [(0, 82), (2, 86)], [(0, 84), (2, 79)]],
]


def build_music(n):
    rng = np.random.default_rng(SEED + 7)
    out = np.zeros((n + int(4 * FS), 2))
    tail = 1.2
    seg_n = int((BAR + tail) * FS)
    ts = np.arange(seg_n) / FS

    # Pre-render each chord's pad + e-piano segment (stereo).
    segs = []
    for ci, chord in enumerate(CHORDS):
        seg = np.zeros((seg_n, 2))
        env = np.clip(ts / 0.45, 0, 1)
        env = 0.5 - 0.5 * np.cos(np.pi * env)
        rel = np.clip((ts - BAR) / 0.9, 0, 1)
        env *= 0.5 + 0.5 * np.cos(np.pi * rel)
        for ch, dets in enumerate(([-7, 4], [6, -4])):
            saws = np.zeros(seg_n)
            for m in chord:
                for d in dets:
                    saws += polyblep_saw(midi_hz(m) * 2 ** (d / 1200), seg_n, rng.uniform())
            pad = lp(saws, 1000, 2) * 0.12
            pad += sum(np.sin(2 * np.pi * midi_hz(m) * ts + rng.uniform(0, 6.28)) for m in chord) * 0.18
            pad += np.sin(2 * np.pi * midi_hz(BASS[ci]) * ts) * 0.28
            seg[:, ch] += pad * env
        # mellow sine e-piano stabs on beats 1 and 3
        for bi, beat in enumerate((0, 2)):
            tt = ts - beat * BEAT
            m_ = tt >= 0
            e = (1 - np.exp(-tt[m_] / 0.015)) * np.exp(-tt[m_] / 0.7)
            for k, m in enumerate(chord):
                f = midi_hz(m + 12)
                tone = np.sin(2 * np.pi * f * tt[m_]) + 0.12 * np.sin(4 * np.pi * f * tt[m_]) * np.exp(-tt[m_] / 0.25)
                pan = (-0.25, 0.0, 0.25)[k]
                seg[m_, 0] += 0.16 * tone * e * (1 - pan)
                seg[m_, 1] += 0.16 * tone * e * (1 + pan)
        segs.append(seg)

    n_bars = int(np.ceil(n / FS / BAR)) + 1
    for b in range(n_bars):
        s = int(round(b * BAR * FS))
        if s >= n:
            break
        out[s:s + seg_n] += segs[b % 4]
        # quiet music box: sparse high sine melody
        phrase = MELODY[(b // 4) % 2][b % 4]
        for j, (beat, m) in enumerate(phrase):
            ns = s + int(round(beat * BEAT * FS))
            tt = np.arange(int(1.6 * FS)) / FS
            f = midi_hz(m)
            tone = (np.sin(2 * np.pi * f * tt) + 0.15 * np.sin(4 * np.pi * f * tt) * np.exp(-tt / 0.15)) \
                * np.minimum(tt / 0.004, 1) * np.exp(-tt / 0.5)
            pan = 0.2 if (b + j) % 2 else -0.2
            out[ns:ns + len(tt), 0] += 0.07 * tone * (1 - pan)
            out[ns:ns + len(tt), 1] += 0.07 * tone * (1 + pan)

    out = out[:n]
    # keep the stereo width slight
    mid, side = (out[:, 0] + out[:, 1]) / 2, (out[:, 0] - out[:, 1]) / 2
    side *= 0.4
    out = np.stack([mid + side, mid - side], axis=1)
    sos = butter(4, 3500, "low", fs=FS, output="sos")
    return sosfilt(sos, out, axis=0)


# ---------------------------------------------------------------- pipeline
def voice_activity(v):
    """Returns (voiced mask, smoothed 0..1 presence envelope)."""
    env = np.sqrt(np.maximum(uniform_filter1d(v ** 2, int(0.02 * FS)), 0.0))
    if env.max() <= 0:
        z = np.zeros(len(v))
        return z.astype(bool), z
    mask = env > env.max() * 10 ** (-30 / 20)
    w = int(0.15 * FS)
    pres = uniform_filter1d(uniform_filter1d(mask.astype(float), w), w)
    return mask, pres


def build(voice_path, cues):
    dur = float(cues["duration"])
    n = int(round(dur * FS))

    voice = process_voice(load_voice(voice_path))
    v = np.zeros(n)
    off = int(round(float(cues.get("voice_offset", 0.0)) * FS))
    src0 = max(0, -off)
    a = max(off, 0)
    b = min(n, off + len(voice))
    if b > a:
        v[a:b] = voice[src0:src0 + (b - a)]

    sfx, sfx_peaks = build_sfx(cues, n)

    music = build_music(n)
    mask, pres = voice_activity(v)
    music *= (10 ** (-DUCK_DB * pres / 20))[:, None]

    # Level: music RMS (in voiced regions, after ducking) 19 dB below speech RMS.
    if mask.any():
        speech_rms = np.sqrt(np.mean(v[mask] ** 2))
        music_rms = np.sqrt(np.mean(music[mask] ** 2))
        target = speech_rms * 10 ** (-MUSIC_BELOW_SPEECH_DB / 20)
    else:
        music_rms = np.sqrt(np.mean(music ** 2))
        target = 0.03
    if music_rms > 0:
        music *= target / music_rms

    # Hush ranges (50 %, smoothed) and fades.
    g = np.ones(n)
    for t0, t1 in cues.get("hush") or []:
        g[max(0, int(t0 * FS)):max(0, min(n, int(t1 * FS)))] = 0.5
    g = uniform_filter1d(g, int(0.2 * FS))
    g *= ramp_env(n, 0.4, 0.6)
    music *= g[:, None]

    mix = music + sfx + v[:, None]
    mix = soft_limit(mix, FINAL_PEAK, 0.8)
    mix = np.nan_to_num(mix)
    return {"mix": mix, "voice": v, "sfx": sfx, "music": music, "voiced": mask,
            "hush_gain": g, "sfx_peaks": sfx_peaks}


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    voice_path, cues_path, out_path = sys.argv[1:]
    with open(cues_path) as f:
        cues = json.load(f)
    r = build(voice_path, cues)
    sf.write(out_path, r["mix"].astype(np.float32), FS, subtype="PCM_16")
    print(f"wrote {out_path}: {len(r['mix']) / FS:.2f} s, peak {np.max(np.abs(r['mix'])):.3f}")
    for k, p in r["sfx_peaks"].items():
        print(f"  sfx {k:9s} peak {p:.3f} ({20 * np.log10(p):+.1f} dBFS)")


if __name__ == "__main__":
    main()
