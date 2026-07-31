"""ORM → GraphQL mappers for image AI flows."""

from __future__ import annotations

from graphql.data_sources import ImageAiFlow
from graphql.schema.types import ImageAiFlowType


def flow_to_gql(row: ImageAiFlow) -> ImageAiFlowType:
    return ImageAiFlowType(
        id=row.id,
        slug=row.slug,
        display_name=row.display_name,
        prompt=row.prompt,
        model=row.model,
        prompt_enhance=row.prompt_enhance,
        image_reference_strength=row.image_reference_strength,
        style_ids=row.style_ids,
        is_active=row.is_active,
        sort_order=row.sort_order,
    )
