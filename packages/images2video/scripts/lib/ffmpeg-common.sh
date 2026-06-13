#!/usr/bin/env bash

render_single_image_overlay() {
  local image="$1"
  local output="$2"
  local fg_filter="$3"
  local frame_count
  frame_count="$(frame_count)"

  ensure_output_dir

  ffmpeg -y -loop 1 -i "${image}" \
    -filter_complex "color=c=${BG_COLOR}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:r=${FPS}:d=${DURATION}[bg];[0:v]${fg_filter}[fg];[bg][fg]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,format=yuv420p[v]" \
    -map "[v]" -t "${DURATION}" -pix_fmt yuv420p -c:v libx264 -crf "${CRF}" "${output}"
}

scale_zoompan_filter() {
  local zoom_expr="$1"
  local x_expr="$2"
  local y_expr="$3"
  local frame_count
  frame_count="$(frame_count)"

  echo "scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='${zoom_expr}':d=${frame_count}:x='${x_expr}':y='${y_expr}':s=${MASK_WIDTH}x${MASK_HEIGHT}:fps=${FPS}"
}

static_image_filter() {
  local extra_filters="$1"
  local frame_count
  frame_count="$(frame_count)"

  echo "scale=${SOURCE_WIDTH}:-1:flags=lanczos,zoompan=z='1':d=${frame_count}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${MASK_WIDTH}x${MASK_HEIGHT}:fps=${FPS},${extra_filters}"
}

run_ffmpeg() {
  ffmpeg -y "$@"
}
