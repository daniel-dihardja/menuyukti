"""Rename a workspace media collection."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.media_asset import MediaCollection
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.media_collections import _collection_to_gql
from graphql.schema.types.media_collection import MediaCollectionType
from graphql.services.media_collections import validate_collection_name


@strawberry.type
class UpdateMediaCollectionMutation:
    @strawberry.mutation(description="Rename a media collection by id.")
    def update_media_collection(
        self,
        info: strawberry.Info,
        id: int,
        name: str,
    ) -> MediaCollectionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateMediaCollection")

        with request_session_scope(info) as session:
            row = session.query(MediaCollection).filter(MediaCollection.id == id).first()
            if row is None:
                raise ValueError("Collection not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this collection")

            name_clean = validate_collection_name(name)
            clash = (
                session.query(MediaCollection)
                .filter(
                    MediaCollection.workspace_id == row.workspace_id,
                    MediaCollection.name == name_clean,
                    MediaCollection.id != row.id,
                )
                .first()
            )
            if clash is not None:
                raise ValueError("A collection with this name already exists")

            row.name = name_clean
            session.commit()
            session.refresh(row)
            return _collection_to_gql(row, include_members=False)
