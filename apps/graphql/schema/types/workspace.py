from datetime import datetime

import strawberry

from graphql.schema.types.api_adapter_tool import ApiAdapterToolType


@strawberry.type(description="A tenant workspace; locations can belong to a workspace with role-based membership.")
class WorkspaceType:
    id: strawberry.ID
    name: str
    owner_clerk_user_id: str
    created_at: datetime | None

    @strawberry.field(
        description="Custom API adapter tools for this workspace. Empty list if the user is not a member.",
    )
    def api_adapter_tools(self, info: strawberry.Info) -> list[ApiAdapterToolType]:
        from graphql.schema.queries.api_adapter_tools import list_api_adapter_tools_for_workspace

        return list_api_adapter_tools_for_workspace(info, int(self.id))
