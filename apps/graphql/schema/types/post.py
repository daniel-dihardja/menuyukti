from datetime import datetime

import strawberry


@strawberry.type(description="A standalone Instagram post draft or published post.")
class PostType:
    id: strawberry.ID
    title: str | None
    status: str
    caption: str | None
    media_type: str | None
    location_id: int | None
    workspace_id: strawberry.ID | None
    created_at: datetime | None
    updated_at: datetime | None
