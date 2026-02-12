import json
from pathlib import Path

import pandas as pd
import pytest

from marketing_engine.core.analytics.calculate_menu_engineering_matrix import (
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

    percentages = [d["percentage"] for d in result["distribution"]]
    assert sum(percentages) == pytest.approx(1.0)


def test_calculate_menu_engineering_matrix_missing_cols():
    df = pd.DataFrame([{"menu": "A", "quantity": 1}])

    with pytest.raises(ValueError):
        calculate_menu_engineering_matrix(df)
