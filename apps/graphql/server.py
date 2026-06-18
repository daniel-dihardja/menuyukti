import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from strawberry.asgi import GraphQL
from strawberry.http import GraphQLHTTPResponse

from graphql import GraphQLError

from .context import init_request_context
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


# uploadSalesReport uses GraphQL Upload scalar; enable multipart handling.
_graphql_app = GraphQLWithUserContext(schema, multipart_uploads_enabled=True)
app = InternalApiKeyMiddleware(_graphql_app)
