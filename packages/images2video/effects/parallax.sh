#!/usr/bin/env bash

EFFECT_ID="parallax"
EFFECT_INPUT="layers"

effect_render() {
  local bg="${PARALLAX_BG:?PARALLAX_BG is required}"
  local fg="${PARALLAX_FG:?PARALLAX_FG is required}"
  local output="${RENDER_OUTPUT:?RENDER_OUTPUT is required}"
  local frame_count
  frame_count="$(frame_count)"

  if [[ ! -f "${bg}" ]]; then
    echo "Background layer not found: ${bg}" >&2
    return 1
  fi

  if [[ ! -f "${fg}" ]]; then
    echo "Foreground layer not found: ${fg}" >&2
    return 1
  fi

  ensure_output_dir

  run_ffmpeg -loop 1 -i "${bg}" -loop 1 -i "${fg}" \
    -filter_complex "\
color=c=${BG_COLOR}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:r=${FPS}:d=${DURATION}[canvas];\
[0:v]scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='min(zoom+${PARALLAX_BG_ZOOM_STEP},${PARALLAX_MAX_ZOOM})':d=${frame_count}:x='iw/2-(iw/zoom/2)+10':y='ih/2-(ih/zoom/2)+5':s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${FPS}[bg];\
[1:v]scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='min(zoom+${PARALLAX_FG_ZOOM_STEP},${PARALLAX_MAX_ZOOM})':d=${frame_count}:x='iw/2-(iw/zoom/2)-15':y='ih/2-(ih/zoom/2)-10':s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=${FPS},format=rgba[fg];\
[canvas][bg]overlay=x='(W-w)/2':y='(H-h)/2'[stage];\
[stage][fg]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,format=yuv420p[v]" \
    -map "[v]" -t "${DURATION}" -pix_fmt yuv420p -c:v libx264 -crf "${CRF}" "${output}"
}
