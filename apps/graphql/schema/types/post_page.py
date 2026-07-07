from datetime import datetime

import strawberry

from graphql.schema.types.post_page_media_version import PostPageMediaVersionType


@strawberry.type(description="A single page/slide within an Instagram post.")
class PostPageType:
    id: strawberry.ID
    sort_order: int
    media_s3_key: str | None
    prompt: str | None
    media_versions: list[PostPageMediaVersionType]
    created_at: datetime | None
    updated_at: datetime | None
