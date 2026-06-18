from datetime import datetime

import strawberry


@strawberry.type(
    description="A tenant workspace; locations can belong to a workspace with role-based membership."
)
class WorkspaceType:
    id: strawberry.ID
    name: str
    owner_clerk_user_id: str
    created_at: datetime | None
