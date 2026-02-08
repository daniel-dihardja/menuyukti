import pytest

from intelligence.models.matrix_distribution import MatrixDistribution, CategoryDistribution
from intelligence.primitives.engine.structural_engine import compute_structural_primitives


def test_compute_structural_primitives():
    distribution = MatrixDistribution(
        categories=[
            CategoryDistribution(category="star", item_count=4, item_share=0.4, margin_share=0.4),
            CategoryDistribution(category="puzzle", item_count=2, item_share=0.2, margin_share=0.2),
            CategoryDistribution(category="plow_horse", item_count=3, item_share=0.3, margin_share=0.3),
            CategoryDistribution(category="low_end", item_count=1, item_share=0.1, margin_share=0.1),
        ]
    )

    structural = compute_structural_primitives(distribution)

    assert structural.profit_concentration == pytest.approx(0.4)
    assert structural.diversification_score == pytest.approx(0.6)
    assert structural.star_margin_share == pytest.approx(0.4)
    assert structural.low_end_share == pytest.approx(0.1)
    assert structural.puzzle_profit_share == pytest.approx(0.2)
    assert structural.structural_health == pytest.approx(0.54)
