#!/usr/bin/env bash

# Push Docker images built with the same names/tags as pnpm docker:build:*.
# Run `docker login` (or your registry credential helper) before pushing.
#
# Usage:
#   ./scripts/docker-push-images.sh              # push all three; tag from DOCKER_TAG or latest
#   ./scripts/docker-push-images.sh graphql      # push one service
#   ./scripts/docker-push-images.sh web v1.2.3    # push one service with tag (overrides DOCKER_TAG)
#
# Env:
#   DOCKER_REGISTRY_PREFIX  default johngoyason
#   DOCKER_TAG             default latest (when no tag given as second arg)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PREFIX="${DOCKER_REGISTRY_PREFIX:-johngoyason}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [graphql|web|agents] [tag]

  With no args: push all images (graphql, agents, web). Tag: \$DOCKER_TAG or latest.
  With service: push that image only. Optional tag overrides \$DOCKER_TAG.

Env: DOCKER_REGISTRY_PREFIX (default johngoyason), DOCKER_TAG (default latest)

Examples:
  DOCKER_TAG=v1.0.0 $(basename "$0")
  $(basename "$0") graphql
  $(basename "$0") agents v1.0.0
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

SERVICE=""
TAG=""

if [[ -z "${1:-}" ]]; then
  SERVICE="all"
  TAG="${DOCKER_TAG:-latest}"
else
  case "$1" in
    graphql | web | agents)
      SERVICE="$1"
      TAG="${2:-${DOCKER_TAG:-latest}}"
      ;;
    *)
      printf 'Unknown service %q. Use graphql, web, or agents.\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
fi

push_image() {
  local name="$1"
  local image="${PREFIX}/menuyukti-${name}:${TAG}"
  printf '[docker-push] %s\n' "$image"
  docker push "$image"
}

if [[ "$SERVICE" == all ]]; then
  push_image graphql
  push_image agents
  push_image web
else
  push_image "$SERVICE"
fi
