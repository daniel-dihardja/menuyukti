from pathlib import Path

import pytest

from menuyukti.core.analytics.quino import normalize_quino_excel

ROOT_DIR = Path(__file__).resolve().parents[6]
REPORT_FILE = ROOT_DIR / "reports" / "quino" / "ItemSalesReport.xlsx"


def test_normalize_quino_excel_normalizes_item_sales_rows():
    if not REPORT_FILE.exists():
        pytest.skip("Expected sample QUINO report at 'reports/quino/ItemSalesReport.xlsx'.")

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)

    assert not df.empty
    assert {
        "bill_number",
        "menu",
        "qty",
        "price",
        "total_after_bill_discount",
        "order_time",
        "menu_category",
        "menu_category_detail",
    }.issubset(df.columns)
    assert df["bill_number"].str.startswith("QUINO-ITEM-").all()
    assert (df["qty"] > 0).any()
    assert (df["order_time"].notna()).all()
    assert (df["total_after_bill_discount"] > 0).all()


def test_normalize_quino_excel_computes_price_from_net_sales():
    if not REPORT_FILE.exists():
        pytest.skip("Expected sample QUINO report at 'reports/quino/ItemSalesReport.xlsx'.")

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)

    computed = df["total_after_bill_discount"] / df["qty"]
    assert (df["price"].round(6) == computed.round(6)).all()
