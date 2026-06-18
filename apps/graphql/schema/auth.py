"""GraphQL authorization helpers."""

from __future__ import annotations

import strawberry

from graphql.access import (
    get_analytics_run_if_owner,
    is_location_owner,
    is_workspace_member,
    is_workspace_owner_role,
    require_location_owner,
)

__all__ = [
    "get_analytics_run_if_owner",
    "is_location_owner",
    "is_workspace_member",
    "is_workspace_owner_role",
    "require_location_owner",
    "user_id_from_info",
]


def user_id_from_info(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""
