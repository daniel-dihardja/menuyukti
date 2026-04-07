from datetime import datetime

import strawberry


@strawberry.type
class WorkspaceType:
    id: strawberry.ID
    name: str
    owner_clerk_user_id: str
    created_at: datetime | None
