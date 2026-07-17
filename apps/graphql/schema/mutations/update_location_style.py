"""Update a location visual style pack."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.location_style import LocationStyle
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.location_styles import _style_to_gql
from graphql.schema.types.location_style import LocationStyleType
from graphql.services.location_style import clear_other_defaults, validate_style_fields


@strawberry.type
class UpdateLocationStyleMutation:
    @strawberry.mutation(description="Update a location visual style pack.")
    def update_location_style(
        self,
        info: strawberry.Info,
        id: int,
        name: str | None = None,
        rules: str | None = None,
        reference_image_name: str | None = None,
        is_default: bool | None = None,
    ) -> LocationStyleType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationStyle")

        with request_session_scope(info) as session:
            row = session.query(LocationStyle).filter(LocationStyle.id == id).first()
            if row is None:
                raise ValueError("Location style not found")
            require_location_owner(session, row.location_id, user_id)

            next_name = name if name is not None else row.name
            next_rules = rules if rules is not None else row.rules
            next_image = (
                reference_image_name if reference_image_name is not None else row.reference_image_name
            )
            name_clean, rules_clean, image_clean = validate_style_fields(
                name=next_name,
                rules=next_rules,
                reference_image_name=next_image,
            )
            row.name = name_clean
            row.rules = rules_clean
            row.reference_image_name = image_clean

            if is_default is not None:
                if is_default:
                    clear_other_defaults(session, row.location_id, keep_id=row.id)
                row.is_default = is_default

            session.commit()
            session.refresh(row)
            return _style_to_gql(row)
