"""ORM → GraphQL mappers for visual styles."""

from __future__ import annotations

from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.types.style import StyleType


def style_to_gql(row: VisualStyle) -> StyleType:
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
