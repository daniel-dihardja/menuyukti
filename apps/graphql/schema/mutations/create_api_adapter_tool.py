"""Create a workspace API adapter tool."""

from __future__ import annotations

import strawberry

from graphql.data_sources import ApiAdapterTool, SessionLocal
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.api_adapter_tools import _row_to_gql
from graphql.schema.types import ApiAdapterToolType
from graphql.services import api_adapter_tool as api_adapter_tool_service


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
        name_clean = api_adapter_tool_service.normalize_name(name)
        desc_clean = api_adapter_tool_service.normalize_description(description)
        url_clean = api_adapter_tool_service.validate_https_url(url)
        tool_key = api_adapter_tool_service.tool_key_from_name(name_clean)

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
