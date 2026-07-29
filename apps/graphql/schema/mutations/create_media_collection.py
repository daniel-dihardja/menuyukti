"""Create a workspace media collection."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.media_asset import MediaCollection
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.media_collections import _collection_to_gql
from graphql.schema.types.media_collection import MediaCollectionType
from graphql.services.media_collections import validate_collection_name
from graphql.services.workspace_scope import primary_workspace_id


@strawberry.type
class CreateMediaCollectionMutation:
    @strawberry.mutation(description="Create a named media collection in the caller's workspace.")
    def create_media_collection(self, info: strawberry.Info, name: str) -> MediaCollectionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createMediaCollection")

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                raise ValueError("No workspace found for createMediaCollection")

            name_clean = validate_collection_name(name)
            existing = (
                session.query(MediaCollection)
                .filter(
                    MediaCollection.workspace_id == workspace_id,
                    MediaCollection.name == name_clean,
                )
                .first()
            )
            if existing is not None:
                raise ValueError("A collection with this name already exists")

            row = MediaCollection(
                workspace_id=workspace_id,
                name=name_clean,
                created_by_clerk_user_id=user_id,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _collection_to_gql(row, include_members=False)
