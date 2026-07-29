"""Ensure / delete media asset catalog rows."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.media_collections import _asset_to_gql
from graphql.schema.types.media_collection import MediaAssetType
from graphql.services.media_collections import (
    delete_media_asset_by_filename,
    ensure_media_asset,
)
from graphql.services.workspace_scope import primary_workspace_id


@strawberry.type
class EnsureMediaAssetMutation:
    @strawberry.mutation(
        description=(
            "Idempotently create or update a media asset catalog row for a workspace photo filename."
        )
    )
    def ensure_media_asset(
        self,
        info: strawberry.Info,
        filename: str,
        display_name: str | None = None,
    ) -> MediaAssetType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for ensureMediaAsset")

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                raise ValueError("No workspace found for ensureMediaAsset")
            row = ensure_media_asset(
                session,
                workspace_id=workspace_id,
                user_id=user_id,
                filename=filename,
                display_name=display_name,
            )
            session.commit()
            session.refresh(row)
            return _asset_to_gql(row)


@strawberry.type
class DeleteMediaAssetMutation:
    @strawberry.mutation(
        description=(
            "Delete a media asset catalog row by filename (memberships cascade). "
            "Returns true when a row was removed; false when already absent."
        )
    )
    def delete_media_asset(self, info: strawberry.Info, filename: str) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteMediaAsset")

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                return False
            deleted = delete_media_asset_by_filename(
                session,
                workspace_id=workspace_id,
                filename=filename,
            )
            session.commit()
            return deleted
