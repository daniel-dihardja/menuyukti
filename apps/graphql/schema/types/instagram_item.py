"""GraphQL type for workflow-scoped Instagram items."""

from datetime import datetime

import strawberry


@strawberry.type(description="A workflow-scoped Instagram story, post, or reel draft.")
class InstagramItemType:
    id: strawberry.ID
    workflow_id: strawberry.ID
    location_id: int
    kind: str
    title: str | None
    caption: str | None
    hook: str | None
    visual_brief: str | None
    status: str
    schedule: datetime | None
    created_at: datetime | None
    updated_at: datetime | None
