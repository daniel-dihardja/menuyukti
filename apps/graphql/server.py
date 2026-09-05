import os
from contextlib import asynccontextmanager

from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Mount, Route
from strawberry.asgi import GraphQL
from strawberry.http import GraphQLHTTPResponse

from graphql import GraphQLError

from .context import init_request_context
from .crm_auth.challenge import challenge_endpoint
from .crm_auth.enroll import enroll_endpoint
from .crm_auth.me_cashback import me_cashback_endpoint
from .crm_auth.refresh import refresh_endpoint
from .crm_auth.revoke import revoke_endpoint
from .crm_auth.verify import verify_endpoint
from .schema import schema

# Local Expo web (and similar) call CRM REST from the browser; override via CRM_CORS_ORIGINS.
_DEFAULT_CRM_CORS_ORIGINS = (
    "http://localhost:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
)


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


def _cors_allow_origins() -> list[str]:
    raw = os.environ.get("CRM_CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return list(_DEFAULT_CRM_CORS_ORIGINS)


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """When INTERNAL_API_KEY is set, require X-Internal-Api-Key except CRM customer auth."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/crm/v1/"):
            return await call_next(request)
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
        Route("/crm/v1/enroll", enroll_endpoint, methods=["POST"]),
        Route("/crm/v1/auth/challenge", challenge_endpoint, methods=["POST"]),
        Route("/crm/v1/auth/verify", verify_endpoint, methods=["POST"]),
        Route("/crm/v1/auth/refresh", refresh_endpoint, methods=["POST"]),
        Route("/crm/v1/auth/revoke", revoke_endpoint, methods=["POST"]),
        Route("/crm/v1/me/cashback", me_cashback_endpoint, methods=["GET"]),
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
