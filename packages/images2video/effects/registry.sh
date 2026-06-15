#!/usr/bin/env bash

EFFECTS=(
  "ken-burns"
  "zoom-punch"
  "parallax"
  "cross-dissolve"
  "color-grade"
  "vignette-pulse"
)

load_effect() {
  local effect_id="$1"
  local effect_path="${PACKAGE_ROOT}/effects/${effect_id}.sh"

  if [[ ! -f "${effect_path}" ]]; then
    echo "Unknown effect: ${effect_id}" >&2
    echo "Available effects: ${EFFECTS[*]}" >&2
    return 1
  fi

  # shellcheck source=/dev/null
  source "${effect_path}"
}

is_single_image_effect() {
  local effect_id="$1"
  load_effect "${effect_id}"
  [[ "${EFFECT_INPUT}" == "single" ]]
}

list_effects() {
  for effect_id in "${EFFECTS[@]}"; do
    load_effect "${effect_id}"
    printf '%s\t%s\n' "${EFFECT_ID}" "${EFFECT_INPUT}"
  done
}
