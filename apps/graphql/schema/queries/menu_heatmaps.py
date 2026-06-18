"""GraphQL types and resolver for menuHeatmaps."""

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.menu_heatmaps import build_menu_heatmaps


@strawberry.type(description="Hourly demand distribution for a menu item.")
class DailyHeatmapType:
    hour: int
    quantity: int


@strawberry.type(description="Day-of-week demand distribution for a menu item.")
class WeeklyHeatmapType:
    day: str
    quantity: int


@strawberry.type(
    description=(
        "Hourly and day-of-week demand heatmaps for a single menu item. "
        "Use this to understand when a dish sells best."
    )
)
class MenuHeatmapType:
    menu: str
    menu_category: str | None
    menu_category_detail: str | None
    daily_heatmap: list[DailyHeatmapType]
    weekly_heatmap: list[WeeklyHeatmapType]
    reporting_period: str


def menu_heatmaps_to_gql(payloads: list[dict]) -> list[MenuHeatmapType]:
    result: list[MenuHeatmapType] = []
    for payload in payloads:
        daily_heatmap = [
            DailyHeatmapType(
                hour=row["hour"],
                quantity=row["quantity"],
            )
            for row in payload["daily_heatmap"]
        ]
        weekly_heatmap = [
            WeeklyHeatmapType(
                day=row["day"],
                quantity=row["quantity"],
            )
            for row in payload["weekly_heatmap"]
        ]
        result.append(
            MenuHeatmapType(
                menu=payload["menu"],
                menu_category=payload["menu_category"],
                menu_category_detail=payload["menu_category_detail"],
                daily_heatmap=daily_heatmap,
                weekly_heatmap=weekly_heatmap,
                reporting_period=payload["reporting_period"],
            )
        )
    return result


@strawberry.type
class MenuHeatmapsQuery:
    @strawberry.field(
        description=(
            "Return hourly and day-of-week demand heatmaps for every menu item in an analytics run. "
            "Use this to identify peak selling times per dish. "
            "When locationId is set, the run must belong to that location (otherwise returns an empty list)."
        )
    )
    def menu_heatmaps(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> list[MenuHeatmapType]:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id, info=info)
            if run is None:
                return []
            if location_id is not None and run.location_id != int(location_id):
                return []
            payloads = build_menu_heatmaps(session, run, info=info)
            return menu_heatmaps_to_gql(payloads)
