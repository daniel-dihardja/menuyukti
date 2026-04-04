from datetime import UTC, datetime

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import PromotionCandidates, SessionLocal
from graphql.schema.auth import get_campaign_if_owner, user_id_from_info
from graphql.schema.types import PromotionCandidatesType


@strawberry.type
class SavePromotionCandidatesMutation:
    @strawberry.mutation
    def save_promotion_candidates(
        self,
        info: strawberry.Info,
        campaign_id: strawberry.ID,
        candidates_json: JSON,
    ) -> PromotionCandidatesType:
        """Upsert promotion candidates JSON for a campaign (one row per campaign)."""
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            campaign = get_campaign_if_owner(session, int(campaign_id), user_id)
            if campaign is None:
                raise PermissionError("Access denied")

            row = (
                session.query(PromotionCandidates)
                .filter(PromotionCandidates.campaign_id == int(campaign_id))
                .first()
            )
            if row is None:
                row = PromotionCandidates(
                    campaign_id=int(campaign_id),
                    candidates_json=candidates_json,
                )
                session.add(row)
            else:
                row.candidates_json = candidates_json
                row.updated_at = datetime.now(tz=UTC)
            session.commit()
            session.refresh(row)
            return PromotionCandidatesType(
                id=row.id,
                campaign_id=row.campaign_id,
                candidates_json=row.candidates_json,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
        finally:
            session.close()
