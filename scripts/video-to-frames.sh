#!/usr/bin/env bash
# Turn a short video of your head turning (profile -> front, plain background) into a frame
# sequence for the particle portrait.
#   usage: scripts/video-to-frames.sh head-turn.mp4 [fps=24] [size=512]
# Then set HEAD.sequence in src/config/flight.ts to the line this script prints.
set -euo pipefail
in="${1:?video file}"; fps="${2:-24}"; size="${3:-512}"
out="$(dirname "$0")/../public/head-frames"
mkdir -p "$out"
ffmpeg -loglevel error -y -i "$in" \
  -vf "fps=${fps},crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size}" \
  -c:v libwebp -quality 85 "$out/frame_%04d.webp"
count=$(find "$out" -name 'frame_*.webp' | wc -l)
echo "Wrote $count frames to public/head-frames/"
echo "sequence: { count: $count, pattern: 'frame_%04d.webp', fps: $fps },"
