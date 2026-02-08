import pytest

from app.intelligence.models.heatmap import MenuHeatmap, HourlyDemand, WeeklyDemand
from app.intelligence.primitives.engine.behavioral_engine import compute_behavioral_primitives


def test_compute_behavioral_primitives():
    heatmap = MenuHeatmap(
        menu="Alpha",
        menu_category="DRINK",
        menu_category_detail="COFFEE",
        daily_heatmap=[
            HourlyDemand(hour=8, quantity=10),
            HourlyDemand(hour=9, quantity=15),
            HourlyDemand(hour=10, quantity=25),
            HourlyDemand(hour=11, quantity=20),
            HourlyDemand(hour=12, quantity=30),
        ],
        weekly_heatmap=[
            WeeklyDemand(day="mon", quantity=30),
            WeeklyDemand(day="tue", quantity=25),
            WeeklyDemand(day="wed", quantity=20),
            WeeklyDemand(day="thu", quantity=10),
            WeeklyDemand(day="fri", quantity=10),
            WeeklyDemand(day="sat", quantity=3),
            WeeklyDemand(day="sun", quantity=2),
        ],
        reporting_period="2025-02",
    )

    beh = compute_behavioral_primitives(heatmap)

    assert beh.peak_hour == 12
    assert beh.peak_share == pytest.approx(0.30)
    assert beh.demand_concentration == pytest.approx(0.75)
    assert beh.weekday_share == pytest.approx(0.95)
    assert beh.dead_hours == 0
