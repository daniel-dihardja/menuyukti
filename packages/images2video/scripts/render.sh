#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "${SCRIPT_DIR}/lib/config.sh"
# shellcheck source=lib/ffmpeg-common.sh
source "${SCRIPT_DIR}/lib/ffmpeg-common.sh"
# shellcheck source=../effects/registry.sh
source "${PACKAGE_ROOT}/effects/registry.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") <effect> [options]

Options:
  --image PATH       Input image for single-image effects
  --images "a b c"   Space-separated image list for slideshow effects
  --bg PATH          Background layer for parallax
  --fg PATH          Foreground layer (alpha PNG) for parallax
  --output PATH      Output MP4 path (default: output/<effect>__<basename>.mp4)
  --duration SEC     Override render duration

Environment overrides: FPS, DURATION, VIDEO_WIDTH, VIDEO_HEIGHT, CRF, LUT, FOCAL_X, FOCAL_Y
EOF
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

EFFECT="$1"
shift

IMAGE=""
IMAGES=()
PARALLAX_BG=""
PARALLAX_FG=""
OUTPUT=""
CUSTOM_DURATION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="$2"
      shift 2
      ;;
    --images)
      read -r -a IMAGES <<< "$2"
      shift 2
      ;;
    --bg)
      PARALLAX_BG="$2"
      shift 2
      ;;
    --fg)
      PARALLAX_FG="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --duration)
      CUSTOM_DURATION="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "${CUSTOM_DURATION}" ]]; then
  DURATION="${CUSTOM_DURATION}"
fi

load_effect "${EFFECT}"

case "${EFFECT_INPUT}" in
  single)
    if [[ -z "${IMAGE}" ]]; then
      echo "Effect '${EFFECT}' requires --image PATH" >&2
      exit 1
    fi
    if [[ ! -f "${IMAGE}" ]]; then
      echo "Image not found: ${IMAGE}" >&2
      exit 1
    fi

    if [[ -z "${OUTPUT}" ]]; then
      OUTPUT="$(default_output_path "${EFFECT_ID}" "${IMAGE}")"
    fi

    if declare -F effect_render >/dev/null; then
      RENDER_OUTPUT="${OUTPUT}"
      effect_render
    else
      fg_filter="$(effect_fg_filter)"
      render_single_image_overlay "${IMAGE}" "${OUTPUT}" "${fg_filter}"
    fi
    ;;
  multi)
    if ((${#IMAGES[@]} == 0)); then
      echo "Effect '${EFFECT}' requires --images \"file1 file2 ...\"" >&2
      exit 1
    fi

    for image in "${IMAGES[@]}"; do
      if [[ ! -f "${image}" ]]; then
        echo "Image not found: ${image}" >&2
        exit 1
      fi
    done

    if [[ -z "${OUTPUT}" ]]; then
      OUTPUT="${OUTPUT_DIR}/${EFFECT_ID}__slideshow.mp4"
    fi

    RENDER_OUTPUT="${OUTPUT}"
    effect_render
    ;;
  layers)
    if [[ -z "${PARALLAX_BG}" || -z "${PARALLAX_FG}" ]]; then
      echo "Effect '${EFFECT}' requires --bg PATH and --fg PATH" >&2
      exit 1
    fi

    if [[ -z "${OUTPUT}" ]]; then
      OUTPUT="${OUTPUT_DIR}/${EFFECT_ID}__$(basename "${PARALLAX_BG}" .webp).mp4"
    fi

    RENDER_OUTPUT="${OUTPUT}"
    effect_render
    ;;
  *)
    echo "Unsupported effect input type: ${EFFECT_INPUT}" >&2
    exit 1
    ;;
esac

echo "Wrote ${OUTPUT}"
