import logging

import strawberry

from graphql.data_sources import LocationProfile, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import LocationProfileType

logger = logging.getLogger(__name__)


@strawberry.type
class LocationProfileQuery:
    @strawberry.field
    def location_profile(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
    ) -> LocationProfileType | None:
        lid = int(location_id)
        aid = int(analytics_run_id)
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            if not user_id:
                logger.warning(
                    "location_profile: empty user context (set X-User-Id); "
                    "returning null (location_id=%s analytics_run_id=%s)",
                    lid,
                    aid,
                )
                return None
            if not is_location_owner(session, lid, user_id):
                logger.warning(
                    "location_profile: not location owner; returning null "
                    "(location_id=%s analytics_run_id=%s clerk_user_id=%s)",
                    lid,
                    aid,
                    user_id,
                )
                return None
            row = (
                session.query(LocationProfile)
                .filter(
                    LocationProfile.location_id == lid,
                    LocationProfile.analytics_run_id == aid,
                )
                .first()
            )
            if row is None:
                logger.info(
                    "location_profile: no saved profile row (location_id=%s analytics_run_id=%s)",
                    lid,
                    aid,
                )
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
