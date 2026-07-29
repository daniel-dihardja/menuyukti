"""Delete a workspace media collection."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.media_asset import MediaCollection
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeleteMediaCollectionMutation:
    @strawberry.mutation(description="Delete a media collection by id (memberships cascade).")
    def delete_media_collection(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteMediaCollection")

        with request_session_scope(info) as session:
            row = session.query(MediaCollection).filter(MediaCollection.id == id).first()
            if row is None:
                raise ValueError("Collection not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this collection")
            session.delete(row)
            session.commit()
            return True
