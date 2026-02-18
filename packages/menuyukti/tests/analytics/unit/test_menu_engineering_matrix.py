import json
from pathlib import Path

import pandas as pd
import pytest

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
)


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_matrix_rows():
    return json.loads((FIXTURES / "matrix_rows.json").read_text())


def test_calculate_menu_engineering_matrix_categories_and_filters():
    df = pd.DataFrame(_load_matrix_rows())

    result = calculate_menu_engineering_matrix(df)

    items = {item["menu"]: item for item in result["items"]}

    assert "Freebie" not in items
    assert items["Star"]["category"] == "star"
    assert items["Plow"]["category"] == "plow_horse"
    assert items["Puzzle"]["category"] == "puzzle"
    assert items["Low"]["category"] == "low_end"

    item_shares = [d["item_share"] for d in result["distribution"]]
    assert sum(item_shares) == pytest.approx(1.0)


def test_calculate_menu_engineering_matrix_missing_cols():
    df = pd.DataFrame([{"menu": "A", "quantity": 1}])

    with pytest.raises(ValueError):
        calculate_menu_engineering_matrix(df)


def test_calculate_menu_engineering_matrix_items_tie_break_stable():
    df = pd.DataFrame(
        [
            {
                "menu": "Beta",
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
                "quantity": 10,
                "total_revenue": 100.0,
                "cogs": 2.0,
            },
            {
                "menu": "Alpha",
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
                "quantity": 10,
                "total_revenue": 100.0,
                "cogs": 2.0,
            },
        ]
    )

    result = calculate_menu_engineering_matrix(df)
    assert [item["menu"] for item in result["items"]] == ["Alpha", "Beta"]


def test_calculate_menu_engineering_matrix_rejects_when_no_valid_items_after_cogs_filter():
    df = pd.DataFrame(
        [
            {
                "menu": "Latte",
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
                "quantity": 10,
                "total_revenue": 120.0,
                "cogs": 0.0,
            }
        ]
    )

    with pytest.raises(ValueError, match="No valid menu items with cogs > 0 and revenue > 0"):
        calculate_menu_engineering_matrix(df)
