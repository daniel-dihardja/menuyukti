import strawberry
from sqlalchemy import select

from graphql.context import request_session_scope
from graphql.data_sources import ImageAiFlow
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.mappers.image_ai_flow import flow_to_gql
from graphql.schema.types import ImageAiFlowType


@strawberry.type
class ImageAiFlowsQuery:
    @strawberry.field(
        description="Image AI flows ordered for display. Default: active only (asset upload UI)."
    )
    def image_ai_flows(
        self,
        info: strawberry.Info,
        include_inactive: bool = False,
        first: int | None = None,
    ) -> list[ImageAiFlowType]:
        limit = clamp_page_size(first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST)
        with request_session_scope(info) as session:
            stmt = select(ImageAiFlow).order_by(ImageAiFlow.sort_order.asc(), ImageAiFlow.id.asc())
            if not include_inactive:
                stmt = stmt.where(ImageAiFlow.is_active.is_(True))
            rows = session.scalars(stmt.limit(limit)).all()
            return [flow_to_gql(r) for r in rows]

    @strawberry.field(
        description="Single flow by slug (including inactive), for server-side processing."
    )
    def image_ai_flow(self, info: strawberry.Info, slug: str) -> ImageAiFlowType | None:
        slug_clean = slug.strip()
        if not slug_clean:
            return None

        with request_session_scope(info) as session:
            row = session.scalars(select(ImageAiFlow).where(ImageAiFlow.slug == slug_clean)).first()
            return flow_to_gql(row) if row else None
