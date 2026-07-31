"""Query workspace media assets and collections."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources.models.media_asset import (
    MediaAsset,
    MediaCollection,
    MediaCollectionMember,
)
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.media import asset_to_gql, collection_to_gql
from graphql.schema.types.media_collection import MediaAssetType, MediaCollectionType
from graphql.services.workspace_scope import workspace_ids_for_user


@strawberry.type
class MediaCollectionsQuery:
    @strawberry.field(
        description="List media collections in workspaces the current user belongs to."
    )
    def media_collections(
        self, info: strawberry.Info, first: int | None = None
    ) -> list[MediaCollectionType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST)
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.scalars(
                    select(MediaCollection)
                    .options(joinedload(MediaCollection.members))
                    .where(MediaCollection.workspace_id.in_(workspace_ids))
                    .order_by(MediaCollection.name.asc())
                    .limit(limit)
                )
                .unique()
                .all()
            )
            return [collection_to_gql(row, include_members=False) for row in rows]

    @strawberry.field(
        description="Fetch one media collection by id, including member assets. Null when missing."
    )
    def media_collection(self, info: strawberry.Info, id: int) -> MediaCollectionType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = (
                session.scalars(
                    select(MediaCollection)
                    .options(
                        joinedload(MediaCollection.members).joinedload(MediaCollectionMember.asset)
                    )
                    .where(MediaCollection.id == id)
                )
                .unique()
                .first()
            )
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return collection_to_gql(row, include_members=True)

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
        first: int | None = None,
    ) -> list[MediaAssetType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST)
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []

            if collection_id is not None:
                collection = (
                    session.scalars(
                        select(MediaCollection)
                        .options(
                            joinedload(MediaCollection.members).joinedload(
                                MediaCollectionMember.asset
                            )
                        )
                        .where(MediaCollection.id == collection_id)
                    )
                    .unique()
                    .first()
                )
                if collection is None or collection.workspace_id not in workspace_ids:
                    return []
                assets = [m.asset for m in collection.members if m.asset is not None]
                assets.sort(key=lambda a: a.filename)
                return [asset_to_gql(a) for a in assets[:limit]]

            rows = session.scalars(
                select(MediaAsset)
                .where(MediaAsset.workspace_id.in_(workspace_ids))
                .order_by(MediaAsset.created_at.desc(), MediaAsset.filename.asc())
                .limit(limit)
            ).all()
            return [asset_to_gql(row) for row in rows]
