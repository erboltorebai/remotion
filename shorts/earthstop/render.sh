#!/bin/bash
# Renders the picture in resumable chunks (out/parts/pNN.mp4), then joins them and muxes audio/mix.wav.
B=${CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
N=1725; C=115; mkdir -p out/parts
[ -d out/bundle ] || npx remotion bundle src/index.ts --out-dir out/bundle >/dev/null 2>&1
: > out/parts/list.txt
for ((a=0; a<N; a+=C)); do
  b=$(( a+C-1 < N-1 ? a+C-1 : N-1 )); f=out/parts/p$(printf %04d $a).mp4
  if [ ! -f "$f" ]; then
    npx remotion render out/bundle EarthStop out/parts/tmp.mp4 --frames=$a-$b --codec h264 --crf 16 --scale 2 --concurrency=4 --browser-executable=$B --gl=swangle --log=error --muted >> out/render.log 2>&1 && mv out/parts/tmp.mp4 "$f" || { echo "chunk $a failed"; exit 1; }
  fi
  echo "file '$(basename $f)'" >> out/parts/list.txt; echo "done $b/$N"
done
ffmpeg -loglevel error -y -f concat -safe 0 -i out/parts/list.txt -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/final.mp4 && echo FINAL_OK
