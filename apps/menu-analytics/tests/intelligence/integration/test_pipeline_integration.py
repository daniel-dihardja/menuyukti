import json
from pathlib import Path

from app.intelligence.models.matrix_item import MatrixItem
from app.intelligence.models.heatmap import MenuHeatmap
from app.intelligence.models.matrix_distribution import MatrixDistribution
from app.intelligence.pipeline.pipeline import build_promotion_candidates
from app.intelligence.allocation.promotion_scheduler import PromotionScheduler


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "intelligence"


def _load_json(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_pipeline_and_scheduler_from_fixtures():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    portfolio, candidates = build_promotion_candidates(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    assert portfolio.structural is not None
    assert len(candidates) == 2

    expected_candidates = _load_json("expected_candidates.json")
    actual_candidates = [
        {
            "menu": c.menu,
            "decision": c.decision.value,
            "priority": c.priority.value,
            "recommended_post_time": c.recommended_post_time.isoformat(),
            "economic_weight": round(c.economic_weight, 2),
        }
        for c in candidates
    ]

    assert actual_candidates == expected_candidates

    scheduler = PromotionScheduler()
    schedule = scheduler.build_weekly_schedule(candidates)

    expected_schedule = _load_json("expected_schedule.json")
    actual_schedule = [
        {
            "day": p.day,
            "time": p.time.isoformat(),
            "menu": p.menu,
            "menu_category": p.menu_category,
            "priority": p.priority.value,
            "expected_behavior": p.expected_behavior,
            "reason": p.reason,
            "source_candidate": p.source_candidate,
        }
        for p in schedule
    ]

    assert actual_schedule == expected_schedule
