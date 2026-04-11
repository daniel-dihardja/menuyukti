"""Delete an API adapter tool."""

from __future__ import annotations

import strawberry

from graphql.data_sources import ApiAdapterTool, SessionLocal
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeleteApiAdapterToolMutation:
    @strawberry.mutation
    def delete_api_adapter_tool(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteApiAdapterTool")

        row_id = int(id)
        with SessionLocal() as session:
            row = session.get(ApiAdapterTool, row_id)
            if row is None:
                raise ValueError("API adapter tool not found")

            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Access denied")

            session.delete(row)
            session.commit()
            return True
