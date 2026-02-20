import pytest

from menuyukti.core.contracts.adapters import (
    to_menu_matrix_envelope_v1,
    to_sales_analytics_envelope_v1,
    to_core_distribution,
    to_core_heatmap,
    to_core_matrix_item,
)


def test_to_core_heatmap_accepts_legacy_shape():
    payload = {
        "menu": "Latte",
        "menuCategory": "DRINK",
        "menuCategoryDetail": "COFFEE",
        "dailyHeatmap": [{"hour": "08", "quantity": 3}],
        "weeklyHeatmap": [{"day": "mon", "quantity": 5}],
    }

    model = to_core_heatmap(payload)
    assert model.menu_category == "DRINK"
    assert model.daily_heatmap[0].hour == 8
    assert model.reporting_period == "unknown"


def test_to_core_distribution_accepts_legacy_shape():
    payload = {
        "categories": [
            {
                "category": "star",
                "count": 2,
                "percentage": 0.5,
                "margin_contribution_percentage": 0.6,
            }
        ]
    }

    model = to_core_distribution(payload)
    assert model.categories[0].item_count == 2
    assert model.categories[0].item_share == 0.5
    assert model.categories[0].margin_share == 0.6


def test_to_core_matrix_item_round_trip():
    payload = {
        "menu": "Latte",
        "menu_category": "DRINK",
        "menu_category_detail": "COFFEE",
        "category": "star",
        "action": "keep",
        "quantity": 10,
        "total_revenue": 100.0,
        "cogs": 2.0,
        "total_cogs": 20.0,
        "margin_per_unit": 8.0,
        "contribution_margin": 80.0,
        "contribution_margin_percentage": 0.2,
        "we_value": 0.4,
    }

    model = to_core_matrix_item(payload)
    assert model.menu == "Latte"
    assert model.total_revenue == 100.0


def test_to_sales_analytics_envelope_v1():
    payload = {
        "metadata": {
            "schema_version": "v1",
            "source_system": "esb",
            "pipeline_run_id": "run-1",
            "ingested_at_utc": "2026-02-18T00:00:00Z",
            "quality_status": "passed",
        },
        "total_orders": 1,
        "total_items_sold": 2,
        "total_revenue": 30.0,
        "avg_order_revenue": 30.0,
        "max_order_revenue": 30.0,
        "min_order_revenue": 30.0,
        "avg_order_items": 2.0,
        "max_order_items": 2,
        "min_order_items": 2,
        "avg_popularity_threshold": 1.0,
        "popularity_index": [],
        "menu_heatmaps": [],
        "period_start": "2025-02-01",
        "period_end": "2025-02-01",
    }
    envelope = to_sales_analytics_envelope_v1(payload)
    assert envelope.contract_type == "sales_analytics"
    assert envelope.metadata.schema_version == "v1"
    assert envelope.payload.total_orders == 1


def test_to_menu_matrix_envelope_v1():
    payload = {
        "thresholds": {
            "avg_popularity": 10.0,
            "avg_contribution_margin": 5.0,
            "total_cogs": 100.0,
            "total_profit": 80.0,
            "total_margin": 0.44,
        },
        "distribution": [],
        "items": [],
    }
    envelope = to_menu_matrix_envelope_v1(payload, source_system="api")
    assert envelope.contract_type == "menu_matrix"
    assert envelope.metadata.schema_version == "v1"


def test_to_sales_analytics_envelope_v1_rejects_non_mapping_metadata():
    payload = {
        "metadata": "invalid-metadata",
        "total_orders": 1,
        "total_items_sold": 2,
        "total_revenue": 30.0,
        "avg_order_revenue": 30.0,
        "max_order_revenue": 30.0,
        "min_order_revenue": 30.0,
        "avg_order_items": 2.0,
        "max_order_items": 2,
        "min_order_items": 2,
        "avg_popularity_threshold": 1.0,
        "popularity_index": [],
        "menu_heatmaps": [],
        "period_start": "2025-02-01",
        "period_end": "2025-02-01",
    }

    with pytest.raises(TypeError):
        to_sales_analytics_envelope_v1(payload)
