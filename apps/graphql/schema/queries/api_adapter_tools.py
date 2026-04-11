"""List API adapter tools for a workspace (members only)."""

from __future__ import annotations

import strawberry

from graphql.data_sources import ApiAdapterTool, SessionLocal
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import ApiAdapterToolType


def _row_to_gql(row: ApiAdapterTool) -> ApiAdapterToolType:
    return ApiAdapterToolType(
        id=strawberry.ID(str(row.id)),
        workspace_id=strawberry.ID(str(row.workspace_id)),
        tool_key=row.tool_key,
        name=row.name,
        description=row.description,
        url=row.url,
        is_active=row.is_active,
        created_at=row.created_at,  # type: ignore[arg-type]
        updated_at=row.updated_at,  # type: ignore[arg-type]
    )


@strawberry.type
class ApiAdapterToolsQuery:
    @strawberry.field(
        description="Custom API adapter tools for a workspace. Empty list if the user is not a member.",
    )
    def api_adapter_tools(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
    ) -> list[ApiAdapterToolType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        wid = int(workspace_id)
        with SessionLocal() as session:
            if not is_workspace_member(session, wid, user_id):
                return []
            rows = (
                session.query(ApiAdapterTool)
                .filter(ApiAdapterTool.workspace_id == wid)
                .order_by(ApiAdapterTool.name.asc(), ApiAdapterTool.id.asc())
                .all()
            )
            return [_row_to_gql(r) for r in rows]
