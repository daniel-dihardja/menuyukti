#!/usr/bin/env bash

EFFECT_ID="ken-burns"
EFFECT_INPUT="single"

effect_fg_filter() {
  local frame_count
  frame_count="$(frame_count)"
  echo "scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='min(zoom+${ZOOM_STEP},${MAX_ZOOM})':d=${frame_count}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${MASK_WIDTH}x${MASK_HEIGHT}:fps=${FPS}"
}
