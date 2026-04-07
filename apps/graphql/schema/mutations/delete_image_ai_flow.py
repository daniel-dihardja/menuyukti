"""Delete an image AI flow by slug."""

from __future__ import annotations

import strawberry

from graphql.data_sources.database import ImageAiFlow, SessionLocal
from graphql.schema.auth import user_id_from_info


@strawberry.type
class DeleteImageAiFlowMutation:
    @strawberry.mutation
    def delete_image_ai_flow(self, info: strawberry.Info, slug: str) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteImageAiFlow")

        slug_key = slug.strip().lower()
        if not slug_key:
            raise ValueError("Slug is required")

        session = SessionLocal()
        try:
            row = session.query(ImageAiFlow).filter(ImageAiFlow.slug == slug_key).first()
            if row is None:
                raise ValueError("Image AI flow not found")

            session.delete(row)
            session.commit()
            return True
        finally:
            session.close()
