from datetime import date

from menuyukti.core.contracts.v1 import (
    ContractEnvelopeV1,
    MatrixDistributionV1,
    MenuMatrixPayloadV1,
    MenuHeatmapV1,
    SalesAnalyticsPayloadV1,
    SalesAnalyticsSummaryV1,
)


def test_menu_heatmap_v1_accepts_legacy_aliases():
    payload = {
        "menu": "Latte",
        "menuCategory": "DRINK",
        "menuCategoryDetail": "COFFEE",
        "dailyHeatmap": [{"hour": "08", "quantity": 3}],
        "weeklyHeatmap": [{"day": "mon", "quantity": 10}],
    }

    model = MenuHeatmapV1(**payload)
    assert model.menu_category == "DRINK"
    assert model.menu_category_detail == "COFFEE"
    assert model.daily_heatmap[0].hour == 8


def test_matrix_distribution_v1_accepts_legacy_aliases():
    payload = {
        "categories": [
            {
                "category": "star",
                "count": 4,
                "percentage": 0.4,
                "margin_contribution_percentage": 0.55,
            }
        ]
    }

    model = MatrixDistributionV1(**payload)
    assert model.categories[0].item_count == 4
    assert model.categories[0].item_share == 0.4
    assert model.categories[0].margin_share == 0.55


def test_sales_summary_v1_accepts_avg_popularity_alias():
    payload = {
        "total_orders": 5,
        "total_items_sold": 12,
        "total_revenue": 123.0,
        "avg_order_revenue": 20.5,
        "max_order_revenue": 40.0,
        "min_order_revenue": 5.0,
        "avg_order_items": 2.4,
        "max_order_items": 5,
        "min_order_items": 1,
        "avg_popularity": 0.4,
        "popularity_index": [],
        "period_start": "2025-02-01",
        "period_end": "2025-02-28",
    }

    model = SalesAnalyticsSummaryV1(**payload)
    assert model.avg_popularity_threshold == 0.4
    assert model.period_start == date(2025, 2, 1)


def test_sales_analytics_payload_v1_shape():
    payload = SalesAnalyticsPayloadV1(
        total_orders=10,
        total_items_sold=20,
        total_revenue=200.0,
        avg_order_revenue=20.0,
        max_order_revenue=30.0,
        min_order_revenue=10.0,
        avg_order_items=2.0,
        max_order_items=3,
        min_order_items=1,
        avg_popularity_threshold=0.5,
        popularity_index=[],
        menu_heatmaps=[],
        period_start="2025-02-01",
        period_end="2025-02-28",
    )
    assert payload.period_start == date(2025, 2, 1)


def test_contract_envelope_v1_typed_payload():
    payload = MenuMatrixPayloadV1(
        thresholds={
            "avg_popularity": 10.0,
            "avg_contribution_margin": 5.0,
            "total_cogs": 100.0,
            "total_profit": 80.0,
            "total_margin": 0.44,
        },
        distribution=[],
        items=[],
    )
    envelope = ContractEnvelopeV1(
        contract_type="menu_matrix",
        metadata={
            "schema_version": "v1",
            "source_system": "api",
            "pipeline_run_id": "run-1",
            "ingested_at_utc": "2026-02-18T00:00:00Z",
            "quality_status": "passed",
        },
        payload=payload,
    )
    assert envelope.contract_version == "v1"
    assert envelope.contract_type == "menu_matrix"
