import pandas as pd

from marketing_engine.core.analytics.utils import normalize_columns


def test_normalize_columns():
    df = pd.DataFrame(columns=[" Menu Name\t", "Total\u00a0Revenue", "Order Time"])

    normalized = normalize_columns(df)

    assert list(normalized.columns) == ["menu_name", "total_revenue", "order_time"]
