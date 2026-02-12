import json
from pathlib import Path

import pandas as pd
import pytest

from marketing_engine.core.analytics.calculate_popularity_index import calculate_popularity_index


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def test_calculate_popularity_index():
    df = pd.DataFrame(_load_sales_rows())

    result = calculate_popularity_index(df)

    popularity_by_menu = {r["menu"]: r["popularity"] for r in result}

    assert popularity_by_menu["Latte"] == 0.375
    assert popularity_by_menu["Tea"] == 0.375
    assert popularity_by_menu["Bagel"] == 0.125
    assert popularity_by_menu["Muffin"] == 0.125


def test_calculate_popularity_index_empty():
    with pytest.raises(ValueError):
        calculate_popularity_index(pd.DataFrame())



def test_calculate_popularity_index_zero_total():
    df = pd.DataFrame(
        [
            {"menu": "A", "qty": 0},
            {"menu": "B", "qty": 0},
        ]
    )

    with pytest.raises(ValueError):
        calculate_popularity_index(df)
