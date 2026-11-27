# Generates voice.wav with Kokoro (offline) line by line, with small pauses.
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
k = Kokoro("/home/user/tts/kokoro-v1.0.onnx", "/home/user/tts/voices-v1.0.bin")
lines = open("lines.txt").read().strip().split("\n")
out = []
for ln in lines:
    a, sr = k.create(ln, voice=VOICE, speed=SPEED, lang="en-us")
    # trim leading/trailing silence
    e = np.abs(a) > 0.01
    idx = np.where(e)[0]
    a = a[max(0, idx[0]-int(.03*sr)): idx[-1]+int(.06*sr)]
    out.append(a); out.append(np.zeros(int(0.22*sr), np.float32))
v = np.concatenate(out)
sf.write("voice.wav", v, sr)
print(VOICE, sr, len(v)/sr)
