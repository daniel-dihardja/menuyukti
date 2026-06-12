from pathlib import Path

import pandas as pd
import pytest

from menuyukti.core.analytics.calculate_sales_analytics import calculate_sales_analytics
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.analytics.quino import normalize_quino_excel, normalize_quino_excel_with_rejections

ROOT_DIR = Path(__file__).resolve().parents[6]
REPORT_FILE = ROOT_DIR / "reports" / "quino" / "TransactionItemDetailReport_May_2026.xlsx"


def test_detect_pos_from_excel_bytes_recognizes_quino_transaction_item_detail_report():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    assert detect_pos_from_excel_bytes(payload) == "quino"


def test_normalize_quino_excel_normalizes_transaction_item_detail_rows():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)

    assert not df.empty
    assert len(df) == 5200
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
    assert df["bill_number"].str.startswith("INV-").all()
    assert (df["qty"] > 0).all()
    assert (df["total_after_bill_discount"] > 0).all()
    assert df["order_time"].min() >= pd.Timestamp("2026-05-01")
    assert df["order_time"].max() < pd.Timestamp("2026-06-01")
    assert df["bill_number"].nunique() == 915


def test_normalize_quino_excel_computes_price_from_net_sales():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)

    computed = df["total_after_bill_discount"] / df["qty"]
    assert (df["price"].round(6) == computed.round(6)).all()


def test_normalize_quino_excel_excludes_modifiers_and_refunds():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    cleaned, rejected = normalize_quino_excel_with_rejections(payload)

    assert len(cleaned) == 5200
    assert len(rejected) == 2891
    assert "non_positive_qty_or_revenue" in rejected["rejection_reason"].values
    assert (cleaned["menu_category"] == cleaned["menu_category"].str.upper()).all()
    assert (cleaned["menu_category_detail"] == cleaned["menu_category_detail"].str.upper()).all()


def test_normalize_quino_excel_enables_order_and_datetime_analytics():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)
    result = calculate_sales_analytics(df)

    assert result["capabilities"]["has_order_id"] is True
    assert result["capabilities"]["has_datetime"] is True
    assert "order_signals" in result["capabilities"]["enabled_blocks"]
    assert "datetime_signals" in result["capabilities"]["enabled_blocks"]
    assert result["additional_signals"]["order_signals"] is not None
    assert result["additional_signals"]["datetime_signals"] is not None
