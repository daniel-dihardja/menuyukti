"""Create a workspace API adapter tool."""

from __future__ import annotations

import strawberry

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
class CreateApiAdapterToolMutation:
    @strawberry.mutation
    def create_api_adapter_tool(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        name: str,
        description: str,
        url: str,
        is_active: bool = True,
    ) -> ApiAdapterToolType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createApiAdapterTool")

        wid = int(workspace_id)
        name_clean = normalize_name(name)
        desc_clean = normalize_description(description)
        url_clean = validate_tool_url(url)
        tool_key = tool_key_from_name(name_clean)

        with SessionLocal() as session:
            if not is_workspace_member(session, wid, user_id):
                raise PermissionError("Access denied")

            existing = (
                session.query(ApiAdapterTool)
                .filter(
                    ApiAdapterTool.workspace_id == wid,
                    ApiAdapterTool.tool_key == tool_key,
                )
                .first()
            )
            if existing is not None:
                raise ValueError(
                    "A tool with this name already exists in the workspace; choose a different name"
                )

            row = ApiAdapterTool(
                workspace_id=wid,
                tool_key=tool_key,
                name=name_clean,
                description=desc_clean,
                url=url_clean,
                is_active=is_active,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _row_to_gql(row)
