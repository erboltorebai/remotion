#!/bin/bash
# usage: ./stills.sh "30 75 200" [scale]  -> out/st/fNNNN.jpg + contact sheet out/st/sheet.jpg
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
S=${2:-0.75}; mkdir -p out/st; rm -f out/st/f*.jpg
[ -d out/bundle ] && [ -z "$REBUNDLE" ] || npx remotion bundle src/index.ts --out-dir out/bundle >/dev/null 2>&1
for f in $1; do
  npx remotion still out/bundle Popcorn out/st/f$(printf %04d $f).jpg --frame=$f --scale=$S --image-format=jpeg --browser-executable=$B --gl=swangle --log=error 2>&1 | grep -v -E "memory|Memory|Docker|Using the lower" 
done
n=$(ls out/st/f*.jpg | wc -l); cols=$(( n < 6 ? n : 6 ))
ffmpeg -loglevel error -y -pattern_type glob -i 'out/st/f*.jpg' -vf "scale=360:-1,tile=${cols}x$(( (n+cols-1)/cols ))" -frames:v 1 out/st/sheet.jpg
