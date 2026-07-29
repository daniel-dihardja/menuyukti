"""Query workspace media assets and collections."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources.models.media_asset import (
    MediaAsset,
    MediaCollection,
    MediaCollectionMember,
)
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.media_collection import MediaAssetType, MediaCollectionType
from graphql.services.workspace_scope import workspace_ids_for_user


def _asset_to_gql(row: MediaAsset) -> MediaAssetType:
    return MediaAssetType(
        id=row.id,
        workspace_id=row.workspace_id,
        filename=row.filename,
        display_name=row.display_name,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
    )


def _collection_to_gql(
    row: MediaCollection,
    *,
    include_members: bool = False,
) -> MediaCollectionType:
    members: list[MediaAssetType] = []
    if include_members:
        members = [_asset_to_gql(m.asset) for m in row.members if m.asset is not None]
        members.sort(key=lambda a: a.filename)
    return MediaCollectionType(
        id=row.id,
        workspace_id=row.workspace_id,
        name=row.name,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
        member_count=len(row.members),
        members=members,
    )


@strawberry.type
class MediaCollectionsQuery:
    @strawberry.field(
        description="List media collections in workspaces the current user belongs to."
    )
    def media_collections(self, info: strawberry.Info) -> list[MediaCollectionType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.query(MediaCollection)
                .options(joinedload(MediaCollection.members))
                .filter(MediaCollection.workspace_id.in_(workspace_ids))
                .order_by(MediaCollection.name.asc())
                .all()
            )
            return [_collection_to_gql(row, include_members=False) for row in rows]

    @strawberry.field(
        description="Fetch one media collection by id, including member assets. Null when missing."
    )
    def media_collection(self, info: strawberry.Info, id: int) -> MediaCollectionType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = (
                session.query(MediaCollection)
                .options(
                    joinedload(MediaCollection.members).joinedload(MediaCollectionMember.asset)
                )
                .filter(MediaCollection.id == id)
                .first()
            )
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return _collection_to_gql(row, include_members=True)

    @strawberry.field(
        description=(
            "List media assets (photos) in the caller's workspaces. "
            "When collectionId is set, only members of that collection."
        )
    )
    def media_assets(
        self,
        info: strawberry.Info,
        collection_id: int | None = None,
    ) -> list[MediaAssetType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []

            if collection_id is not None:
                collection = (
                    session.query(MediaCollection)
                    .options(
                        joinedload(MediaCollection.members).joinedload(MediaCollectionMember.asset)
                    )
                    .filter(MediaCollection.id == collection_id)
                    .first()
                )
                if collection is None or collection.workspace_id not in workspace_ids:
                    return []
                assets = [m.asset for m in collection.members if m.asset is not None]
                assets.sort(key=lambda a: a.filename)
                return [_asset_to_gql(a) for a in assets]

            rows = (
                session.query(MediaAsset)
                .filter(MediaAsset.workspace_id.in_(workspace_ids))
                .order_by(MediaAsset.created_at.desc(), MediaAsset.filename.asc())
                .all()
            )
            return [_asset_to_gql(row) for row in rows]
