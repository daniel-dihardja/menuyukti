"""GraphQL types for workspace media assets and collections."""

from __future__ import annotations

import strawberry


@strawberry.type(description="Catalog entry for a workspace photo in the media library.")
class MediaAssetType:
    id: int
    workspace_id: int
    filename: str
    display_name: str | None
    created_by_clerk_user_id: str


@strawberry.type(description="Named group of media assets within a workspace.")
class MediaCollectionType:
    id: int
    workspace_id: int
    name: str
    created_by_clerk_user_id: str
    member_count: int
    members: list[MediaAssetType]
