from pathlib import Path

import pytest

from menuyukti.core.analytics.quino import normalize_quino_excel

ROOT_DIR = Path(__file__).resolve().parents[6]
REPORT_FILE = ROOT_DIR / "reports" / "quino" / "TransactionDetailReport.xlsx"


def test_normalize_quino_excel_extracts_canonical_rows():
    if not REPORT_FILE.exists():
        pytest.skip("Expected sample QUINO report at 'reports/quino/TransactionDetailReport.xlsx'.")

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
    assert df["bill_number"].str.startswith("INV-").all()
    assert (df["qty"] > 0).any()
    assert df["order_time"].notna().all()


def test_normalize_quino_excel_keeps_modifier_lines():
    if not REPORT_FILE.exists():
        pytest.skip("Expected sample QUINO report at 'reports/quino/TransactionDetailReport.xlsx'.")

    payload = REPORT_FILE.read_bytes()
    df = normalize_quino_excel(payload)

    modifiers = df[df["menu_category"] == "MODIFIER"]
    assert not modifiers.empty
    assert (modifiers["menu_category_detail"] == "MODIFIER").all()
