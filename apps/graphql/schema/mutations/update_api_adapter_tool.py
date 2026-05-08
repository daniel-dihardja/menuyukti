"""Update an API adapter tool (workspace members only)."""

from __future__ import annotations

import strawberry
from strawberry import UNSET

from graphql.data_sources import ApiAdapterTool, SessionLocal
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.api_adapter_tools import _row_to_gql
from graphql.schema.types import ApiAdapterToolType
from graphql.services.api_adapter_tool import (
    normalize_description,
    normalize_name,
    tool_key_from_name,
    validate_tool_url,
)


@strawberry.type
class UpdateApiAdapterToolMutation:
    @strawberry.mutation
    def update_api_adapter_tool(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        name: str | None = UNSET,
        description: str | None = UNSET,
        url: str | None = UNSET,
        is_active: bool | None = UNSET,
    ) -> ApiAdapterToolType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateApiAdapterTool")

        row_id = int(id)
        with SessionLocal() as session:
            row = session.get(ApiAdapterTool, row_id)
            if row is None:
                raise ValueError("API adapter tool not found")

            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Access denied")

            if name is not UNSET and name is not None:
                name_clean = normalize_name(name)
                new_key = tool_key_from_name(name_clean)
                if new_key != row.tool_key:
                    clash = (
                        session.query(ApiAdapterTool)
                        .filter(
                            ApiAdapterTool.workspace_id == row.workspace_id,
                            ApiAdapterTool.tool_key == new_key,
                            ApiAdapterTool.id != row.id,
                        )
                        .first()
                    )
                    if clash is not None:
                        raise ValueError(
                            "A tool with this name already exists in the workspace; choose a different name"
                        )
                    row.tool_key = new_key
                row.name = name_clean

            if description is not UNSET and description is not None:
                row.description = normalize_description(description)

            if url is not UNSET and url is not None:
                row.url = validate_tool_url(url)

            if is_active is not UNSET and is_active is not None:
                row.is_active = is_active

            session.add(row)
            session.commit()
            session.refresh(row)
            return _row_to_gql(row)
