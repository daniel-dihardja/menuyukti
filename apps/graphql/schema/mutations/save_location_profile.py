from datetime import datetime, timezone

import strawberry

from graphql.data_sources import LocationProfile, SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, require_location_owner, user_id_from_info
from graphql.schema.types import LocationProfileType


@strawberry.type
class SaveLocationProfileMutation:
    @strawberry.mutation
    def save_location_profile(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
        summary: str,
    ) -> LocationProfileType:
        user_id = user_id_from_info(info)
        aid = int(analytics_run_id)
        if aid <= 0:
            raise ValueError("analyticsRunId must be a positive existing analytics run id")
        session = SessionLocal()
        try:
            require_location_owner(session, int(location_id), user_id)
            run = get_analytics_run_if_owner(session, aid, user_id)
            if run is None or run.location_id != int(location_id):
                raise ValueError("Analytics run does not exist or does not belong to this location")
            row = (
                session.query(LocationProfile)
                .filter(
                    LocationProfile.location_id == int(location_id),
                    LocationProfile.analytics_run_id == int(analytics_run_id),
                )
                .first()
            )
            if row is None:
                row = LocationProfile(
                    location_id=int(location_id),
                    analytics_run_id=int(analytics_run_id),
                    summary=summary,
                )
                session.add(row)
            else:
                row.summary = summary
                row.updated_at = datetime.now(tz=timezone.utc)
            session.commit()
            session.refresh(row)
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
