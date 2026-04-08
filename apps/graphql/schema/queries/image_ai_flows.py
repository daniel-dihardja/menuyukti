import strawberry

from graphql.data_sources import ImageAiFlow, SessionLocal
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
    def image_ai_flows(
        self, include_inactive: bool = False
    ) -> list[ImageAiFlowType]:
        """Image AI flows ordered for display. Default: active only (asset upload UI)."""

        session = SessionLocal()
        try:
            q = session.query(ImageAiFlow).order_by(
                ImageAiFlow.sort_order.asc(), ImageAiFlow.id.asc()
            )
            if not include_inactive:
                q = q.filter(ImageAiFlow.is_active.is_(True))
            rows = q.all()
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
