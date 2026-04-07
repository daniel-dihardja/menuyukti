from datetime import datetime

import strawberry


@strawberry.type
class WorkspaceMembershipType:
    id: strawberry.ID
    workspace_id: strawberry.ID
    clerk_user_id: str
    role: str
    invited_at: datetime | None
    accepted_at: datetime | None
