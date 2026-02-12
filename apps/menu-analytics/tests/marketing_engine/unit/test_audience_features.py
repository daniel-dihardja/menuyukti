import json
from pathlib import Path

from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.core.models.matrix_item import MatrixItem
from app.marketing_engine.core.models.heatmap import MenuHeatmap
from app.marketing_engine.core.models.matrix_distribution import (
    MatrixDistribution,
    CategoryDistribution,
)
from app.marketing_engine.core.models.sales_analytics_summary import (
    SalesAnalyticsSummary,
)
from app.marketing_engine.features.audience import build_audience_features


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "marketing_engine"


def _load_json(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_build_audience_features():
    matrix_items = [MatrixItem(**i) for i in _load_json("matrix_items.json")]
    heatmaps = [MenuHeatmap(**h) for h in _load_json("heatmaps.json")]
    distribution = MatrixDistribution(**_load_json("distribution.json"))

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    features = build_audience_features(core)

    assert features.top_items[0] == "Beta"
    assert features.peak_hours
    assert features.weekday_bias in {"weekday", "weekend", "balanced"}
    assert set(features.daypart_profile.keys()) == {
        "morning",
        "lunch",
        "afternoon",
        "evening",
    }
    assert "mon" in features.weekday_profile
    assert features.party_size_signal in {"mostly_solo", "mostly_pair", "group_heavy"}
    assert isinstance(features.social_dining_score, float)


def test_build_audience_features_top_items_order():
    matrix_items = [
        MatrixItem(
            menu="Alpha",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            category="star",
            action="keep",
            quantity=5,
            total_revenue=50.0,
            cogs=2.0,
            total_cogs=10.0,
            margin_per_unit=8.0,
            contribution_margin=40.0,
            contribution_margin_percentage=0.4,
            we_value=0.7,
        ),
        MatrixItem(
            menu="Beta",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            category="star",
            action="keep",
            quantity=12,
            total_revenue=120.0,
            cogs=2.0,
            total_cogs=24.0,
            margin_per_unit=8.0,
            contribution_margin=96.0,
            contribution_margin_percentage=0.6,
            we_value=0.9,
        ),
        MatrixItem(
            menu="Gamma",
            menu_category="FOOD",
            menu_category_detail="SNACK",
            category="puzzle",
            action="keep",
            quantity=8,
            total_revenue=80.0,
            cogs=3.0,
            total_cogs=24.0,
            margin_per_unit=7.0,
            contribution_margin=56.0,
            contribution_margin_percentage=0.2,
            we_value=0.6,
        ),
    ]

    heatmaps = [
        MenuHeatmap(
            menu="Alpha",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            daily_heatmap=[],
            weekly_heatmap=[],
            reporting_period="2026-01",
        )
    ]

    distribution = MatrixDistribution(
        categories=[
            CategoryDistribution(
                category="star",
                item_count=3,
                item_share=1.0,
                margin_share=1.0,
            )
        ]
    )

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    features = build_audience_features(core)

    assert features.top_items == ["Beta", "Gamma", "Alpha"]


def test_build_audience_features_peak_hours_and_weekday_bias():
    matrix_items = [
        MatrixItem(
            menu="Latte",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            category="star",
            action="keep",
            quantity=10,
            total_revenue=100.0,
            cogs=2.0,
            total_cogs=20.0,
            margin_per_unit=8.0,
            contribution_margin=80.0,
            contribution_margin_percentage=0.5,
            we_value=0.8,
        )
    ]

    heatmaps = [
        MenuHeatmap(
            menu="Latte",
            menu_category="DRINK",
            menu_category_detail="COFFEE",
            daily_heatmap=[
                {"hour": 9, "quantity": 10},
                {"hour": 12, "quantity": 25},
                {"hour": 18, "quantity": 15},
            ],
            weekly_heatmap=[
                {"day": "mon", "quantity": 5},
                {"day": "sat", "quantity": 20},
                {"day": "sun", "quantity": 18},
            ],
            reporting_period="2026-01",
        )
    ]

    distribution = MatrixDistribution(
        categories=[
            CategoryDistribution(
                category="star",
                item_count=1,
                item_share=1.0,
                margin_share=1.0,
            )
        ]
    )

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
    )

    features = build_audience_features(core)

    assert features.peak_hours[0] == 12
    assert features.weekday_bias == "weekend"


def test_build_audience_features_uses_sales_summary_when_available():
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
        avg_order_items=2.9,
        max_order_items=8,
        min_order_items=1,
        avg_popularity=0.41,
        popularity_index=[{"menu": "Latte"}],
        period_start="2026-01-01",
        period_end="2026-01-31",
    )

    core = CoreInputs(
        matrix_items=matrix_items,
        heatmaps=heatmaps,
        distribution=distribution,
        sales_summary=sales_summary,
    )

    features = build_audience_features(core)

    assert features.avg_order_items == 2.9
    assert features.avg_order_revenue == 35000.0
    assert features.party_size_signal == "group_heavy"
    assert features.popularity_index_coverage == 1
    assert features.analysis_window_days == 31
