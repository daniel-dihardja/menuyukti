import json
from pathlib import Path

import pytest

from menuyukti.core.inputs import CoreInputs
from menuyukti.indicators.models.matrix_item import MatrixItem
from menuyukti.indicators.models.heatmap import MenuHeatmap
from menuyukti.indicators.models.matrix_distribution import MatrixDistribution
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "menuyukti"


def _load_json(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_core_inputs_model():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    assert len(core.matrix_items) == 2
    assert len(core.heatmaps) == 2
    assert core.distribution.categories
    assert core.sales_summary is None


def test_core_inputs_model_with_sales_summary_alias_support():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))
    sales_summary = SalesAnalyticsSummary(
        total_orders=100,
        total_items_sold=240,
        total_revenue=3500000.0,
        avg_order_revenue=35000.0,
        max_order_revenue=125000.0,
        min_order_revenue=8000.0,
        avg_order_items=2.4,
        max_order_items=8,
        min_order_items=1,
        avg_popularity=0.41,
        popularity_index=[],
        period_start="2026-01-01",
        period_end="2026-01-31",
    )

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
        sales_summary=sales_summary,
    )

    assert core.sales_summary is not None
    assert core.sales_summary.avg_popularity_threshold == 0.41


def test_core_inputs_rejects_empty_matrix_items():
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    with pytest.raises(ValueError) as exc:
        CoreInputs(matrix_items=[], heatmaps=heatmaps, distribution=distribution)

    assert "at least 1 item" in str(exc.value)


def test_core_inputs_rejects_unknown_heatmap_menu():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))
    rogue_heatmap = {
        "menu": "Rogue Menu",
        "menu_category": "DRINK",
        "menu_category_detail": "SPECIAL",
        "daily_heatmap": [],
        "weekly_heatmap": [],
        "reporting_period": "2026-01",
    }
    heatmaps.append(MenuHeatmap(**rogue_heatmap))

    with pytest.raises(ValueError) as exc:
        CoreInputs(
            matrix_items=matrix_items,
            heatmaps=heatmaps,
            distribution=distribution,
        )

    assert "CORE_INPUT_HEATMAP_MENU_UNKNOWN" in str(exc.value)


def test_core_inputs_rejects_duplicate_distribution_category():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]

    with pytest.raises(ValueError) as exc:
        CoreInputs(
            matrix_items=matrix_items,
            heatmaps=heatmaps,
            distribution={
                "categories": [
                    {
                        "category": "star",
                        "item_count": 1,
                        "item_share": 0.5,
                        "margin_share": 0.6,
                    },
                    {
                        "category": "star",
                        "item_count": 1,
                        "item_share": 0.5,
                        "margin_share": 0.4,
                    },
                ]
            },
        )

    assert "CORE_MODEL_DUPLICATE_CATEGORY_DISTRIBUTION" in str(exc.value)


def test_core_inputs_sorts_deterministically():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    core = CoreInputs(
        matrix_items=list(reversed(matrix_items)),
        heatmaps=list(reversed(heatmaps)),
        distribution=MatrixDistribution(
            categories=list(reversed(distribution.categories))
        ),
    )

    assert [item.menu for item in core.matrix_items] == sorted(
        [item.menu for item in matrix_items], key=str.lower
    )
    assert [item.menu for item in core.heatmaps] == sorted(
        [item.menu for item in heatmaps], key=str.lower
    )
    assert [item.category for item in core.distribution.categories] == sorted(
        [item.category for item in distribution.categories]
    )
