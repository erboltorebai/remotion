# faster-whisper word timings -> words.json + words.js
import json, sys
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
prompt = open("lines.txt").read().replace("\n", " ")
import soundfile as sf
from scipy.signal import resample_poly
a, sr = sf.read("voice.wav", dtype="float32")
if a.ndim > 1: a = a.mean(1)
a = resample_poly(a, 16000, sr).astype("float32")
segs, _ = m.transcribe(a, word_timestamps=True, initial_prompt=prompt, beam_size=5)
W = []
for s in segs:
    for w in s.words:
        W.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
json.dump(W, open("words.json", "w"), indent=0)
open("words.js", "w").write("window.WORDS=" + json.dumps(W) + ";\n")
print(len(W)); print(" ".join(f"{x['w']}@{x['s']}" for x in W))
