from datetime import time

from app.decision.decisions.promotion_candidate import PromotionCandidate
from app.decision.decisions.promotion_decision_types import PromotionDecision
from app.decision.decisions.promotion_candidate import PromotionPriority
from app.decision.allocation.promotion_scheduler import PromotionScheduler


def _candidate(menu: str, category: str, decision: PromotionDecision, priority: PromotionPriority, weight: float):
    return PromotionCandidate(
        menu=menu,
        menu_category=category,
        menu_category_detail=None,
        decision=decision,
        priority=priority,
        roles=frozenset(),
        signals=frozenset(),
        profit_velocity=1.0,
        contribution_share=0.1,
        economic_weight=weight,
        peak_hour=10,
        recommended_post_time=time(hour=9, minute=15),
        decision_reason="reason",
        expected_behavior="behavior",
        requires_discount=False,
    )


def test_scheduler_filters_and_avoids_repetition():
    scheduler = PromotionScheduler(post_days=["mon", "wed"])

    candidates = [
        _candidate("Alpha", "DRINK", PromotionDecision.PROMOTE, PromotionPriority.CRITICAL, 10.0),
        _candidate("Beta", "DRINK", PromotionDecision.PROMOTE, PromotionPriority.HIGH, 9.0),
        _candidate("Gamma", "FOOD", PromotionDecision.PROMOTE, PromotionPriority.HIGH, 8.0),
        _candidate("Delta", "FOOD", PromotionDecision.CONSIDER, PromotionPriority.MEDIUM, 7.0),
    ]

    schedule = scheduler.build_weekly_schedule(candidates)

    assert [p.menu for p in schedule] == ["Alpha", "Gamma"]
    assert [p.day for p in schedule] == ["mon", "wed"]
