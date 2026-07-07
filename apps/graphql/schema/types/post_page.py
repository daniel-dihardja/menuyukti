from datetime import datetime

import strawberry


@strawberry.type(description="A single page/slide within an Instagram post.")
class PostPageType:
    id: strawberry.ID
    sort_order: int
    media_s3_key: str | None
    prompt: str | None
    created_at: datetime | None
    updated_at: datetime | None
