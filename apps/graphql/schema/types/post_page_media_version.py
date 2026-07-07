from datetime import datetime

import strawberry


@strawberry.type(description="A single generated image version for a post page.")
class PostPageMediaVersionType:
    id: strawberry.ID
    media_s3_key: str
    prompt: str | None
    created_at: datetime | None
