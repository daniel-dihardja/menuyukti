"""Create a workspace visual style pack."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from graphql.context import request_session_scope
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.style import style_to_gql
from graphql.schema.types.style import StyleType
from graphql.services.visual_style import (
    clear_other_defaults,
    rules_from_style_spec,
    validate_style_fields,
    validate_style_spec,
)
from graphql.services.workspace_scope import primary_workspace_id


@strawberry.type
class CreateStyleMutation:
    @strawberry.mutation(description="Create a named visual style pack in the caller's workspace.")
    def create_style(
        self,
        info: strawberry.Info,
        name: str,
        reference_image_name: str,
        spec: JSON,
        is_default: bool = False,
    ) -> StyleType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createStyle")

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                raise ValueError("No workspace found for createStyle")

            spec_clean = validate_style_spec(spec)
            rules = rules_from_style_spec(spec_clean)
            name_clean, rules_clean, image_clean = validate_style_fields(
                name=name,
                rules=rules,
                reference_image_name=reference_image_name,
            )

            if is_default:
                clear_other_defaults(session, workspace_id)
            row = VisualStyle(
                workspace_id=workspace_id,
                created_by_clerk_user_id=user_id,
                name=name_clean,
                rules=rules_clean,
                reference_image_name=image_clean,
                spec=spec_clean,
                is_default=is_default,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return style_to_gql(row)
