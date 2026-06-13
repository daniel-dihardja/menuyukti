#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/config.sh
source "${SCRIPT_DIR}/lib/config.sh"
# shellcheck source=../effects/registry.sh
source "${PACKAGE_ROOT}/effects/registry.sh"

printf 'EFFECT\tINPUT\n'
list_effects | sort
