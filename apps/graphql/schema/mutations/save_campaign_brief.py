from datetime import datetime, timezone

import strawberry

from graphql.data_sources import CampaignBrief, SessionLocal
from graphql.schema.types import CampaignBriefType


@strawberry.type
class SaveCampaignBriefMutation:
    @strawberry.mutation
    def save_campaign_brief(
        self,
        campaign_id: strawberry.ID,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
        campaign_theme: str,
        tone: str,
        target_audience: str,
        posting_cadence: str,
    ) -> CampaignBriefType:
        session = SessionLocal()
        try:
            row = (
                session.query(CampaignBrief)
                .filter(CampaignBrief.campaign_id == int(campaign_id))
                .first()
            )
            if row is None:
                row = CampaignBrief(
                    campaign_id=int(campaign_id),
                    location_id=int(location_id),
                    analytics_run_id=int(analytics_run_id),
                    campaign_theme=campaign_theme,
                    tone=tone,
                    target_audience=target_audience,
                    posting_cadence=posting_cadence,
                )
                session.add(row)
            else:
                row.location_id = int(location_id)
                row.analytics_run_id = int(analytics_run_id)
                row.campaign_theme = campaign_theme
                row.tone = tone
                row.target_audience = target_audience
                row.posting_cadence = posting_cadence
                row.updated_at = datetime.now(tz=timezone.utc)
            session.commit()
            session.refresh(row)
            return CampaignBriefType(
                id=row.id,
                campaign_id=row.campaign_id,
                location_id=row.location_id,
                analytics_run_id=row.analytics_run_id,
                campaign_theme=row.campaign_theme,
                tone=row.tone,
                target_audience=row.target_audience,
                posting_cadence=row.posting_cadence,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
        finally:
            session.close()
