"""GraphQL type for workflow-scoped Instagram items."""

from datetime import datetime

import strawberry


@strawberry.type(description="Media-library photo attached as an image-generation reference.")
class InstagramItemReferenceImageType:
    name: str
    enabled: bool


@strawberry.input(description="Input for an attached media-library generation reference.")
class InstagramItemReferenceImageInput:
    name: str
    enabled: bool = True


@strawberry.type(description="A single generated image version for an Instagram item page.")
class InstagramItemPageMediaVersionType:
    id: strawberry.ID
    media_s3_key: str
    prompt: str | None
    created_at: datetime | None


@strawberry.type(description="A single page/frame within a workflow Instagram item.")
class InstagramItemPageType:
    id: strawberry.ID
    sort_order: int
    media_s3_key: str | None
    prompt: str | None
    media_versions: list[InstagramItemPageMediaVersionType]
    created_at: datetime | None
    updated_at: datetime | None


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
    generation_prompt: str | None
    reference_images: list[InstagramItemReferenceImageType]
    pages: list[InstagramItemPageType]
    style_id: int | None
    status: str
    schedule: datetime | None
    created_at: datetime | None
    updated_at: datetime | None
