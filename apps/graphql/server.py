import os
from contextlib import asynccontextmanager

from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount
from strawberry.asgi import GraphQL
from strawberry.http import GraphQLHTTPResponse

from graphql import GraphQLError

from .context import init_request_context
from .schema import schema


def _env_flag_true(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def is_production_runtime() -> bool:
    """True when deployed production-like (or explicit GRAPHQL_ENV=production)."""
    for key in ("GRAPHQL_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
        if os.environ.get(key, "").strip().lower() == "production":
            return True
    return False


def expected_internal_api_key() -> str:
    """Shared secret with web BFF / agents (``INTERNAL_API_KEY`` or ``GRAPHQL_INTERNAL_API_KEY``)."""
    return (
        os.environ.get("INTERNAL_API_KEY", "").strip()
        or os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    )


# Kept for tests that monkeypatch ``server.INTERNAL_API_KEY`` directly.
INTERNAL_API_KEY = expected_internal_api_key()


def validate_startup_security() -> None:
    """Fail fast in production when the GraphQL internal API key is missing."""
    require_key = is_production_runtime() or _env_flag_true("GRAPHQL_REQUIRE_INTERNAL_API_KEY")
    if require_key and not expected_internal_api_key():
        msg = (
            "INTERNAL_API_KEY or GRAPHQL_INTERNAL_API_KEY must be set in production "
            "(or set GRAPHQL_REQUIRE_INTERNAL_API_KEY=0 only for local dev)."
        )
        raise RuntimeError(msg)
    if is_production_runtime():
        _validate_production_fiscal_provider()


def _validate_production_fiscal_provider() -> None:
    """Refuse production boot with mock / unset / unknown fiscal providers."""
    raw = (os.environ.get("POS_FISCAL_PROVIDER") or "").strip().lower()
    if raw in {"", "mock"}:
        raise RuntimeError(
            "POS_FISCAL_PROVIDER must be set to 'fiskaly' or 'off' in production "
            "(mock TSE is not allowed)."
        )
    if raw in {"off", "none", "disabled", "fiskaly"}:
        return
    raise RuntimeError(f"Unknown POS_FISCAL_PROVIDER={raw!r} in production; allowed: off, fiskaly")


def _cors_allow_origins() -> list[str]:
    raw = os.environ.get("GRAPHQL_CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return []


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """When INTERNAL_API_KEY is set, require X-Internal-Api-Key on every request."""

    async def dispatch(self, request: Request, call_next):
        expected = INTERNAL_API_KEY or expected_internal_api_key()
        if expected and request.headers.get("X-Internal-Api-Key", "") != expected:
            return Response(status_code=403)
        return await call_next(request)


class GraphQLWithUserContext(GraphQL):
    async def get_context(self, request, response):
        ctx = await super().get_context(request, response)
        if isinstance(ctx, dict):
            hdr = request.headers.get("X-User-Id", "")
            ctx["user_id"] = hdr
            init_request_context(ctx)
        return ctx

    async def process_result(self, request, result) -> GraphQLHTTPResponse:
        response = await super().process_result(request, result)
        errors = response.get("errors")
        if not isinstance(errors, list):
            return response

        for item in errors:
            if not isinstance(item, dict):
                continue
            extensions = item.get("extensions")
            if not isinstance(extensions, dict):
                extensions = {}
                item["extensions"] = extensions
            if extensions.get("code"):
                continue

            original_error = None
            if isinstance(getattr(result, "errors", None), list):
                for err in result.errors:
                    if isinstance(err, GraphQLError) and err.message == item.get("message"):
                        original_error = err.original_error
                        break
            if isinstance(original_error, PermissionError):
                extensions["code"] = "FORBIDDEN"
            elif isinstance(original_error, ValueError):
                extensions["code"] = "BAD_USER_INPUT"
            else:
                extensions["code"] = "INTERNAL_SERVER_ERROR"
        return response


@asynccontextmanager
async def _lifespan(_app: Starlette):
    validate_startup_security()
    yield


# uploadSalesReport uses GraphQL Upload scalar; enable multipart handling.
_graphql_app = GraphQLWithUserContext(schema, multipart_uploads_enabled=True)

_starlette_app = Starlette(
    routes=[
        Mount("/", app=_graphql_app),
    ],
    lifespan=_lifespan,
)
app = CORSMiddleware(
    InternalApiKeyMiddleware(_starlette_app),
    allow_origins=_cors_allow_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)
