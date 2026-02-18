from io import BytesIO

import pandas as pd

from menuyukti.core.analytics.esb.normalizer import (
    normalize_esb_excel,
    normalize_esb_excel_with_rejections,
)


def test_normalize_esb_excel():
    df = pd.DataFrame(
        [
            {
                "Bill Number": "B1",
                "Menu": "Latte",
                "Qty": 2,
                "Price": 10.0,
                "Total After Bill Discount": 20.0,
                "Order Time": "2025-02-01 10:00:00",
                "Menu Category": "DRINK",
                "Menu Category Detail": "COFFEE",
            }
        ]
    )

    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)

    normalized = normalize_esb_excel(buf.getvalue(), skiprows=0)

    assert list(normalized.columns) == [
        "bill_number",
        "menu",
        "qty",
        "price",
        "total_after_bill_discount",
        "order_time",
        "menu_category",
        "menu_category_detail",
    ]
    assert normalized.iloc[0]["qty"] == 2


def test_normalize_esb_excel_with_rejections():
    df = pd.DataFrame(
        [
            {
                "Bill Number": "B1",
                "Menu": "Latte",
                "Qty": 2,
                "Price": 10.0,
                "Total After Bill Discount": 20.0,
                "Order Time": "2025-02-01 10:00:00",
                "Menu Category": "DRINK",
                "Menu Category Detail": "COFFEE",
            },
            {
                "Bill Number": "B2",
                "Menu": "Tea",
                "Qty": None,
                "Price": 5.0,
                "Total After Bill Discount": 5.0,
                "Order Time": "2025-02-01 11:00:00",
                "Menu Category": "DRINK",
                "Menu Category Detail": "TEA",
            },
        ]
    )

    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)

    accepted, rejected = normalize_esb_excel_with_rejections(buf.getvalue(), skiprows=0)

    assert len(accepted) == 1
    assert len(rejected) == 1
    assert rejected.iloc[0]["rejection_reason"] == "missing_required_field"
