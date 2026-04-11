from datetime import datetime

import strawberry


@strawberry.type(
    description="Workspace-owned HTTP tool definition for custom agent integrations (URL invoked at runtime)."
)
class ApiAdapterToolType:
    id: strawberry.ID
    workspace_id: strawberry.ID
    tool_key: str
    name: str
    description: str
    url: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
