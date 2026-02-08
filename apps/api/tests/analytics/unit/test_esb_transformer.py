import pandas as pd
import pytest

from app.analytics.esb.transformer import filter_required_columns, convert_column_types


def test_filter_required_columns_missing():
    df = pd.DataFrame({"menu": ["A"]})

    with pytest.raises(ValueError):
        filter_required_columns(df)


def test_convert_column_types_drops_invalid_rows():
    df = pd.DataFrame(
        [
            {
                "bill_number": "B1",
                "menu": "Latte",
                "qty": "2",
                "price": "10",
                "total_after_bill_discount": "20",
                "order_time": "2025-02-01 10:00:00",
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
            },
            {
                "bill_number": "B2",
                "menu": "Latte",
                "qty": "x",
                "price": "bad",
                "total_after_bill_discount": "oops",
                "order_time": "not-a-date",
                "menu_category": "DRINK",
                "menu_category_detail": "COFFEE",
            },
        ]
    )

    converted = convert_column_types(df)

    assert len(converted) == 1
    assert converted.iloc[0]["qty"] == 2
