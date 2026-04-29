import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from strawberry.asgi import GraphQL

from .schema import schema

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """When INTERNAL_API_KEY is set, require X-Internal-Api-Key on every HTTP request."""

    async def dispatch(self, request: Request, call_next):
        if INTERNAL_API_KEY and request.headers.get("X-Internal-Api-Key", "") != INTERNAL_API_KEY:
            return Response(status_code=403)
        return await call_next(request)


class GraphQLWithUserContext(GraphQL):
    async def get_context(self, request, response):
        ctx = await super().get_context(request, response)
        if isinstance(ctx, dict):
            hdr = request.headers.get("X-User-Id", "")
            ctx["user_id"] = hdr
        return ctx


# uploadSalesReport uses GraphQL Upload scalar; enable multipart handling.
_graphql_app = GraphQLWithUserContext(schema, multipart_uploads_enabled=True)
app = InternalApiKeyMiddleware(_graphql_app)
