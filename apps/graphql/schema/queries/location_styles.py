"""Query location visual style packs."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.location_style import LocationStyle
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.location_style import LocationStyleType


def _style_to_gql(row: LocationStyle) -> LocationStyleType:
    return LocationStyleType(
        id=row.id,
        location_id=row.location_id,
        name=row.name,
        rules=row.rules,
        reference_image_name=row.reference_image_name,
        is_default=bool(row.is_default),
        style_spec=row.style_spec,
    )


@strawberry.type
class LocationStylesQuery:
    @strawberry.field(
        description="List visual style packs for a location. Empty when unset or access denied."
    )
    def location_styles(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[LocationStyleType]:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id):
                return []
            rows = (
                session.query(LocationStyle)
                .filter(LocationStyle.location_id == location_id)
                .order_by(LocationStyle.is_default.desc(), LocationStyle.name.asc())
                .all()
            )
            return [_style_to_gql(row) for row in rows]

    @strawberry.field(
        description="Fetch one visual style pack by id. Null when missing or access denied."
    )
    def location_style(
        self,
        info: strawberry.Info,
        id: int,
    ) -> LocationStyleType | None:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            row = session.query(LocationStyle).filter(LocationStyle.id == id).first()
            if row is None:
                return None
            if not is_location_owner(session, row.location_id, user_id):
                return None
            return _style_to_gql(row)
