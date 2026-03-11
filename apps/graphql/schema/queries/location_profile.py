import strawberry

from graphql.data_sources import LocationProfile, SessionLocal
from graphql.schema.types import LocationProfileType


@strawberry.type
class LocationProfileQuery:
    @strawberry.field
    def location_profile(
        self,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
    ) -> LocationProfileType | None:
        session = SessionLocal()
        try:
            row = (
                session.query(LocationProfile)
                .filter(
                    LocationProfile.location_id == int(location_id),
                    LocationProfile.analytics_run_id == int(analytics_run_id),
                )
                .first()
            )
            if row is None:
                return None
            return LocationProfileType(
                id=row.id,
                location_id=row.location_id,
                analytics_run_id=row.analytics_run_id,
                summary=row.summary,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
        finally:
            session.close()
