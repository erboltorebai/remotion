"""Kokoro (ONNX) narration + word timings. Synthesizes paragraph by paragraph, transcribes each paragraph on its own
(faster-whisper) and aligns the recognised words to the SCRIPT words, so words.json always has exactly the script's words.
usage: python voice2.py script.txt outdir voice speed"""
import sys, json, re, difflib, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel
script, out, voice, speed = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
m = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
paras = [p.strip() for p in open(script).read().split("\n\n") if p.strip()]
t0 = 0.07; chunks = [np.zeros(int(t0 * 48000), np.float32)]; words = []
for p in paras:
    s, sr = k.create(p, voice=voice, speed=speed, lang="en-us")
    idx = np.where(np.abs(s) > 0.01)[0]
    s = s[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.05 * sr)]
    a48 = resample_poly(s, 48000, sr).astype(np.float32)
    segs, _ = m.transcribe(resample_poly(a48, 1, 3).astype(np.float32), word_timestamps=True, condition_on_previous_text=False)
    rec = [(norm(w.word), w.start, w.end) for sg in segs for w in sg.words if norm(w.word)]
    sw = p.split(); dur = len(a48) / 48000
    tim = [None] * len(sw)
    sm = difflib.SequenceMatcher(None, [norm(w) for w in sw], [r[0] for r in rec], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for i in range(n): tim[a + i] = (rec[b + i][1], rec[b + i][2])
    # fill unmatched words by spreading them (by length) between the neighbouring matched words
    i = 0
    while i < len(sw):
        if tim[i] is None:
            j = i
            while j < len(sw) and tim[j] is None: j += 1
            lo = tim[i - 1][1] if i > 0 else 0.0
            hi = tim[j][0] if j < len(sw) else dur
            tot = sum(len(w) + 1 for w in sw[i:j]); acc = 0
            for q in range(i, j):
                a_ = lo + (hi - lo) * acc / tot; acc += len(sw[q]) + 1
                tim[q] = (a_, lo + (hi - lo) * acc / tot)
            i = j
        else: i += 1
    for w, (a_, b_) in zip(sw, tim): words.append({"w": w, "s": round(t0 + a_, 3), "e": round(t0 + b_, 3)})
    chunks += [a48, np.zeros(int(.16 * 48000), np.float32)]
    t0 += dur + .16
    print(f"{len(sw)} words, {len(rec)} recognised, {sum(1 for x in sm.get_matching_blocks() for _ in range(x.size))} matched")
a = np.concatenate(chunks[:-1] + [np.zeros(int(.35 * 48000), np.float32)])
a *= 0.89 / np.abs(a).max()
sf.write(out + "/voice.wav", a, 48000, subtype="PCM_16")
for i in range(1, len(words)): words[i]["s"] = max(words[i]["s"], words[i - 1]["s"] + 0.04)
json.dump(words, open(out + "/words.json", "w"))
print("dur", round(len(a) / 48000, 2), len(words), "words")
