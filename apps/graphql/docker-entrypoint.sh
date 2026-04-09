#!/bin/sh
set -e

echo "[entrypoint] Running Alembic migrations..."
cd /app/apps/graphql
PYTHONPATH=/app uv run --no-sync alembic upgrade head

echo "[entrypoint] Migrations complete. Starting server..."
exec "$@"
