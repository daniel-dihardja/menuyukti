"""Update an existing image AI flow by slug."""

from __future__ import annotations

import strawberry
from strawberry import UNSET
from strawberry.scalars import JSON

from graphql.data_sources import SessionLocal
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.image_ai_flows import _flow_to_gql
from graphql.schema.types import ImageAiFlowType
from graphql.services import image_ai_flow as image_ai_flow_service


@strawberry.type
class UpdateImageAiFlowMutation:
    @strawberry.mutation
    def update_image_ai_flow(
        self,
        info: strawberry.Info,
        slug: str,
        new_slug: str | None = UNSET,
        display_name: str | None = UNSET,
        prompt: str | None = UNSET,
        model: str | None = UNSET,
        prompt_enhance: str | None = UNSET,
        image_reference_strength: str | None = UNSET,
        style_ids: JSON | None = UNSET,
        is_active: bool | None = UNSET,
        sort_order: int | None = UNSET,
    ) -> ImageAiFlowType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateImageAiFlow")

        session = SessionLocal()
        try:
            row = image_ai_flow_service.update_image_ai_flow(
                session,
                slug=slug,
                new_slug=new_slug,
                display_name=display_name,
                prompt=prompt,
                model=model,
                prompt_enhance=prompt_enhance,
                image_reference_strength=image_reference_strength,
                style_ids=style_ids,
                is_active=is_active,
                sort_order=sort_order,
            )
            return _flow_to_gql(row)
        finally:
            session.close()
