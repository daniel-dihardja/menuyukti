"""Update a workspace visual style pack."""

from __future__ import annotations

from typing import Any

import strawberry
from strawberry.scalars import JSON

from graphql.context import request_session_scope
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.styles import _style_to_gql
from graphql.schema.types.style import StyleType
from graphql.services.visual_style import (
    clear_other_defaults,
    rules_from_style_spec,
    validate_style_fields,
    validate_style_spec,
)


@strawberry.type
class UpdateStyleMutation:
    @strawberry.mutation(description="Update a visual style pack in the caller's workspace.")
    def update_style(
        self,
        info: strawberry.Info,
        id: int,
        name: str | None = None,
        rules: str | None = None,
        reference_image_name: str | None = None,
        is_default: bool | None = None,
        style_spec: JSON | None = None,
    ) -> StyleType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateStyle")

        with request_session_scope(info) as session:
            row = session.query(VisualStyle).filter(VisualStyle.id == id).first()
            if row is None:
                raise ValueError("Style not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this style")

            next_name = name if name is not None else row.name
            next_image = (
                reference_image_name
                if reference_image_name is not None
                else row.reference_image_name
            )

            normalized_spec: dict[str, Any] | None
            if style_spec is not None:
                normalized_spec = validate_style_spec(style_spec)
                next_rules = rules_from_style_spec(normalized_spec)
            else:
                normalized_spec = row.style_spec
                next_rules = rules if rules is not None else row.rules

            name_clean, rules_clean, image_clean = validate_style_fields(
                name=next_name,
                rules=next_rules,
                reference_image_name=next_image,
            )
            row.name = name_clean
            row.rules = rules_clean
            row.reference_image_name = image_clean
            if style_spec is not None:
                row.style_spec = normalized_spec

            if is_default is not None:
                if is_default:
                    clear_other_defaults(session, row.workspace_id, keep_id=row.id)
                row.is_default = is_default

            session.commit()
            session.refresh(row)
            return _style_to_gql(row)
