import strawberry

from graphql.data_sources.database import ImageAiFlow, SessionLocal
from graphql.schema.types import ImageAiFlowType


def _flow_to_gql(row: ImageAiFlow) -> ImageAiFlowType:
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


@strawberry.type
class ImageAiFlowsQuery:
    @strawberry.field
    def image_ai_flows(self) -> list[ImageAiFlowType]:
        """All active image AI flows for the asset upload UI, ordered for display."""

        session = SessionLocal()
        try:
            rows = (
                session.query(ImageAiFlow)
                .filter(ImageAiFlow.is_active.is_(True))
                .order_by(ImageAiFlow.sort_order.asc(), ImageAiFlow.id.asc())
                .all()
            )
            return [_flow_to_gql(r) for r in rows]
        finally:
            session.close()

    @strawberry.field
    def image_ai_flow(self, slug: str) -> ImageAiFlowType | None:
        """Single flow by slug (including inactive), for server-side processing."""

        slug_clean = slug.strip()
        if not slug_clean:
            return None

        session = SessionLocal()
        try:
            row = (
                session.query(ImageAiFlow)
                .filter(ImageAiFlow.slug == slug_clean)
                .first()
            )
            return _flow_to_gql(row) if row else None
        finally:
            session.close()
