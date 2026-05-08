"""GraphQL query for campaign schedule planning."""

from __future__ import annotations

import strawberry

from graphql.data_sources import AnalyticsRun, Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.services.campaign_schedule_plan import build_campaign_schedule_plan


@strawberry.type
class CampaignScheduleSlotType:
    date_time: str
    post_type: str
    promoted_menu_items: list[str]
    visual_idea: str
    caption_idea: str


@strawberry.type
class CampaignSchedulePlanType:
    analytics_run_id: strawberry.ID
    campaign_start: str
    campaign_end: str
    timezone: str
    posts_per_week: int
    slots: list[CampaignScheduleSlotType]
    source_signals_summary: str


@strawberry.type
class CampaignSchedulePlanQuery:
    @strawberry.field(
        description=(
            "Schedule plan for a Scheduler milestone. Requires a prior campaign brief "
            "milestone with structured campaign window data in the same workflow."
        )
    )
    def campaign_schedule_plan(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        milestone_id: strawberry.ID,
        location_id: int,
        analytics_run_id: strawberry.ID | None = None,
    ) -> CampaignSchedulePlanType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return None
            root = session.get(Node, int(str(workflow_id)))
            if root is None or root.node_type != "workflow":
                return None
            if root.location_id != location_id:
                return None

            run: AnalyticsRun | None
            if analytics_run_id is None:
                run = (
                    session.query(AnalyticsRun)
                    .where(AnalyticsRun.location_id == location_id)
                    .order_by(AnalyticsRun.id.desc())
                    .first()
                )
            else:
                run = session.get(AnalyticsRun, int(str(analytics_run_id)))
                if run is None or run.location_id != location_id:
                    return None
            if run is None:
                return None

            raw = build_campaign_schedule_plan(
                session,
                run=run,
                workflow_id=int(str(workflow_id)),
                milestone_id=int(str(milestone_id)),
                location_id=location_id,
            )
            if raw is None:
                return None

            return CampaignSchedulePlanType(
                analytics_run_id=strawberry.ID(str(raw["analytics_run_id"])),
                campaign_start=str(raw["campaign_start"]),
                campaign_end=str(raw["campaign_end"]),
                timezone=str(raw["timezone"]),
                posts_per_week=int(raw["posts_per_week"]),
                slots=[
                    CampaignScheduleSlotType(
                        date_time=str(slot["date_time"]),
                        post_type=str(slot["post_type"]),
                        promoted_menu_items=[str(x) for x in slot["promoted_menu_items"]],
                        visual_idea=str(slot["visual_idea"]),
                        caption_idea=str(slot["caption_idea"]),
                    )
                    for slot in raw["slots"]
                    if isinstance(slot, dict)
                ],
                source_signals_summary=str(raw["source_signals_summary"]),
            )
