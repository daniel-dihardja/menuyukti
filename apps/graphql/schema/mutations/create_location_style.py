"""Create a location visual style pack."""

from __future__ import annotations

from typing import Any

import strawberry
from strawberry.scalars import JSON

from graphql.context import request_session_scope
from graphql.data_sources.models.location_style import LocationStyle
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.location_styles import _style_to_gql
from graphql.schema.types.location_style import LocationStyleType
from graphql.services.location_style import (
    clear_other_defaults,
    rules_from_style_spec,
    validate_style_fields,
    validate_style_spec,
)


@strawberry.type
class CreateLocationStyleMutation:
    @strawberry.mutation(description="Create a named visual style pack for a location.")
    def create_location_style(
        self,
        info: strawberry.Info,
        location_id: int,
        name: str,
        rules: str,
        reference_image_name: str,
        is_default: bool = False,
        style_spec: JSON | None = None,
    ) -> LocationStyleType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createLocationStyle")

        normalized_spec: dict[str, Any] | None = None
        if style_spec is not None:
            normalized_spec = validate_style_spec(style_spec)
            rules = rules_from_style_spec(normalized_spec)

        name_clean, rules_clean, image_clean = validate_style_fields(
            name=name,
            rules=rules,
            reference_image_name=reference_image_name,
        )

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            if is_default:
                clear_other_defaults(session, location_id)
            row = LocationStyle(
                location_id=location_id,
                name=name_clean,
                rules=rules_clean,
                reference_image_name=image_clean,
                style_spec=normalized_spec,
                is_default=is_default,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _style_to_gql(row)
