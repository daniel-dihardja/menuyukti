"""Query workspace visual style packs."""

from __future__ import annotations

import strawberry
from sqlalchemy import select

from graphql.context import request_session_scope
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.style import style_to_gql
from graphql.schema.types.style import StyleType
from graphql.services.workspace_scope import workspace_ids_for_user


@strawberry.type
class StylesQuery:
    @strawberry.field(
        description="List visual style packs in workspaces the current user belongs to."
    )
    def styles(self, info: strawberry.Info, first: int | None = None) -> list[StyleType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST)
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = session.scalars(
                select(VisualStyle)
                .where(VisualStyle.workspace_id.in_(workspace_ids))
                .order_by(VisualStyle.is_default.desc(), VisualStyle.name.asc())
                .limit(limit)
            ).all()
            return [style_to_gql(row) for row in rows]

    @strawberry.field(
        description="Fetch one visual style pack by id. Null when missing or access denied."
    )
    def style(self, info: strawberry.Info, id: int) -> StyleType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = session.scalars(select(VisualStyle).where(VisualStyle.id == id)).first()
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return style_to_gql(row)
