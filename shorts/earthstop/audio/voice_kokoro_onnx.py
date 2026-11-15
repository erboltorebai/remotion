import sys, json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro
script, out, voice, speed = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
paras = [p.strip() for p in open(script).read().split("\n\n") if p.strip()]
chunks = []
for p in paras:
    s, sr = k.create(p, voice=voice, speed=speed, lang="en-us")
    # trim silence at the ends, keep a short breath between paragraphs
    idx = np.where(np.abs(s) > 0.01)[0]
    s = s[max(0, idx[0]-int(.02*sr)): idx[-1]+int(.05*sr)]
    chunks += [s, np.zeros(int(.16*sr), np.float32)]
a = np.concatenate(chunks[:-1])
a = resample_poly(a, 48000, sr).astype(np.float32)
a = np.concatenate([np.zeros(int(.07*48000), np.float32), a, np.zeros(int(.35*48000), np.float32)])
a *= 0.89/np.abs(a).max()
sf.write(out+"/voice.wav", a, 48000, subtype="PCM_16")
print("dur", len(a)/48000)
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
a16 = resample_poly(a, 1, 3).astype(np.float32)
segs, _ = m.transcribe(a16, word_timestamps=True, initial_prompt=open(script).read()[:800])
words = [{"w": w.word.strip(), "s": round(w.start,3), "e": round(w.end,3)} for s in segs for w in s.words]
json.dump(words, open(out+"/words.json","w"), indent=0)
print(len(words), "words")
