import strawberry

from graphql.data_sources import PromotionCandidates, SessionLocal
from graphql.schema.auth import get_campaign_if_owner, user_id_from_info
from graphql.schema.types import PromotionCandidatesType


@strawberry.type
class PromotionCandidatesQuery:
    @strawberry.field
    def promotion_candidates(
        self,
        info: strawberry.Info,
        campaign_id: strawberry.ID,
    ) -> PromotionCandidatesType | None:
        """Return saved promotion candidates JSON for a campaign, or None if none exist."""
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            campaign = get_campaign_if_owner(session, int(campaign_id), user_id)
            if campaign is None:
                return None
            row = (
                session.query(PromotionCandidates)
                .filter(PromotionCandidates.campaign_id == int(campaign_id))
                .first()
            )
            if row is None:
                return None
            return PromotionCandidatesType(
                id=row.id,
                campaign_id=row.campaign_id,
                candidates_json=row.candidates_json,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
        finally:
            session.close()
