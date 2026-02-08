from app.decision.enrichment.enriched_menu_item import EnrichedMenuItem
from app.decision.models.matrix_item import MatrixItem
from app.decision.models.heatmap import MenuHeatmap, HourlyDemand, WeeklyDemand
from app.decision.primitives.economic_primitives import EconomicPrimitives
from app.decision.primitives.behavioral_primitives import BehavioralPrimitives
from app.decision.roles.role_types import RoleType
from app.decision.signals.signal_types import SignalType
from app.decision.decisions.promotion_engine import promotion_decision
from app.decision.decisions.promotion_decision_types import PromotionDecision


def _dummy_item() -> EnrichedMenuItem:
    return EnrichedMenuItem(
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
            margin_strength=1.0,
            volume_strength=1.0,
            contribution_share=0.05,
        ),
        behavioral=BehavioralPrimitives(
            peak_hour=12,
            peak_share=0.2,
            demand_concentration=0.4,
            weekday_share=0.9,
            dead_hours=5,
        ),
    )


def test_promotion_decision_risk_blocks():
    decision = promotion_decision(
        _dummy_item(),
        roles=set(),
        signals={SignalType.DRAG_ALERT},
    )
    assert decision == PromotionDecision.DO_NOT_PROMOTE


def test_promotion_decision_growth_lever_with_signal():
    decision = promotion_decision(
        _dummy_item(),
        roles={RoleType.GROWTH_LEVER},
        signals={SignalType.MOMENTUM},
    )
    assert decision == PromotionDecision.PROMOTE


def test_promotion_decision_velocity_driver_consider():
    decision = promotion_decision(
        _dummy_item(),
        roles={RoleType.VELOCITY_DRIVER},
        signals=set(),
    )
    assert decision == PromotionDecision.CONSIDER


def test_promotion_decision_default_do_not_promote():
    decision = promotion_decision(
        _dummy_item(),
        roles=set(),
        signals=set(),
    )
    assert decision == PromotionDecision.DO_NOT_PROMOTE
