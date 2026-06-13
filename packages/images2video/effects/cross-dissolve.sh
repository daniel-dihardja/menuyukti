#!/usr/bin/env bash

EFFECT_ID="cross-dissolve"
EFFECT_INPUT="multi"

effect_render() {
  local output="${RENDER_OUTPUT:?RENDER_OUTPUT is required}"
  local -a images=("${IMAGES[@]}")

  if ((${#images[@]} < 2)); then
    echo "cross-dissolve requires at least 2 images" >&2
    return 1
  fi

  ensure_output_dir

  local -a ffmpeg_inputs=()
  local filter=""
  local index
  local input_count="${#images[@]}"
  local total_duration=$(( input_count * SLIDE_DURATION - (input_count - 1) * XFADE_DURATION ))
  local current_label
  local next_label
  local offset

  for image in "${images[@]}"; do
    ffmpeg_inputs+=(-loop 1 -t "${total_duration}" -i "${image}")
  done

  for ((index = 0; index < input_count; index++)); do
    filter+="[${index}:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS},format=yuv420p[v${index}];"
  done

  current_label="v0"
  for ((index = 1; index < input_count; index++)); do
    next_label="x${index}"
    offset=$(( index * (SLIDE_DURATION - XFADE_DURATION) ))

    filter+="[${current_label}][v${index}]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${offset}[${next_label}];"
    current_label="${next_label}"
  done

  filter+="[${current_label}]format=yuv420p[v]"

  run_ffmpeg "${ffmpeg_inputs[@]}" \
    -filter_complex "${filter}" \
    -map "[v]" -t "${total_duration}" -pix_fmt yuv420p -c:v libx264 -crf "${CRF}" "${output}"
}
