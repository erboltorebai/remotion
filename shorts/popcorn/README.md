# What If Every Home in America Microwaved Popcorn at the Same Second

Vertical cartoon short, ~57.7 s, 30 fps, 1440x2560: 2D stickmen (white head, black line body) in a 3D toon world,
one-word pop-in captions, voice + synthesized SFX (no music).

- `SCRIPT.md` – topic check, checked facts, voice-over script.
- `voice/` – narration and word timings; `audio/voice_kokoro_onnx.py` regenerates them (per-paragraph alignment to the script).
- `src/toon.ts` – the stickman drawing API; `src/scenes.ts` – six sets (kitchen, neighbourhood, power plant, bicycle hill,
  control room, night city); `src/story.ts` – shots and camera; `src/Short.tsx` – component, 2D effects, captions;
  `src/engine.ts` – toon shading, ink outlines, lens blur, grade.
- `audio/mix.py` – SFX + ambience + voice mix (-14 LUFS).

```bash
npm install
python audio/mix.py     # -> audio/mix.wav
./render.sh             # resumable chunks -> out/final.mp4 (software GL: ~45 min)
```
