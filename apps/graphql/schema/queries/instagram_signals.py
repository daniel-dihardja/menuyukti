"""GraphQL resolver for capability-aware instagramSignals."""

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.mappers.instagram_signals import instagram_signals_raw_to_gql
from graphql.schema.types.instagram_signals import InstagramSignalsType
from graphql.services.compute_limits import compute_timeout
from graphql.services.instagram_signals import build_instagram_signals


@strawberry.type
class InstagramSignalsQuery:
    @strawberry.field(
        description=(
            "Composite Instagram signals for an analytics run: content heroes, "
            "trending items, avoid list, category focus, best posting window, "
            "and period headline. Requires order facts; returns null if none."
        )
    )
    def instagram_signals(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> InstagramSignalsType | None:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            run = get_analytics_run_if_owner(
                session,
                int(analytics_run_id),
                user_id,
                info=info,
                location_id=int(location_id) if location_id is not None else None,
            )
            if run is None:
                return None

            with compute_timeout():
                raw = build_instagram_signals(session, run, info=info)
            if raw is None:
                return None

            return instagram_signals_raw_to_gql(run.id, raw)
