# What If the Earth Stopped Spinning for One Second

Vertical cartoon short (2D characters in a 3D toon world), ~57.5 s, 30 fps, 1440x2560.

- `SCRIPT.md` – checked facts + voice-over script.
- `voice/` – narration (`voice.wav`, 48 kHz mono) and word timings (`words.json`).
- `src/engine.ts` – three.js pipeline: two-tone toon shading, ink outline pass, lens blur, grade, camera-facing cards.
- `src/toon.ts` – Canvas2D characters (Dave, cat, wave, jet).
- `src/scenes.ts` – the five sets (space, kitchen, street, bus, South Pole) and their per-frame posing.
- `src/story.ts` – shot list, camera keys, kicks, flashes, dissolves (everything is timed to the voice).
- `src/Short.tsx` – Remotion component, 2D effect sprites, burned-in captions.
- `audio/mix.py` – synthesized SFX + ambience + voice mix (-14 LUFS, no music); `audio/voice_kokoro_onnx.py` – narration generator.

```bash
npm install
npx remotion studio src/index.ts                 # preview
npm run render                                   # 1440x2560 silent picture -> out/video.mp4 (software GL: ~1 h)
python audio/mix.py                              # -> audio/mix.wav
ffmpeg -i out/video.mp4 -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/final.mp4
```
