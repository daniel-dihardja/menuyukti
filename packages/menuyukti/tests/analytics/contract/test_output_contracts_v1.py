import json
from pathlib import Path

import pandas as pd

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
)
from menuyukti.core.analytics.calculate_sales_analytics import calculate_sales_analytics
from menuyukti.core.contracts.adapters import (
    to_core_distribution,
    to_core_heatmap,
    to_menu_matrix_envelope_v1,
    to_sales_analytics_envelope_v1,
)


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def _load_matrix_rows():
    return json.loads((FIXTURES / "matrix_rows.json").read_text())


def test_sales_analytics_contract_v1_shape():
    df = pd.DataFrame(_load_sales_rows())
    result = calculate_sales_analytics(df)

    assert set(result["metadata"].keys()) == {
        "schema_version",
        "source_system",
        "pipeline_run_id",
        "ingested_at_utc",
        "quality_status",
    }
    assert result["metadata"]["schema_version"] == "v1"
    assert isinstance(result["total_orders"], int)
    assert isinstance(result["avg_popularity_threshold"], float)

    heatmap = result["menu_heatmaps"][0]
    assert set(heatmap.keys()) == {
        "menu",
        "menu_category",
        "menu_category_detail",
        "daily_heatmap",
        "weekly_heatmap",
        "reporting_period",
    }
    assert isinstance(heatmap["daily_heatmap"][0]["hour"], int)


def test_matrix_distribution_contract_v1_shape():
    df = pd.DataFrame(_load_matrix_rows())
    result = calculate_menu_engineering_matrix(df)

    dist = result["distribution"][0]
    assert set(dist.keys()) == {
        "category",
        "item_count",
        "item_share",
        "margin_share",
    }


def test_legacy_heatmap_payload_still_compatible():
    legacy_payload = {
        "menu": "Latte",
        "menuCategory": "DRINK",
        "menuCategoryDetail": "COFFEE",
        "dailyHeatmap": [{"hour": "08", "quantity": 4}],
        "weeklyHeatmap": [{"day": "mon", "quantity": 11}],
    }
    model = to_core_heatmap(legacy_payload)
    assert model.menu_category == "DRINK"
    assert model.daily_heatmap[0].hour == 8


def test_legacy_distribution_payload_still_compatible():
    legacy_payload = {
        "categories": [
            {
                "category": "star",
                "count": 3,
                "percentage": 0.5,
                "margin_contribution_percentage": 0.7,
            }
        ]
    }
    model = to_core_distribution(legacy_payload)
    assert model.categories[0].item_count == 3
    assert model.categories[0].margin_share == 0.7


def test_sales_analytics_envelope_v1_compatibility():
    df = pd.DataFrame(_load_sales_rows())
    result = calculate_sales_analytics(df)
    envelope = to_sales_analytics_envelope_v1(result)

    assert envelope.contract_version == "v1"
    assert envelope.contract_type == "sales_analytics"
    assert envelope.metadata.schema_version == "v1"
    assert envelope.payload.total_orders > 0


def test_menu_matrix_envelope_v1_compatibility():
    df = pd.DataFrame(_load_matrix_rows())
    result = calculate_menu_engineering_matrix(df)
    envelope = to_menu_matrix_envelope_v1(result, source_system="matrix")

    assert envelope.contract_version == "v1"
    assert envelope.contract_type == "menu_matrix"
    assert envelope.metadata.schema_version == "v1"
    assert isinstance(envelope.payload.items, list)
