#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-3000}"
ANALYTICS_HOST="${ANALYTICS_HOST:-127.0.0.1}"
ANALYTICS_PORT="${ANALYTICS_PORT:-8000}"
AGENTS_HOST="${AGENTS_HOST:-127.0.0.1}"
AGENTS_PORT="${AGENTS_PORT:-8001}"

RUN_DB_RESET="${RUN_DB_RESET:-1}"
RUN_DB_GEN="${RUN_DB_GEN:-1}"
RUN_DB_INIT="${RUN_DB_INIT:-1}"
RUN_DB_SEED="${RUN_DB_SEED:-1}"

PIDS=()

log() {
  printf '[start-all] %s\n' "$1"
}

start_bg() {
  local name="$1"
  shift
  log "starting ${name}: $*"
  "$@" &
  local pid=$!
  PIDS+=("$pid")
  log "${name} pid=${pid}"
}

cleanup() {
  log "stopping services..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait || true
  log "all services stopped"
}

trap cleanup EXIT INT TERM

log "running database lifecycle"
if [[ "$RUN_DB_RESET" == "1" ]]; then
  pnpm -C apps/web run db:reset
else
  log "skip db:reset (RUN_DB_RESET=${RUN_DB_RESET})"
fi

if [[ "$RUN_DB_GEN" == "1" ]]; then
  pnpm -C apps/web run db:gen
else
  log "skip db:gen (RUN_DB_GEN=${RUN_DB_GEN})"
fi

if [[ "$RUN_DB_INIT" == "1" ]]; then
  pnpm -C apps/web run db:init
else
  log "skip db:init (RUN_DB_INIT=${RUN_DB_INIT})"
fi

if [[ "$RUN_DB_SEED" == "1" ]]; then
  pnpm -C apps/web run db:seed
else
  log "skip db:seed (RUN_DB_SEED=${RUN_DB_SEED})"
fi

log "starting analytics + agents + web"
start_bg "analytics" uv run --project apps/analytics uvicorn app.main:app --host "$ANALYTICS_HOST" --port "$ANALYTICS_PORT"
start_bg "agents" uv run --project apps/agents uvicorn agent.api:app --app-dir apps/agents/src --host "$AGENTS_HOST" --port "$AGENTS_PORT"
start_bg "web" pnpm -C apps/web exec next dev --turbopack --hostname "$WEB_HOST" --port "$WEB_PORT"

log "services are up (logs stream in this terminal). Press Ctrl+C to stop all."
wait
