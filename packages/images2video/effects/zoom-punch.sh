#!/usr/bin/env bash

EFFECT_ID="zoom-punch"
EFFECT_INPUT="single"

effect_fg_filter() {
  local frame_count
  frame_count="$(frame_count)"
  echo "scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='min(zoom+${PUNCH_ZOOM_STEP},${PUNCH_MAX_ZOOM})':d=${frame_count}:x='(iw-iw/zoom)*${FOCAL_X}':y='(ih-ih/zoom)*${FOCAL_Y}':s=${MASK_WIDTH}x${MASK_HEIGHT}:fps=${FPS}"
}
