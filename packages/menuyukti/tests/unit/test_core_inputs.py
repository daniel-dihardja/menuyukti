import json
from pathlib import Path

from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models.matrix_item import MatrixItem
from menuyukti.core.models.heatmap import MenuHeatmap
from menuyukti.core.models.matrix_distribution import MatrixDistribution
from menuyukti.core.models.sales_analytics_summary import SalesAnalyticsSummary


FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "menuyukti"


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
