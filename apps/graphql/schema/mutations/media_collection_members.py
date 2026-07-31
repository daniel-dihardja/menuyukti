"""Add or remove media assets from collections."""

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
from graphql.schema.mappers.media import collection_to_gql
from graphql.schema.types.media_collection import MediaCollectionType
from graphql.services.media_collections import (
    add_member,
    ensure_media_asset,
    remove_member,
    validate_photo_filename,
)


@strawberry.type
class AddMediaToCollectionMutation:
    @strawberry.mutation(description="Add a photo (by filename) to a media collection.")
    def add_media_to_collection(
        self,
        info: strawberry.Info,
        collection_id: int,
        filename: str,
    ) -> MediaCollectionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for addMediaToCollection")

        with request_session_scope(info) as session:
            collection = (
                session.query(MediaCollection).filter(MediaCollection.id == collection_id).first()
            )
            if collection is None:
                raise ValueError("Collection not found")
            if not is_workspace_member(session, collection.workspace_id, user_id):
                raise PermissionError("Not allowed to modify this collection")

            filename_clean = validate_photo_filename(filename)
            asset = ensure_media_asset(
                session,
                workspace_id=collection.workspace_id,
                user_id=user_id,
                filename=filename_clean,
            )
            add_member(session, collection=collection, asset=asset)
            session.commit()

            row = (
                session.query(MediaCollection)
                .options(
                    joinedload(MediaCollection.members).joinedload(MediaCollectionMember.asset)
                )
                .filter(MediaCollection.id == collection_id)
                .first()
            )
            assert row is not None
            return collection_to_gql(row, include_members=True)


@strawberry.type
class RemoveMediaFromCollectionMutation:
    @strawberry.mutation(description="Remove a photo (by filename) from a media collection.")
    def remove_media_from_collection(
        self,
        info: strawberry.Info,
        collection_id: int,
        filename: str,
    ) -> MediaCollectionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for removeMediaFromCollection")

        with request_session_scope(info) as session:
            collection = (
                session.query(MediaCollection).filter(MediaCollection.id == collection_id).first()
            )
            if collection is None:
                raise ValueError("Collection not found")
            if not is_workspace_member(session, collection.workspace_id, user_id):
                raise PermissionError("Not allowed to modify this collection")

            filename_clean = validate_photo_filename(filename)
            asset = (
                session.query(MediaAsset)
                .filter(
                    MediaAsset.workspace_id == collection.workspace_id,
                    MediaAsset.filename == filename_clean,
                )
                .first()
            )
            if asset is not None:
                remove_member(session, collection=collection, asset=asset)
            session.commit()

            row = (
                session.query(MediaCollection)
                .options(
                    joinedload(MediaCollection.members).joinedload(MediaCollectionMember.asset)
                )
                .filter(MediaCollection.id == collection_id)
                .first()
            )
            assert row is not None
            return collection_to_gql(row, include_members=True)
