# Build from repository root:
#   docker build -f apps/graphql/Dockerfile -t graphql .
#
# Runtime: set DATABASE_URL (and any other vars your app loads from env / .env).

FROM ghcr.io/astral-sh/uv:python3.12-bookworm

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/menuyukti ./packages/menuyukti
COPY apps/graphql ./apps/graphql
COPY apps/agents/pyproject.toml ./apps/agents/pyproject.toml

RUN uv sync --frozen --no-dev --package graphql

EXPOSE 8000

# Skip runtime sync: root workspace lists sibling packages; this image only ships graphql + menuyukti.
CMD ["uv", "run", "--no-sync", "uvicorn", "graphql.server:app", "--host", "0.0.0.0", "--port", "8000"]
