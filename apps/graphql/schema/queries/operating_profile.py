from typing import Optional

import strawberry

from graphql.data_sources import AnalyticsRun, OrderFact, SessionLocal
from menuyukti.core.analytics import compute_operating_profile_from_orders


@strawberry.type
class MealPeriodBreakdownType:
    period: str
    label: str
    order_count: int
    share: float
    revenue: float
    revenue_share: float


@strawberry.type
class DayOfWeekBreakdownType:
    day: str
    is_weekend: bool
    order_count: int
    share: float
    revenue: float
    is_peak_day: bool


@strawberry.type
class DayTypeBreakdownType:
    type: str
    order_count: int
    share: float
    revenue: float
    revenue_share: float


@strawberry.type
class OperatingProfileType:
    total_orders: int
    total_revenue: float
    active_days_count: int
    avg_daily_orders: float
    avg_order_size: float
    weekday_share: float
    weekend_share: float
    peak_day: str
    primary_meal_period: str
    active_meal_periods: list[str]
    day_of_week_breakdown: list[DayOfWeekBreakdownType]
    day_type_breakdown: list[DayTypeBreakdownType]
    meal_period_breakdown: list[MealPeriodBreakdownType]
    operating_pattern: str
    dining_focus: str


def _result_to_type(result) -> OperatingProfileType:
    return OperatingProfileType(
        total_orders=result["total_orders"],
        total_revenue=result["total_revenue"],
        active_days_count=result["active_days_count"],
        avg_daily_orders=result["avg_daily_orders"],
        avg_order_size=result["avg_order_size"],
        weekday_share=result["weekday_share"],
        weekend_share=result["weekend_share"],
        peak_day=result["peak_day"],
        primary_meal_period=result["primary_meal_period"],
        active_meal_periods=result["active_meal_periods"],
        day_of_week_breakdown=[
            DayOfWeekBreakdownType(
                day=r["day"],
                is_weekend=r["is_weekend"],
                order_count=r["order_count"],
                share=r["share"],
                revenue=r["revenue"],
                is_peak_day=r["is_peak_day"],
            )
            for r in result["day_of_week_breakdown"]
        ],
        day_type_breakdown=[
            DayTypeBreakdownType(
                type=r["type"],
                order_count=r["order_count"],
                share=r["share"],
                revenue=r["revenue"],
                revenue_share=r["revenue_share"],
            )
            for r in result["day_type_breakdown"]
        ],
        meal_period_breakdown=[
            MealPeriodBreakdownType(
                period=r["period"],
                label=r["label"],
                order_count=r["order_count"],
                share=r["share"],
                revenue=r["revenue"],
                revenue_share=r["revenue_share"],
            )
            for r in result["meal_period_breakdown"]
        ],
        operating_pattern=result["operating_pattern"],
        dining_focus=result["dining_focus"],
    )


@strawberry.type
class OperatingProfileQuery:
    @strawberry.field
    def operating_profile(
        self,
        location_id: strawberry.ID,
        analytics_run_id: strawberry.ID,
    ) -> Optional[OperatingProfileType]:
        """Return the operating profile for an analytics run scoped to a location.

        Returns None if the analytics run does not exist or does not belong to
        the given location_id.
        """
        session = SessionLocal()
        try:
            run = session.get(AnalyticsRun, int(analytics_run_id))
            if run is None or run.location_id != int(location_id):
                return None

            rows = (
                session.query(OrderFact)
                .where(OrderFact.analytics_run_id == run.id)
                .all()
            )

            order_rows = [
                {
                    "order_time": r.order_time,
                    "bill_number": r.bill_number,
                    "total_after_bill_discount": r.total_after_bill_discount,
                    "qty": r.qty,
                }
                for r in rows
            ]

            result = compute_operating_profile_from_orders(order_rows)
            if result is None:
                return None

            return _result_to_type(result)
        finally:
            session.close()
