from app.intelligence.enrichment.enriched_menu_item import EnrichedMenuItem
from app.intelligence.models.matrix_item import MatrixItem
from app.intelligence.models.heatmap import MenuHeatmap, HourlyDemand, WeeklyDemand
from app.intelligence.primitives.economic_primitives import EconomicPrimitives
from app.intelligence.primitives.behavioral_primitives import BehavioralPrimitives
from app.intelligence.roles.role_types import RoleType
from app.intelligence.signals.signal_engine import detect_signals
from app.intelligence.signals.signal_types import SignalType


def test_detect_signals_promotion_ready_and_momentum():
    item = EnrichedMenuItem(
        matrix=MatrixItem(
            menu="Alpha",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            category="star",
            action="promote",
            quantity=50,
            total_revenue=1000.0,
            cogs=3.0,
            total_cogs=150.0,
            margin_per_unit=12.0,
            contribution_margin=600.0,
            contribution_margin_percentage=0.2,
            we_value=0.8,
        ),
        heatmap=MenuHeatmap(
            menu="Alpha",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            daily_heatmap=[HourlyDemand(hour=12, quantity=30)],
            weekly_heatmap=[WeeklyDemand(day="mon", quantity=30)],
            reporting_period="2025-02",
        ),
        economic=EconomicPrimitives(
            profit_velocity=2.0,
            margin_strength=1.3,
            volume_strength=0.7,
            contribution_share=0.12,
        ),
        behavioral=BehavioralPrimitives(
            peak_hour=12,
            peak_share=0.2,
            demand_concentration=0.6,
            weekday_share=0.9,
            dead_hours=10,
        ),
    )

    roles = {RoleType.GROWTH_LEVER}
    signals = detect_signals(item, roles)

    assert SignalType.PROMOTION_READY in signals
    assert SignalType.MOMENTUM in signals
    assert SignalType.OVEREXPOSED not in signals
