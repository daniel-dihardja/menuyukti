"""Query workspace visual style packs."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.style import StyleType
from graphql.services.workspace_scope import workspace_ids_for_user


def _style_to_gql(row: VisualStyle) -> StyleType:
    return StyleType(
        id=row.id,
        workspace_id=row.workspace_id,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
        name=row.name,
        rules=row.rules,
        reference_image_name=row.reference_image_name,
        is_default=bool(row.is_default),
        spec=row.spec,
    )


@strawberry.type
class StylesQuery:
    @strawberry.field(
        description="List visual style packs in workspaces the current user belongs to."
    )
    def styles(self, info: strawberry.Info) -> list[StyleType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.query(VisualStyle)
                .filter(VisualStyle.workspace_id.in_(workspace_ids))
                .order_by(VisualStyle.is_default.desc(), VisualStyle.name.asc())
                .all()
            )
            return [_style_to_gql(row) for row in rows]

    @strawberry.field(
        description="Fetch one visual style pack by id. Null when missing or access denied."
    )
    def style(self, info: strawberry.Info, id: int) -> StyleType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = session.query(VisualStyle).filter(VisualStyle.id == id).first()
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return _style_to_gql(row)
