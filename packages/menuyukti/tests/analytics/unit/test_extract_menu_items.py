import json
from pathlib import Path

import pandas as pd

from menuyukti.core.analytics.extract_menu_items import extract_menu_items


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def test_extract_menu_items_filters_and_aggregates():
    df = pd.DataFrame(_load_sales_rows())

    result = extract_menu_items(df)

    by_menu = {r["menu"]: r for r in result}

    assert "Tea" not in by_menu
    assert by_menu["Latte"]["quantity"] == 3
    assert by_menu["Latte"]["total_revenue"] == 30.0
    assert by_menu["Bagel"]["total_revenue"] == 5.0
    assert by_menu["Muffin"]["total_revenue"] == 4.0
