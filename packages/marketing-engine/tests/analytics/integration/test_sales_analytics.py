import json
from pathlib import Path

import pandas as pd
import pytest

from marketing_engine.core.analytics.calculate_sales_analytics import calculate_sales_analytics


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def test_calculate_sales_analytics_basic():
    df = pd.DataFrame(_load_sales_rows())

    result = calculate_sales_analytics(df)

    assert result["total_orders"] == 4
    assert result["total_items_sold"] == 5
    assert result["total_revenue"] == 45.0
    assert result["avg_order_revenue"] == 25.0
    assert result["max_order_revenue"] == 40.0
    assert result["min_order_revenue"] == 10.0
    assert result["avg_order_items"] == 2.0
    assert result["max_order_items"] == 3
    assert result["min_order_items"] == 1
    assert result["avg_popularity"] == 0.25
    assert result["period_start"] == "2025-02-01"
    assert result["period_end"] == "2025-02-04"
    assert isinstance(result["popularity_index"], list)
    assert isinstance(result["menu_heatmaps"], list)


def test_calculate_sales_analytics_invalid_order_time():
    df = pd.DataFrame(_load_sales_rows())
    df.loc[0, "order_time"] = "not-a-date"

    with pytest.raises(ValueError):
        calculate_sales_analytics(df)


def test_calculate_sales_analytics_empty_df():
    with pytest.raises(ValueError):
        calculate_sales_analytics(pd.DataFrame())
