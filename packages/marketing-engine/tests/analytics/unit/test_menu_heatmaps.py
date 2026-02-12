import json
from pathlib import Path

import pandas as pd
import pytest

from marketing_engine.core.analytics.calculate_menu_heatmaps import calculate_menu_heatmaps


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def test_calculate_menu_heatmaps_shape_and_sort():
    df = pd.DataFrame(_load_sales_rows())
    df["order_time"] = pd.to_datetime(df["order_time"], errors="raise")

    result = calculate_menu_heatmaps(df)

    assert len(result) == 4
    assert result[0]["menu"] == "Latte"
    assert result[1]["menu"] == "Tea"

    latte = next(r for r in result if r["menu"] == "Latte")
    assert len(latte["dailyHeatmap"]) == 24
    assert len(latte["weeklyHeatmap"]) == 7
    assert latte["menuCategory"] == "DRINK"
    assert latte["menuCategoryDetail"] == "COFFEE"


def test_calculate_menu_heatmaps_multiple_categories_error():
    df = pd.DataFrame(
        [
            {
                "menu": "Latte",
                "qty": 1,
                "order_time": pd.Timestamp("2025-02-01 10:00:00"),
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
            },
            {
                "menu": "Latte",
                "qty": 1,
                "order_time": pd.Timestamp("2025-02-01 11:00:00"),
                "menu_category": "FOOD",
                "menu_category_detail": "COFFEE",
            },
        ]
    )

    with pytest.raises(ValueError):
        calculate_menu_heatmaps(df)
