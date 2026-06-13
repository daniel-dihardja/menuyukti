#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "${SCRIPT_DIR}/lib/config.sh"
# shellcheck source=../effects/registry.sh
source "${PACKAGE_ROOT}/effects/registry.sh"

IMAGE=""
CUSTOM_DURATION=""

usage() {
  cat <<EOF
Usage: $(basename "$0") --image PATH [options]

Renders all single-image effects against one fixture for comparison.

Options:
  --image PATH     Input image (required)
  --duration SEC   Override render duration
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="$2"
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

if [[ -z "${IMAGE}" ]]; then
  echo "--image PATH is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -f "${IMAGE}" ]]; then
  echo "Image not found: ${IMAGE}" >&2
  exit 1
fi

for effect_id in "${EFFECTS[@]}"; do
  load_effect "${effect_id}"

  if [[ "${EFFECT_INPUT}" != "single" ]]; then
    continue
  fi

  echo "Rendering ${effect_id}..."
  if [[ -n "${CUSTOM_DURATION}" ]]; then
    "${SCRIPT_DIR}/render.sh" "${effect_id}" --image "${IMAGE}" --duration "${CUSTOM_DURATION}"
  else
    "${SCRIPT_DIR}/render.sh" "${effect_id}" --image "${IMAGE}"
  fi
done

echo "All single-image previews written to ${OUTPUT_DIR}/"
