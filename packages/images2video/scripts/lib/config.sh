#!/usr/bin/env bash

# Shared defaults for images2video renders. Override via environment variables.

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-${PACKAGE_ROOT}/output}"

FPS="${FPS:-25}"
DURATION="${DURATION:-5}"
VIDEO_WIDTH="${VIDEO_WIDTH:-1080}"
VIDEO_HEIGHT="${VIDEO_HEIGHT:-1920}"
MASK_WIDTH="${MASK_WIDTH:-1080}"
MASK_HEIGHT="${MASK_HEIGHT:-1080}"
SOURCE_WIDTH="${SOURCE_WIDTH:-4000}"
CRF="${CRF:-18}"
BG_COLOR="${BG_COLOR:-black}"

# Ken Burns
ZOOM_STEP="${ZOOM_STEP:-0.0015}"
MAX_ZOOM="${MAX_ZOOM:-1.5}"

# Zoom punch
PUNCH_ZOOM_STEP="${PUNCH_ZOOM_STEP:-0.008}"
PUNCH_MAX_ZOOM="${PUNCH_MAX_ZOOM:-2.0}"
FOCAL_X="${FOCAL_X:-0.5}"
FOCAL_Y="${FOCAL_Y:-0.5}"

# Cross-dissolve
SLIDE_DURATION="${SLIDE_DURATION:-3}"
XFADE_DURATION="${XFADE_DURATION:-1}"

# Parallax
PARALLAX_BG_ZOOM_STEP="${PARALLAX_BG_ZOOM_STEP:-0.0008}"
PARALLAX_FG_ZOOM_STEP="${PARALLAX_FG_ZOOM_STEP:-0.002}"
PARALLAX_MAX_ZOOM="${PARALLAX_MAX_ZOOM:-1.4}"

frame_count() {
  echo $((FPS * DURATION))
}

default_output_path() {
  local effect_id="$1"
  local input_path="$2"
  local basename
  basename="$(basename "${input_path}")"
  basename="${basename%.*}"
  echo "${OUTPUT_DIR}/${effect_id}__${basename}.mp4"
}

ensure_output_dir() {
  mkdir -p "${OUTPUT_DIR}"
}
