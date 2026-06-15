#!/usr/bin/env bash

EFFECT_ID="color-grade"
EFFECT_INPUT="single"

effect_fg_filter() {
  local frame_count
  frame_count="$(frame_count)"
  local grade_filters="eq=saturation='0.35+0.13*t':contrast='1+0.04*t/${DURATION}':brightness='0.03*t/${DURATION}':eval=frame"

  if [[ -n "${LUT:-}" && -f "${LUT}" ]]; then
    grade_filters="${grade_filters},lut3d='${LUT}'"
  fi

  echo "scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='1.05':d=${frame_count}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${MASK_WIDTH}x${MASK_HEIGHT}:fps=${FPS},${grade_filters}"
}
