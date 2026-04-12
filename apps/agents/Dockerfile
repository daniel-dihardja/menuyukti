# Build from repository root:
#   docker build -f apps/agents/Dockerfile -t agents .
#
# Runtime: set AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN on Vercel), GRAPHQL_ENDPOINT,
# and optional GRAPHQL_INTERNAL_API_KEY / AGENTS_API_KEY.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/menuyukti ./packages/menuyukti
COPY packages/url-safety ./packages/url-safety
COPY apps/agents ./apps/agents
COPY apps/graphql/pyproject.toml ./apps/graphql/pyproject.toml

RUN uv sync --frozen --no-dev --package agents-app

EXPOSE 8001

# Skip runtime sync: locked install only needs agents-app plus its editable workspace deps on disk.
CMD ["uv", "run", "--no-sync", "uvicorn", "agents_app.server:app", "--host", "0.0.0.0", "--port", "8001"]
