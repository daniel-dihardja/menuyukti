"""ORM → GraphQL mappers for media assets and collections."""

from __future__ import annotations

from graphql.data_sources.models.media_asset import MediaAsset, MediaCollection
from graphql.schema.types.media_collection import MediaAssetType, MediaCollectionType


def asset_to_gql(row: MediaAsset) -> MediaAssetType:
    return MediaAssetType(
        id=row.id,
        workspace_id=row.workspace_id,
        filename=row.filename,
        display_name=row.display_name,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
    )


def collection_to_gql(
    row: MediaCollection,
    *,
    include_members: bool = False,
) -> MediaCollectionType:
    members: list[MediaAssetType] = []
    if include_members:
        members = [asset_to_gql(m.asset) for m in row.members if m.asset is not None]
        members.sort(key=lambda a: a.filename)
    return MediaCollectionType(
        id=row.id,
        workspace_id=row.workspace_id,
        name=row.name,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
        member_count=len(row.members),
        members=members,
    )
