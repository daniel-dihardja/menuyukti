import strawberry

from graphql.context import get_manual_brief_cache, request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.location_manual_brief_input import LocationManualBriefInputType


@strawberry.type(description="Opening hours for one weekday.")
class OpeningHourType:
    day_of_week: str
    open_time: str
    close_time: str


@strawberry.type(
    description="A restaurant location; ties POS data and product entities to a workspace or legacy owner."
)
class LocationType:
    id: strawberry.ID
    name: str
    street: str | None
    city: str | None
    country: str | None
    currency: str | None
    node_id: strawberry.ID | None
    workspace_id: strawberry.ID | None
    opening_hours: list[OpeningHourType]

    @strawberry.field(description=("Owner-provided click-first brief hints. Not AI-generated."))
    def manual_brief_input(self, info: strawberry.Info) -> LocationManualBriefInputType | None:
        # Lazy import: avoid types ↔ queries circular import at module load.
        from graphql.schema.queries.location_manual_brief_input import load_manual_brief_type

        user_id = user_id_from_info(info)
        if not user_id:
            return None
        location_id = int(self.id)
        cache = get_manual_brief_cache(info)
        if location_id in cache:
            return cache[location_id]
        with request_session_scope(info) as session:
            is_owner = is_location_owner(session, location_id, user_id, info=info)
            if not is_owner:
                return None
            manual = load_manual_brief_type(session, location_id)
            cache[location_id] = manual
            return manual
